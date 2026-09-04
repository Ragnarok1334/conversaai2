import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateAssistantReply, type AssistantConfig } from '@/lib/openai'
import { normalizePlan, getPlanConfig } from '@/lib/plans'
import { checkRateLimit, consumeMessageCredit, refundMessageCredit } from '@/lib/security'
import { getModelForPlan } from '@/lib/ai/model-router'
import { canUsePremiumFeatures } from '@/lib/billing/subscription-status'

const MAX_BODY_BYTES = 64 * 1024
const MAX_MESSAGE_LENGTH = 4000
const MAX_CONFIG_BYTES = 48 * 1024

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

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

    const contentLength = request.headers.get('content-length')
    if (contentLength && Number.isFinite(Number(contentLength)) && Number(contentLength) > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'La solicitud es demasiado grande.' }, { status: 413 })
    }

    const rawBody = await request.text()
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'La solicitud es demasiado grande.' }, { status: 413 })
    }

    let body: unknown
    try {
      body = JSON.parse(rawBody)
    } catch {
      return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 })
    }

    if (!isPlainObject(body)) {
      return NextResponse.json({ error: 'Cuerpo de solicitud inválido.' }, { status: 400 })
    }

    const { assistantId, assistantConfig, userMessage } = body

    if (typeof userMessage !== 'string') {
      return NextResponse.json({ error: 'Mensaje requerido' }, { status: 400 })
    }

    const normalizedMessage = userMessage.trim()
    if (!normalizedMessage || normalizedMessage.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ error: `El mensaje debe tener entre 1 y ${MAX_MESSAGE_LENGTH} caracteres.` }, { status: 400 })
    }

    const rateAllowed = await checkRateLimit(`assistant-test-${user.id}`, 'assistant-test', 10, 60)
    if (!rateAllowed) {
      return NextResponse.json({ error: 'Demasiados intentos. Espera un minuto e intenta nuevamente.' }, { status: 429 })
    }

    let config: AssistantConfig

    if (assistantId !== undefined && assistantId !== null) {
      if (typeof assistantId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(assistantId)) {
        return NextResponse.json({ error: 'assistantId inválido' }, { status: 400 })
      }

      const { data: assistant, error: dbError } = await supabase
        .from('assistants')
        .select('assistant_name,business_name,business_type,channel,tone,main_goal,instructions,faqs,services,schedule,fallback_message,language,behavior,knowledge_blocks')
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
    } else if (assistantConfig !== undefined) {
      if (!isPlainObject(assistantConfig)) {
        return NextResponse.json({ error: 'assistantConfig inválido' }, { status: 400 })
      }

      const configBytes = new TextEncoder().encode(JSON.stringify(assistantConfig)).byteLength
      if (configBytes > MAX_CONFIG_BYTES) {
        return NextResponse.json({ error: 'La configuración del asistente es demasiado grande.' }, { status: 413 })
      }

      config = assistantConfig as AssistantConfig
    } else {
      return NextResponse.json({ error: 'Se requiere assistantId o assistantConfig' }, { status: 400 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('trial_ends_at')
      .eq('id', user.id)
      .single()

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('plan,current_messages_used,status')
      .eq('user_id', user.id)
      .single()

    if (!sub || !canUsePremiumFeatures(sub, profile)) {
      return NextResponse.json({ error: 'Suscripción inactiva o no encontrada' }, { status: 403 })
    }

    const normalizedPlan = normalizePlan(sub.plan)
    const planConfig = getPlanConfig(normalizedPlan)
    const effectiveLimit = planConfig.limits.messagesPerMonth

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
      const aiModel = getModelForPlan(normalizedPlan, 'assistant_test', { messageLength: normalizedMessage.length })
      const reply = await generateAssistantReply(config, normalizedMessage, aiModel)

      if (assistantId) {
        const { error: saveError } = await supabase.from('assistant_test_messages').insert({
          assistant_id: assistantId,
          user_id: user.id,
          user_message: normalizedMessage,
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
    console.error('[API /assistant/test] Unexpected error:', error instanceof Error ? error.message : 'unknown')

    if (creditConsumed && userIdRef.value) {
      const refunded = await refundMessageCredit(userIdRef.value)
      if (!refunded) {
        console.error('[API /assistant/test] CRITICAL: failed to refund credit after unexpected error')
      }
    }

    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}