import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const MAX_BODY_BYTES = 4 * 1024
const CONVERSATION_SELECT_FIELDS = 'id, assistant_id, channel, external_chat_id, last_message, created_at, updated_at, visitor_id, visitor_name, visitor_email, visitor_phone, status, last_message_at, assistant:assistants(assistant_name, business_name, channel)'
const MESSAGE_SELECT_FIELDS = 'id, conversation_id, assistant_id, role, content, channel, created_at'

function getContentLength(request: Request) {
  const raw = request.headers.get('content-length')
  if (!raw) return null
  const value = Number(raw)
  return Number.isSafeInteger(value) && value >= 0 ? value : null
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Invalid conversation id' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: conv, error: convError } = await supabase
      .from('conversations')
      .select(CONVERSATION_SELECT_FIELDS)
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (convError || !conv) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select(MESSAGE_SELECT_FIELDS)
      .eq('conversation_id', id)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (msgError) throw msgError

    return NextResponse.json({ conversation: conv, messages: messages || [] })
  } catch (error) {
    console.error('[GET /api/conversations/[id]]', error instanceof Error ? error.message : 'unknown error')
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Invalid conversation id' }, { status: 400 })

    const contentLength = getContentLength(request)
    if (contentLength !== null && contentLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Request body too large' }, { status: 413 })
    }

    const rawBody = await request.text()
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Request body too large' }, { status: 413 })
    }

    let body: unknown
    try {
      body = JSON.parse(rawBody)
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const record = body as Record<string, unknown>
    const keys = Object.keys(record)
    if (keys.length === 0 || keys.some((key) => key !== 'status')) {
      return NextResponse.json({ error: 'Invalid request fields' }, { status: 400 })
    }

    const status = record.status
    if (typeof status !== 'string' || !['open', 'pending', 'closed'].includes(status)) {
      return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabaseAdmin = createSupabaseAdmin()

    const { data: verify } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!verify) return NextResponse.json({ error: 'Not found or forbidden' }, { status: 404 })

    const [subRes, profileRes] = await Promise.all([
      supabaseAdmin.from('subscriptions').select('plan, status, current_period_end, grace_ends_at, cancel_at_period_end').eq('user_id', user.id).single(),
      supabaseAdmin.from('profiles').select('trial_used, trial_ends_at').eq('id', user.id).single()
    ])
    const { getEffectiveSubscriptionStatus } = await import('@/lib/billing/subscription-status')
    const effectiveStatus = getEffectiveSubscriptionStatus(subRes.data, profileRes.data)

    if (['free', 'expired', 'cancelled'].includes(effectiveStatus)) {
      return NextResponse.json({ error: 'Plan inválido para editar' }, { status: 403 })
    }

    const { error: updateError } = await supabaseAdmin
      .from('conversations')
      .update({ status })
      .eq('id', id)
      .eq('user_id', user.id)

    if (updateError) throw updateError

    return NextResponse.json({ success: true, status })
  } catch (error) {
    console.error('[PATCH /api/conversations/[id]]', error instanceof Error ? error.message : 'unknown error')
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
