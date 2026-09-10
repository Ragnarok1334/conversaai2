import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { canUseChannel, PlanKey, normalizePlan, getPlanLimits } from '@/lib/plans'
import { getEffectiveSubscriptionStatus } from '@/lib/billing/subscription-status'
import { logAuditEvent } from '@/lib/audit'
import { revalidatePath } from 'next/cache'
import { HttpInputError, readJsonBody } from '@/lib/http-security'
import { ASSISTANT_LANGUAGES, DEFAULT_BEHAVIOR, validateBehavior } from '@/lib/assistant/behavior'
import { MAX_KNOWLEDGE_BLOCK_CHARS, MAX_KNOWLEDGE_TOTAL_CHARS, MIN_KNOWLEDGE_CHARS, getKnowledgeTotalLength } from '@/lib/assistant/knowledge-limits'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const assistantsClient = process.env.SUPABASE_SERVICE_ROLE_KEY ? createSupabaseAdmin() : supabase
    const { data: assistants, error } = await assistantsClient.from('assistants').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    if (error) throw error

    const [conversationsResult, leadsResult, domainsResult] = await Promise.all([
      assistantsClient.from('conversations').select('assistant_id, created_at').eq('user_id', user.id),
      assistantsClient.from('leads').select('assistant_id, created_at').eq('user_id', user.id),
      assistantsClient.from('assistant_domains').select('*').eq('user_id', user.id),
    ])
    const convData = conversationsResult.error ? [] : (conversationsResult.data ?? [])
    const leadsData = leadsResult.error ? [] : (leadsResult.data ?? [])
    const domainsData = domainsResult.error ? [] : (domainsResult.data ?? [])
    const { calculateAssistantHealth } = await import('@/lib/assistant/assistant-health')

    const enrichedAssistants = assistants?.map(assistant => {
      const convs = convData.filter(c => c.assistant_id === assistant.id)
      const leads = leadsData.filter(l => l.assistant_id === assistant.id)
      const domains = domainsData.filter(domain => domain.assistant_id === assistant.id)
      const lastConvAt = convs.length > 0 ? Math.max(...convs.map(c => new Date(c.created_at).getTime())) : 0
      const lastLeadAt = leads.length > 0 ? Math.max(...leads.map(l => new Date(l.created_at).getTime())) : 0
      const lastActivityAt = Math.max(new Date(assistant.created_at).getTime(), lastConvAt, lastLeadAt)
      return {
        ...assistant,
        conversationsCount: convs.length,
        leadsCount: leads.length,
        lastActivityAt: new Date(lastActivityAt).toISOString(),
        assistant_domains: domains,
        health: calculateAssistantHealth(assistant, domains, { conversations: convs.length, leads: leads.length })
      }
    })
    return NextResponse.json({ assistants: enrichedAssistants })
  } catch (error) {
    console.error('[GET /api/assistants]', error)
    return NextResponse.json({ error: 'Error al obtener asistentes' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ success: false, error: 'Debes iniciar sesión para crear un asistente.' }, { status: 401 })

    const body = await readJsonBody<Record<string, any>>(request, 128_000)
    const name = body.assistant_name || body.name || ''
    const businessName = body.business_name || body.businessName || ''
    const businessInfo = body.instructions || body.business_info || body.businessInfo || ''
    const requestedLanguage = body.language ?? 'es'
    if (!ASSISTANT_LANGUAGES.includes(requestedLanguage)) {
      return NextResponse.json({ success: false, error: 'El idioma seleccionado no es válido.' }, { status: 400 })
    }
    const language = requestedLanguage
    const behaviorInput = body.behavior ?? {}
    if (!behaviorInput || typeof behaviorInput !== 'object' || Array.isArray(behaviorInput)) {
      return NextResponse.json({ success: false, error: 'El campo behavior debe ser un objeto válido.' }, { status: 400 })
    }
    const behaviorCandidate = {
      ...behaviorInput,
      initialChannel: behaviorInput.initialChannel ?? body.channel ?? DEFAULT_BEHAVIOR.initialChannel,
      tone: behaviorInput.tone ?? body.tone ?? DEFAULT_BEHAVIOR.tone,
      goal: behaviorInput.goal ?? body.main_goal ?? DEFAULT_BEHAVIOR.goal,
    }
    const behaviorResult = validateBehavior(behaviorCandidate)
    if (!behaviorResult.success) {
      return NextResponse.json({ success: false, error: behaviorResult.error }, { status: 400 })
    }
    const behavior = behaviorResult.data
    const channel = behavior.initialChannel
    const tone = behavior.tone
    const mainGoal = behavior.goal
    if (!name.trim()) return NextResponse.json({ success: false, error: 'El nombre del asistente es obligatorio.' }, { status: 400 })

    const rawBlocks = body.knowledge_blocks || body.knowledgeBlocks
    let finalKnowledgeBlocks = null
    if (rawBlocks && Array.isArray(rawBlocks)) {
      const validBlocks = rawBlocks
        .filter((b: any) => b && typeof b === 'object' && b.is_active !== false && b.enabled !== false && typeof b.content === 'string' && b.content.trim().length > 0)
        .map((b: any) => ({ id: b.id || crypto.randomUUID(), type: b.type || 'general', title: b.title || 'Información', content: b.content, is_active: true, sort_order: b.sort_order || 0 }))
      if (validBlocks.length > 0) finalKnowledgeBlocks = validBlocks
    }

    if (finalKnowledgeBlocks?.some((block: { content: string }) => block.content.length > MAX_KNOWLEDGE_BLOCK_CHARS)) {
      return NextResponse.json({ success: false, error: `Cada bloque puede contener hasta ${MAX_KNOWLEDGE_BLOCK_CHARS} caracteres.` }, { status: 400 })
    }
    if (getKnowledgeTotalLength(finalKnowledgeBlocks) > MAX_KNOWLEDGE_TOTAL_CHARS) {
      return NextResponse.json({ success: false, error: `El entrenamiento completo puede contener hasta ${MAX_KNOWLEDGE_TOTAL_CHARS} caracteres.` }, { status: 400 })
    }

    const hasValidKnowledgeBlock = finalKnowledgeBlocks?.some((block: { content: string }) => block.content.trim().length >= MIN_KNOWLEDGE_CHARS) ?? false
    if (businessInfo.trim().length < MIN_KNOWLEDGE_CHARS && !hasValidKnowledgeBlock) {
      return NextResponse.json({ success: false, error: 'Agrega información mínima del negocio para entrenar el asistente.' }, { status: 400 })
    }

    const channels = body.channels ?? {}
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
    if (!canUseChannel(planKey, channel)) {
      return NextResponse.json({ success: false, error: `Tu plan actual (${planKey}) no permite el canal: ${channel}. Actualiza tu plan para desbloquearlo.`, code: 'CHANNEL_NOT_ALLOWED', plan: planKey, channel }, { status: 403 })
    }

    const { count, error: countErr } = await supabase.from('assistants').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
    if (countErr) throw countErr
    if (assistantsLimit !== null && (count || 0) >= assistantsLimit) {
      return NextResponse.json({ success: false, error: 'Alcanzaste el límite de asistentes de tu plan actual.', code: 'ASSISTANT_LIMIT_REACHED', limit: assistantsLimit, used: count || 0, plan: planKey }, { status: 403 })
    }

    const assistantPayload = {
      user_id: user.id,
      assistant_name: name,
      business_name: businessName || name,
      business_type: body.business_type || body.businessType || null,
      channel,
      tone,
      main_goal: mainGoal,
      instructions: businessInfo || null,
      faqs: body.faqs || null,
      services: body.services || null,
      schedule: body.schedule || body.business_hours || body.businessHours || null,
      fallback_message: body.fallback_message || body.fallbackMessage || null,
      language,
      status: 'active',
      behavior,
      ...(body.welcome_message || body.welcomeMessage ? { welcome_message: body.welcome_message || body.welcomeMessage } : {}),
      ...(businessInfo ? { business_info: businessInfo } : {}),
      ...((body.schedule || body.business_hours || body.businessHours) ? { business_hours: body.schedule || body.business_hours || body.businessHours } : {}),
      ...(finalKnowledgeBlocks ? { knowledge_blocks: finalKnowledgeBlocks } : {}),
    }

    const { data: assistant, error: assistantError } = await supabase.from('assistants').insert(assistantPayload).select().single()
    if (assistantError || !assistant) {
      console.error('[api/assistants][POST] Supabase insert error:', assistantError)
      return NextResponse.json({ success: false, error: 'No se pudo crear el asistente. La configuración de comportamiento no pudo guardarse.', details: process.env.NODE_ENV === 'development' ? assistantError?.message : undefined }, { status: 500 })
    }

    try {
      const channelsPayload = [
        { assistant_id: assistant.id, user_id: user.id, channel: 'webchat', is_enabled: channels.webchat?.enabled !== false, config: { status: 'active' } },
        { assistant_id: assistant.id, user_id: user.id, channel: 'telegram', is_enabled: channels.telegram?.enabled === true && channel === 'telegram', config: { status: channels.telegram?.enabled === true && channel === 'telegram' ? 'active' : 'inactive' } },
        { assistant_id: assistant.id, user_id: user.id, channel: 'whatsapp', is_enabled: channels.whatsapp?.enabled === true && channel === 'whatsapp', config: { status: channels.whatsapp?.enabled === true && channel === 'whatsapp' ? 'active' : 'inactive', provider: 'meta' } },
        { assistant_id: assistant.id, user_id: user.id, channel: 'instagram', is_enabled: channels.instagram?.enabled === true && channel === 'instagram', config: { status: channels.instagram?.enabled === true && channel === 'instagram' ? 'active' : 'inactive', provider: 'meta' } },
        { assistant_id: assistant.id, user_id: user.id, channel: 'facebook', is_enabled: channels.facebook?.enabled === true && channel === 'facebook', config: { status: channels.facebook?.enabled === true && channel === 'facebook' ? 'active' : 'inactive', provider: 'meta' } },
      ]
      const { error: channelsError } = await supabase.from('assistant_channels').insert(channelsPayload)
      if (channelsError) console.error('[POST /api/assistants] channelsError:', channelsError.message)
    } catch (channelsCatchErr) {
      console.error('[POST /api/assistants] channels insert failed:', channelsCatchErr)
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
    if (error instanceof HttpInputError) return NextResponse.json({ success: false, error: error.message }, { status: error.status })
    console.error('[api/assistants][POST] Error creating assistant:', error)
    return NextResponse.json({ success: false, error: 'Error al crear asistente', details: process.env.NODE_ENV === 'development' ? String((error as any)?.message || error) : undefined }, { status: 500 })
  }
}
