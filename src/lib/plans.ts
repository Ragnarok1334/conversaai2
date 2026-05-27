export type PlanKey = 'free' | 'pro' | 'business' | 'enterprise'
export type ChannelKey = 'webchat' | 'telegram' | 'whatsapp'
export type PlanStatus = 'active' | 'cancelled' | 'past_due'

export interface PlanFeature {
  name: string
}

import { CONTACT_INFO } from './contact'

const telegramBase = process.env.NEXT_PUBLIC_TELEGRAM_URL || CONTACT_INFO.telegram

export interface PlanConfig {
  key: PlanKey
  label: string
  price: string
  period: string
  description: string
  assistantsLimit: number | null // null means unlimited
  messagesLimit: number | null   // null means unlimited
  channels: ChannelKey[]
  popular?: boolean
  features: string[]
  cta: string
  href: string
  // TODO: Implement payment gateway. This URL will be used to generate the checkout session.
  checkoutUrl?: string
  external?: boolean
  highlighted?: boolean
  badge?: string
}

export const PLAN_CONFIGS: Record<PlanKey, PlanConfig> = {
  free: {
    key: 'free',
    label: 'Free',
    price: '$0',
    period: '/mes',
    description: 'Para probar ConversaAI y crear tu primer asistente.',
    assistantsLimit: 1,
    messagesLimit: 100,
    channels: ['webchat'],
    features: [
      '1 asistente IA',
      '100 mensajes al mes',
      'Canal Web Chat',
      'Playground básico',
      'Soporte comunitario',
    ],
    cta: 'Crear asistente',
    href: '/dashboard/create-assistant',
    highlighted: false
  },
  pro: {
    key: 'pro',
    label: 'Pro',
    price: '$19',
    period: '/mes',
    description: 'Ideal para emprendedores y negocios pequeños que quieren automatizar conversaciones.',
    assistantsLimit: 5,
    messagesLimit: 5000,
    channels: ['webchat', 'telegram', 'whatsapp'],
    features: [
      '5 asistentes IA',
      '5,000 mensajes al mes',
      'Web Chat, Telegram y WhatsApp',
      'Captura de leads',
      'Historial de conversaciones',
      'Soporte prioritario',
    ],
    cta: 'Contratar Pro',
    href: '/dashboard/billing/checkout?plan=pro',
    checkoutUrl: '/api/checkout', // TODO: Connect to Stripe/MercadoPago API route
    highlighted: false
  },
  business: {
    key: 'business',
    label: 'Business',
    price: '$49',
    period: '/mes',
    description: 'Para negocios con más volumen, más canales y automatización avanzada.',
    assistantsLimit: 20,
    messagesLimit: 50000,
    channels: ['webchat', 'telegram', 'whatsapp'],
    features: [
      '20 asistentes IA',
      '50,000 mensajes al mes',
      'Todos los canales',
      'Analytics avanzados',
      'Branding personalizado',
      'API y Webhooks',
      'Soporte prioritario',
    ],
    cta: 'Contratar Business',
    href: '/dashboard/billing/checkout?plan=business',
    checkoutUrl: '/api/checkout', // TODO: Connect to Stripe/MercadoPago API route
    highlighted: true,
    badge: 'Más popular'
  },
  enterprise: {
    key: 'enterprise',
    label: 'Enterprise',
    price: 'Personalizado',
    period: '',
    description: 'Solución a medida para empresas que necesitan infraestructura dedicada y soporte directo.',
    assistantsLimit: null,
    messagesLimit: null,
    channels: ['webchat', 'telegram', 'whatsapp'],
    features: [
      'Asistentes ilimitados',
      'Mensajes personalizados',
      'Infraestructura dedicada',
      'SLA empresarial',
      'Integraciones custom',
      'Soporte dedicado',
    ],
    cta: 'Hablar por Telegram',
    href: `${telegramBase}?text=Hola,%20quiero%20información%20sobre%20el%20plan%20Enterprise%20de%20ConversaAI`,
    external: true,
    highlighted: false
  },
}

export interface UserSubscription {
  id: string
  user_id: string
  plan: PlanKey
  status: PlanStatus
  assistants_limit: number
  messages_limit: number
  current_messages_used: number
  created_at: string
  updated_at: string
}

// ─── PLAN_LIMITS: source of truth with Infinity for enterprise ───────────────
export const PLAN_LIMITS = {
  free: {
    assistants: 1,
    messagesPerMonth: 100,
    channels: { webchat: true, telegram: false, whatsapp: false },
    features: {
      playground: true, leadCapture: false, conversationHistory: false,
      advancedAnalytics: false, customBranding: false, apiWebhooks: false,
    },
  },
  pro: {
    assistants: 5,
    messagesPerMonth: 5000,
    channels: { webchat: true, telegram: true, whatsapp: false },
    features: {
      playground: true, leadCapture: true, conversationHistory: true,
      advancedAnalytics: false, customBranding: false, apiWebhooks: false,
    },
  },
  business: {
    assistants: 20,
    messagesPerMonth: 50000,
    channels: { webchat: true, telegram: true, whatsapp: true },
    features: {
      playground: true, leadCapture: true, conversationHistory: true,
      advancedAnalytics: true, customBranding: true, apiWebhooks: true,
    },
  },
  enterprise: {
    assistants: Infinity,
    messagesPerMonth: Infinity,
    channels: { webchat: true, telegram: true, whatsapp: true },
    features: {
      playground: true, leadCapture: true, conversationHistory: true,
      advancedAnalytics: true, customBranding: true, apiWebhooks: true,
      dedicatedSupport: true, customIntegrations: true,
    },
  },
} as const

export function getPlanLimits(plan: PlanKey) {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.free
}

export function normalizePlan(plan: unknown): PlanKey {
  if (plan === 'pro' || plan === 'business' || plan === 'enterprise') return plan
  return 'free'
}

export function getRemainingAssistants(plan: PlanKey, currentCount: number): number | null {
  const limit = getPlanLimits(plan).assistants
  if (limit === Infinity) return null
  return Math.max(0, limit - currentCount)
}

export function canSendMessage(plan: PlanKey, usedMessagesThisMonth: number): boolean {
  const limit = getPlanLimits(plan).messagesPerMonth
  if (limit === Infinity) return true
  return usedMessagesThisMonth < limit
}

export function getRemainingMessages(plan: PlanKey, usedMessagesThisMonth: number): number | null {
  const limit = getPlanLimits(plan).messagesPerMonth
  if (limit === Infinity) return null
  return Math.max(0, limit - usedMessagesThisMonth)
}

// ─── Legacy helpers (keep for backward compatibility) ─────────────────────────
export function getPlanConfig(plan: PlanKey): PlanConfig {
  return PLAN_CONFIGS[plan] || PLAN_CONFIGS.free
}

export function isUnlimited(limit: number | null): boolean {
  return limit === null
}

export function getUsagePercentage(used: number, limit: number | null): number {
  if (limit === null) return 0
  if (limit === 0) return 100
  return Math.min(100, (used / limit) * 100)
}

export function canUseChannel(plan: PlanKey, channel: string): boolean {
  const config = getPlanConfig(plan)
  return config.channels.includes(channel as ChannelKey)
}

export function canCreateAssistant(plan: PlanKey, currentAssistantCount: number): boolean {
  const config = getPlanConfig(plan)
  if (config.assistantsLimit === null) return true
  return currentAssistantCount < config.assistantsLimit
}

export function hasMessagesRemaining(plan: PlanKey, currentMessagesUsed: number): boolean {
  const config = getPlanConfig(plan)
  if (config.messagesLimit === null) return true
  return currentMessagesUsed < config.messagesLimit
}

export function formatLimit(limit: number | null): string {
  if (limit === null) return 'Ilimitado'
  return limit.toLocaleString()
}

export function getChannelLabel(channel: string): string {
  const map: Record<string, string> = {
    webchat: 'Web Chat',
    telegram: 'Telegram',
    whatsapp: 'WhatsApp'
  }
  return map[channel] || channel
}
