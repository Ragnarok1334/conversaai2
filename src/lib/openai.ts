import OpenAI from 'openai'

export const DEFAULT_OPENAI_MODEL = 'gpt-4.1-mini'

// Server-only client — never import this in client components
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface AssistantConfig {
  assistantName: string
  businessName: string
  businessType?: string
  channel?: string
  tone?: string
  mainGoal?: string
  instructions?: string
  faqs?: string
  services?: string
  schedule?: string
  fallbackMessage?: string
  language?: string
}

function buildSystemPrompt(config: AssistantConfig): string {
  const tone = config.tone || 'profesional'
  const language = config.language || 'es'
  const goal = config.mainGoal || 'asistir a los clientes'
  const fallback = config.fallbackMessage || 'En este momento no tengo esa información, pero puedo contactarte con un asesor.'

  const languageInstruction = language === 'es'
    ? 'Siempre responde en español.'
    : `Responde en el idioma: ${language}.`

  let systemPrompt = `Eres ${config.assistantName}, el asistente virtual de ${config.businessName}.`

  if (config.businessType) {
    systemPrompt += ` Somos una empresa del sector: ${config.businessType}.`
  }

  systemPrompt += `

Tu objetivo principal es: ${goal}.
${languageInstruction}
Mantén un tono ${tone} en todas tus respuestas.

INSTRUCCIONES CRÍTICAS:
- Sé conciso, claro y útil. Evita respuestas largas innecesarias.
- NO inventes información sobre productos, precios o datos que no se te hayan proporcionado.
- Si no sabes algo, di: "${fallback}"
- Nunca digas que eres un modelo de lenguaje o AI de OpenAI. Eres el asistente de ${config.businessName}.
- Sé comercialmente orientado pero sin ser agresivo.
`

  if (config.instructions) {
    systemPrompt += `\nINSTRUCCIONES ESPECÍFICAS DEL NEGOCIO:\n${config.instructions}\n`
  }

  if (config.services) {
    systemPrompt += `\nPRODUCTOS / SERVICIOS QUE OFRECEMOS:\n${config.services}\n`
  }

  if (config.faqs) {
    systemPrompt += `\nPREGUNTAS FRECUENTES Y RESPUESTAS:\n${config.faqs}\n`
  }

  if (config.schedule) {
    systemPrompt += `\nHORARIO DE ATENCIÓN:\n${config.schedule}\n`
  }

  if (config.channel === 'telegram' || config.channel === 'whatsapp') {
    systemPrompt += `\nEstás respondiendo en ${config.channel === 'telegram' ? 'Telegram' : 'WhatsApp'}. Usa un formato de texto simple, sin markdown complejo.`
  }

  return systemPrompt
}

export async function generateAssistantReply(
  config: AssistantConfig,
  userMessage: string
): Promise<string> {
  const systemPrompt = buildSystemPrompt(config)

  const response = await openai.responses.create({
    model: DEFAULT_OPENAI_MODEL,
    instructions: systemPrompt,
    input: userMessage,
  })

  const text = response.output_text?.trim()

  if (!text) {
    return config.fallbackMessage || 'Lo siento, no pude procesar tu mensaje. Por favor intenta de nuevo.'
  }

  return text
}
