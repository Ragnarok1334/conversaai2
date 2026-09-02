import OpenAI from 'openai'
import { buildAssistantSystemPrompt, type Assistant } from './assistant/buildPrompt'

export const DEFAULT_OPENAI_MODEL = 'gpt-4.1-mini'

// Server-only client — initialized lazily so a missing build-time secret
// cannot crash Next.js while it is collecting route/page data.
function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY?.trim()

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured')
  }

  return new OpenAI({ apiKey })
}

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

export async function generateAssistantReply(
  config: AssistantConfig,
  userMessage: string,
  model: string = DEFAULT_OPENAI_MODEL
): Promise<string> {
  const systemPrompt = buildAssistantSystemPrompt({
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

  const openai = getOpenAIClient()
  const response = await openai.responses.create({
    model,
    instructions: systemPrompt,
    input: userMessage,
  })

  const text = response.output_text?.trim()

  if (!text) {
    return config.fallbackMessage || config.fallback_message || 'Lo siento, no pude procesar tu mensaje. Por favor intenta de nuevo.'
  }

  return text
}
