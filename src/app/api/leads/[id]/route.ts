import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { getClientIp, HttpInputError, isUuid, readJsonBody } from '@/lib/http-security'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    if (!isUuid(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Lead detail
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*, assistant:assistants(assistant_name, business_name), conversation:conversations(last_message)')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (leadError || !lead) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({ lead })
  } catch (error) {
    console.error('[GET /api/leads/[id]]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!isUuid(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const body = await readJsonBody<Record<string, unknown>>(request, 8_192)
    const { status, notes, name, email, phone } = body

    const normalizedStatus = status === 'discarded' ? 'lost' : status
    if (normalizedStatus !== undefined && (typeof normalizedStatus !== 'string' || !['new', 'contacted', 'qualified', 'converted', 'lost'].includes(normalizedStatus))) {
      return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
    }

    if (notes !== undefined && (typeof notes !== 'string' || notes.length > 5_000)) return NextResponse.json({ error: 'Notas inválidas' }, { status: 400 })
    if (name !== undefined && (typeof name !== 'string' || name.length > 120)) return NextResponse.json({ error: 'Nombre inválido' }, { status: 400 })
    if (email !== undefined && (typeof email !== 'string' || email.length > 254)) return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
    if (phone !== undefined && (typeof phone !== 'string' || phone.length > 40)) return NextResponse.json({ error: 'Teléfono inválido' }, { status: 400 })

    // Verify ownership via RLS select first
    const { data: verify } = await supabase.from('leads').select('id').eq('id', id).single()
    if (!verify) return NextResponse.json({ error: 'Not found or forbidden' }, { status: 404 })

    const supabaseAdmin = createSupabaseAdmin()

    // Validate plan access
    const [subRes, profileRes] = await Promise.all([
      supabaseAdmin.from('subscriptions').select('plan, status, current_period_end, grace_ends_at, cancel_at_period_end').eq('user_id', user.id).single(),
      supabaseAdmin.from('profiles').select('trial_used, trial_ends_at').eq('id', user.id).single()
    ])
    const { getEffectiveSubscriptionStatus } = await import('@/lib/billing/subscription-status')
    const effectiveStatus = getEffectiveSubscriptionStatus(subRes.data, profileRes.data)
    
    if (['free', 'expired', 'cancelled'].includes(effectiveStatus)) {
      return NextResponse.json({ error: 'Plan inválido para editar leads' }, { status: 403 })
    }

    // Update using admin because frontend cannot UPDATE directly based on our new max security RLS
    const updates: Record<string, string | null> = {}
    
    if (normalizedStatus !== undefined) updates.status = normalizedStatus
    if (notes !== undefined) updates.notes = notes
    if (name !== undefined) updates.name = name
    if (email !== undefined) updates.email = email
    if (phone !== undefined) updates.phone = phone

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabaseAdmin
        .from('leads')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)

      if (updateError) throw updateError
      
      if (normalizedStatus !== undefined) {
        await supabaseAdmin.from('audit_logs').insert({
          user_id: user.id,
          action: 'lead_status_updated',
          details: { lead_id: id, new_status: normalizedStatus },
          ip_address: getClientIp(request)
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof HttpInputError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error('[PATCH /api/leads/[id]]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
