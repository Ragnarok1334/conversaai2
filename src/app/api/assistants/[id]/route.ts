import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logAuditEvent, logSecurityEvent } from '@/lib/audit'
import { revalidatePath } from 'next/cache'

const SELECT_FIELDS = `
  id, assistant_name, business_name, business_type, channel, tone,
  main_goal, instructions, faqs, services, schedule, fallback_message,
  language, status, behavior, knowledge_blocks, widget_config,
  allow_all_domains, created_at, updated_at,
  assistant_test_messages(id, assistant_id, user_id, user_message, assistant_reply, created_at),
  assistant_domains(id, domain, verification_status, is_active, is_verified)
`

const MAX_BODY_BYTES = 256 * 1024
const MAX_BLOCKS = 50
const MAX_KNOWLEDGE_TOTAL = 100_000
const VALID_TONES = ['amigable', 'profesional', 'vendedor', 'cercano', 'directo']
const VALID_STATUS = ['active', 'inactive', 'draft']

function validUuid(id: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
}

function serializedSize(value: unknown) {
  try { return JSON.stringify(value).length } catch { return Infinity }
}

function validateBlocks(value: unknown): string | null {
  if (value !== null && !Array.isArray(value)) return 'knowledge_blocks debe ser un array o null.'
  if (!Array.isArray(value)) return null
  if (value.length > MAX_BLOCKS) return `No puedes guardar más de ${MAX_BLOCKS} bloques.`
  let total = 0
  for (const block of value) {
    if (!block || typeof block !== 'object' || Array.isArray(block)) return 'Formato inválido en bloque de conocimiento.'
    const b = block as Record<string, unknown>
    if (typeof b.type !== 'string' || typeof b.title !== 'string' || typeof b.content !== 'string' || typeof b.is_active !== 'boolean') {
      return 'Formato inválido en bloque de conocimiento.'
    }
    if (b.type.length > 50 || b.title.length > 120 || b.content.length > 5_000) return 'Un bloque de conocimiento excede su límite permitido.'
    total += b.type.length + b.title.length + b.content.length
  }
  return total > MAX_KNOWLEDGE_TOTAL ? 'El contenido total de conocimiento excede el máximo permitido.' : null
}

async function getUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  return { supabase, user, error }
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    if (!validUuid(id)) return NextResponse.json({ error: 'Asistente no encontrado' }, { status: 404 })
    const { supabase, user, error: authError } = await getUser()
    if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const { data, error } = await supabase.from('assistants').select(SELECT_FIELDS).eq('id', id).eq('user_id', user.id).single()
    if (error || !data) return NextResponse.json({ error: 'Asistente no encontrado' }, { status: 404 })
    const [conversations, leads] = await Promise.all([
      supabase.from('conversations').select('created_at').eq('assistant_id', id).eq('user_id', user.id),
      supabase.from('leads').select('created_at').eq('assistant_id', id).eq('user_id', user.id),
    ])
    if (conversations.error || leads.error) return NextResponse.json({ error: 'No se pudo cargar la actividad del asistente' }, { status: 500 })
    const convData = conversations.data || []
    const leadData = leads.data || []
    const timestamps = [data.created_at ? new Date(data.created_at).getTime() : 0, ...convData.map(x => x.created_at ? new Date(x.created_at).getTime() : 0), ...leadData.map(x => x.created_at ? new Date(x.created_at).getTime() : 0)].filter(Number.isFinite)
    const { calculateAssistantHealth } = await import('@/lib/assistant/assistant-health')
    const health = calculateAssistantHealth(data, data.assistant_domains || [], { conversations: convData.length, leads: leadData.length })
    return NextResponse.json({ assistant: { ...data, conversationsCount: convData.length, leadsCount: leadData.length, lastActivityAt: new Date(timestamps.length ? Math.max(...timestamps) : Date.now()).toISOString(), health } })
  } catch (error) {
    console.error('[GET /api/assistants/[id]]', error instanceof Error ? error.message : 'unknown error')
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    if (!validUuid(id)) return NextResponse.json({ error: 'Asistente no encontrado' }, { status: 404 })
    const contentLength = Number(request.headers.get('content-length') || 0)
    if (contentLength > MAX_BODY_BYTES) return NextResponse.json({ error: 'La solicitud es demasiado grande.' }, { status: 413 })
    const { supabase, user, error: authError } = await getUser()
    if (authError || !user) {
      await logSecurityEvent({ eventType: 'unauthorized_api_access', severity: 'warning', message: 'Intento de actualizar asistente sin auth', req: request })
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    let body: unknown
    try { body = await request.json() } catch { return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 }) }
    if (!body || typeof body !== 'object' || Array.isArray(body) || serializedSize(body) > MAX_BODY_BYTES) return NextResponse.json({ error: 'Cuerpo de solicitud inválido o demasiado grande.' }, { status: 400 })
    const input = body as Record<string, unknown>
    const { createSupabaseAdmin } = await import('@/lib/supabase/admin')
    const admin = createSupabaseAdmin()
    const [{ data: sub }, { data: profile }] = await Promise.all([
      admin.from('subscriptions').select('plan').eq('user_id', user.id).single(),
      admin.from('profiles').select('trial_ends_at').eq('id', user.id).single(),
    ])
    const { getEffectiveSubscriptionStatus } = await import('@/lib/billing/subscription-status')
    const effectiveStatus = getEffectiveSubscriptionStatus(sub, profile)
    const { normalizePlan } = await import('@/lib/plans')
    const currentPlan = sub ? normalizePlan(sub.plan) : 'free'
    const aliases: Record<string, string> = { name: 'assistant_name', objective: 'main_goal' }
    for (const [from, to] of Object.entries(aliases)) if (from in input && to in input) return NextResponse.json({ error: `No envíes '${from}' y '${to}' al mismo tiempo.` }, { status: 400 })
    const limits: Record<string, number> = { assistant_name: 100, business_name: 100, business_type: 100, instructions: 2_000, main_goal: 500, fallback_message: 500, faqs: 10_000, services: 10_000, schedule: 5_000, language: 10 }
    const allowed = new Set(['assistant_name', 'business_name', 'business_type', 'instructions', 'behavior', 'channel', 'tone', 'main_goal', 'fallback_message', 'status', 'knowledge_blocks', 'faqs', 'services', 'schedule', 'language', 'widget_config'])
    const updates: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(input)) {
      const target = aliases[key] || key
      if (!allowed.has(target) || value === undefined) continue
      let val: unknown = value
      if (target in limits) {
        if (typeof val !== 'string') return NextResponse.json({ error: `El campo ${target} debe ser texto.` }, { status: 400 })
        const text = val.trim()
        if (text.length > limits[target]) return NextResponse.json({ error: `El campo ${target} excede su límite.` }, { status: 400 })
        val = text
      }
      if (target === 'channel' && val !== 'webchat') return NextResponse.json({ error: 'Solo el canal webchat está disponible actualmente.' }, { status: 400 })
      if (target === 'tone' && (typeof val !== 'string' || !VALID_TONES.includes(val))) return NextResponse.json({ error: 'El tono seleccionado no es válido.' }, { status: 400 })
      if (target === 'status' && (typeof val !== 'string' || !VALID_STATUS.includes(val))) return NextResponse.json({ error: 'El estado seleccionado no es válido.' }, { status: 400 })
      if (target === 'knowledge_blocks') {
        const blockError = validateBlocks(val)
        if (blockError) return NextResponse.json({ error: blockError }, { status: 400 })
      }
      if (target === 'behavior') {
        if (!val || typeof val !== 'object' || Array.isArray(val) || serializedSize(val) > 20_000) return NextResponse.json({ error: 'behavior no es válido o excede 20 KB.' }, { status: 400 })
        const rules = (val as Record<string, unknown>).rules
        if (rules !== undefined) {
          if (!rules || typeof rules !== 'object' || Array.isArray(rules)) return NextResponse.json({ error: 'La estructura de rules no es válida.' }, { status: 400 })
          const allowedRules = ['askName', 'askContact', 'offerPricesWhenAsked', 'suggestAppointment', 'escalateIfUnknown', 'doNotInvent', 'alwaysSpanish']
          for (const [rule, ruleValue] of Object.entries(rules as Record<string, unknown>)) if (!allowedRules.includes(rule) || typeof ruleValue !== 'boolean') return NextResponse.json({ error: `La regla '${rule}' no es válida.` }, { status: 400 })
        }
      }
      if (target === 'widget_config') {
        if (!val || typeof val !== 'object' || Array.isArray(val) || serializedSize(val) > 20_000) return NextResponse.json({ error: 'widget_config no es válido o excede 20 KB.' }, { status: 400 })
        if (['free', 'expired', 'cancelled'].includes(effectiveStatus)) return NextResponse.json({ error: 'Tu plan no permite modificar la apariencia del Web Chat.' }, { status: 403 })
        const { sanitizeWidgetConfigForPlan } = await import('@/lib/widget-config')
        val = sanitizeWidgetConfigForPlan(val, currentPlan)
      }
      updates[target] = val
    }
    if (Object.keys(updates).length === 0) return NextResponse.json({ error: 'No hay campos válidos para actualizar.' }, { status: 400 })
    if (updates.instructions !== undefined || updates.knowledge_blocks !== undefined) {
      const { data: current, error } = await supabase.from('assistants').select('instructions, knowledge_blocks').eq('id', id).eq('user_id', user.id).single()
      if (error || !current) return NextResponse.json({ error: 'Asistente no encontrado' }, { status: 404 })
      const instructions = typeof (updates.instructions ?? current.instructions) === 'string' ? String(updates.instructions ?? current.instructions).trim() : ''
      const blocks = updates.knowledge_blocks ?? current.knowledge_blocks
      const validBlock = Array.isArray(blocks) && blocks.some((b: unknown) => {
        if (!b || typeof b !== 'object' || Array.isArray(b)) return false
        const block = b as Record<string, unknown>
        return block.is_active === true && typeof block.content === 'string' && block.content.trim().length >= 80
      })
      if (instructions.length < 80 && !validBlock) return NextResponse.json({ error: 'Agrega información mínima del negocio para entrenar el asistente.' }, { status: 400 })
    }
    const { data, error } = await supabase.from('assistants').update(updates).eq('id', id).eq('user_id', user.id).select(SELECT_FIELDS).single()
    if (error || !data) {
      if (error?.code === '23514' && error.message?.includes('assistants_tone_check')) return NextResponse.json({ error: 'El tono seleccionado no está permitido por la base de datos.' }, { status: 400 })
      await logSecurityEvent({ userId: user.id, eventType: 'assistant_update_forbidden', severity: 'warning', message: `No se pudo actualizar el asistente ${id}.`, req: request })
      return NextResponse.json({ error: 'No se pudo actualizar' }, { status: 404 })
    }
    await logAuditEvent({ userId: user.id, action: 'assistant_updated', entityType: 'assistant', entityId: id, description: 'Asistente actualizado', metadata: { updates: Object.keys(updates) }, req: request })
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/assistants')
    revalidatePath(`/dashboard/assistants/${id}`)
    return NextResponse.json({ assistant: data })
  } catch (error) {
    console.error('[PATCH /api/assistants/[id]]', error instanceof Error ? error.message : 'unknown error')
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    if (!validUuid(id)) return NextResponse.json({ error: 'Asistente no encontrado' }, { status: 404 })
    const { supabase, user, error: authError } = await getUser()
    if (authError || !user) {
      await logSecurityEvent({ eventType: 'unauthorized_api_access', severity: 'warning', message: 'Intento de eliminar asistente sin auth', req: request })
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const { error } = await supabase.from('assistants').delete().eq('id', id).eq('user_id', user.id)
    if (error) {
      await logSecurityEvent({ userId: user.id, eventType: 'assistant_delete_forbidden', severity: 'warning', message: `No se pudo eliminar el asistente ${id}`, req: request })
      return NextResponse.json({ error: 'No se pudo eliminar' }, { status: 404 })
    }
    await logAuditEvent({ userId: user.id, action: 'assistant_deleted', entityType: 'assistant', entityId: id, description: 'Asistente eliminado', req: request })
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/assistants')
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/assistants/[id]]', error instanceof Error ? error.message : 'unknown error')
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}