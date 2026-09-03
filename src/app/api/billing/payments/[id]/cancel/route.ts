import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const supabaseAdmin = createSupabaseAdmin()
    const { data: payment, error: fetchError } = await supabaseAdmin
      .from('billing_payments')
      .select('id, user_id, status, metadata')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (fetchError || !payment) {
      return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 })
    }

    if (payment.status === 'paid') {
      return NextResponse.json({ error: 'No puedes cancelar un pago ya confirmado.' }, { status: 400 })
    }

    if (payment.status === 'failed' || payment.status === 'cancelled' || payment.status === 'expired') {
      return NextResponse.json({ success: true, payment: { id: payment.id, status: payment.status } })
    }

    if (payment.status === 'pending') {
      const currentMetadata = payment.metadata && typeof payment.metadata === 'object' && !Array.isArray(payment.metadata)
        ? payment.metadata as Record<string, unknown>
        : {}
      const updatedMetadata = {
        ...currentMetadata,
        cancelledByUser: true,
        cancelledAt: new Date().toISOString(),
        cancelReason: 'user_cancelled_pending_attempt'
      }

      const { data: updatedPayment, error: updateError } = await supabaseAdmin
        .from('billing_payments')
        .update({
          status: 'cancelled',
          metadata: updatedMetadata,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select('id, status')
        .maybeSingle()

      if (updateError) {
        console.error('[POST /api/billing/payments/[id]/cancel] Error updating:', updateError.message)
        return NextResponse.json({ error: 'Error al cancelar el pago' }, { status: 500 })
      }

      if (!updatedPayment) {
        return NextResponse.json({ error: 'El pago ya no está pendiente.' }, { status: 409 })
      }

      return NextResponse.json({ success: true, payment: updatedPayment })
    }

    return NextResponse.json({ error: 'Estado de pago no soportado' }, { status: 400 })
  } catch (error) {
    console.error('[POST /api/billing/payments/[id]/cancel] Error:', error instanceof Error ? error.message : 'unknown error')
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
