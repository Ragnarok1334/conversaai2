import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { generateAssistantReply, type AssistantConfig } from '@/lib/openai'
import { normalizePlan, getPlanConfig } from '@/lib/plans'
import { checkRateLimit, consumeMessageCredit, validateWidgetDomain } from '@/lib/security'
import { logSecurityEvent } from '@/lib/audit'
import { getModelForPlan } from '@/lib/ai/model-router'
import { getEffectiveSubscriptionStatus } from '@/lib/billing/subscription-status'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const VISITOR_ID_RE = /^[A-Za-z0-9_-]{16,128}$/
const MAX_CONTENT_LENGTH = 16 * 1024

function isValidUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value)
}

function isValidVisitorId(value: unknown): value is string {
  return typeof value === 'string' && VISITOR_ID_RE.test(value)
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function POST(request: NextRequest) {
  try {
    const contentLength = request.headers.get('content-length')
    if (contentLength) {
      const parsedLength = Number(contentLength)
      if (!Number.isFinite(parsedLength) || parsedLength > MAX_CONTENT_LENGTH) {
        return NextResponse.json({ error: 'Solicitud demasiado grande.' }, { status: 413, headers: corsHeaders })
      }
    }

    const body = await request.json()
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Body inválido.' }, { status: 400, headers: corsHeaders })
    }

    const { assistantId, message, conversationId, visitorId } = body as {
      assistantId?: unknown
      message?: unknown
      conversationId?: unknown
      visitorId?: unknown
    }

    if (!isValidUuid(assistantId)) {
      return NextResponse.json({ error: 'assistantId inválido.' }, { status: 400, headers: corsHeaders })
    }

    if (!isValidVisitorId(visitorId)) {
      return NextResponse.json({ error: 'visitorId inválido.' }, { status: 400, headers: corsHeaders })
    }

    if (conversationId !== undefined && conversationId !== null && !isValidUuid(conversationId)) {
      return NextResponse.json({ error: 'conversationId inválido.' }, { status: 400, headers: corsHeaders })
    }

    if (typeof message !== 'string' || message.trim().length === 0 || message.length > 1000) {
      return NextResponse.json({ error: 'Mensaje inválido o demasiado largo.' }, { status: 400, headers: corsHeaders })
    }

    const supabaseAdmin = createSupabaseAdmin()

    // 1. Fetch assistant and check status. Owner is always derived server-side.
    const { data: assistant, error: assistantError } = await supabaseAdmin
      .from('assistants')
      .select('id, user_id, status, assistant_name, business_name, business_type, channel, tone, main_goal, instructions, faqs, services, schedule, fallback_message, language, behavior, knowledge_blocks')
      .eq('id', assistantId)
      .single()

    if (assistantError || !assistant) {
      return NextResponse.json({ error: 'Asistente no encontrado.' }, { status: 404, headers: corsHeaders })
    }

    if (assistant.status !== 'active') {
      return NextResponse.json({ error: 'El asistente no está activo.' }, { status: 403, headers: corsHeaders })
    }

    const ownerId = assistant.user_id

    // 2. Validate Domain
    const domainValidation = await validateWidgetDomain({ assistantId, req: request })
    if (!domainValidation.isValid) {
      await logSecurityEvent({
        userId: ownerId,
        eventType: 'widget_message_domain_blocked',
        severity: 'warning',
        message: `Widget message domain block (${domainValidation.normalizedDomain || 'no-origin'}) for assistant ${assistantId}`,
        req: request,
      })
      return NextResponse.json({ error: 'Este dominio no está autorizado para usar este asistente.' }, { status: 403, headers: corsHeaders })
    }

    // 3. Rate Limit Checks
    const forwardedFor = request.headers.get('x-forwarded-for')
    const ip = forwardedFor?.split(',')[0]?.trim() || 'unknown-ip'

    const ipRateLimitOk = await checkRateLimit(`widget-ip-${assistantId}-${ip}`, 'widget-message-ip-minute', 60, 60)
    if (!ipRateLimitOk) {
      await logSecurityEvent({ userId: ownerId, eventType: 'widget_rate_limited', severity: 'warning', message: `Widget IP rate limit para asistente ${assistantId}`, req: request })
      return NextResponse.json({ error: 'Demasiados mensajes desde tu red. Intenta nuevamente en unos minutos.' }, { status: 429, headers: corsHeaders })
    }

    const visitorRateLimitOk = await checkRateLimit(`widget-vis-${assistantId}-${visitorId}`, 'widget-message-vis-minute', 20, 60)
    if (!visitorRateLimitOk) {
      await logSecurityEvent({ userId: ownerId, eventType: 'widget_rate_limited', severity: 'warning', message: `Widget visitor rate limit para asistente ${assistantId}`, req: request })
      return NextResponse.json({ error: 'Estás enviando mensajes muy rápido. Intenta nuevamente.' }, { status: 429, headers: corsHeaders })
    }

    // 4. Fetch owner subscription limits
    const [subRes, profileRes] = await Promise.all([
      supabaseAdmin
        .from('subscriptions')
        .select('plan, current_messages_used, messages_limit, status, current_period_end, grace_ends_at, cancel_at_period_end')
        .eq('user_id', ownerId)
        .single(),
      supabaseAdmin
        .from('profiles')
        .select('trial_used, trial_ends_at')
        .eq('id', ownerId)
        .single()
    ])

    const sub = subRes.data
    const profile = profileRes.data
    const effectiveStatus = getEffectiveSubscriptionStatus(sub, profile)

    if (effectiveStatus === 'free' || effectiveStatus === 'expired' || effectiveStatus === 'cancelled') {
      return NextResponse.json({ error: 'El plan del asistente no está activo. Renueva tu plan o activa tu prueba para continuar.' }, { status: 403, headers: corsHeaders })
    }

    const normalizedPlan = normalizePlan(sub?.plan || 'free')
    const planConfig = getPlanConfig(normalizedPlan)
    const effectiveLimit = planConfig.limits.messagesPerMonth

    // 5. Consume credit atomically
    const consumed = await consumeMessageCredit(ownerId, effectiveLimit)
    if (!consumed) {
      await logSecurityEvent({ userId: ownerId, eventType: 'message_limit_reached', severity: 'info', message: `Límite de mensajes alcanzado para asistente ${assistantId}`, req: request })
      return NextResponse.json({ error: 'El asistente alcanzó el límite mensual de mensajes.', code: 'MESSAGE_LIMIT_REACHED' }, { status: 403, headers: corsHeaders })
    }

    // 6. Conversation handling.
    // A browser-controlled conversationId is never sufficient by itself:
    // it must also match this assistant, webchat channel and visitorId.
    let currentConversationId: string | null = null

    if (conversationId) {
      const { data: conv, error: convError } = await supabaseAdmin
        .from('conversations')
        .update({
          last_message: message.substring(0, 100),
          last_message_at: new Date().toISOString(),
          status: 'open'
        })
        .eq('id', conversationId)
        .eq('assistant_id', assistantId)
        .eq('user_id', ownerId)
        .eq('channel', 'webchat')
        .eq('visitor_id', visitorId)
        .select('id')
        .maybeSingle()

      if (!convError && conv) {
        currentConversationId = conv.id
      }
    }

    // If the supplied conversation does not belong to this visitor, start a new one.
    // We deliberately do not modify or reveal the existence of the rejected conversation.
    if (!currentConversationId) {
      const { data: conv, error: convError } = await supabaseAdmin
        .from('conversations')
        .insert({
          user_id: ownerId,
          assistant_id: assistantId,
          channel: 'webchat',
          visitor_id: visitorId,
          status: 'open',
          last_message: message.substring(0, 100),
          last_message_at: new Date().toISOString(),
        })
        .select('id')
        .single()

      if (convError || !conv) {
        console.error('[POST /api/widget/message] Error creating conversation')
        return NextResponse.json({ error: 'Error interno guardando conversación.' }, { status: 500, headers: corsHeaders })
      }
      currentConversationId = conv.id
    }

    // Guardar mensaje del usuario and fail closed if persistence fails.
    const { error: userMessageError } = await supabaseAdmin.from('messages').insert({
      conversation_id: currentConversationId,
      user_id: ownerId,
      assistant_id: assistantId,
      channel: 'webchat',
      role: 'user',
      content: message
    })

    if (userMessageError) {
      console.error('[POST /api/widget/message] Error saving user message')
      return NextResponse.json({ error: 'Error interno guardando mensaje.' }, { status: 500, headers: corsHeaders })
    }

    // 7. Generate AI Reply
    const config: AssistantConfig = {
      assistantName: assistant.assistant_name || '',
      businessName: assistant.business_name || '',
      businessType: assistant.business_type || '',
      channel: assistant.channel || 'webchat',
      tone: assistant.tone || 'profesional',
      mainGoal: assistant.main_goal || '',
      instructions: assistant.instructions || '',
      faqs: assistant.faqs || '',
      services: assistant.services || '',
      schedule: assistant.schedule || '',
      fallbackMessage: assistant.fallback_message || '',
      language: assistant.language || 'es',
      behavior: assistant.behavior || undefined,
      knowledge_blocks: assistant.knowledge_blocks
    }

    const aiModel = getModelForPlan(normalizedPlan, 'webchat_message', { messageLength: message.length })
    const reply = await generateAssistantReply(config, message.trim(), aiModel)

    const { error: assistantMessageError } = await supabaseAdmin.from('messages').insert({
      conversation_id: currentConversationId,
      user_id: ownerId,
      assistant_id: assistantId,
      channel: 'webchat',
      role: 'assistant',
      content: reply
    })

    if (assistantMessageError) {
      console.error('[POST /api/widget/message] Error saving assistant message')
      return NextResponse.json({ error: 'Error interno guardando respuesta.' }, { status: 500, headers: corsHeaders })
    }

    // 8. Detección Automática de Leads
    const emailRegex = /[\w.-]+@[\w.-]+\.\w+/i
    const phoneRegexSimple = /\b\+?[0-9][0-9\s\-\(\)]{7,15}\b/
    const nameRegex = /(?:me llamo|soy|mi nombre es)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)*)/i

    const extractedEmail = message.match(emailRegex)?.[0]
    const extractedPhone = message.match(phoneRegexSimple)?.[0]
    const extractedName = message.match(nameRegex)?.[1]

    if (extractedEmail || extractedPhone || extractedName) {
      const { data: existingLead } = await supabaseAdmin
        .from('leads')
        .select('id, email, phone, name')
        .eq('conversation_id', currentConversationId)
        .maybeSingle()

      if (existingLead) {
        const updates: Record<string, string> = {}
        if (extractedEmail && !existingLead.email) updates.email = extractedEmail
        if (extractedPhone && !existingLead.phone) updates.phone = extractedPhone
        if (extractedName && !existingLead.name) updates.name = extractedName

        if (Object.keys(updates).length > 0) {
          await supabaseAdmin.from('leads').update(updates).eq('id', existingLead.id)
        }
      } else {
        const { data: newLead } = await supabaseAdmin.from('leads').insert({
          user_id: ownerId,
          assistant_id: assistantId,
          conversation_id: currentConversationId,
          source: 'webchat',
          status: 'new',
          email: extractedEmail || null,
          phone: extractedPhone || null,
          name: extractedName || null
        }).select('id').single()

        if (newLead) {
          try {
            await supabaseAdmin.from('notifications').insert({
              user_id: ownerId,
              title: 'Nuevo lead capturado',
              message: 'Un visitante dejó sus datos desde Web Chat.',
              type: 'lead',
              metadata: { leadId: newLead.id, assistantId, conversationId: currentConversationId }
            })
          } catch {
            // Notifications are non-critical and must not break the response.
          }
        }
      }
    }

    return NextResponse.json({ reply, conversationId: currentConversationId }, { headers: corsHeaders })
  } catch (error) {
    console.error('[POST /api/widget/message] Error inesperado')
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500, headers: corsHeaders })
  }
}
