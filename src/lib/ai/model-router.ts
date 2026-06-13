export type AiTask = 
  | 'webchat_message'
  | 'assistant_test'
  | 'improve_training'
  | 'lead_analysis'
  | 'conversation_summary'
  | 'automation_rule'
  | 'support_diagnosis'

export type AiTier = 'economy' | 'standard' | 'improved' | 'advanced' | 'premium' | 'custom' | 'none'

// OPENAI Model defaults mapping via Env variables
export const AI_MODELS: Record<Exclude<AiTier, 'none'>, string> = {
  economy: process.env.OPENAI_MODEL_ECONOMY || 'gpt-4o-mini',
  standard: process.env.OPENAI_MODEL_STANDARD || 'gpt-4.1-mini',
  improved: process.env.OPENAI_MODEL_IMPROVED || 'gpt-4.1-mini',
  advanced: process.env.OPENAI_MODEL_ADVANCED || 'gpt-4.1',
  premium: process.env.OPENAI_MODEL_PREMIUM || 'gpt-4.1',
  custom: process.env.OPENAI_MODEL_CUSTOM || 'gpt-4.1'
}

/**
 * Mapeo general del nivel de IA para cada plan.
 * Determina el baseline de IA del usuario según su suscripción.
 */
export function getAiTierForPlan(plan: string): AiTier {
  const p = plan.toLowerCase()
  if (p.includes('trial') || p.includes('free')) return 'economy'
  if (p.includes('starter')) return 'standard'
  if (p.includes('pro')) return 'improved'
  if (p.includes('growth')) return 'advanced'
  if (p.includes('business')) return 'premium'
  if (p.includes('enterprise')) return 'custom'
  return 'economy'
}

/**
 * Nombre comercial amigable de la IA, a usarse en la Interfaz (Frontend).
 * NUNCA MOSTRAR EL NOMBRE DEL MODELO REAL.
 */
export function getAiPlanLabel(plan: string): string {
  const p = plan.toLowerCase()
  if (p.includes('trial') || p.includes('free')) return 'IA básica'
  if (p.includes('starter')) return 'IA estándar'
  if (p.includes('pro')) return 'IA mejorada'
  if (p.includes('growth')) return 'IA avanzada'
  if (p.includes('business')) return 'IA avanzada prioritaria'
  if (p.includes('enterprise')) return 'IA personalizada / dedicada'
  return 'IA básica'
}

/**
 * Nivel de límite de contexto o historia en la memoria.
 */
export function getMaxContextForPlan(plan: string): string {
  const p = plan.toLowerCase()
  if (p.includes('trial') || p.includes('free')) return 'limitado'
  if (p.includes('starter')) return 'básico'
  if (p.includes('pro')) return 'ampliado'
  if (p.includes('growth')) return 'alto'
  if (p.includes('business')) return 'máximo'
  if (p.includes('enterprise')) return 'personalizado'
  return 'limitado'
}

/**
 * Determina si el nivel base del modelo debe escalar debido a la complejidad de la tarea.
 */
function shouldEscalateModel(tier: AiTier, task: AiTask, context?: any): boolean {
  // No escalar economy o custom.
  if (tier === 'economy' || tier === 'custom' || tier === 'none') return false

  const isComplexTask = task === 'automation_rule' || task === 'lead_analysis' || task === 'conversation_summary'
  const isLongMessage = context?.messageLength && context.messageLength > 500

  // Standard/Improved escalation (solo si es muy compleja)
  if (tier === 'standard' && isComplexTask) return true // sube a improved
  if (tier === 'improved' && (isComplexTask || isLongMessage)) return true // sube a advanced

  // Growth/Business escalate on long contextual logic
  if (tier === 'advanced' && isLongMessage) return true // sube a premium

  return false
}

/**
 * Evalúa las reglas de negocio sobre qué tareas tienen acceso según el plan, y devuelve el Tier ajustado (si aplica escalado).
 */
export function resolveTierForTask(plan: string, task: AiTask, context?: any): AiTier {
  const baseTier = getAiTierForPlan(plan)
  
  if (task === 'webchat_message' || task === 'assistant_test') {
    return baseTier
  }

  if (task === 'improve_training') {
    if (baseTier === 'economy') return 'economy'
    return baseTier
  }

  if (task === 'lead_analysis') {
    if (baseTier === 'economy') return 'none'
    return baseTier
  }

  if (task === 'conversation_summary' || task === 'automation_rule') {
    if (baseTier === 'economy' || baseTier === 'standard') return 'none'
    return baseTier
  }

  if (task === 'support_diagnosis') {
    // Current diagnosis is deterministic, return none unless requested for future explanation
    return 'none'
  }

  return baseTier
}

/**
 * Obtiene el identificador real del modelo de OpenAI según el plan, tarea y contexto.
 * Esta función DEBE usarse en backend/endpoints exclusivamente.
 */
export function getModelForPlan(plan: string, task: AiTask, context?: any): string {
  let tier = resolveTierForTask(plan, task, context)
  
  if (tier === 'none') {
    // Si llegara a pedir un modelo de algo no soportado, usamos fallback mínimo
    return AI_MODELS['economy']
  }

  // Verificar si amerita un escalamiento temporal
  if (shouldEscalateModel(tier, task, context)) {
    if (tier === 'standard') tier = 'improved'
    else if (tier === 'improved') tier = 'advanced'
    else if (tier === 'advanced') tier = 'premium'
  }

  return AI_MODELS[tier as Exclude<AiTier, 'none'>]
}
