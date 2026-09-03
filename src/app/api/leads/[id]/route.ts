import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'

const MAX_BODY_BYTES = 16 * 1024
const MAX_TEXT_LENGTH = 2000
const MAX_NOTES_LENGTH = 5000
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isOptionalString(value: unknown, max: number): value is string {
  return value === undefined || (typeof value === 'string' && value.length <= max)
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('id, user_id, assistant_id, conversation_id, name, email, phone, company, notes, status, source, created_at, updated_at, assistant:assistants(assistant_name, business_name), conversation:conversations(last_message)')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (leadError || !lead) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({ lead })
  } catch (error) {
    console.error('[GET /api/leads/[id]] Error:', error instanceof Error ? error.message : 'unknown')
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const contentLength = Number.parseInt(request.headers.get('content-length') || '', 10)
    if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Solicitud demasiado grande' }, { status: 413 })
    }

    const rawBody = await request.text()
    if (new TextEncoder().encode(rawBody).length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Solicitud demasiado grande' }, { status: 413 })
    }

    let body: unknown
    try {
      body = JSON.parse(rawBody)
    } catch {
      return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
    }

    if (!isPlainObject(body)) return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 })

    const { status, notes, name, email, phone } = body

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (status !== undefined && (typeof status !== 'string' || !['new', 'contacted', 'qualified', 'converted', 'discarded'].includes(status))) {
      return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
    }
    if (!isOptionalString(notes, MAX_NOTES_LENGTH) || !isOptionalString(name, MAX_TEXT_LENGTH) || !isOptionalString(email, MAX_TEXT_LENGTH) || !isOptionalString(phone, 64)) {
      return NextResponse.json({ error: 'Campo inválido o demasiado largo' }, { status: 400 })
    }

    const updates: Record<string, string> = {}
    if (status !== undefined) updates.status = status as string
    if (notes !== undefined) updates.notes = notes as string
    if (name !== undefined) updates.name = name as string
    if (email !== undefined) updates.email = email as string
    if (phone !== undefined) updates.phone = phone as string

    const supabaseAdmin = createSupabaseAdmin()

    const [subRes, profileRes, leadRes] = await Promise.all([
      supabaseAdmin.from('subscriptions').select('plan, status, current_period_end, grace_ends_at, cancel_at_period_end').eq('user_id', user.id).maybeSingle(),
      supabaseAdmin.from('profiles').select('trial_used, trial_ends_at').eq('id', user.id).maybeSingle(),
      supabaseAdmin.from('leads').select('id').eq('id', id).eq('user_id', user.id).maybeSingle(),
    ])

    if (subRes.error || profileRes.error || leadRes.error) {
      console.error('[PATCH /api/leads/[id]] authorization lookup failed')
      return NextResponse.json({ error: 'No se pudo validar el acceso' }, { status: 500 })
    }
    if (!leadRes.data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { getEffectiveSubscriptionStatus } = await import('@/lib/billing/subscription-status')
    const effectiveStatus = getEffectiveSubscriptionStatus(subRes.data, profileRes.data)
    if (['free', 'expired', 'cancelled'].includes(effectiveStatus)) {
      return NextResponse.json({ error: 'Plan inválido para editar leads' }, { status: 403 })
    }

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabaseAdmin
        .from('leads')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)

      if (updateError) throw updateError

      if (status !== undefined) {
        const forwardedFor = request.headers.get('x-forwarded-for')
        const ip = forwardedFor?.split(',')[0]?.trim() || '127.0.0.1'
        await supabaseAdmin.from('audit_logs').insert({
          user_id: user.id,
          action: 'lead_status_updated',
          details: { lead_id: id, new_status: status },
          ip_address: ip.slice(0, 64),
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[PATCH /api/leads/[id]] Error:', error instanceof Error ? error.message : 'unknown')
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
