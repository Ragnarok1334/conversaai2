import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { generateAssistantReply, type AssistantConfig } from '@/lib/openai'
import { isUnlimited, normalizePlan, getPlanConfig } from '@/lib/plans'
import { checkRateLimit, consumeMessageCredit, validateWidgetDomain } from '@/lib/security'
import { logSecurityEvent } from '@/lib/audit'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { assistantId, message, conversationId, visitorId } = body

    if (!assistantId) {
      return NextResponse.json({ error: 'Missing assistantId' }, { status: 400, headers: corsHeaders })
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0 || message.length > 1000) {
      return NextResponse.json({ error: 'Mensaje inválido o demasiado largo.' }, { status: 400, headers: corsHeaders })
    }

    const supabaseAdmin = createSupabaseAdmin()

    // 1. Fetch assistant and check status
    const { data: assistant, error: assistantError } = await supabaseAdmin
      .from('assistants')
      .select('*')
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
      await logSecurityEvent({ userId: ownerId, eventType: 'widget_message_domain_blocked', severity: 'warning', message: `Widget message domain block (${domainValidation.normalizedDomain || 'no-origin'}) for assistant ${assistantId}`, req: request })
      return NextResponse.json({ error: 'Este dominio no está autorizado para usar este asistente.' }, { status: 403, headers: corsHeaders })
    }

    // 3. Rate Limit Checks
    const ip = request.headers.get('x-forwarded-for') || 'unknown-ip'
    
    // Max 60 messages per minute per IP per assistant
    const ipRateLimitOk = await checkRateLimit(`widget-ip-${assistantId}-${ip}`, 'widget-message-ip-minute', 60, 60)
    if (!ipRateLimitOk) {
      await logSecurityEvent({ userId: ownerId, eventType: 'widget_rate_limited', severity: 'warning', message: `Widget IP rate limit para asistente ${assistantId}`, req: request })
      return NextResponse.json({ error: 'Demasiados mensajes desde tu red. Intenta nuevamente en unos minutos.' }, { status: 429, headers: corsHeaders })
    }
    
    // Max 20 messages per minute per VisitorID per assistant
    const visId = visitorId || ip
    const visitorRateLimitOk = await checkRateLimit(`widget-vis-${assistantId}-${visId}`, 'widget-message-vis-minute', 20, 60)
    if (!visitorRateLimitOk) {
      await logSecurityEvent({ userId: ownerId, eventType: 'widget_rate_limited', severity: 'warning', message: `Widget visitor rate limit para asistente ${assistantId}`, req: request })
      return NextResponse.json({ error: 'Estás enviando mensajes muy rápido. Intenta nuevamente.' }, { status: 429, headers: corsHeaders })
    }

    // 4. Fetch owner subscription limits
    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('plan, current_messages_used, messages_limit, status')
      .eq('user_id', ownerId)
      .single()

    if (!sub || sub.status !== 'active') {
      return NextResponse.json({ error: 'El servicio del asistente no está activo.' }, { status: 403, headers: corsHeaders })
    }

    const normalizedPlan = normalizePlan(sub.plan)
    const planConfig = getPlanConfig(normalizedPlan)
    const effectiveLimit = planConfig.limits.messagesPerMonth

    // 5. Consume credit atomically
    const consumed = await consumeMessageCredit(ownerId, effectiveLimit)
    if (!consumed) {
      await logSecurityEvent({ userId: ownerId, eventType: 'message_limit_reached', severity: 'info', message: `Límite de mensajes alcanzado para asistente ${assistantId}`, req: request })
      return NextResponse.json({
        error: 'El asistente alcanzó el límite mensual de mensajes.',
        code: 'MESSAGE_LIMIT_REACHED'
      }, { status: 403, headers: corsHeaders })
    }

    // 6. Conversation Handling
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
          visitor_id: visitorId || null,
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

    // Guardar mensaje del usuario
    await supabaseAdmin.from('messages').insert({
      conversation_id: currentConversationId,
      user_id: ownerId,
      assistant_id: assistantId,
      channel: 'webchat',
      role: 'user',
      content: message
    })

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
      behavior: assistant.behavior || undefined
    }

    const reply = await generateAssistantReply(config, message.trim())

    // Guardar respuesta del asistente
    await supabaseAdmin.from('messages').insert({
      conversation_id: currentConversationId,
      user_id: ownerId,
      assistant_id: assistantId,
      channel: 'webchat',
      role: 'assistant',
      content: reply
    })

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
          } catch (notifError) {
            // ignorar error de notificaciones
          }
        }
      }
    }

    // 9. Return response
    return NextResponse.json({ reply, conversationId: currentConversationId }, { headers: corsHeaders })

  } catch (error) {
    console.error('[POST /api/widget/message]', error)
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500, headers: corsHeaders })
  }
}
