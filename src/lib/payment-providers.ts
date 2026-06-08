export type PaymentProvider = 'flow' | 'paypal' | 'crypto'
export type PaymentCurrency = 'CLP' | 'USD'

export interface ProviderConfig {
  key: PaymentProvider
  label: string
  sublabel: string
  description: string
  currency: PaymentCurrency
  /** true = checkout funcional, false = próximamente */
  available: boolean
  icon: string
  checkoutEndpoint: string
  /** Métodos de pago aceptados (para mostrar en UI) */
  methods: string[]
}

export const PAYMENT_PROVIDERS: Record<PaymentProvider, ProviderConfig> = {
  flow: {
    key: 'flow',
    label: 'Flow / Webpay',
    sublabel: 'Pago en pesos chilenos',
    description: 'Tarjetas de crédito, débito y transferencias bancarias en CLP.',
    currency: 'CLP',
    available: true,
    icon: '🏦',
    checkoutEndpoint: '/api/billing/flow/checkout',
    methods: ['Webpay Plus', 'Transferencia', 'Redcompra'],
  },
  paypal: {
    key: 'paypal',
    label: 'PayPal',
    sublabel: 'Pago en dólares (USD)',
    description: 'Paga con tu cuenta PayPal o tarjeta de crédito internacional.',
    currency: 'USD',
    available: false, // Próximamente
    icon: '🌐',
    checkoutEndpoint: '/api/billing/paypal/checkout',
    methods: ['PayPal', 'Visa', 'Mastercard'],
  },
  crypto: {
    key: 'crypto',
    label: 'Cripto',
    sublabel: 'USDT / USDC / BTC / ETH',
    description: 'Pago con criptomonedas. Precio de referencia en USD.',
    currency: 'USD',
    available: false, // Próximamente
    icon: '₿',
    checkoutEndpoint: '/api/billing/crypto/checkout',
    methods: ['USDT', 'USDC', 'Bitcoin', 'Ethereum'],
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
  const labels: Record<string, string> = {
    flow: 'Flow',
    paypal: 'PayPal',
    crypto: 'Cripto',
  }
  return labels[provider] || provider
}
