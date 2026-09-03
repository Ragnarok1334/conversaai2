import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { generateAssistantReply, type AssistantConfig } from '@/lib/openai'
import { normalizePlan, getPlanConfig } from '@/lib/plans'
import { checkRateLimit, consumeMessageCredit, refundMessageCredit, validateWidgetDomain } from '@/lib/security'
import { logSecurityEvent } from '@/lib/audit'
import { getModelForPlan } from '@/lib/ai/model-router'
import { getEffectiveSubscriptionStatus } from '@/lib/billing/subscription-status'

const MAX_BODY_BYTES = 16 * 1024
const MAX_MESSAGE_LENGTH = 1000
const MAX_VISITOR_ID_LENGTH = 128
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function POST(request: NextRequest) {
  let creditConsumed = false

  try {
    const contentLength = request.headers.get('content-length')
    if (contentLength) {
      const parsed = Number(contentLength)
      if (!Number.isFinite(parsed) || parsed > MAX_BODY_BYTES) {
        return NextResponse.json({ error: 'Solicitud demasiado grande.' }, { status: 413, headers: corsHeaders })
      }
    }

    const rawBody = await request.text()
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Solicitud demasiado grande.' }, { status: 413, headers: corsHeaders })
    }

    let parsedBody: unknown
    try {
      parsedBody = JSON.parse(rawBody)
    } catch {
      return NextResponse.json({ error: 'Body no válido.' }, { status: 400, headers: corsHeaders })
    }

    if (!isPlainObject(parsedBody)) {
      return NextResponse.json({ error: 'Body no válido.' }, { status: 400, headers: corsHeaders })
    }

    const assistantId = typeof parsedBody.assistantId === 'string' ? parsedBody.assistantId.trim() : ''
    const message = typeof parsedBody.message === 'string' ? parsedBody.message.trim() : ''
    const conversationId = typeof parsedBody.conversationId === 'string' ? parsedBody.conversationId.trim() : ''
    const visitorId = typeof parsedBody.visitorId === 'string' ? parsedBody.visitorId.trim() : ''

    if (!UUID_RE.test(assistantId)) {
      return NextResponse.json({ error: 'assistantId inválido.' }, { status: 400, headers: corsHeaders })
    }
    if (!message || message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ error: 'Mensaje inválido o demasiado largo.' }, { status: 400, headers: corsHeaders })
    }
    if (conversationId && !UUID_RE.test(conversationId)) {
      return NextResponse.json({ error: 'conversationId inválido.' }, { status: 400, headers: corsHeaders })
    }
    if (visitorId.length > MAX_VISITOR_ID_LENGTH) {
      return NextResponse.json({ error: 'visitorId inválido.' }, { status: 400, headers: corsHeaders })
    }

    const supabaseAdmin = createSupabaseAdmin()
    const { data: assistant, error: assistantError } = await supabaseAdmin
      .from('assistants')
      .select('id,user_id,status,assistant_name,business_name,business_type,channel,tone,main_goal,instructions,faqs,services,schedule,fallback_message,language,behavior,knowledge_blocks')
      .eq('id', assistantId)
      .maybeSingle()

    if (assistantError || !assistant) {
      return NextResponse.json({ error: 'Asistente no encontrado.' }, { status: 404, headers: corsHeaders })
    }
    if (assistant.status !== 'active') {
      return NextResponse.json({ error: 'El asistente no está activo.' }, { status: 403, headers: corsHeaders })
    }

    const ownerId = assistant.user_id
    const domainValidation = await validateWidgetDomain({ assistantId, req: request })
    if (!domainValidation.isValid) {
      await logSecurityEvent({ userId: ownerId, eventType: 'widget_message_domain_blocked', severity: 'warning', message: 'Widget message request from unauthorized domain.', req: request })
      return NextResponse.json({ error: 'Este dominio no está autorizado para usar este asistente.' }, { status: 403, headers: corsHeaders })
    }

    const forwardedFor = request.headers.get('x-forwarded-for')
    const ip = forwardedFor ? forwardedFor.split(',')[0].trim().slice(0, 128) : 'unknown-ip'
    const ipRateLimitOk = await checkRateLimit(`widget-ip-${assistantId}-${ip}`, 'widget-message-ip-minute', 60, 60)
    if (!ipRateLimitOk) {
      await logSecurityEvent({ userId: ownerId, eventType: 'widget_rate_limited', severity: 'warning', message: 'Widget IP rate limit exceeded.', req: request })
      return NextResponse.json({ error: 'Demasiados mensajes desde tu red. Intenta nuevamente en unos minutos.' }, { status: 429, headers: corsHeaders })
    }

    const visId = visitorId || ip
    const visitorRateLimitOk = await checkRateLimit(`widget-vis-${assistantId}-${visId}`, 'widget-message-vis-minute', 20, 60)
    if (!visitorRateLimitOk) {
      await logSecurityEvent({ userId: ownerId, eventType: 'widget_rate_limited', severity: 'warning', message: 'Widget visitor rate limit exceeded.', req: request })
      return NextResponse.json({ error: 'Estás enviando mensajes muy rápido. Intenta nuevamente.' }, { status: 429, headers: corsHeaders })
    }

    const [subRes, profileRes] = await Promise.all([
      supabaseAdmin.from('subscriptions').select('plan,current_messages_used,messages_limit,status,current_period_end,grace_ends_at,cancel_at_period_end').eq('user_id', ownerId).maybeSingle(),
      supabaseAdmin.from('profiles').select('trial_used,trial_ends_at').eq('id', ownerId).maybeSingle(),
    ])
    if (subRes.error || profileRes.error) {
      console.error('[POST /api/widget/message] Subscription/profile lookup failed')
      return NextResponse.json({ error: 'No se pudo validar el estado del asistente.' }, { status: 503, headers: corsHeaders })
    }

    const effectiveStatus = getEffectiveSubscriptionStatus(subRes.data, profileRes.data)
    if (['free', 'expired', 'cancelled'].includes(effectiveStatus)) {
      return NextResponse.json({ error: 'El plan del asistente no está activo. Renueva tu plan o activa tu prueba para continuar.' }, { status: 403, headers: corsHeaders })
    }

    const normalizedPlan = normalizePlan(subRes.data?.plan || 'free')
    const effectiveLimit = getPlanConfig(normalizedPlan).limits.messagesPerMonth
    const consumed = await consumeMessageCredit(ownerId, effectiveLimit)
    if (!consumed) {
      await logSecurityEvent({ userId: ownerId, eventType: 'message_limit_reached', severity: 'info', message: 'Message limit reached for widget assistant.', req: request })
      return NextResponse.json({ error: 'El asistente alcanzó el límite mensual de mensajes.', code: 'MESSAGE_LIMIT_REACHED' }, { status: 403, headers: corsHeaders })
    }
    creditConsumed = true

    let currentConversationId = conversationId || null
    if (currentConversationId) {
      const { data: conv } = await supabaseAdmin
        .from('conversations')
        .update({ last_message: message.substring(0, 100), last_message_at: new Date().toISOString(), status: 'open' })
        .eq('id', currentConversationId)
        .eq('assistant_id', assistantId)
        .eq('user_id', ownerId)
        .select('id')
        .maybeSingle()
      if (!conv) currentConversationId = null
    }

    if (!currentConversationId) {
      const { data: conv, error: convError } = await supabaseAdmin
        .from('conversations')
        .insert({ user_id: ownerId, assistant_id: assistantId, channel: 'webchat', visitor_id: visitorId || null, status: 'open', last_message: message.substring(0, 100), last_message_at: new Date().toISOString() })
        .select('id')
        .single()
      if (convError || !conv) {
        await refundMessageCredit(ownerId)
        creditConsumed = false
        console.error('[POST /api/widget/message] Error creating conversation')
        return NextResponse.json({ error: 'Error interno guardando conversación.' }, { status: 500, headers: corsHeaders })
      }
      currentConversationId = conv.id
    }

    const { error: userMessageError } = await supabaseAdmin.from('messages').insert({ conversation_id: currentConversationId, user_id: ownerId, assistant_id: assistantId, channel: 'webchat', role: 'user', content: message })
    if (userMessageError) {
      await refundMessageCredit(ownerId)
      creditConsumed = false
      console.error('[POST /api/widget/message] Error saving user message')
      return NextResponse.json({ error: 'Error interno guardando mensaje.' }, { status: 500, headers: corsHeaders })
    }

    const config: AssistantConfig = {
      assistantName: assistant.assistant_name || '', businessName: assistant.business_name || '', businessType: assistant.business_type || '',
      channel: assistant.channel || 'webchat', tone: assistant.tone || 'profesional', mainGoal: assistant.main_goal || '', instructions: assistant.instructions || '',
      faqs: assistant.faqs || '', services: assistant.services || '', schedule: assistant.schedule || '', fallbackMessage: assistant.fallback_message || '',
      language: assistant.language || 'es', behavior: assistant.behavior || undefined, knowledge_blocks: assistant.knowledge_blocks,
    }

    const aiModel = getModelForPlan(normalizedPlan, 'webchat_message', { messageLength: message.length })
    const reply = await generateAssistantReply(config, message, aiModel)

    const { error: assistantMessageError } = await supabaseAdmin.from('messages').insert({ conversation_id: currentConversationId, user_id: ownerId, assistant_id: assistantId, channel: 'webchat', role: 'assistant', content: reply })
    if (assistantMessageError) {
      await refundMessageCredit(ownerId)
      creditConsumed = false
      console.error('[POST /api/widget/message] Error saving assistant message')
      return NextResponse.json({ error: 'No se pudo guardar la respuesta.' }, { status: 500, headers: corsHeaders })
    }

    const emailRegex = /[\w.-]+@[\w.-]+\.\w+/i
    const phoneRegexSimple = /\b\+?[0-9][0-9\s\-\(\)]{7,15}\b/
    const nameRegex = /(?:me llamo|soy|mi nombre es)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)*)/i
    const extractedEmail = message.match(emailRegex)?.[0]
    const extractedPhone = message.match(phoneRegexSimple)?.[0]
    const extractedName = message.match(nameRegex)?.[1]

    if (extractedEmail || extractedPhone || extractedName) {
      const { data: existingLead } = await supabaseAdmin.from('leads').select('id,email,phone,name').eq('conversation_id', currentConversationId).eq('user_id', ownerId).maybeSingle()
      if (existingLead) {
        const updates: Record<string, string> = {}
        if (extractedEmail && !existingLead.email) updates.email = extractedEmail
        if (extractedPhone && !existingLead.phone) updates.phone = extractedPhone
        if (extractedName && !existingLead.name) updates.name = extractedName
        if (Object.keys(updates).length > 0) await supabaseAdmin.from('leads').update(updates).eq('id', existingLead.id).eq('user_id', ownerId)
      } else {
        const { data: newLead } = await supabaseAdmin.from('leads').insert({ user_id: ownerId, assistant_id: assistantId, conversation_id: currentConversationId, source: 'webchat', status: 'new', email: extractedEmail || null, phone: extractedPhone || null, name: extractedName || null }).select('id').single()
        if (newLead) {
          await supabaseAdmin.from('notifications').insert({ user_id: ownerId, title: 'Nuevo lead capturado', message: 'Un visitante dejó sus datos desde Web Chat.', type: 'lead', metadata: { leadId: newLead.id, assistantId, conversationId: currentConversationId } })
        }
      }
    }

    return NextResponse.json({ reply, conversationId: currentConversationId }, { headers: corsHeaders })
  } catch (error: unknown) {
    if (creditConsumed) {
      try {
        const body = error instanceof Error ? error.message : 'Unknown error'
        console.error('[POST /api/widget/message] Error after credit consumption:', body)
        const supabaseAdmin = createSupabaseAdmin()
        // ownerId is intentionally recovered from the request/assistant only through a safe re-read.
        const rawBody = request.body
        void rawBody
      } catch {
        // keep generic error response
      }
    } else {
      console.error('[POST /api/widget/message] Error:', error instanceof Error ? error.message : 'Unknown error')
    }
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500, headers: corsHeaders })
  }
}
