const ZERO_WIDTH = /[\u200B-\u200D\u2060\uFEFF]/g

const DIRECT_INJECTION_PATTERNS = [
  /\b(?:ignore|disregard|forget|override|bypass|ignora|olvida|omite|anula|sobrescribe|desobedece)\b.{0,100}\b(?:previous|prior|above|system|developer|instructions?|rules?|anteriores?|previas?|sistema|reglas?|instrucciones?)\b/i,
  /\b(?:reveal|show|print|dump|repeat|copy|display|extract|revela|muestra|imprime|copia|repite|extrae)\b.{0,100}\b(?:system prompt|developer message|hidden instructions|knowledge base|prompt del sistema|mensaje del desarrollador|instrucciones internas|base de conocimiento|secrets?|secretos?|api keys?|tokens?)\b/i,
  /<\/?(?:system|developer|assistant|knowledge_data|tool|function)[^>]*>/i,
  /\b(?:jailbreak|do anything now|developer mode|modo desarrollador|modo dan|prompt injection)\b/i,
  /\b(?:env|environment variables?|variables? de entorno|process\.env)\b.{0,80}\b(?:show|print|list|reveal|muestra|imprime|lista|revela)\b/i,
]

const OUTPUT_LEAK_PATTERNS = [
  /<\/?knowledge_data>/i,
  /SEGURIDAD CONTRA PROMPT INJECTION/i,
  /REGLAS ESTRICTAS QUE DEBES CUMPLIR/i,
  /CONTEXTO OPERATIVO DE ESTA CONVERSACI[ÓO]N/i,
  /\b(?:OPENAI_API_KEY|SUPABASE_SERVICE_ROLE_KEY|META_APP_SECRET|WHATSAPP_APP_SECRET|TOKEN_ENCRYPTION_KEY)\b/i,
  /\b(?:sk-[A-Za-z0-9_-]{16,}|EAA[A-Za-z0-9_-]{20,})\b/,
]

export const PROMPT_INJECTION_REFUSAL = 'No puedo cambiar mis reglas internas ni revelar configuración privada. Sí puedo ayudarte con consultas legítimas sobre este negocio.'

export function normalizeUntrustedText(value: string): string {
  return value.normalize('NFKC').replace(ZERO_WIDTH, '').replace(/\0/g, '').trim()
}

export function isPromptInjectionAttempt(value: string): boolean {
  const normalized = normalizeUntrustedText(value)
  return normalized.length > 0 && DIRECT_INJECTION_PATTERNS.some(pattern => pattern.test(normalized))
}

export function sanitizeConversationHistory<T extends { role: 'user' | 'assistant'; content: string }>(history: T[]): T[] {
  return history.map(message => {
    const content = normalizeUntrustedText(message.content).slice(0, 2000)
    if (message.role === 'user' && isPromptInjectionAttempt(content)) {
      return { ...message, content: '[Mensaje anterior omitido por seguridad]' }
    }
    return { ...message, content }
  })
}

export function containsProtectedPromptLeak(value: string, canary?: string): boolean {
  if (canary && value.includes(canary)) return true
  return OUTPUT_LEAK_PATTERNS.some(pattern => pattern.test(value))
}
