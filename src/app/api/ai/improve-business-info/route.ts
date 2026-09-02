import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit, consumeMessageCredit, refundMessageCredit } from '@/lib/security'
import { normalizePlan, getPlanConfig } from '@/lib/plans'
import { getModelForPlan } from '@/lib/ai/model-router'
import { canUsePremiumFeatures } from '@/lib/billing/subscription-status'

const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) {
    return null
  }
  return new OpenAI({ apiKey })
}

export async function POST(request: NextRequest) {
  let creditConsumed = false
  let userId: string | null = null

  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Debes iniciar sesión para usar esta función.' }, { status: 401 })
    }

    userId = user.id

    const body = await request.json()
    const {
      text,
      blockType,
      blockTitle,
      assistantName,
      businessType,
      activeTemplate,
      existingKnowledgeBlocks,
      instructionsLegacy,
    } = body

    if (typeof text !== 'string' || text.length > 5000) {
      return NextResponse.json(
        { error: 'El texto no puede exceder los 5000 caracteres.' },
        { status: 400 }
      )
    }

    if (!blockType) {
      return NextResponse.json({ error: 'Falta blockType' }, { status: 400 })
    }

    const isCreating = text.trim().length === 0

    if (
      isCreating &&
      !assistantName &&
      !businessType &&
      (!Array.isArray(existingKnowledgeBlocks) || existingKnowledgeBlocks.length === 0)
    ) {
      return NextResponse.json(
        { error: 'Agrega al menos una idea del negocio para que la IA pueda ayudarte mejor.' },
        { status: 400 }
      )
    }

    const openai = getOpenAIClient()
    if (!openai) {
      return NextResponse.json(
        { error: 'La API key de IA no está configurada.' },
        { status: 500 }
      )
    }

    // Rate limit: 10 peticiones por minuto por usuario.
    const isRateLimited = !(await checkRateLimit(`improve-info-${user.id}`, 'improve-business-info', 10, 60))
    if (isRateLimited) {
      return NextResponse.json(
        { error: 'Demasiados intentos. Espera un minuto e intenta nuevamente.' },
        { status: 429 }
      )
    }

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
      return NextResponse.json({ error: 'Suscripción inactiva o vencida.' }, { status: 403 })
    }

    const plan = normalizePlan(sub.plan)
    const planConfig = getPlanConfig(plan)
    const limit = planConfig.limits.messagesPerMonth

    // Consume the credit only after all validation has passed and immediately before AI usage.
    const consumed = await consumeMessageCredit(user.id, limit)
    if (!consumed) {
      return NextResponse.json({ error: 'Alcanzaste el límite de mensajes de tu plan.' }, { status: 403 })
    }
    creditConsumed = true

    let systemContext = `Eres un experto en redacción comercial para asistentes virtuales. `
    if (isCreating) {
      systemContext += `Debes CREAR el contenido inicial para el bloque de conocimiento "${blockTitle}" (${blockType}). `
    } else {
      systemContext += `Debes MEJORAR el contenido del bloque de conocimiento "${blockTitle}" (${blockType}). `
    }
    systemContext += `No inventes datos exactos como precios específicos, direcciones exactas o teléfonos si no se proveen. Si no tienes datos, usa placeholders como [Agrega aquí tu precio]. `

    if (blockType === 'pricing') {
      systemContext += `Si es de precios, puedes proponer rangos o estructura de cotización (ej: "Los precios dependen del servicio. Para cotizar, necesito..."). `
    } else if (blockType === 'location') {
      systemContext += `Si es ubicación, es válido sugerir opciones como "atención 100% online", "delivery a domicilio" o "zonas de cobertura". No inventes una dirección física. `
    } else if (blockType === 'lead_capture') {
      systemContext += `Sugiere qué datos debe pedir el asistente (nombre, correo, teléfono, fecha, motivo). `
    } else if (blockType === 'rules') {
      systemContext += `Convierte las reglas en instrucciones claras y estrictas para el comportamiento del asistente. `
    }

    let userMessage = `Por favor ${isCreating ? 'crea' : 'mejora'} el bloque "${blockTitle}" (${blockType}).\n`
    userMessage += `\nContexto del negocio:\n`
    if (assistantName) userMessage += `- Nombre del asistente/negocio: ${assistantName}\n`
    if (businessType) userMessage += `- Tipo de negocio: ${businessType}\n`
    if (activeTemplate) userMessage += `- Plantilla base: ${activeTemplate}\n`

    if (Array.isArray(existingKnowledgeBlocks) && existingKnowledgeBlocks.length > 0) {
      userMessage += `\nOtros bloques ya completados (para referencia):\n`
      existingKnowledgeBlocks.forEach((b: any) => {
        if (
          b &&
          typeof b.type === 'string' &&
          b.type !== blockType &&
          typeof b.content === 'string' &&
          b.content.trim().length > 0
        ) {
          const title = typeof b.title === 'string' ? b.title : 'Bloque'
          userMessage += `- ${title}: ${b.content.substring(0, 100)}...\n`
        }
      })
    }

    if (typeof instructionsLegacy === 'string' && instructionsLegacy.length > 0) {
      userMessage += `\nInformación general extra:\n${instructionsLegacy.substring(0, 200)}...\n`
    }

    if (!isCreating) {
      userMessage += `\nTexto actual a mejorar:\n${text}`
    } else {
      userMessage += `\n(Actualmente está vacío, por favor genera una buena base).`
    }

    const aiModel = getModelForPlan(plan, 'improve_training', { messageLength: userMessage.length })

    const response = await openai.chat.completions.create({
      model: aiModel,
      messages: [
        { role: 'system', content: systemContext },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: 1500,
    })

    const improvedText = response.choices[0]?.message?.content?.trim()

    if (!improvedText) {
      throw new Error('La respuesta de OpenAI estaba vacía.')
    }

    creditConsumed = false
    return NextResponse.json({ improvedText })
  } catch (error: unknown) {
    if (creditConsumed && userId) {
      const refunded = await refundMessageCredit(userId)
      if (!refunded) {
        console.error('[POST /api/ai/improve-business-info] No se pudo reembolsar el crédito consumido tras un fallo de IA.')
      }
      creditConsumed = false
    }

    let errorMessage = 'No se pudo mejorar la redacción. Intenta de nuevo.'
    let statusCode = 500

    const err = error as { status?: number; error?: { code?: string } }

    if (err?.status === 401 || err?.error?.code === 'invalid_api_key') {
      errorMessage = 'La API key de IA no es válida.'
      statusCode = 401
    } else if (
      err?.status === 429 ||
      err?.error?.code === 'insufficient_quota' ||
      err?.error?.code === 'billing_not_active'
    ) {
      errorMessage = 'El servicio de IA no tiene saldo o cuota disponible.'
      statusCode = 429
    } else if (process.env.NODE_ENV === 'development') {
      console.error('[POST /api/ai/improve-business-info] Unhandled error:', error)
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    )
  }
}
