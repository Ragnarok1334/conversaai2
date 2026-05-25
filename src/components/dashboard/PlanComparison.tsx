'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import type { PlanConfig } from '@/lib/plans'

interface PlanComparisonProps {
  plans: PlanConfig[]
  currentPlan: string
}

export function PlanComparison({ plans, currentPlan }: PlanComparisonProps) {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleCheckout = async (planKey: string) => {
    setLoadingPlan(planKey)
    setError(null)
    try {
      const res = await fetch('/api/billing/flow/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planKey })
      })
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || 'Error al iniciar el pago')
      }
      
      if (data.url) {
        window.location.assign(data.url)
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Error desconocido')
      }
      setLoadingPlan(null)
    }
  }

  return (
    <div className="space-y-6 pt-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Explorar planes</h2>
        {error && <p className="text-sm text-brand-pink">{error}</p>}
      </div>
      
      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
        {plans.map((plan) => {
          const isCurrent = currentPlan === plan.key
          const isLoading = loadingPlan === plan.key

          return (
            <div 
              key={plan.key}
              id={`plan-${plan.key}`}
              className={`scroll-mt-24 relative rounded-[2rem] p-6 flex flex-col transition-all ${
                plan.highlighted 
                  ? 'border border-[#7C3AED]/50 bg-white/[0.04] shadow-[0_0_30px_rgba(124,58,237,0.15)]' 
                  : 'bg-card-bg border border-card-border hover:border-white/20'
              }`}
            >
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
              
              <h3 className="text-xl font-bold mb-1 mt-4">{plan.label}</h3>
              <div className="mb-6 flex items-baseline gap-1">
                <span className={`font-bold ${plan.price.length > 8 ? 'text-2xl' : 'text-3xl'}`}>{plan.price}</span>
                <span className="text-text-soft text-sm">{plan.period}</span>
              </div>
              
              <ul className="space-y-3 flex-1 mb-6">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                    <Check className="w-4 h-4 text-brand-success shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <button disabled className="w-full py-3 rounded-xl text-sm font-semibold border border-white/10 bg-white/[0.02] text-text-soft opacity-60 cursor-not-allowed">
                  Plan activo
                </button>
              ) : plan.external ? (
                <a
                  href={plan.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-full py-3 rounded-xl text-sm font-semibold transition-all duration-300 text-center inline-block ${
                    plan.highlighted
                      ? 'bg-gradient-to-r from-[#7C3AED] via-[#2563EB] to-[#06B6D4] text-white hover:opacity-90'
                      : 'bg-white/[0.06] border border-white/10 text-white hover:bg-white/10'
                  }`}
                >
                  {plan.cta}
                </a>
              ) : (
                <button
                  onClick={() => handleCheckout(plan.key)}
                  disabled={!!loadingPlan}
                  className={`w-full py-3 rounded-xl text-sm font-semibold transition-all duration-300 text-center inline-flex items-center justify-center gap-2 ${
                    plan.highlighted
                      ? 'bg-gradient-to-r from-[#7C3AED] via-[#2563EB] to-[#06B6D4] text-white hover:opacity-90 disabled:opacity-70'
                      : 'bg-white/[0.06] border border-white/10 text-white hover:bg-white/10 disabled:opacity-50'
                  }`}
                >
                  {isLoading ? 'Redirigiendo a Flow...' : plan.cta}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
