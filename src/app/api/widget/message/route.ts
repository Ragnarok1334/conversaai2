import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { generateAssistantReply, type AssistantConfig } from '@/lib/openai'
import { normalizePlan, getPlanConfig } from '@/lib/plans'
import { checkRateLimit, consumeMessageCredit, validateWidgetDomain } from '@/lib/security'
import { logSecurityEvent } from '@/lib/audit'
import { getModelForPlan } from '@/lib/ai/model-router'
import { getEffectiveSubscriptionStatus } from '@/lib/billing/subscription-status'
import { getClientIp, HttpInputError, isUuid, isVisitorId, readJsonBody, widgetCorsHeaders } from '@/lib/http-security'
import { detectHumanHandoffRequest, HUMAN_HANDOFF_ACK, HUMAN_WAITING_MESSAGE } from '@/lib/handoff'

interface WidgetMessageBody {
  assistantId?: unknown
  message?: unknown
  conversationId?: unknown
  visitorId?: unknown
}

function redactContactData(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[correo ya entregado]')
    .replace(/\+?[0-9][0-9\s\-()]{7,15}/g, '[teléfono ya entregado]')
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: widgetCorsHeaders(request, true) })
}

export async function POST(request: NextRequest) {
  try {
    const body = await readJsonBody<WidgetMessageBody>(request, 8_192)
    const { assistantId, message, conversationId, visitorId } = body
    const privateCorsHeaders = widgetCorsHeaders(request, false)

    if (!isUuid(assistantId)) {
      return NextResponse.json({ error: 'Identificador de asistente inválido.' }, { status: 400, headers: privateCorsHeaders })
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0 || message.length > 1000) {
      return NextResponse.json({ error: 'Mensaje inválido o demasiado largo.' }, { status: 400, headers: privateCorsHeaders })
    }

    if (!isVisitorId(visitorId) || (conversationId != null && !isUuid(conversationId))) {
      return NextResponse.json({ error: 'Sesión de visitante inválida.' }, { status: 400, headers: privateCorsHeaders })
    }

    const supabaseAdmin = createSupabaseAdmin()

    // 1. Fetch assistant and check status
    const { data: assistant, error: assistantError } = await supabaseAdmin
      .from('assistants')
      .select('*')
      .eq('id', assistantId)
      .single()

    if (assistantError || !assistant) {
      return NextResponse.json({ error: 'Asistente no encontrado.' }, { status: 404, headers: privateCorsHeaders })
    }

    if (assistant.status !== 'active') {
      return NextResponse.json({ error: 'El asistente no está activo.' }, { status: 403, headers: privateCorsHeaders })
    }

    const ownerId = assistant.user_id

    // 2. Validate Domain
    const domainValidation = await validateWidgetDomain({ assistantId, req: request })
    
    if (!domainValidation.isValid) {
      await logSecurityEvent({ userId: ownerId, eventType: 'widget_message_domain_blocked', severity: 'warning', message: `Widget message domain block (${domainValidation.normalizedDomain || 'no-origin'}) for assistant ${assistantId}`, req: request })
      return NextResponse.json({ error: 'Este dominio no está autorizado para usar este asistente.' }, { status: 403, headers: privateCorsHeaders })
    }

    const corsHeaders = widgetCorsHeaders(request, true)

    // 3. Rate Limit Checks
    const ip = getClientIp(request)
    
    // Max 60 messages per minute per IP per assistant
    const ipRateLimitOk = await checkRateLimit(`widget-ip-${assistantId}-${ip}`, 'widget-message-ip-minute', 60, 60)
    if (!ipRateLimitOk) {
      await logSecurityEvent({ userId: ownerId, eventType: 'widget_rate_limited', severity: 'warning', message: `Widget IP rate limit para asistente ${assistantId}`, req: request })
      return NextResponse.json({ error: 'Demasiados mensajes desde tu red. Intenta nuevamente en unos minutos.' }, { status: 429, headers: corsHeaders })
    }
    
    // Max 20 messages per minute per VisitorID per assistant
    const visId = visitorId
    const visitorRateLimitOk = await checkRateLimit(`widget-vis-${assistantId}-${visId}`, 'widget-message-vis-minute', 20, 60)
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

    const rawPlan = sub ? sub.plan : 'free'
    const normalizedPlan = normalizePlan(rawPlan)
    const planConfig = getPlanConfig(normalizedPlan)
    const effectiveLimit = planConfig.limits.messagesPerMonth

    // 5. Human handoff: persist messages without consuming AI credits.
    const { data: existingConversation } = conversationId
      ? await supabaseAdmin
          .from('conversations')
          .select('id, ai_paused, handoff_status')
          .eq('id', conversationId)
          .eq('assistant_id', assistantId)
          .eq('visitor_id', visitorId)
          .maybeSingle()
      : { data: null }

    const requestedHuman = detectHumanHandoffRequest(message)
    if (existingConversation?.ai_paused || requestedHuman) {
      const now = new Date().toISOString()
      let handoffConversationId = existingConversation?.id || null
      const currentHandoffStatus = existingConversation?.handoff_status || 'ai'

      if (!handoffConversationId) {
        const { data: created, error: createError } = await supabaseAdmin.from('conversations').insert({
          user_id: ownerId,
          assistant_id: assistantId,
          channel: 'webchat',
          visitor_id: visitorId,
          status: 'pending',
          ai_paused: true,
          handoff_status: 'waiting',
          handoff_reason: 'El visitante solicitó atención humana.',
          human_requested_at: now,
          last_message: message.slice(0, 100),
          last_message_at: now,
        }).select('id').single()
        if (createError || !created) throw createError || new Error('No se pudo crear la conversación')
        handoffConversationId = created.id
      } else {
        const updates: Record<string, string | boolean> = {
          ai_paused: true,
          status: currentHandoffStatus === 'human' ? 'open' : 'pending',
          last_message: message.slice(0, 100),
          last_message_at: now,
        }
        if (requestedHuman && currentHandoffStatus === 'ai') {
          updates.handoff_status = 'waiting'
          updates.handoff_reason = 'El visitante solicitó atención humana.'
          updates.human_requested_at = now
        }
        await supabaseAdmin.from('conversations').update(updates).eq('id', handoffConversationId)
      }

      await supabaseAdmin.from('messages').insert({
        conversation_id: handoffConversationId,
        user_id: ownerId,
        assistant_id: assistantId,
        channel: 'webchat',
        role: 'user',
        sender_type: 'visitor',
        content: message,
      })

      let reply: string | null = null
      if (requestedHuman && currentHandoffStatus === 'ai') {
        reply = HUMAN_HANDOFF_ACK
        await supabaseAdmin.from('messages').insert({
          conversation_id: handoffConversationId,
          user_id: ownerId,
          assistant_id: assistantId,
          channel: 'webchat',
          role: 'assistant',
          sender_type: 'system',
          content: reply,
        })
        await supabaseAdmin.from('notifications').insert({
          user_id: ownerId,
          title: 'Conversación esperando atención',
          message: 'Un visitante solicitó hablar con una persona.',
          type: 'conversation',
          metadata: { assistantId, conversationId: handoffConversationId },
        })
      }

      return NextResponse.json({
        reply: reply || HUMAN_WAITING_MESSAGE,
        conversationId: handoffConversationId,
        humanHandoff: true,
        handoffStatus: existingConversation?.handoff_status === 'human' ? 'human' : 'waiting',
      }, { headers: corsHeaders })
    }

    // 6. Consume credit atomically
    const consumed = await consumeMessageCredit(ownerId, effectiveLimit)
    if (!consumed) {
      await logSecurityEvent({ userId: ownerId, eventType: 'message_limit_reached', severity: 'info', message: `Límite de mensajes alcanzado para asistente ${assistantId}`, req: request })
      return NextResponse.json({
        error: 'El asistente alcanzó el límite mensual de mensajes.',
        code: 'MESSAGE_LIMIT_REACHED'
      }, { status: 403, headers: corsHeaders })
    }

    // 7. Conversation Handling
    let currentConversationId = conversationId

    if (currentConversationId) {
      const { data: conv, error: convError } = await supabaseAdmin
        .from('conversations')
        .update({
          last_message: message.substring(0, 100),
          last_message_at: new Date().toISOString(),
          status: 'open'
        })
        .eq('id', currentConversationId)
        .eq('assistant_id', assistantId)
        .eq('visitor_id', visitorId)
        .select()
        .single()

      if (convError || !conv) {
        currentConversationId = null
      }
    }

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
        .select()
        .single()

      if (convError || !conv) {
        console.error('[POST /api/widget/message] Error creating conversation', convError)
        return NextResponse.json({ error: 'Error interno guardando conversación.' }, { status: 500, headers: corsHeaders })
      }
      currentConversationId = conv.id
    }

    // Load recent context before storing the current message so it is not duplicated
    // in the request sent to the model.
    const [historyResult, leadContextResult] = await Promise.all([
      supabaseAdmin
        .from('messages')
        .select('role, content, created_at')
        .eq('conversation_id', currentConversationId)
        .order('created_at', { ascending: false })
        .limit(12),
      supabaseAdmin
        .from('leads')
        .select('name, email, phone')
        .eq('conversation_id', currentConversationId)
        .maybeSingle(),
    ])

    if (historyResult.error) {
      console.warn('[POST /api/widget/message] Could not load conversation history:', historyResult.error.message)
    }

    const conversationHistory = (historyResult.data ?? [])
      .filter((item): item is { role: 'user' | 'assistant'; content: string; created_at: string } =>
        (item.role === 'user' || item.role === 'assistant') && typeof item.content === 'string'
      )
      .reverse()
      .map(item => ({ role: item.role, content: redactContactData(item.content.slice(0, 2000)) }))

    const knownLead = leadContextResult.data
    const cleanKnownName = knownLead?.name
      ?.replace(/\s+(?:mi\s+)?(?:n[uú]mero|tel[eé]fono|correo|email|whatsapp)\b.*$/i, '')
      .trim()

    // Guardar mensaje del usuario
    await supabaseAdmin.from('messages').insert({
      conversation_id: currentConversationId,
      user_id: ownerId,
      assistant_id: assistantId,
      channel: 'webchat',
      role: 'user',
      sender_type: 'visitor',
      content: message
    })

    // 8. Generate AI Reply
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
    const reply = await generateAssistantReply(config, message.trim(), aiModel, conversationHistory, {
      knownLead: knownLead ? {
        name: cleanKnownName || null,
        hasEmail: Boolean(knownLead.email),
        hasPhone: Boolean(knownLead.phone),
      } : undefined,
    })

    // Guardar respuesta del asistente
    await supabaseAdmin.from('messages').insert({
      conversation_id: currentConversationId,
      user_id: ownerId,
      assistant_id: assistantId,
      channel: 'webchat',
      role: 'assistant',
      sender_type: 'ai',
      content: reply
    })

    // 9. Detección Automática de Leads
    const emailRegex = /[\w.-]+@[\w.-]+\.\w+/i
    const phoneRegexSimple = /\b\+?[0-9][0-9\s\-\(\)]{7,15}\b/
    const nameRegex = /(?:me llamo|soy|mi nombre es)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)*)/i

    const extractedEmail = message.match(emailRegex)?.[0]
    const extractedPhone = message.match(phoneRegexSimple)?.[0]
    const extractedName = message.match(nameRegex)?.[1]
      ?.replace(/\s+(?:mi\s+)?(?:n[uú]mero|tel[eé]fono|correo|email|whatsapp)\b.*$/i, '')
      .trim()

    if (extractedEmail || extractedPhone || extractedName) {
      const { data: existingLead } = await supabaseAdmin
        .from('leads')
        .select('*')
        .eq('conversation_id', currentConversationId)
        .single()

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
        }).select().single()

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
            // ignorar error de notificaciones
          }
        }
      }
    }

    // 10. Return response
    return NextResponse.json({ reply, conversationId: currentConversationId }, { headers: corsHeaders })

  } catch (error) {
    if (error instanceof HttpInputError) {
      return NextResponse.json({ error: error.message }, { status: error.status, headers: widgetCorsHeaders(request, false) })
    }
    console.error('[POST /api/widget/message]', error)
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500, headers: widgetCorsHeaders(request, false) })
  }
}
