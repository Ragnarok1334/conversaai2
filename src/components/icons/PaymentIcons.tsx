/**
 * Payment provider icon components.
 * Pure SVG — no external images, no react-icons dependency.
 * Designed to match ConversaAI's dark premium aesthetic.
 */

interface IconProps {
  className?: string
  size?: number
}

/** Flow / Webpay — Chilean bank icon */
export function FlowIcon({ size = 24, className = '' }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Flow / Webpay"
    >
      <rect x="2" y="5" width="20" height="14" rx="3" stroke="#06B6D4" strokeWidth="1.5" />
      <path d="M2 9h20" stroke="#06B6D4" strokeWidth="1.5" />
      <rect x="5" y="13" width="4" height="2" rx="0.5" fill="#06B6D4" opacity="0.7" />
      <rect x="11" y="13" width="6" height="2" rx="0.5" fill="#06B6D4" opacity="0.4" />
    </svg>
  )
}

/** PayPal — stylized "P" mark matching PayPal brand colors */
export function PayPalIcon({ size = 24, className = '' }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="PayPal"
    >
      {/* Outer P shape - dark blue */}
      <path
        d="M6 4h7.5C16.5 4 18.5 6 18 8.5c-.5 2.5-2.5 4-5 4H10l-1 5H6L6 4z"
        fill="#003087"
        opacity="0.85"
      />
      {/* Inner P shape - light blue */}
      <path
        d="M8 6.5h6C16 6.5 17.5 8 17 10c-.4 1.8-1.8 3-3.8 3H10.5l-1 4.5H7L8 6.5z"
        fill="#009CDE"
      />
      {/* Highlight dot */}
      <circle cx="13" cy="9" r="1.5" fill="#012169" opacity="0.6" />
    </svg>
  )
}

/** Tether/USDT — "₮" mark in Tether green */
export function TetherIcon({ size = 24, className = '' }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="USDT / Tether"
    >
      {/* Circle background */}
      <circle cx="12" cy="12" r="10" fill="#26A17B" opacity="0.18" />
      <circle cx="12" cy="12" r="10" stroke="#26A17B" strokeWidth="1.5" />
      {/* ₮ symbol */}
      {/* Top bar */}
      <line x1="6.5" y1="8" x2="17.5" y2="8" stroke="#26A17B" strokeWidth="2" strokeLinecap="round" />
      {/* Vertical stem */}
      <line x1="12" y1="8" x2="12" y2="11.5" stroke="#26A17B" strokeWidth="2" strokeLinecap="round" />
      {/* Middle bar (shorter) */}
      <line x1="8" y1="13" x2="16" y2="13" stroke="#26A17B" strokeWidth="1.5" strokeLinecap="round" />
      {/* Bottom stem */}
      <line x1="12" y1="13" x2="12" y2="17" stroke="#26A17B" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

/** Generic crypto icon for when no specific token is selected */
export function CryptoIcon({ size = 24, className = '' }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Criptomonedas"
    >
      <circle cx="12" cy="12" r="10" fill="url(#cryptoGrad)" opacity="0.15" />
      <circle cx="12" cy="12" r="10" stroke="url(#cryptoGrad)" strokeWidth="1.5" />
      {/* Bitcoin-inspired B shape */}
      <path
        d="M9.5 7h3.5c1.5 0 2.5.8 2.5 2s-.8 1.5-1.5 1.7c1 .2 2 .9 2 2.3 0 1.6-1.2 2.5-3 2.5H9.5V7z"
        stroke="#F7931A"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <line x1="9.5" y1="12.7" x2="13.5" y2="12.7" stroke="#F7931A" strokeWidth="1.2" />
      <line x1="10" y1="6" x2="10" y2="8" stroke="#F7931A" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="12" y1="6" x2="12" y2="8" stroke="#F7931A" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="10" y1="16" x2="10" y2="18" stroke="#F7931A" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="12" y1="16" x2="12" y2="18" stroke="#F7931A" strokeWidth="1.2" strokeLinecap="round" />
      <defs>
        <linearGradient id="cryptoGrad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F7931A" />
          <stop offset="1" stopColor="#F4D03F" />
        </linearGradient>
      </defs>
    </svg>
  )
}
