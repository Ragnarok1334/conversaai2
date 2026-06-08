'use client'

import { PAYMENT_PROVIDERS, type PaymentProvider } from '@/lib/payment-providers'

interface PaymentProviderSelectorProps {
  selected: PaymentProvider
  onChange: (provider: PaymentProvider) => void
}

export function PaymentProviderSelector({ selected, onChange }: PaymentProviderSelectorProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-text-soft uppercase tracking-wider">Método de pago</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {Object.values(PAYMENT_PROVIDERS).map((provider) => {
          const isSelected = selected === provider.key
          const isDisabled = !provider.available

          return (
            <button
              key={provider.key}
              onClick={() => !isDisabled && onChange(provider.key)}
              disabled={isDisabled}
              aria-label={`Seleccionar ${provider.label}`}
              className={`relative flex items-start gap-3 p-4 rounded-2xl border text-left transition-all duration-200 ${
                isDisabled
                  ? 'opacity-50 cursor-not-allowed border-white/5 bg-white/[0.02]'
                  : isSelected
                  ? 'border-brand-cyan/50 bg-brand-cyan/5 shadow-[0_0_20px_rgba(6,182,212,0.08)]'
                  : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05] cursor-pointer'
              }`}
            >
              {/* Radio indicator */}
              <div className={`mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 transition-all ${
                isSelected && !isDisabled
                  ? 'border-brand-cyan bg-brand-cyan shadow-[0_0_8px_rgba(6,182,212,0.5)]'
                  : 'border-white/20'
              }`} />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-base">{provider.icon}</span>
                  <span className="text-sm font-semibold text-white leading-tight">{provider.label}</span>
                  {isDisabled && (
                    <span className="text-[9px] uppercase font-bold tracking-wider bg-white/5 border border-white/10 text-white/40 px-1.5 py-0.5 rounded-md">
                      Próximamente
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-text-soft mt-1 leading-snug">{provider.sublabel}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {provider.methods.slice(0, 2).map((method) => (
                    <span key={method} className="text-[9px] uppercase font-bold tracking-wider bg-white/5 border border-white/10 text-white/50 px-1.5 py-0.5 rounded">
                      {method}
                    </span>
                  ))}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
