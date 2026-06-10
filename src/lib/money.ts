/**
 * Central money formatting helpers for ConversaAI.
 * CLP: no decimals, locale es-CL
 * USD: 2 decimals, stored as cents (999 → $9.99)
 * Crypto: up to 8 decimals, no forced rounding
 */

/**
 * Formats CLP amount (integer pesos).
 * Example: formatCLP(39990) → "$39.990 CLP"
 */
export function formatCLP(amount: number | null): string {
  if (amount === null) return 'Personalizado'
  return (
    new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0,
    }).format(amount) + ' CLP'
  )
}

/**
 * Formats USD amount stored as CENTS (integer).
 * Example: formatUSDCents(3999) → "$39.99 USD"
 * Example: formatUSDCents(999)  → "$9.99 USD"
 */
export function formatUSDCents(cents: number | null): string {
  if (cents === null) return 'Personalizado'
  const dollars = cents / 100
  return (
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(dollars) + ' USD'
  )
}

/**
 * Formats USD amount stored as decimal dollars.
 * Example: formatUSDDecimal(39.99) → "$39.99 USD"
 */
export function formatUSDDecimal(amount: number | null): string {
  if (amount === null) return 'Personalizado'
  return (
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount) + ' USD'
  )
}

/**
 * Formats a crypto amount with up to 8 decimal places.
 * Example: formatCryptoAmount(0.00059, "BTC") → "0.00059000 BTC"
 * Example: formatCryptoAmount(39.99, "USDT") → "39.99 USDT"
 */
export function formatCryptoAmount(amount: number, symbol: string): string {
  const isSmall = amount < 0.01
  const formatted = isSmall
    ? amount.toFixed(8).replace(/0+$/, '').replace(/\.$/, '')
    : amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 })
  return `${formatted} ${symbol}`
}

/**
 * Universal formatter that dispatches by currency.
 * - CLP: amount in integer pesos
 * - USD: amount in CENTS (integer)
 * - crypto: passed as decimal with symbol in meta
 */
export function formatMoney(amount: number | null, currency: string): string {
  if (amount === null) return 'Personalizado'
  switch (currency.toUpperCase()) {
    case 'CLP':
      return formatCLP(amount)
    case 'USD':
      // If amount looks like dollars (< 10000), treat as decimal; else treat as cents
      return amount < 10000
        ? formatUSDDecimal(amount)
        : formatUSDCents(amount)
    default:
      return `${amount} ${currency}`
  }
}
