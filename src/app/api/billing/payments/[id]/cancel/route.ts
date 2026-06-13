import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Buscar el pago
    const { data: payment, error: fetchError } = await supabase
      .from('billing_payments')
      .select('id, user_id, status, metadata')
      .eq('id', id)
      .single()

    if (fetchError || !payment) {
      return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 })
    }

    // Validar pertenencia
    if (payment.user_id !== user.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // Regla: No cancelar pagos ya pagados
    if (payment.status === 'paid') {
      return NextResponse.json({ error: 'No puedes cancelar un pago ya confirmado.' }, { status: 400 })
    }

    // Regla: Si ya está fallido, cancelado o expirado, retornar éxito idempotente
    if (payment.status === 'failed' || payment.status === 'cancelled' || payment.status === 'expired') {
      return NextResponse.json({ success: true, payment: { id: payment.id, status: payment.status } })
    }

    // Si es pending, lo cancelamos
    if (payment.status === 'pending') {
      const currentMetadata = payment.metadata || {}
      const updatedMetadata = {
        ...currentMetadata,
        cancelledByUser: true,
        cancelledAt: new Date().toISOString(),
        cancelReason: 'user_cancelled_pending_attempt'
      }

      const supabaseAdmin = createSupabaseAdmin()
      const { data: updatedPayment, error: updateError } = await supabaseAdmin
        .from('billing_payments')
        .update({
          status: 'cancelled',
          metadata: updatedMetadata,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', user.id) // Enforce ownership again at update
        .select('id, status')
        .single()

      if (updateError) {
        console.error('[POST /api/billing/payments/[id]/cancel] Error updating:', updateError)
        return NextResponse.json({ error: 'Error al cancelar el pago' }, { status: 500 })
      }

      return NextResponse.json({ success: true, payment: updatedPayment })
    }

    return NextResponse.json({ error: 'Estado de pago no soportado' }, { status: 400 })

  } catch (error) {
    console.error('[POST /api/billing/payments/[id]/cancel] Error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
