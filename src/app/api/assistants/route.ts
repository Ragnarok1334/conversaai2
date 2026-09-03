import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { canUseChannel, PlanKey, normalizePlan, getPlanLimits } from '@/lib/plans'
import { getEffectiveSubscriptionStatus } from '@/lib/billing/subscription-status'
import { logAuditEvent } from '@/lib/audit'
import { revalidatePath } from 'next/cache'

export const dynamic = 'force-dynamic'

const MAX_NAME_LENGTH = 120
const MAX_BUSINESS_NAME_LENGTH = 160
const MAX_INSTRUCTIONS_LENGTH = 20000
const MAX_MESSAGE_LENGTH = 2000
const MAX_BUSINESS_TYPE_LENGTH = 100
const MAX_KNOWLEDGE_BLOCKS = 50
const MAX_KNOWLEDGE_TITLE_LENGTH = 200
const MAX_KNOWLEDGE_CONTENT_LENGTH = 10000
const MAX_KNOWLEDGE_TOTAL_LENGTH = 100000
const MAX_GOAL_LENGTH = 500
const MAX_RULES_LENGTH = 10000
const VALID_TONES = ['amigable', 'profesional', 'vendedor', 'cercano', 'directo'] as const

function stringField(value: unknown, max: number): string | null {
  if (value === undefined || value === null) return null
  if (typeof value !== 'string') return null
  const valueTrimmed = value.trim()
  if (valueTrimmed.length > max) return null
  return valueTrimmed
}

function firstString(values: unknown[], max: number, fallback = ''): string {
  for (const value of values) {
    const parsed = stringField(value, max)
    if (parsed !== null && parsed.length > 0) return parsed
  }
  return fallback
}

function jsonLength(value: unknown): number {
  try { return JSON.stringify(value)?.length ?? 0 } catch { return Number.MAX_SAFE_INTEGER }
}

// GET /api/assistants — list user's assistants
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    // Never expose the entire row: assistants may gain secrets/configuration fields over time.
    const { data: assistants, error } = await supabase
      .from('assistants')
      .select(`
        id, user_id, assistant_name, business_name, business_type, channel, tone,
        main_goal, instructions, faqs, services, schedule, fallback_message,
        language, status, behavior, welcome_message, business_info, business_hours,
        knowledge_blocks, created_at, updated_at,
        assistant_domains ( verification_status )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (error) throw error

    const [{ data: convData, error: convError }, { data: leadsData, error: leadsError }] = await Promise.all([
      supabase.from('conversations').select('assistant_id, created_at').eq('user_id', user.id),
      supabase.from('leads').select('assistant_id, created_at').eq('user_id', user.id),
    ])
    if (convError) throw convError
    if (leadsError) throw leadsError

    const { calculateAssistantHealth } = await import('@/lib/assistant/assistant-health')
    const enrichedAssistants = assistants?.map((assistant) => {
      const convs = convData?.filter(c => c.assistant_id === assistant.id) || []
      const leads = leadsData?.filter(l => l.assistant_id === assistant.id) || []
      const conversationsCount = convs.length
      const leadsCount = leads.length
      const lastConvAt = convs.length ? Math.max(...convs.map(c => new Date(c.created_at).getTime())) : 0
      const lastLeadAt = leads.length ? Math.max(...leads.map(l => new Date(l.created_at).getTime())) : 0
      const lastActivityAt = Math.max(new Date(assistant.created_at).getTime(), lastConvAt, lastLeadAt)
      const health = calculateAssistantHealth(assistant, assistant.assistant_domains || [], { conversations: conversationsCount, leads: leadsCount })
      return { ...assistant, conversationsCount, leadsCount, lastActivityAt: new Date(lastActivityAt).toISOString(), health }
    })
    return NextResponse.json({ assistants: enrichedAssistants })
  } catch (error) {
    console.error('[GET /api/assistants]', error)
    return NextResponse.json({ error: 'Error al obtener asistentes' }, { status: 500 })
  }
}

// POST /api/assistants — create a new assistant
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Debes iniciar sesión para crear un asistente.' }, { status: 401 })

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ success: false, error: 'El cuerpo de la solicitud no es JSON válido.' }, { status: 400 })
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ success: false, error: 'El cuerpo de la solicitud no es válido.' }, { status: 400 })
    }
    if (jsonLength(body) > 150000) {
      return NextResponse.json({ success: false, error: 'La solicitud es demasiado grande.' }, { status: 413 })
    }

    const behavior = body.behavior
    if (behavior !== undefined && (typeof behavior !== 'object' || behavior === null || Array.isArray(behavior))) {
      return NextResponse.json({ success: false, error: 'El campo behavior no es válido.' }, { status: 400 })
    }
    const behaviorObj = (behavior ?? {}) as Record<string, unknown>

    const name = firstString([body.assistant_name, body.name], MAX_NAME_LENGTH)
    const businessName = firstString([body.business_name, body.businessName], MAX_BUSINESS_NAME_LENGTH)
    const businessInfo = firstString([body.instructions, body.business_info, body.businessInfo], MAX_INSTRUCTIONS_LENGTH)
    const businessType = firstString([body.business_type, body.businessType], MAX_BUSINESS_TYPE_LENGTH) || null
    const channel = firstString([behaviorObj.initialChannel, body.channel], 50, 'webchat')
    const tone = firstString([behaviorObj.tone, body.tone], 50, 'profesional')
    const mainGoal = firstString([behaviorObj.goal, body.main_goal], MAX_GOAL_LENGTH) || null
    const salesLevel = stringField(behaviorObj.salesLevel, 100)
    const responseStyle = stringField(behaviorObj.responseStyle, 100)
    const rules = stringField(behaviorObj.rules, MAX_RULES_LENGTH)
    const language = 'es'

    if (!name) return NextResponse.json({ success: false, error: 'El nombre del asistente es obligatorio.' }, { status: 400 })
    if (!VALID_TONES.includes(tone as typeof VALID_TONES[number])) return NextResponse.json({ success: false, error: 'El tono seleccionado no es válido.' }, { status: 400 })
    if (!['webchat', 'telegram', 'whatsapp'].includes(channel)) return NextResponse.json({ success: false, error: 'El canal seleccionado no es válido.' }, { status: 400 })

    const faqs = body.faqs ?? null
    const services = body.services ?? null
    const schedule = body.schedule ?? body.business_hours ?? body.businessHours ?? null
    const fallbackMessage = firstString([body.fallback_message, body.fallbackMessage], MAX_MESSAGE_LENGTH) || null
    const welcomeMessage = firstString([body.welcome_message, body.welcomeMessage], MAX_MESSAGE_LENGTH) || null

    if (faqs !== null && jsonLength(faqs) > 30000) return NextResponse.json({ success: false, error: 'Las preguntas frecuentes son demasiado grandes.' }, { status: 400 })
    if (services !== null && jsonLength(services) > 30000) return NextResponse.json({ success: false, error: 'Los servicios son demasiado grandes.' }, { status: 400 })
    if (schedule !== null && jsonLength(schedule) > 20000) return NextResponse.json({ success: false, error: 'El horario es demasiado grande.' }, { status: 400 })

    const rawBlocks = body.knowledge_blocks ?? body.knowledgeBlocks
    let finalKnowledgeBlocks: Array<{ id: string; type: string; title: string; content: string; is_active: boolean; sort_order: number }> | null = null
    if (rawBlocks !== undefined && rawBlocks !== null) {
      if (!Array.isArray(rawBlocks) || rawBlocks.length > MAX_KNOWLEDGE_BLOCKS) {
        return NextResponse.json({ success: false, error: `La base de conocimiento admite como máximo ${MAX_KNOWLEDGE_BLOCKS} bloques.` }, { status: 400 })
      }
      let totalLength = 0
      const blocks = []
      for (const block of rawBlocks) {
        if (!block || typeof block !== 'object' || Array.isArray(block)) continue
        const b = block as Record<string, unknown>
        if (b.is_active === false || b.enabled === false) continue
        const content = stringField(b.content, MAX_KNOWLEDGE_CONTENT_LENGTH)
        if (!content) continue
        const title = firstString([b.title], MAX_KNOWLEDGE_TITLE_LENGTH, 'Información')
        const type = firstString([b.type], 50, 'general')
        const sortOrder = typeof b.sort_order === 'number' && Number.isInteger(b.sort_order) && b.sort_order >= 0 && b.sort_order <= MAX_KNOWLEDGE_BLOCKS ? b.sort_order : 0
        totalLength += content.length + title.length + type.length
        if (totalLength > MAX_KNOWLEDGE_TOTAL_LENGTH) return NextResponse.json({ success: false, error: 'La base de conocimiento es demasiado grande.' }, { status: 400 })
        blocks.push({ id: typeof b.id === 'string' && b.id.length <= 100 ? b.id : crypto.randomUUID(), type, title, content, is_active: true, sort_order: sortOrder })
      }
      if (blocks.length) finalKnowledgeBlocks = blocks
    }

    if (businessInfo.length < 80 && !finalKnowledgeBlocks) return NextResponse.json({ success: false, error: 'Agrega información mínima del negocio para entrenar el asistente.' }, { status: 400 })

    const supabaseAdmin = createSupabaseAdmin()
    const [subRes, profileRes] = await Promise.all([
      supabaseAdmin.from('subscriptions').select('plan, assistants_limit, status, current_period_end, grace_ends_at, cancel_at_period_end').eq('user_id', user.id).single(),
      supabaseAdmin.from('profiles').select('trial_used, trial_ends_at').eq('id', user.id).single()
    ])
    const sub = subRes.data
    const profile = profileRes.data
    const effectiveStatus = getEffectiveSubscriptionStatus(sub, profile)
    if (effectiveStatus === 'free' || effectiveStatus === 'expired' || effectiveStatus === 'cancelled') {
      return NextResponse.json({ success: false, error: 'No tienes un plan activo. Renueva tu plan o activa tu prueba gratis para crear asistentes.', code: 'PLAN_NOT_ACTIVE' }, { status: 403 })
    }

    const rawPlan = sub ? sub.plan : 'free'
    const planKey = normalizePlan(rawPlan) as PlanKey
    const planLimits = getPlanLimits(planKey)
    const assistantsLimit = planLimits.assistants
    if (!canUseChannel(planKey, channel)) return NextResponse.json({ success: false, error: `Tu plan actual (${planKey}) no permite el canal: ${channel}. Actualiza tu plan para desbloquearlo.`, code: 'CHANNEL_NOT_ALLOWED', plan: planKey, channel }, { status: 403 })

    const { count, error: countErr } = await supabase.from('assistants').select('id', { count: 'exact', head: true }).eq('user_id', user.id)
    if (countErr) throw countErr
    if (assistantsLimit !== null && (count || 0) >= assistantsLimit) return NextResponse.json({ success: false, error: 'Alcanzaste el límite de asistentes de tu plan actual.', code: 'ASSISTANT_LIMIT_REACHED', limit: assistantsLimit, used: count || 0, plan: planKey }, { status: 403 })

    const behaviorData = { initialChannel: channel, tone, goal: mainGoal, salesLevel, responseStyle, rules }
    const assistantPayload = {
      user_id: user.id,
      assistant_name: name,
      business_name: businessName || name,
      business_type: businessType,
      channel: 'webchat',
      tone,
      main_goal: mainGoal,
      instructions: businessInfo || null,
      faqs,
      services,
      schedule,
      fallback_message: fallbackMessage,
      language,
      status: 'active',
      behavior: behaviorData,
      ...(welcomeMessage ? { welcome_message: welcomeMessage } : {}),
      ...(businessInfo ? { business_info: businessInfo } : {}),
      ...(schedule ? { business_hours: schedule } : {}),
      ...(finalKnowledgeBlocks ? { knowledge_blocks: finalKnowledgeBlocks } : {}),
    }

    let { data: assistant, error: assistantError } = await supabase.from('assistants').insert(assistantPayload).select().single()
    if (assistantError) {
      const isColumnError = assistantError.code === '42703' || assistantError.code === 'PGRST204'
      if (isColumnError) {
        const basePayload = { user_id: user.id, assistant_name: name, business_name: businessName || name, channel: 'webchat', tone, main_goal: mainGoal, instructions: businessInfo || null, language, status: 'active' }
        const fallbackResult = await supabase.from('assistants').insert(basePayload).select().single()
        assistant = fallbackResult.data
        assistantError = fallbackResult.error
      }
    }

    if (assistantError || !assistant) {
      console.error('[api/assistants][POST] Supabase insert error:', { message: assistantError?.message, details: assistantError?.details, hint: assistantError?.hint, code: assistantError?.code })
      if (assistantError?.code === '23514' && assistantError?.message?.includes('assistants_tone_check')) {
        return NextResponse.json({ success: false, error: 'El tono seleccionado no está permitido por la base de datos.' }, { status: 400 })
      }
      return NextResponse.json({ success: false, error: 'No se pudo crear el asistente.', details: process.env.NODE_ENV === 'development' ? assistantError?.message : undefined }, { status: 500 })
    }

    try {
      const channelsPayload = [
        { assistant_id: assistant.id, user_id: user.id, channel: 'webchat', is_enabled: true, config: { status: 'active' } },
        { assistant_id: assistant.id, user_id: user.id, channel: 'telegram', is_enabled: false, config: { status: 'coming_soon' } },
        { assistant_id: assistant.id, user_id: user.id, channel: 'whatsapp', is_enabled: false, config: { status: 'coming_soon' } },
      ]
      const { error: channelsError } = await supabase.from('assistant_channels').insert(channelsPayload)
      if (channelsError) console.error('[POST /api/assistants] channelsError (non-fatal):', channelsError.message)
    } catch (channelsCatchErr) {
      console.error('[POST /api/assistants] channels insert failed (non-fatal):', channelsCatchErr)
    }

    await logAuditEvent({ userId: user.id, action: 'assistant_created', entityType: 'assistant', entityId: assistant.id, description: `Asistente creado: ${assistant.assistant_name}`, req: request })
    try {
      revalidatePath('/dashboard')
      revalidatePath('/dashboard/assistants')
    } catch (e) {
      console.error('[POST /api/assistants] Failed to revalidate paths:', e)
    }
    return NextResponse.json({ success: true, assistant }, { status: 201 })
  } catch (error) {
    const err = error as any
    console.error('[api/assistants][POST] Error creating assistant:', err)
    return NextResponse.json({ success: false, error: 'Error al crear asistente', details: process.env.NODE_ENV === 'development' ? String(err?.message || err) : undefined }, { status: 500 })
  }
}
