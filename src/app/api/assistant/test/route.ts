import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateAssistantReply, type AssistantConfig } from '@/lib/openai'
import { normalizePlan, getPlanConfig } from '@/lib/plans'
import { consumeMessageCredit, refundMessageCredit } from '@/lib/security'
import { getModelForPlan } from '@/lib/ai/model-router'
import { canUsePremiumFeatures } from '@/lib/billing/subscription-status'

export async function POST(request: NextRequest) {
  let creditConsumed = false
  const userIdRef: { value: string | null } = { value: null }

  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    userIdRef.value = user.id

    const body = await request.json()
    const { assistantId, assistantConfig, userMessage } = body

    if (!userMessage || typeof userMessage !== 'string' || userMessage.trim().length === 0) {
      return NextResponse.json({ error: 'Mensaje requerido' }, { status: 400 })
    }

    // Validate the assistant before consuming a message credit.
    let config: AssistantConfig

    if (assistantId) {
      if (typeof assistantId !== 'string') {
        return NextResponse.json({ error: 'assistantId inválido' }, { status: 400 })
      }

      const { data: assistant, error: dbError } = await supabase
        .from('assistants')
        .select('*')
        .eq('id', assistantId)
        .eq('user_id', user.id)
        .single()

      if (dbError || !assistant) {
        return NextResponse.json({ error: 'Asistente no encontrado' }, { status: 404 })
      }

      config = {
        assistantName: assistant.assistant_name,
        businessName: assistant.business_name,
        businessType: assistant.business_type,
        channel: assistant.channel,
        tone: assistant.tone,
        mainGoal: assistant.main_goal,
        instructions: assistant.instructions,
        faqs: assistant.faqs,
        services: assistant.services,
        schedule: assistant.schedule,
        fallbackMessage: assistant.fallback_message,
        language: assistant.language,
        behavior: assistant.behavior,
        knowledge_blocks: assistant.knowledge_blocks,
      }
    } else if (assistantConfig && typeof assistantConfig === 'object') {
      // Preview mode — use provided config without saving.
      config = assistantConfig as AssistantConfig
    } else {
      return NextResponse.json({ error: 'Se requiere assistantId o assistantConfig' }, { status: 400 })
    }

    // --- Subscription Limits ---
    const { data: profile } = await supabase
      .from('profiles')
      .select('trial_ends_at')
      .eq('id', user.id)
      .single()

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!canUsePremiumFeatures(sub, profile)) {
      return NextResponse.json({ error: 'Suscripción inactiva o no encontrada' }, { status: 403 })
    }

    const normalizedPlan = normalizePlan(sub.plan)
    const planConfig = getPlanConfig(normalizedPlan)
    const effectiveLimit = planConfig.limits.messagesPerMonth

    // Reserve one message credit atomically immediately before the AI call.
    const consumed = await consumeMessageCredit(user.id, effectiveLimit)
    if (!consumed) {
      return NextResponse.json({
        error: 'Alcanzaste el límite mensual de mensajes de tu plan.',
        code: 'MESSAGE_LIMIT_REACHED',
        limit: effectiveLimit,
        used: sub.current_messages_used,
        plan: normalizedPlan,
      }, { status: 403 })
    }
    creditConsumed = true

    try {
      const aiModel = getModelForPlan(normalizedPlan, 'assistant_test', { messageLength: userMessage.length })
      const reply = await generateAssistantReply(config, userMessage.trim(), aiModel)

      // Save test message if assistantId exists. A successful AI response consumes
      // the credit even if persistence fails, because the model call already happened.
      if (assistantId) {
        const { error: saveError } = await supabase.from('assistant_test_messages').insert({
          assistant_id: assistantId,
          user_id: user.id,
          user_message: userMessage.trim(),
          assistant_reply: reply,
        })

        if (saveError) {
          console.error('[API /assistant/test] Error saving test message:', saveError)
        }
      }

      creditConsumed = false
      return NextResponse.json({ reply })
    } catch (aiError) {
      console.error('[API /assistant/test] AI generation error:', aiError)

      const refunded = await refundMessageCredit(user.id)
      creditConsumed = false

      if (!refunded) {
        console.error('[API /assistant/test] CRITICAL: failed to refund reserved message credit')
      }

      return NextResponse.json({ error: 'No se pudo generar la respuesta. Intenta nuevamente.' }, { status: 502 })
    }
  } catch (error) {
    console.error('[API /assistant/test]', error)

    // Safety net: return a reserved credit if an unexpected exception occurs
    // after the reservation and before the AI response is successfully returned.
    if (creditConsumed && userIdRef.value) {
      const refunded = await refundMessageCredit(userIdRef.value)
      if (!refunded) {
        console.error('[API /assistant/test] CRITICAL: failed to refund credit after unexpected error')
      }
    }

    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
