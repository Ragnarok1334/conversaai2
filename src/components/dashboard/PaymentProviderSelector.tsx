'use client'

import { useState } from 'react'
import { PAYMENT_PROVIDERS, type PaymentProvider } from '@/lib/payment-providers'
import { FlowIcon, PayPalIcon, TetherIcon } from '@/components/icons/PaymentIcons'

interface PaymentProviderSelectorProps {
  selected: PaymentProvider
  onChange: (provider: PaymentProvider) => void
}

function ProviderIcon({ provider, size = 22 }: { provider: PaymentProvider; size?: number }) {
  switch (provider) {
    case 'flow':
      return <FlowIcon size={size} />
    case 'paypal':
      return <PayPalIcon size={size} />
    case 'crypto':
      return <TetherIcon size={size} />
  }
}

export function PaymentProviderSelector({ selected, onChange }: PaymentProviderSelectorProps) {
  const [tooltip, setTooltip] = useState<PaymentProvider | null>(null)

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-text-soft uppercase tracking-wider">
        Método de pago
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {(Object.values(PAYMENT_PROVIDERS) as typeof PAYMENT_PROVIDERS[PaymentProvider][]).map((provider) => {
          const isSelected = selected === provider.key
          const isDisabled = !provider.available

          return (
            <div key={provider.key} className="relative">
              <button
                onClick={() => {
                  if (isDisabled) {
                    setTooltip(tooltip === provider.key ? null : provider.key)
                    return
                  }
                  setTooltip(null)
                  onChange(provider.key)
                }}
                aria-label={`Seleccionar ${provider.label}`}
                aria-pressed={isSelected}
                className={`relative w-full flex items-start gap-3 p-4 rounded-2xl border text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/50 ${
                  isDisabled
                    ? 'cursor-pointer opacity-60 border-white/[0.06] bg-white/[0.02]'
                    : isSelected
                    ? 'border-brand-cyan/50 bg-brand-cyan/5 shadow-[0_0_20px_rgba(6,182,212,0.08)]'
                    : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05] cursor-pointer'
                }`}
              >
                {/* Radio dot */}
                <div
                  className={`mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 transition-all ${
                    isSelected && !isDisabled
                      ? 'border-brand-cyan bg-brand-cyan shadow-[0_0_8px_rgba(6,182,212,0.6)]'
                      : isDisabled
                      ? 'border-white/10'
                      : 'border-white/30'
                  }`}
                />

                <div className="flex-1 min-w-0">
                  {/* Header row */}
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <ProviderIcon provider={provider.key} size={20} />
                    <span className="text-sm font-semibold text-white leading-tight">
                      {provider.label}
                    </span>
                    {provider.badge && (
                      <span className="text-[9px] uppercase font-bold tracking-wider bg-white/[0.06] border border-white/10 text-white/40 px-1.5 py-0.5 rounded-md">
                        {provider.badge}
                      </span>
                    )}
                  </div>

                  {/* Currency line */}
                  <p className="text-[11px] text-text-soft mb-1.5">
                    {provider.currency === 'CLP' ? 'Precio en CLP' : 'Precio en USD'}
                  </p>

                  {/* Methods */}
                  <div className="flex flex-wrap gap-1">
                    {provider.methods.slice(0, 2).map((method) => (
                      <span
                        key={method}
                        className="text-[9px] uppercase font-bold tracking-wider bg-white/5 border border-white/10 text-white/40 px-1.5 py-0.5 rounded"
                      >
                        {method}
                      </span>
                    ))}
                  </div>
                </div>
              </button>

              {/* Tooltip for disabled providers */}
              {isDisabled && tooltip === provider.key && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-20 w-52 text-center text-xs bg-[#0B1026] border border-white/10 text-white/70 rounded-xl px-3 py-2 shadow-xl pointer-events-none">
                  Este método estará disponible próximamente.
                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-[#0B1026] border-r border-b border-white/10 rotate-45 -mt-1" />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
