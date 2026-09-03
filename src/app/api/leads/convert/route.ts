import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'

const MAX_BODY_BYTES = 16 * 1024
const MAX_NAME_LENGTH = 120
const MAX_EMAIL_LENGTH = 180
const MAX_PHONE_LENGTH = 40
const MAX_SOURCE_LENGTH = 64
const MAX_NOTES_LENGTH = 5000

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function optionalString(value: unknown, maxLength: number): string | undefined | null {
  if (value === undefined || value === null || value === '') return value === null ? null : undefined
  if (typeof value !== 'string' || value.length > maxLength) return null
  return value.trim() || null
}

const LEAD_FIELDS = 'id, assistant_id, user_id, name, email, phone, source, status, created_at, updated_at, conversation_id, notes, metadata'

export async function POST(request: Request) {
  try {
    const contentLength = request.headers.get('content-length')
    if (contentLength) {
      const parsed = Number(contentLength)
      if (!Number.isFinite(parsed) || parsed > MAX_BODY_BYTES) {
        return NextResponse.json({ error: 'Solicitud demasiado grande' }, { status: 413 })
      }
    }

    const rawBody = await request.text()
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Solicitud demasiado grande' }, { status: 413 })
    }

    let body: unknown
    try {
      body = JSON.parse(rawBody)
    } catch {
      return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
    }

    if (!isPlainObject(body)) {
      return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 })
    }

    const { conversation_id, assistant_id } = body
    if (!isUuid(conversation_id) || !isUuid(assistant_id)) {
      return NextResponse.json({ error: 'IDs inválidos' }, { status: 400 })
    }

    const name = optionalString(body.name, MAX_NAME_LENGTH)
    const email = optionalString(body.email, MAX_EMAIL_LENGTH)
    const phone = optionalString(body.phone, MAX_PHONE_LENGTH)
    const source = optionalString(body.source, MAX_SOURCE_LENGTH)
    const notes = optionalString(body.notes, MAX_NOTES_LENGTH)

    if (body.name !== undefined && name === null) return NextResponse.json({ error: 'Nombre inválido' }, { status: 400 })
    if (body.email !== undefined && email === null) return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
    if (body.phone !== undefined && phone === null) return NextResponse.json({ error: 'Teléfono inválido' }, { status: 400 })
    if (body.source !== undefined && source === null) return NextResponse.json({ error: 'Origen inválido' }, { status: 400 })
    if (body.notes !== undefined && notes === null) return NextResponse.json({ error: 'Notas inválidas' }, { status: 400 })

    if (!email && !phone && !name) {
      return NextResponse.json({ error: 'Faltan datos de contacto para crear un lead útil' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseAdmin = createSupabaseAdmin()

    const [subRes, profileRes, conversationRes] = await Promise.all([
      supabaseAdmin
        .from('subscriptions')
        .select('plan, status, current_period_end, grace_ends_at, cancel_at_period_end')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabaseAdmin
        .from('profiles')
        .select('trial_used, trial_ends_at')
        .eq('id', user.id)
        .maybeSingle(),
      supabaseAdmin
        .from('conversations')
        .select('id, assistant_id')
        .eq('id', conversation_id)
        .eq('user_id', user.id)
        .maybeSingle(),
    ])

    if (conversationRes.error) {
      console.error('[POST /api/leads/convert] Conversation lookup failed:', conversationRes.error.message)
      return NextResponse.json({ error: 'No se pudo validar la conversación' }, { status: 500 })
    }

    if (!conversationRes.data || conversationRes.data.assistant_id !== assistant_id) {
      return NextResponse.json({ error: 'Conversación no encontrada' }, { status: 404 })
    }

    const { getEffectiveSubscriptionStatus } = await import('@/lib/billing/subscription-status')
    const effectiveStatus = getEffectiveSubscriptionStatus(subRes.data, profileRes.data)

    if (['free', 'expired', 'cancelled'].includes(effectiveStatus)) {
      return NextResponse.json({ error: 'Plan inválido para crear leads' }, { status: 403 })
    }

    let existingLead: Record<string, unknown> | null = null

    if (email) {
      const { data, error } = await supabaseAdmin
        .from('leads')
        .select(LEAD_FIELDS)
        .eq('user_id', user.id)
        .eq('assistant_id', assistant_id)
        .eq('email', email)
        .limit(1)
        .maybeSingle()

      if (error) throw error
      existingLead = data as Record<string, unknown> | null
    }

    if (!existingLead && phone) {
      const { data, error } = await supabaseAdmin
        .from('leads')
        .select(LEAD_FIELDS)
        .eq('user_id', user.id)
        .eq('assistant_id', assistant_id)
        .eq('phone', phone)
        .limit(1)
        .maybeSingle()

      if (error) throw error
      existingLead = data as Record<string, unknown> | null
    }

    if (existingLead) {
      const updates: Record<string, unknown> = { conversation_id }
      const existingNotes = typeof existingLead.notes === 'string' ? existingLead.notes : ''

      if (notes) {
        const combinedNotes = existingNotes ? `${existingNotes}\n---\n${notes}` : notes
        updates.notes = combinedNotes.slice(0, MAX_NOTES_LENGTH)
      }
      if (name && !existingLead.name) updates.name = name
      if (email && !existingLead.email) updates.email = email
      if (phone && !existingLead.phone) updates.phone = phone

      const { data: updatedLead, error: updateError } = await supabaseAdmin
        .from('leads')
        .update(updates)
        .eq('id', existingLead.id)
        .eq('user_id', user.id)
        .eq('assistant_id', assistant_id)
        .select(LEAD_FIELDS)
        .single()

      if (updateError) throw updateError
      return NextResponse.json({ success: true, lead: updatedLead, isNew: false })
    }

    const { data: newLead, error } = await supabaseAdmin
      .from('leads')
      .insert({
        user_id: user.id,
        assistant_id,
        conversation_id,
        source: source || 'webchat',
        name,
        email,
        phone,
        notes,
        status: 'new',
      })
      .select(LEAD_FIELDS)
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, lead: newLead, isNew: true })
  } catch (error: unknown) {
    console.error('[POST /api/leads/convert] Error:', error instanceof Error ? error.message : 'Unknown error')
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
