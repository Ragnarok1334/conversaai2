import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit, consumeMessageCredit } from '@/lib/security'
import { normalizePlan, getPlanConfig } from '@/lib/plans'

const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return null
  }
  return new OpenAI({ apiKey })
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Debes iniciar sesión para usar esta función.' }, { status: 401 })
    }

    const body = await request.json()
    const { text } = body

    if (!text || typeof text !== 'string' || text.trim().length < 20 || text.length > 5000) {
      return NextResponse.json(
        { error: 'El texto debe tener entre 20 y 5000 caracteres.' },
        { status: 400 }
      )
    }

    // Rate limit: 10 peticiones por minuto por usuario
    const isRateLimited = !(await checkRateLimit(`improve-info-${user.id}`, 'improve-business-info', 10, 60))
    if (isRateLimited) {
      return NextResponse.json({ error: 'Demasiados intentos. Espera un minuto e intenta nuevamente.' }, { status: 429 })
    }

    // Check plan and consume credit atomically
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('plan, status')
      .eq('user_id', user.id)
      .single()

    if (!sub || sub.status !== 'active') {
      return NextResponse.json({ error: 'Suscripción inactiva.' }, { status: 403 })
    }

    const planConfig = getPlanConfig(normalizePlan(sub.plan))
    const limit = planConfig.messagesLimit

    const consumed = await consumeMessageCredit(user.id, limit)
    if (!consumed) {
      return NextResponse.json({ error: 'Alcanzaste el límite de mensajes de tu plan.' }, { status: 403 })
    }

    const openai = getOpenAIClient()
    if (!openai) {
      return NextResponse.json(
        { error: 'La API key de IA no está configurada.' },
        { status: 500 }
      )
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'Eres un experto en redacción comercial para asistentes virtuales de negocios. Mejora textos escritos por dueños de negocios para que un asistente pueda responder mejor a clientes. Mantén la información original, no inventes datos, organiza por secciones claras y escribe en español.',
        },
        {
          role: 'user',
          content:
            'Mejora y organiza este texto para entrenar un asistente de atención al cliente. No inventes información. Conserva precios, horarios, ubicación, servicios y formas de pago si aparecen:\n\n' + text.trim(),
        },
      ],
      temperature: 0.7,
      max_tokens: 1500,
    })

    const improvedText = response.choices[0]?.message?.content?.trim()

    if (!improvedText) {
      throw new Error('La respuesta de OpenAI estaba vacía.')
    }

    return NextResponse.json({ improvedText })
  } catch (error: unknown) {
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
    } else {
       if (process.env.NODE_ENV === 'development') {
           console.error('[POST /api/ai/improve-business-info] Unhandled error:', error)
       }
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    )
  }
}
