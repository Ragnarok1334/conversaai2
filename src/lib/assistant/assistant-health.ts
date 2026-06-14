import { KnowledgeBlock } from '@/components/dashboard/create-assistant/types'

export type AssistantBaseState = 
  | 'Requiere atención'
  | 'Necesita entrenamiento'
  | 'En configuración'
  | 'Falta instalación'
  | 'Activo'

export type HealthScoreLevel = 'Bajo' | 'Medio' | 'Bueno' | 'Excelente'

export interface AssistantActivityBadges {
  isReceivingConversations: boolean
  isGeneratingLeads: boolean
  hasVerifiedDomain: boolean
  hasPendingDomain: boolean
}

export interface AssistantHealthData {
  baseState: AssistantBaseState
  score: number
  scoreLevel: HealthScoreLevel
  badges: AssistantActivityBadges
  nextStep: string
  trainingQuality: 'Básico' | 'Bueno' | 'Completo'
}

const PLACEHOLDERS = [
  '[Agrega', '[Indica', 'Ej:', '[Precio]', '[Horario]', '[Nombre]', '[Dirección'
]

function getValidContentLength(text?: string | null): number {
  if (!text) return 0
  let cleanText = text
  PLACEHOLDERS.forEach(p => {
    // Basic detection: if the text contains these exact placeholders unedited, we discount their length
    // But to be safer, if it contains placeholders, we might just strip them or if it's mostly placeholders, return 0.
    // Let's just check if it contains "[Agrega" or "[Indica" and it's short.
  })
  
  // Si contiene placeholders obvios sin rellenar, no lo consideramos completo
  if (text.includes('[Agrega ') || text.includes('[Indica ') || text.includes('[Precio]')) {
    return Math.max(0, text.trim().length - 40) // castigo suave
  }
  return text.trim().length
}

export function calculateAssistantHealth(
  assistant: any,
  domains: any[],
  counts: { conversations: number; leads: number }
): AssistantHealthData {
  // 1. Entrenamiento / Knowledge
  let trainingScore = 0
  let quality: 'Básico' | 'Bueno' | 'Completo' = 'Básico'
  
  const blocks: KnowledgeBlock[] = assistant.knowledge_blocks || []
  const hasBlocks = blocks.length > 0
  
  const validChars = getValidContentLength(assistant.instructions)
  const legacyComplete = validChars >= 80

  if (hasBlocks) {
    const activeBlocks = blocks.filter(b => b.is_active && getValidContentLength(b.content) >= 80)
    if (activeBlocks.length > 0) trainingScore += 20
    
    const hasServices = activeBlocks.some(b => b.type === 'services')
    const hasPricing = activeBlocks.some(b => b.type === 'pricing')
    const hasHours = activeBlocks.some(b => b.type === 'hours')
    const hasLocation = activeBlocks.some(b => b.type === 'location')
    
    if (hasServices && hasPricing && hasHours && hasLocation) {
      trainingScore += 20 // Esenciales completos
    }
    
    if (activeBlocks.length >= 6 && hasServices && hasPricing && hasHours && hasLocation) {
      quality = 'Completo'
    } else if (activeBlocks.length >= 3) {
      quality = 'Bueno'
    }
  } else if (legacyComplete) {
    trainingScore += 20
    if (validChars > 300) {
      trainingScore += 20
      quality = 'Completo'
    } else {
      quality = 'Bueno'
    }
  }

  // 2. Canal configurado
  let channelScore = 0
  // Para Fase 1, webchat siempre está disponible si existe el asistente.
  const hasWebchat = true 
  if (hasWebchat) channelScore += 20

  // 3. Instalación
  let installScore = 0
  const hasVerifiedDomain = domains.some(d => d.verification_status === 'verified' || d.verification_status === 'installed')
  const hasPendingDomain = domains.some(d => d.verification_status === 'pending')
  const hasBlockedDomain = domains.some(d => d.verification_status === 'blocked')
  
  if (hasVerifiedDomain) {
    installScore += 20
  }

  // 4. Actividad
  let activityScore = 0
  if (counts.conversations > 0) activityScore += 10
  if (counts.leads > 0) activityScore += 10

  const score = trainingScore + channelScore + installScore + activityScore
  
  let scoreLevel: HealthScoreLevel = 'Bajo'
  if (score >= 90) scoreLevel = 'Excelente'
  else if (score >= 70) scoreLevel = 'Bueno'
  else if (score >= 40) scoreLevel = 'Medio'

  // Determinar Estado Base (Prioridad)
  let baseState: AssistantBaseState = 'Activo'
  
  if (hasBlockedDomain) {
    baseState = 'Requiere atención'
  } else if (trainingScore < 20) {
    baseState = 'Necesita entrenamiento'
  } else if (!hasVerifiedDomain) {
    baseState = 'Falta instalación'
  } else if (counts.conversations === 0) {
    baseState = 'En configuración'
  }

  // Badges de actividad
  const badges: AssistantActivityBadges = {
    isReceivingConversations: counts.conversations > 0,
    isGeneratingLeads: counts.leads > 0,
    hasVerifiedDomain,
    hasPendingDomain
  }

  // Siguiente Paso Recomendado
  let nextStep = 'Tu asistente está listo para operar.'
  
  if (baseState === 'Requiere atención') {
    nextStep = 'Revisa los dominios bloqueados o alertas de configuración.'
  } else if (baseState === 'Necesita entrenamiento') {
    nextStep = 'Completa la base de conocimiento para mejorar respuestas.'
  } else if (baseState === 'En configuración') {
    nextStep = 'Tu asistente está instalado. Pruébalo para recibir la primera conversación.'
  } else if (baseState === 'Falta instalación') {
    if (hasPendingDomain) {
      nextStep = 'Instala el script en tu sitio y verifica la conexión.'
    } else {
      nextStep = 'Autoriza un dominio para instalar el Web Chat.'
    }
  } else if (counts.conversations > 0 && counts.leads === 0) {
    nextStep = 'Revisa conversaciones y ajusta los datos que debe solicitar para capturar leads.'
  } else if (counts.leads > 0) {
    nextStep = 'Revisa tus leads recientes.'
  } else if (counts.conversations === 0) {
    nextStep = 'Genera tráfico a tu sitio web o prueba tu asistente.'
  }

  return {
    baseState,
    score,
    scoreLevel,
    badges,
    nextStep,
    trainingQuality: quality
  }
}
