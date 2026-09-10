import OpenAI from 'openai'
import 'server-only'

export const DEFAULT_OPENAI_MODEL = 'gpt-4.1-mini'

let openaiClient: OpenAI | null = null

// Se crea bajo demanda: Vercel puede importar esta ruta durante el build,
// cuando los secretos de runtime todavía no están disponibles.
function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY no está configurada en el servidor.')
  }

  openaiClient ??= new OpenAI({ apiKey })
  return openaiClient
}

import { buildAssistantSystemPrompt, type Assistant } from './assistant/buildPrompt'
import { normalizeBehavior } from './assistant/behavior'

export interface AssistantConfig extends Partial<Assistant> {
  // Legacy fields for backward compatibility during transition
  assistantName?: string
  businessName?: string
  businessType?: string
  mainGoal?: string
  channel?: string
  tone?: string
  instructions?: string
  faqs?: string
  services?: string
  schedule?: string
  fallbackMessage?: string
  language?: string
  knowledge_blocks?: any[] | null
}

export interface AssistantConversationMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AssistantRuntimeContext {
  knownLead?: {
    name?: string | null
    hasEmail?: boolean
    hasPhone?: boolean
  }
}

// Se reemplazó buildSystemPrompt por buildAssistantSystemPrompt

export async function generateAssistantReply(
  config: AssistantConfig,
  userMessage: string,
  model: string = DEFAULT_OPENAI_MODEL,
  history: AssistantConversationMessage[] = [],
  runtimeContext: AssistantRuntimeContext = {}
): Promise<string> {
  const baseSystemPrompt = buildAssistantSystemPrompt({
    assistant_name: config.assistantName || config.assistant_name,
    business_name: config.businessName || config.business_name,
    business_type: config.businessType || config.business_type,
    channel: config.channel,
    instructions: config.instructions,
    faqs: config.faqs,
    services: config.services,
    business_hours: config.schedule || config.business_hours,
    fallback_message: config.fallbackMessage || config.fallback_message,
    language: config.language,
    knowledge_blocks: config.knowledge_blocks,
    behavior: config.behavior || {
      tone: config.tone,
      goal: config.mainGoal,
      salesLevel: 'Medium'
    }
  })

  const knownLead = runtimeContext.knownLead
  const knownFields = [
    knownLead?.name ? 'nombre' : null,
    knownLead?.hasEmail ? 'correo electrónico' : null,
    knownLead?.hasPhone ? 'teléfono' : null,
  ].filter(Boolean)
  const sessionContext = knownFields.length > 0
    ? `\n\nCONTEXTO OPERATIVO DE ESTA CONVERSACIÓN:\n- Ya contamos con: ${knownFields.join(', ')}.${knownLead?.name ? ` El nombre del visitante es ${knownLead.name}.` : ''}\n- No vuelvas a solicitar ninguno de esos datos. Continúa desde el interés más reciente del visitante.\n- No repitas el correo o teléfono completo en tu respuesta; basta con confirmar que ya lo tienes.`
    : ''
  const systemPrompt = `${baseSystemPrompt}${sessionContext}`
  const responseStyle = normalizeBehavior(config.behavior).responseStyle
  const maxOutputTokens = responseStyle === 'Breves' ? 90 : responseStyle === 'Detalladas' ? 280 : 160

  const response = await getOpenAIClient().responses.create({
    model: model,
    instructions: systemPrompt,
    max_output_tokens: maxOutputTokens,
    input: [
      ...history.map(message => ({ role: message.role, content: message.content })),
      { role: 'user' as const, content: userMessage },
    ],
  })

  const text = response.output_text?.trim()

  if (!text) {
    return config.fallbackMessage || config.fallback_message || 'Lo siento, no pude procesar tu mensaje. Por favor intenta de nuevo.'
  }

  return text
}
