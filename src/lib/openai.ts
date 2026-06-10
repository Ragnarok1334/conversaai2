import OpenAI from 'openai'

export const DEFAULT_OPENAI_MODEL = 'gpt-4.1-mini'

// Server-only client — never import this in client components
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

import { buildAssistantSystemPrompt, type Assistant } from './assistant/buildPrompt'

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

// Se reemplazó buildSystemPrompt por buildAssistantSystemPrompt

export async function generateAssistantReply(
  config: AssistantConfig,
  userMessage: string
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

  const response = await openai.responses.create({
    model: DEFAULT_OPENAI_MODEL,
    instructions: systemPrompt,
    input: userMessage,
  })

  const text = response.output_text?.trim()

  if (!text) {
    return config.fallbackMessage || config.fallback_message || 'Lo siento, no pude procesar tu mensaje. Por favor intenta de nuevo.'
  }

  return text
}
