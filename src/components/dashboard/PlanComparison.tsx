'use client'

import { useState } from 'react'
import { Check, X, Clock, Building2 } from 'lucide-react'
import type { PlanConfig } from '@/lib/plans'
import { PAYMENT_PROVIDERS, type PaymentProvider } from '@/lib/payment-providers'
import { PaymentProviderSelector } from './PaymentProviderSelector'
import { useRouter } from 'next/navigation'

interface PlanComparisonProps {
  plans: PlanConfig[]
  currentPlan: string
  trialUsed: boolean
}

export function PlanComparison({ plans, currentPlan, trialUsed }: PlanComparisonProps) {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [startingTrial, setStartingTrial] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider>('flow')
  const router = useRouter()

  const providerConfig = PAYMENT_PROVIDERS[selectedProvider]

  const handleCheckout = async (planKey: string) => {
    // Guard: don't call unavailable providers
    if (!providerConfig.available) {
      setError(`${providerConfig.label} estará disponible próximamente.`)
      return
    }

    setLoadingPlan(planKey)
    setError(null)
    try {
      const res = await fetch(providerConfig.checkoutEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planKey, provider: selectedProvider })
      })

      const contentType = res.headers.get("content-type") || ""
      if (!contentType.includes("application/json")) {
        throw new Error("El servidor devolvió una respuesta inválida (No es JSON).")
      }

      const data = await res.json()

      if (!res.ok) {
        let finalError = data.error || 'No se pudo iniciar el pago. Intenta nuevamente.'
        if (data.details) finalError = `${finalError} ${data.details}`
        throw new Error(finalError)
      }

      if (data.url) {
        window.location.assign(data.url)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setLoadingPlan(null)
    }
  }

  const handleStartTrial = async () => {
    setStartingTrial(true)
    setError(null)
    try {
      const res = await fetch('/api/billing/trial/start', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al iniciar prueba')
      
      router.refresh()
    } catch (err: any) {
      setError(err.message)
      setStartingTrial(false)
    }
  }

  const corePlans = plans.filter(p => ['starter', 'pro', 'growth', 'business'].includes(p.key))
  const trialPlan = plans.find(p => p.key === 'trial')!
  const enterprisePlan = plans.find(p => p.key === 'enterprise')!

  const hasPaidPlan = currentPlan !== 'trial' && currentPlan !== 'free'

  return (
    <div className="space-y-12 pt-4">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* TRIAL BLOCK */}
      {!hasPaidPlan && (
        <div className="relative rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden backdrop-blur-2xl bg-white/[0.03] border border-brand-cyan/20 shadow-[0_0_40px_rgba(6,182,212,0.06)]">
          <div className="absolute inset-0 bg-gradient-to-br from-[#06B6D4]/5 to-transparent opacity-60 pointer-events-none" />
          <div className="relative z-10 flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-2xl font-bold text-white">Prueba Gratis</h3>
              <span className="bg-brand-cyan/20 text-brand-cyan text-xs font-bold uppercase tracking-wider py-1 px-3 rounded-full">7 días</span>
            </div>
            <p className="text-[#94A3B8] text-sm max-w-lg">
              Crea tu primer asistente y prueba el poder de ConversaAI sin ingresar tarjeta de crédito.
            </p>
          </div>
          <div className="relative z-10 shrink-0 w-full md:w-auto">
            {currentPlan === 'trial' ? (
              <button disabled className="w-full md:w-auto px-8 py-3 rounded-xl text-sm font-semibold bg-white/5 border border-white/10 text-white/50 cursor-not-allowed">
                Plan activo
              </button>
            ) : trialUsed ? (
              <button disabled className="w-full md:w-auto px-8 py-3 rounded-xl text-sm font-semibold bg-white/5 border border-white/10 text-white/50 cursor-not-allowed">
                Prueba ya utilizada
              </button>
            ) : (
              <button 
                onClick={handleStartTrial}
                disabled={startingTrial}
                className="w-full md:w-auto px-8 py-3 rounded-xl text-sm font-semibold transition-all duration-300 text-center bg-brand-cyan/10 border border-brand-cyan/30 text-brand-cyan hover:bg-brand-cyan/20 hover:scale-[1.02]"
              >
                {startingTrial ? 'Activando...' : 'Comenzar prueba'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* PAYMENT PROVIDER SELECTOR */}
      <PaymentProviderSelector
        selected={selectedProvider}
        onChange={(p) => { setSelectedProvider(p); setError(null) }}
      />

      {/* CORE PLANS */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {corePlans.map((plan) => {
          const isCurrent = currentPlan === plan.key
          const isLoading = loadingPlan === plan.key

          return (
            <div 
              key={plan.key}
              className={`relative rounded-[2rem] p-6 flex flex-col transition-all overflow-hidden ${
                plan.highlighted 
                  ? 'border border-[#7C3AED]/50 bg-white/[0.04] shadow-[0_0_30px_rgba(124,58,237,0.15)]' 
                  : 'bg-card-bg border border-card-border hover:border-white/20'
              }`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#7C3AED]/5 via-transparent to-[#06B6D4]/5 opacity-60 pointer-events-none" />
              {plan.badge && (
                <div className="absolute -top-0 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#7C3AED] via-[#2563EB] to-[#06B6D4] text-white text-xs font-bold uppercase tracking-wider py-1 px-3 rounded-b-lg shadow-md">
                  {plan.badge}
                </div>
              )}
              {isCurrent && !plan.badge && (
                <div className="absolute -top-0 left-1/2 -translate-x-1/2 bg-white/10 border border-white/20 backdrop-blur-md text-white text-xs font-bold uppercase tracking-wider py-1 px-3 rounded-b-lg shadow-md">
                  Plan actual
                </div>
              )}
              
              <div className="relative z-10 flex-1 flex flex-col">
                <h3 className="text-xl font-bold mb-2 mt-4">{plan.label}</h3>
                <div className="mb-2 flex items-baseline gap-1">
                  <span className={`font-bold ${plan.priceLabelCLP.length > 8 ? 'text-2xl' : 'text-3xl'}`}>
                    {selectedProvider === 'flow' ? plan.priceLabelCLP : plan.priceLabelUSD}
                  </span>
                  <span className="text-text-soft text-sm">{plan.period}</span>
                </div>
                {selectedProvider !== 'flow' && (
                  <p className="text-[11px] text-text-soft mb-4">
                    Equiv. aprox. {plan.priceLabelCLP} con Flow Chile
                  </p>
                )}
                
                <ul className="space-y-3 flex-1 mb-6">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                      <Check className="w-4 h-4 text-brand-success shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                {plan.futureFeatures && plan.futureFeatures.length > 0 && (
                  <div className="mb-6 pt-4 border-t border-white/5 flex flex-wrap gap-2">
                    {plan.futureFeatures.map((feature, fIndex) => (
                      <span key={fIndex} className="bg-white/5 border border-white/10 text-white/60 text-[10px] uppercase font-bold tracking-wider py-1 px-2 rounded-md">
                        {feature} ⏱
                      </span>
                    ))}
                  </div>
                )}

                {isCurrent ? (
                  <button disabled className="w-full py-3 mt-auto rounded-xl text-sm font-semibold border border-white/10 bg-white/[0.02] text-text-soft opacity-60 cursor-not-allowed">
                    Plan activo
                  </button>
                ) : (
                  <button
                    onClick={() => handleCheckout(plan.key)}
                    disabled={!!loadingPlan}
                    className={`w-full py-3 mt-auto rounded-xl text-sm font-semibold transition-all duration-300 text-center inline-flex items-center justify-center gap-2 ${
                      plan.highlighted
                        ? 'bg-gradient-to-r from-[#7C3AED] via-[#2563EB] to-[#06B6D4] text-white hover:opacity-90 disabled:opacity-70'
                        : 'bg-white/[0.06] border border-white/10 text-white hover:bg-white/10 disabled:opacity-50'
                    }`}
                  >
                    {isLoading ? 'Conectando...' : plan.cta}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* ENTERPRISE BLOCK */}
      <div className="relative rounded-[2rem] p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-8 overflow-hidden backdrop-blur-2xl bg-gradient-to-r from-brand-violet/5 via-brand-cyan/5 to-transparent border border-white/10 shadow-[0_0_40px_rgba(124,58,237,0.06)]">
        <div className="relative z-10 flex-1">
          <div className="flex items-center gap-3 mb-4">
            <Building2 className="w-8 h-8 text-brand-violet" />
            <h3 className="text-3xl font-bold text-white">{enterprisePlan.label}</h3>
          </div>
          <p className="text-[#94A3B8] text-base mb-6 max-w-lg">
            {enterprisePlan.description}
          </p>
        </div>
        <div className="relative z-10 shrink-0 w-full md:w-auto text-center md:text-right">
          <div className="text-[#94A3B8] text-sm mb-2">A partir de</div>
          <div className="text-3xl font-bold text-white mb-6">{enterprisePlan.priceLabel}</div>
          <a
            href={enterprisePlan.href}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full md:w-auto inline-block px-8 py-3.5 rounded-xl text-sm font-bold transition-all duration-300 text-center bg-white text-black hover:bg-white/90 hover:scale-[1.02]"
          >
            {enterprisePlan.cta}
          </a>
        </div>
      </div>

      {/* DETAILED COMPARISON TABLE */}
      <div className="pt-10">
        <h3 className="text-2xl font-bold mb-6 text-center">Comparativa completa de funcionalidades</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-white/10">
                <th className="py-4 px-4 text-text-soft font-medium">Característica</th>
                <th className="py-4 px-4 font-semibold text-center w-32">Trial</th>
                <th className="py-4 px-4 font-semibold text-center w-32">Starter</th>
                <th className="py-4 px-4 font-semibold text-center w-32">Pro</th>
                <th className="py-4 px-4 font-semibold text-center w-32 text-brand-cyan">Growth</th>
                <th className="py-4 px-4 font-semibold text-center w-32">Business</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              <tr className="border-b border-white/5">
                <td className="py-4 px-4 text-text-secondary">Mensajes al mes</td>
                <td className="py-4 px-4 text-center">100</td>
                <td className="py-4 px-4 text-center">500</td>
                <td className="py-4 px-4 text-center">2.500</td>
                <td className="py-4 px-4 text-center font-medium">8.000</td>
                <td className="py-4 px-4 text-center">20.000</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-4 px-4 text-text-secondary">Asistentes IA</td>
                <td className="py-4 px-4 text-center">1</td>
                <td className="py-4 px-4 text-center">1</td>
                <td className="py-4 px-4 text-center">3</td>
                <td className="py-4 px-4 text-center font-medium">8</td>
                <td className="py-4 px-4 text-center">20</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-4 px-4 text-text-secondary">Dominios permitidos</td>
                <td className="py-4 px-4 text-center">1</td>
                <td className="py-4 px-4 text-center">1</td>
                <td className="py-4 px-4 text-center">3</td>
                <td className="py-4 px-4 text-center font-medium">10</td>
                <td className="py-4 px-4 text-center">25</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-4 px-4 text-text-secondary">Canal Web Chat</td>
                <td className="py-4 px-4 text-center"><Check className="w-4 h-4 mx-auto text-brand-success" /></td>
                <td className="py-4 px-4 text-center"><Check className="w-4 h-4 mx-auto text-brand-success" /></td>
                <td className="py-4 px-4 text-center"><Check className="w-4 h-4 mx-auto text-brand-success" /></td>
                <td className="py-4 px-4 text-center"><Check className="w-4 h-4 mx-auto text-brand-success" /></td>
                <td className="py-4 px-4 text-center"><Check className="w-4 h-4 mx-auto text-brand-success" /></td>
              </tr>
              <tr className="border-b border-white/5 bg-white/[0.01]">
                <td className="py-4 px-4 text-text-secondary">Mini CRM e Inbox</td>
                <td className="py-4 px-4 text-center"><X className="w-4 h-4 mx-auto text-slate-600" /></td>
                <td className="py-4 px-4 text-center">Básico</td>
                <td className="py-4 px-4 text-center"><Check className="w-4 h-4 mx-auto text-brand-success" /></td>
                <td className="py-4 px-4 text-center"><Check className="w-4 h-4 mx-auto text-brand-success" /></td>
                <td className="py-4 px-4 text-center">Avanzado</td>
              </tr>
              <tr className="border-b border-white/5 bg-white/[0.01]">
                <td className="py-4 px-4 text-text-secondary">Exportar Leads CSV</td>
                <td className="py-4 px-4 text-center"><X className="w-4 h-4 mx-auto text-slate-600" /></td>
                <td className="py-4 px-4 text-center"><X className="w-4 h-4 mx-auto text-slate-600" /></td>
                <td className="py-4 px-4 text-center"><Check className="w-4 h-4 mx-auto text-brand-success" /></td>
                <td className="py-4 px-4 text-center"><Check className="w-4 h-4 mx-auto text-brand-success" /></td>
                <td className="py-4 px-4 text-center"><Check className="w-4 h-4 mx-auto text-brand-success" /></td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-4 px-4 text-text-secondary">Canal Telegram</td>
                <td className="py-4 px-4 text-center"><span className="text-[10px] uppercase text-slate-500">Pronto</span></td>
                <td className="py-4 px-4 text-center"><span className="text-[10px] uppercase text-slate-500">Pronto</span></td>
                <td className="py-4 px-4 text-center"><span className="text-[10px] uppercase text-slate-500">Pronto</span></td>
                <td className="py-4 px-4 text-center"><span className="text-[10px] uppercase text-brand-cyan">Pronto</span></td>
                <td className="py-4 px-4 text-center"><span className="text-[10px] uppercase text-slate-500">Pronto</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
