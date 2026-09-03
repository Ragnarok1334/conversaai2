import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit, consumeMessageCredit, refundMessageCredit } from '@/lib/security'
import { normalizePlan, getPlanConfig } from '@/lib/plans'
import { getModelForPlan } from '@/lib/ai/model-router'
import { canUsePremiumFeatures } from '@/lib/billing/subscription-status'

const MAX_BODY_BYTES = 32 * 1024
const MAX_TEXT_LENGTH = 5000
const MAX_BLOCK_TITLE_LENGTH = 160
const MAX_BLOCK_TYPE_LENGTH = 60
const MAX_CONTEXT_FIELD_LENGTH = 300
const MAX_TEMPLATE_LENGTH = 500
const MAX_INSTRUCTIONS_LENGTH = 1000
const MAX_KNOWLEDGE_BLOCKS = 50
const MAX_KNOWLEDGE_BLOCK_CONTENT = 1000
const MAX_KNOWLEDGE_CONTEXT_LENGTH = 20_000

const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) {
    return null
  }
  return new OpenAI({ apiKey })
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isString = (value: unknown): value is string => typeof value === 'string'

const readOptionalString = (
  body: Record<string, unknown>,
  key: string,
  maxLength: number,
): { value?: string; error?: string } => {
  const raw = body[key]
  if (raw === undefined || raw === null) return {}
  if (!isString(raw)) return { error: `${key} debe ser texto.` }
  const value = raw.trim()
  if (value.length > maxLength) return { error: `${key} es demasiado largo.` }
  return { value }
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

    const contentLength = request.headers.get('content-length')
    if (contentLength && Number.isFinite(Number(contentLength)) && Number(contentLength) > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'La solicitud es demasiado grande.' }, { status: 413 })
    }

    const rawBody = await request.text()
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'La solicitud es demasiado grande.' }, { status: 413 })
    }

    let parsedBody: unknown
    try {
      parsedBody = JSON.parse(rawBody)
    } catch {
      return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 })
    }

    if (!isRecord(parsedBody)) {
      return NextResponse.json({ error: 'El cuerpo de la solicitud no es válido.' }, { status: 400 })
    }

    const body = parsedBody
    const textResult = readOptionalString(body, 'text', MAX_TEXT_LENGTH)
    const blockTypeResult = readOptionalString(body, 'blockType', MAX_BLOCK_TYPE_LENGTH)
    const blockTitleResult = readOptionalString(body, 'blockTitle', MAX_BLOCK_TITLE_LENGTH)
    const assistantNameResult = readOptionalString(body, 'assistantName', MAX_CONTEXT_FIELD_LENGTH)
    const businessTypeResult = readOptionalString(body, 'businessType', MAX_CONTEXT_FIELD_LENGTH)
    const activeTemplateResult = readOptionalString(body, 'activeTemplate', MAX_TEMPLATE_LENGTH)
    const instructionsResult = readOptionalString(body, 'instructionsLegacy', MAX_INSTRUCTIONS_LENGTH)

    const validationError =
      textResult.error ||
      blockTypeResult.error ||
      blockTitleResult.error ||
      assistantNameResult.error ||
      businessTypeResult.error ||
      activeTemplateResult.error ||
      instructionsResult.error

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const text = textResult.value ?? ''
    const blockType = blockTypeResult.value ?? ''
    const blockTitle = blockTitleResult.value ?? ''
    const assistantName = assistantNameResult.value
    const businessType = businessTypeResult.value
    const activeTemplate = activeTemplateResult.value
    const instructionsLegacy = instructionsResult.value

    if (!blockType) {
      return NextResponse.json({ error: 'Falta blockType' }, { status: 400 })
    }

    const rawBlocks = body.existingKnowledgeBlocks
    if (rawBlocks !== undefined && rawBlocks !== null && !Array.isArray(rawBlocks)) {
      return NextResponse.json({ error: 'existingKnowledgeBlocks debe ser una lista.' }, { status: 400 })
    }

    const existingKnowledgeBlocks = Array.isArray(rawBlocks) ? rawBlocks : []
    if (existingKnowledgeBlocks.length > MAX_KNOWLEDGE_BLOCKS) {
      return NextResponse.json({ error: 'Demasiados bloques de conocimiento.' }, { status: 400 })
    }

    let knowledgeContextLength = 0
    for (const block of existingKnowledgeBlocks) {
      if (!isRecord(block)) {
        return NextResponse.json({ error: 'Un bloque de conocimiento no es válido.' }, { status: 400 })
      }

      if (block.type !== undefined && !isString(block.type)) {
        return NextResponse.json({ error: 'El tipo de un bloque no es válido.' }, { status: 400 })
      }

      if (block.title !== undefined && !isString(block.title)) {
        return NextResponse.json({ error: 'El título de un bloque no es válido.' }, { status: 400 })
      }

      if (block.content !== undefined && !isString(block.content)) {
        return NextResponse.json({ error: 'El contenido de un bloque no es válido.' }, { status: 400 })
      }

      const content = isString(block.content) ? block.content.trim() : ''
      knowledgeContextLength += Math.min(content.length, MAX_KNOWLEDGE_BLOCK_CONTENT)
      if (knowledgeContextLength > MAX_KNOWLEDGE_CONTEXT_LENGTH) {
        return NextResponse.json({ error: 'El contexto de conocimiento es demasiado grande.' }, { status: 400 })
      }
    }

    const isCreating = text.length === 0

    if (
      isCreating &&
      !assistantName &&
      !businessType &&
      existingKnowledgeBlocks.length === 0
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
      .select('plan, status, current_period_end, trial_ends_at')
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

    if (existingKnowledgeBlocks.length > 0) {
      userMessage += `\nOtros bloques ya completados (para referencia):\n`
      existingKnowledgeBlocks.forEach((b) => {
        const type = isString(b.type) ? b.type : ''
        const content = isString(b.content) ? b.content.trim() : ''
        if (type && type !== blockType && content.length > 0) {
          const title = isString(b.title) ? b.title.trim().slice(0, MAX_BLOCK_TITLE_LENGTH) : 'Bloque'
          userMessage += `- ${title}: ${content.substring(0, 100)}...\n`
        }
      })
    }

    if (instructionsLegacy) {
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
