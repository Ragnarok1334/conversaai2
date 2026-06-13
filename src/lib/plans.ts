import { CONTACT_INFO } from './contact'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const telegramBase = process.env.NEXT_PUBLIC_TELEGRAM_URL || CONTACT_INFO.telegram

export type PlanKey = 'trial' | 'starter' | 'pro' | 'growth' | 'business' | 'enterprise'
export type ChannelKey = 'webchat' | 'telegram' | 'whatsapp'
export type PlanStatus = 'active' | 'cancelled' | 'past_due'
export type PaymentCurrency = 'CLP' | 'USD'

// ─── PRECIOS POR MONEDA ─────────────────────────────────────────────────────
export interface PlanPrices {
  CLP: number | null  // Pesos chilenos (Flow)
  USD: number | null  // Dólares en centavos (PayPal/Cripto). Ej: $9.99 USD = 999 cents
}

export interface PlanConfig {
  key: PlanKey
  label: string
  /** @deprecated Usar prices.CLP. Mantenido por compatibilidad con código existente. */
  priceCLP: number | null
  /** Precios por moneda. Fuente de verdad para todos los proveedores. */
  prices: PlanPrices
  /** Label del precio en CLP para UI */
  priceLabelCLP: string
  /** Label del precio en USD para UI */
  priceLabelUSD: string
  priceLabel: string
  period: string
  description: string
  aiSubtitle: string
  recommended?: boolean
  limits: {
    assistants: number | null
    messagesPerMonth: number | null
    domains: number | null
    users: number | null
  }
  channels: {
    webchat: boolean
    telegram: boolean
    whatsapp: boolean
  }
  features: string[]
  futureFeatures: string[]
  supportLevel: string
  cta: string
  href: string
  purchaseMode: 'trial' | 'checkout' | 'contact' | 'placeholder'
  checkoutUrl?: string
  external?: boolean
  highlighted?: boolean
  badge?: string
}

export const PLAN_CONFIGS: Record<PlanKey, PlanConfig> = {
  trial: {
    key: 'trial',
    label: 'Prueba Gratis',
    priceCLP: 0,
    prices: { CLP: 0, USD: 0 },
    priceLabel: '$0',
    priceLabelCLP: '$0 CLP',
    priceLabelUSD: '$0 USD',
    period: '/ 7 días',
    description: 'Para probar ConversaAI y crear tu primer asistente.',
    aiSubtitle: 'IA básica para probar',
    purchaseMode: 'trial',
    limits: { assistants: 1, messagesPerMonth: 100, domains: 1, users: 1 },
    channels: { webchat: true, telegram: false, whatsapp: false },
    features: [
      '1 asistente IA',
      '100 mensajes de prueba',
      'Canal Web Chat',
      '1 dominio autorizado',
    ],
    futureFeatures: [],
    supportLevel: 'Soporte comunitario',
    cta: 'Comenzar prueba',
    href: '/dashboard/create-assistant',
    highlighted: false,
  },
  starter: {
    key: 'starter',
    label: 'Starter',
    priceCLP: 9990,
    prices: { CLP: 9990, USD: 999 }, // $9.99 USD = 999 centavos
    priceLabel: '$9.990 CLP',
    priceLabelCLP: '$9.990 CLP',
    priceLabelUSD: '$9.99 USD',
    period: '/mes',
    description: 'Ideal para quienes recién comienzan a automatizar su sitio web.',
    aiSubtitle: 'IA estándar para atención simple',
    purchaseMode: 'checkout',
    limits: { assistants: 1, messagesPerMonth: 500, domains: 1, users: 1 },
    channels: { webchat: true, telegram: false, whatsapp: false },
    features: [
      '1 asistente IA',
      '500 mensajes al mes',
      'Canal Web Chat',
      'Leads básicos',
    ],
    futureFeatures: [],
    supportLevel: 'Soporte estándar',
    cta: 'Comprar Starter',
    href: '',
    highlighted: false,
  },
  pro: {
    key: 'pro',
    label: 'Pro',
    priceCLP: 19990,
    prices: { CLP: 19990, USD: 1999 }, // $19.99 USD = 1999 centavos
    priceLabel: '$19.990 CLP',
    priceLabelCLP: '$19.990 CLP',
    priceLabelUSD: '$19.99 USD',
    period: '/mes',
    description: 'Para emprendedores y negocios pequeños que quieren automatizar prospectos.',
    aiSubtitle: 'IA mejorada para vender y captar leads',
    purchaseMode: 'checkout',
    limits: { assistants: 3, messagesPerMonth: 2500, domains: 3, users: 1 },
    channels: { webchat: true, telegram: false, whatsapp: false },
    features: [
      '3 asistentes IA',
      '2.500 mensajes al mes',
      '3 dominios autorizados',
      'Mini CRM e Inbox',
    ],
    futureFeatures: [],
    supportLevel: 'Soporte estándar',
    cta: 'Comprar Pro',
    href: '',
    highlighted: false,
  },
  growth: {
    key: 'growth',
    label: 'Growth',
    priceCLP: 39990,
    prices: { CLP: 39990, USD: 3999 }, // $39.99 USD = 3999 centavos
    priceLabel: '$39.990 CLP',
    priceLabelCLP: '$39.990 CLP',
    priceLabelUSD: '$39.99 USD',
    period: '/mes',
    description: 'Para negocios en expansión con mayor volumen y automatización.',
    aiSubtitle: 'IA avanzada para escalar conversaciones',
    purchaseMode: 'checkout',
    recommended: true,
    limits: { assistants: 8, messagesPerMonth: 8000, domains: 10, users: null },
    channels: { webchat: true, telegram: false, whatsapp: false },
    features: [
      '8 asistentes IA',
      '8.000 mensajes al mes',
      '10 dominios autorizados',
      'Canal Web Chat',
    ],
    futureFeatures: [
      'Canal Telegram',
      'Reportes semanales',
      'Automatizaciones',
    ],
    supportLevel: 'Soporte prioritario',
    cta: 'Comprar Growth',
    href: '',
    highlighted: true,
    badge: 'Recomendado',
  },
  business: {
    key: 'business',
    label: 'Business',
    priceCLP: 69990,
    prices: { CLP: 69990, USD: 6999 }, // $69.99 USD = 6999 centavos
    priceLabel: '$69.990 CLP',
    priceLabelCLP: '$69.990 CLP',
    priceLabelUSD: '$69.99 USD',
    period: '/mes',
    description: 'Para negocios con alto volumen, múltiples sucursales o áreas.',
    aiSubtitle: 'IA avanzada prioritaria para operaciones',
    purchaseMode: 'checkout',
    limits: { assistants: 20, messagesPerMonth: 20000, domains: 25, users: null },
    channels: { webchat: true, telegram: false, whatsapp: false },
    features: [
      '20 asistentes IA',
      '20.000 mensajes al mes',
      '25 dominios autorizados',
      'CRM completo y Analytics',
    ],
    futureFeatures: [
      'Canal Telegram',
      'Equipos (5 usuarios)',
    ],
    supportLevel: 'Soporte prioritario',
    cta: 'Comprar Business',
    href: '',
    highlighted: false,
  },
  enterprise: {
    key: 'enterprise',
    label: 'Enterprise',
    priceCLP: null,
    prices: { CLP: null, USD: null },
    priceLabel: 'Desde $149.990 CLP',
    priceLabelCLP: 'Desde $149.990 CLP',
    priceLabelUSD: 'Desde $149.99 USD',
    period: '',
    description: 'Solución a medida para empresas con integración profunda.',
    aiSubtitle: 'IA personalizada / dedicada',
    purchaseMode: 'contact',
    limits: { assistants: null, messagesPerMonth: null, domains: null, users: null },
    channels: { webchat: true, telegram: false, whatsapp: false },
    features: [
      'Asistentes ilimitados',
      'Mensajes personalizados',
      'Integraciones especiales',
      'Onboarding guiado',
    ],
    futureFeatures: [
      'WhatsApp y Telegram',
      'Roles y permisos',
    ],
    supportLevel: 'Soporte dedicado SLA',
    cta: 'Solicitar plan Enterprise',
    href: '/contact',
    external: true,
    highlighted: false,
  },
}

export interface UserSubscription {
  id: string
  user_id: string
  plan: string
  status: PlanStatus
  assistants_limit: number
  messages_limit: number
  current_messages_used: number
  created_at: string
  updated_at: string
}

// ─── HELPERS UNIFICADOS ─────────────────────────────────────────

export function normalizePlan(plan: unknown): PlanKey {
  const value = String(plan || "trial").toLowerCase().trim()
  if (value.includes("free")) return "trial" // LEGACY: usuarios 'free' se mapean a 'trial'
  if (value.includes("trial")) return "trial"
  if (value.includes("starter")) return "starter"
  if (value.includes("pro")) return "pro"
  if (value.includes("growth")) return "growth"
  if (value.includes("business")) return "business"
  if (value.includes("enterprise")) return "enterprise"
  return "trial"
}

export function getPlanConfig(plan: PlanKey | string): PlanConfig {
  const normalized = normalizePlan(plan)
  return PLAN_CONFIGS[normalized] || PLAN_CONFIGS.trial
}

export function getPlanLimits(plan: PlanKey | string) {
  return getPlanConfig(plan).limits
}

/**
 * Obtiene el precio del plan para la moneda indicada.
 * Para USD, devuelve centavos (ej: $9.99 USD = 999 centavos).
 * Para CLP, devuelve pesos enteros.
 * Devuelve null si el plan no tiene precio definido (enterprise).
 */
export function getPlanPrice(plan: PlanKey | string, currency: PaymentCurrency): number | null {
  const config = getPlanConfig(plan)
  return config.prices[currency]
}

/**
 * Formatea centavos USD a string de precio legible.
 * Ej: 999 → "$9.99"  |  3999 → "$39.99"  |  null → "Personalizado"
 */
export function formatUSD(cents: number | null): string {
  if (cents === null) return 'Personalizado'
  const dollars = cents / 100
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(dollars)
}

export function getRemainingAssistants(plan: PlanKey | string, currentCount: number): number | null {
  const limit = getPlanLimits(plan).assistants
  if (limit === null) return null
  return Math.max(0, limit - currentCount)
}

export function canSendMessage(plan: PlanKey | string, usedMessagesThisMonth: number): boolean {
  const limit = getPlanLimits(plan).messagesPerMonth
  if (limit === null) return true
  return usedMessagesThisMonth < limit
}

export function getRemainingMessages(plan: PlanKey | string, usedMessagesThisMonth: number): number | null {
  const limit = getPlanLimits(plan).messagesPerMonth
  if (limit === null) return null
  return Math.max(0, limit - usedMessagesThisMonth)
}

export function isUnlimited(limit: number | null): boolean {
  return limit === null
}

export function getUsagePercentage(used: number, limit: number | null): number {
  if (limit === null) return 0
  if (limit === 0) return 100
  return Math.min(100, (used / limit) * 100)
}

export function canUseChannel(plan: PlanKey | string, channel: string): boolean {
  const config = getPlanConfig(plan)
  return (config.channels as Record<string, boolean>)[channel] ?? false
}

export function canCreateAssistant(plan: PlanKey | string, currentAssistantCount: number): boolean {
  const limit = getPlanLimits(plan).assistants
  if (limit === null) return true
  return currentAssistantCount < limit
}

export function hasMessagesRemaining(plan: PlanKey | string, currentMessagesUsed: number): boolean {
  const limit = getPlanLimits(plan).messagesPerMonth
  if (limit === null) return true
  return currentMessagesUsed < limit
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

export function formatCLP(amount: number | null): string {
  if (amount === null) return 'Personalizado'
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0
  }).format(amount)
}
