import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// This will initialize the OpenAI client only if the key is present.
// It will not throw during build time if the key is missing in CI.
const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return null
  }
  return new OpenAI({ apiKey })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { text } = body

    if (!text || typeof text !== 'string' || text.trim().length < 10) {
      return NextResponse.json(
        { error: 'Escribe más información de tu negocio antes de mejorar la redacción.' },
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

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Economical and fast model
      messages: [
        {
          role: 'system',
          content:
            'Eres un experto en redacción comercial para asistentes virtuales de negocios. Mejora textos escritos por dueños de negocios para que un asistente pueda responder mejor a clientes. Mantén la información original, no inventes datos, organiza por secciones claras y escribe en español.',
        },
        {
          role: 'user',
          content:
            'Mejora y organiza este texto para entrenar un asistente de atención al cliente. No inventes información. Conserva precios, horarios, ubicación, servicios y formas de pago si aparecen:\n\n' + text,
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
    // Determine specific errors if possible
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
       // Only log full error details in development mode
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
