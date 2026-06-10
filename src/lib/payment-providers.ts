export type PaymentProvider = 'flow' | 'paypal' | 'crypto'
export type PaymentCurrency = 'CLP' | 'USD'

export interface ProviderConfig {
  key: PaymentProvider
  label: string
  shortLabel: string
  description: string
  currency: PaymentCurrency
  /** true = checkout funcional; false = stub/próximamente */
  available: boolean
  /** Badge to show on unavailable providers */
  badge?: string
  /** Emoji fallback if SVG icon fails */
  iconFallback: string
  checkoutEndpoint: string
  /** Payment methods accepted (for UI display) */
  methods: string[]
}

export const PAYMENT_PROVIDERS: Record<PaymentProvider, ProviderConfig> = {
  flow: {
    key: 'flow',
    label: 'Flow / Webpay',
    shortLabel: 'Flow',
    description: 'Tarjetas de crédito, débito y transferencias en pesos chilenos.',
    currency: 'CLP',
    available: true,
    iconFallback: '🏦',
    checkoutEndpoint: '/api/billing/flow/checkout',
    methods: ['Webpay Plus', 'Transferencia', 'Redcompra'],
  },
  paypal: {
    key: 'paypal',
    label: 'PayPal',
    shortLabel: 'PayPal',
    description: 'Paga en dólares con tu cuenta PayPal o tarjeta internacional.',
    currency: 'USD',
    available: false,
    badge: 'Próximamente',
    iconFallback: '🌐',
    checkoutEndpoint: '/api/billing/paypal/checkout',
    methods: ['PayPal', 'Tarjeta internacional'],
  },
  crypto: {
    key: 'crypto',
    label: 'Cripto',
    shortLabel: 'USDT / USDC',
    description: 'Pago con criptomonedas. Precio de referencia en dólares.',
    currency: 'USD',
    available: false,
    badge: 'Próximamente',
    iconFallback: '₮',
    checkoutEndpoint: '/api/billing/crypto/checkout',
    methods: ['USDT', 'USDC', 'BTC', 'ETH'],
  },
}

export const ALLOWED_PROVIDERS: PaymentProvider[] = ['flow', 'paypal', 'crypto']

export function isValidProvider(provider: unknown): provider is PaymentProvider {
  return typeof provider === 'string' && ALLOWED_PROVIDERS.includes(provider as PaymentProvider)
}

export function getProviderConfig(provider: PaymentProvider | string): ProviderConfig {
  return PAYMENT_PROVIDERS[provider as PaymentProvider] || PAYMENT_PROVIDERS.flow
}

export function getProviderLabel(provider: string): string {
  const config = PAYMENT_PROVIDERS[provider as PaymentProvider]
  return config?.shortLabel || (provider ? provider.toUpperCase() : 'Pago')
}

export function getProviderBadge(provider: string): string {
  const labels: Record<string, string> = {
    flow: 'FLOW',
    paypal: 'PAYPAL',
    crypto: 'CRYPTO',
  }
  return labels[provider] || (provider ? provider.toUpperCase() : 'PAGO')
}
