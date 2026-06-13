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
                
                <p className="text-sm font-semibold text-brand-cyan mb-4">
                  {plan.aiSubtitle}
                </p>
                
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

      {/* COPY COMERCIAL */}
      <div className="pt-16 pb-8 text-center max-w-3xl mx-auto">
        <h3 className="text-3xl font-bold mb-4 text-white">Compara qué desbloquea cada plan</h3>
        <p className="text-slate-400 text-lg">
          Los planes superiores no solo aumentan límites: agregan más control, más asistentes, más dominios y herramientas para convertir conversaciones en clientes.
        </p>
        <p className="text-sm text-brand-cyan mt-4 font-medium">
          Growth es ideal si quieres escalar atención sin complicarte. Business está pensado para operaciones con más volumen, áreas o sucursales.
        </p>
      </div>

      {/* DETAILED COMPARISON TABLE */}
      <div className="overflow-x-auto pb-6">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead>
            <tr className="border-b border-white/10">
              <th className="py-6 px-4 text-slate-400 font-medium w-[22%] align-bottom">Característica</th>
              <th className="py-6 px-4 w-[15.6%] align-bottom">
                <div className="font-bold text-lg text-white mb-1">Trial</div>
                <div className="text-xs text-slate-500 font-medium mb-3">Para probar</div>
                <div className="text-[10px] text-slate-600 leading-tight border-t border-white/5 pt-2">&nbsp;</div>
              </th>
              <th className="py-6 px-4 w-[15.6%] align-bottom">
                <div className="font-bold text-lg text-white mb-1">Starter</div>
                <div className="text-xs text-slate-400 font-medium mb-3">Para negocios pequeños</div>
                <div className="text-[10px] text-slate-500 leading-tight border-t border-white/5 pt-2">Empieza con atención básica</div>
              </th>
              <th className="py-6 px-4 w-[15.6%] align-bottom">
                <div className="font-bold text-lg text-white mb-1">Pro</div>
                <div className="text-xs text-brand-violet font-medium mb-3">Para vender más</div>
                <div className="text-[10px] text-slate-400 leading-tight border-t border-white/5 pt-2">Agrega más asistentes, CRM y exportación</div>
              </th>
              <th className="py-6 px-4 w-[15.6%] align-bottom relative">
                <div className="absolute inset-0 bg-brand-cyan/5 rounded-t-2xl border-t border-x border-brand-cyan/20 -z-10" />
                <div className="font-bold text-lg text-brand-cyan mb-1 flex items-center gap-2">Growth <span className="text-[9px] bg-brand-cyan/20 px-2 py-0.5 rounded-full uppercase tracking-wider text-brand-cyan">Recomendado</span></div>
                <div className="text-xs text-brand-cyan/80 font-medium mb-3">Escala atención</div>
                <div className="text-[10px] text-brand-cyan/60 leading-tight border-t border-brand-cyan/10 pt-2">Escala conversaciones, dominios y automatizaciones</div>
              </th>
              <th className="py-6 px-4 w-[15.6%] align-bottom">
                <div className="font-bold text-lg text-amber-500 mb-1">Business</div>
                <div className="text-xs text-amber-500/80 font-medium mb-3">Para operación seria</div>
                <div className="text-[10px] text-amber-500/60 leading-tight border-t border-amber-500/10 pt-2">Control avanzado para operaciones más grandes</div>
              </th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {/* A. Capacidad */}
            <tr className="bg-white/[0.02]">
              <td colSpan={6} className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-white">A. Capacidad</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-4 px-4 text-slate-400">Mensajes al mes</td>
              <td className="py-4 px-4 font-semibold">100</td>
              <td className="py-4 px-4 font-semibold text-white">500</td>
              <td className="py-4 px-4 font-semibold text-white">2.500</td>
              <td className="py-4 px-4 font-bold text-brand-cyan bg-brand-cyan/[0.02] border-x border-brand-cyan/10">8.000</td>
              <td className="py-4 px-4 font-bold text-amber-500">20.000</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-4 px-4 text-slate-400">Asistentes IA</td>
              <td className="py-4 px-4">1</td>
              <td className="py-4 px-4">1</td>
              <td className="py-4 px-4 font-medium text-white">3</td>
              <td className="py-4 px-4 font-bold text-brand-cyan bg-brand-cyan/[0.02] border-x border-brand-cyan/10">8</td>
              <td className="py-4 px-4 font-bold text-amber-500">20</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-4 px-4 text-slate-400">Dominios permitidos</td>
              <td className="py-4 px-4">1</td>
              <td className="py-4 px-4">1</td>
              <td className="py-4 px-4 font-medium text-white">3</td>
              <td className="py-4 px-4 font-bold text-brand-cyan bg-brand-cyan/[0.02] border-x border-brand-cyan/10">10</td>
              <td className="py-4 px-4 font-bold text-amber-500">25</td>
            </tr>

            {/* B. Captación y atención */}
            <tr className="bg-white/[0.02]">
              <td colSpan={6} className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-white mt-4 border-t border-transparent">B. Captación y atención</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-4 px-4 text-slate-400">Canal Web Chat</td>
              <td className="py-4 px-4 text-xs">Demo básica</td>
              <td className="py-4 px-4 text-xs text-white">Básico</td>
              <td className="py-4 px-4 text-xs font-medium text-white">Web Chat + leads</td>
              <td className="py-4 px-4 text-xs font-bold text-brand-cyan bg-brand-cyan/[0.02] border-x border-brand-cyan/10">Web Chat escalable</td>
              <td className="py-4 px-4 text-xs font-bold text-amber-500">Web Chat avanzado</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-4 px-4 text-slate-400">Mini CRM e Inbox</td>
              <td className="py-4 px-4 text-slate-600">—</td>
              <td className="py-4 px-4 text-xs text-white">Básico</td>
              <td className="py-4 px-4 text-xs font-medium text-white">Completo</td>
              <td className="py-4 px-4 text-xs font-bold text-brand-cyan bg-brand-cyan/[0.02] border-x border-brand-cyan/10">Avanzado</td>
              <td className="py-4 px-4 text-xs font-bold text-amber-500">Avanzado + operación</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-4 px-4 text-slate-400">Exportar Leads CSV</td>
              <td className="py-4 px-4 text-slate-600">—</td>
              <td className="py-4 px-4 text-slate-600">—</td>
              <td className="py-4 px-4"><span className="text-[10px] uppercase font-bold text-brand-violet bg-brand-violet/10 px-2 py-1 rounded">Incluido</span></td>
              <td className="py-4 px-4 bg-brand-cyan/[0.02] border-x border-brand-cyan/10"><span className="text-[10px] uppercase font-bold text-brand-cyan bg-brand-cyan/10 px-2 py-1 rounded">Incluido</span></td>
              <td className="py-4 px-4"><span className="text-[10px] uppercase font-bold text-amber-500 bg-amber-500/10 px-2 py-1 rounded">Incluido</span></td>
            </tr>

            {/* C. Inteligencia IA */}
            <tr className="bg-white/[0.02]">
              <td colSpan={6} className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-white mt-4 border-t border-transparent">C. Inteligencia IA</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-4 px-4 text-slate-400">Calidad de IA</td>
              <td className="py-4 px-4 text-xs">Básica</td>
              <td className="py-4 px-4 text-xs text-white">Estándar</td>
              <td className="py-4 px-4 text-xs font-medium text-white">Mejorada</td>
              <td className="py-4 px-4 text-xs font-bold text-brand-cyan bg-brand-cyan/[0.02] border-x border-brand-cyan/10">Avanzada</td>
              <td className="py-4 px-4 text-xs font-bold text-amber-500">Avanzada prioritaria</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-4 px-4 text-slate-400">Contexto del asistente</td>
              <td className="py-4 px-4 text-xs">Limitado</td>
              <td className="py-4 px-4 text-xs text-white">Básico</td>
              <td className="py-4 px-4 text-xs font-medium text-white">Ampliado</td>
              <td className="py-4 px-4 text-xs font-bold text-brand-cyan bg-brand-cyan/[0.02] border-x border-brand-cyan/10">Alto</td>
              <td className="py-4 px-4 text-xs font-bold text-amber-500">Máximo</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-4 px-4 text-slate-400">Mejora de entrenamiento con IA</td>
              <td className="py-4 px-4 text-xs text-slate-500">Limitada</td>
              <td className="py-4 px-4 text-xs text-white">Básica</td>
              <td className="py-4 px-4"><span className="text-[10px] uppercase font-bold text-brand-violet bg-brand-violet/10 px-2 py-1 rounded">Incluida</span></td>
              <td className="py-4 px-4 bg-brand-cyan/[0.02] border-x border-brand-cyan/10"><span className="text-[10px] uppercase font-bold text-brand-cyan bg-brand-cyan/10 px-2 py-1 rounded">Avanzada</span></td>
              <td className="py-4 px-4"><span className="text-[10px] uppercase font-bold text-amber-500 bg-amber-500/10 px-2 py-1 rounded">Avanzada + prioridad</span></td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-4 px-4 text-slate-400">Análisis de conversaciones</td>
              <td className="py-4 px-4 text-slate-600">—</td>
              <td className="py-4 px-4 text-slate-600">—</td>
              <td className="py-4 px-4 text-xs text-slate-400">Básico (Próx)</td>
              <td className="py-4 px-4 text-xs font-semibold text-brand-cyan bg-brand-cyan/[0.02] border-x border-brand-cyan/10">Avanzado (Próx)</td>
              <td className="py-4 px-4 text-xs font-semibold text-amber-500">Avanzado (Próx)</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-4 px-4 text-slate-400">Optimización para ventas/leads</td>
              <td className="py-4 px-4 text-slate-600">—</td>
              <td className="py-4 px-4 text-xs text-white">Básica</td>
              <td className="py-4 px-4 text-xs font-medium text-white">Mejorada</td>
              <td className="py-4 px-4 text-xs font-bold text-brand-cyan bg-brand-cyan/[0.02] border-x border-brand-cyan/10">Avanzada</td>
              <td className="py-4 px-4 text-xs font-bold text-amber-500">Avanzada</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-4 px-4 text-slate-400">Prioridad de respuesta IA</td>
              <td className="py-4 px-4 text-xs">Normal</td>
              <td className="py-4 px-4 text-xs">Normal</td>
              <td className="py-4 px-4 text-xs font-medium text-white">Mejorada</td>
              <td className="py-4 px-4 text-xs font-bold text-brand-cyan bg-brand-cyan/[0.02] border-x border-brand-cyan/10">Alta</td>
              <td className="py-4 px-4 text-xs font-bold text-amber-500">Máxima</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-4 px-4 text-slate-400">Escalamiento inteligente de modelo</td>
              <td className="py-4 px-4 text-slate-600">—</td>
              <td className="py-4 px-4 text-slate-600">—</td>
              <td className="py-4 px-4 text-xs text-white">Parcial</td>
              <td className="py-4 px-4"><span className="text-[10px] uppercase font-bold text-brand-cyan bg-brand-cyan/10 px-2 py-1 rounded">Incluido</span></td>
              <td className="py-4 px-4"><span className="text-[10px] uppercase font-bold text-amber-500 bg-amber-500/10 px-2 py-1 rounded">Incluido</span></td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-4 px-4 text-slate-400">Plantillas por industria</td>
              <td className="py-4 px-4 text-slate-600">—</td>
              <td className="py-4 px-4 text-slate-600">—</td>
              <td className="py-4 px-4"><span className="text-[10px] uppercase font-bold text-brand-violet bg-brand-violet/10 px-2 py-1 rounded">Incluido</span></td>
              <td className="py-4 px-4 bg-brand-cyan/[0.02] border-x border-brand-cyan/10"><span className="text-[10px] uppercase font-bold text-brand-cyan bg-brand-cyan/10 px-2 py-1 rounded">Incluido</span></td>
              <td className="py-4 px-4"><span className="text-[10px] uppercase font-bold text-amber-500 bg-amber-500/10 px-2 py-1 rounded">Incluido</span></td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-4 px-4 text-slate-400">Automatizaciones / Reglas</td>
              <td className="py-4 px-4 text-slate-600">—</td>
              <td className="py-4 px-4 text-slate-600">—</td>
              <td className="py-4 px-4 text-slate-600">—</td>
              <td className="py-4 px-4 text-xs text-brand-cyan/70 font-medium bg-brand-cyan/[0.02] border-x border-brand-cyan/10">Próximamente</td>
              <td className="py-4 px-4 text-xs text-amber-500/70 font-medium">Próximamente</td>
            </tr>

            {/* D. Canales */}
            <tr className="bg-white/[0.02]">
              <td colSpan={6} className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-white mt-4 border-t border-transparent">D. Canales</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-4 px-4 text-slate-400">Telegram</td>
              <td className="py-4 px-4 text-slate-600">—</td>
              <td className="py-4 px-4 text-xs text-slate-500">Próximamente</td>
              <td className="py-4 px-4 text-xs text-slate-400">Próximamente</td>
              <td className="py-4 px-4 text-xs font-semibold text-brand-cyan bg-brand-cyan/[0.02] border-x border-brand-cyan/10">Próx. prioritario</td>
              <td className="py-4 px-4 text-xs font-semibold text-amber-500">Próx. prioritario</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-4 px-4 text-slate-400">WhatsApp</td>
              <td className="py-4 px-4 text-slate-600">—</td>
              <td className="py-4 px-4 text-slate-600">—</td>
              <td className="py-4 px-4 text-xs text-slate-400">Próximamente</td>
              <td className="py-4 px-4 text-xs font-semibold text-brand-cyan bg-brand-cyan/[0.02] border-x border-brand-cyan/10">Próx. prioritario</td>
              <td className="py-4 px-4 text-xs font-semibold text-amber-500">Próx. prioritario</td>
            </tr>

            {/* E. Gestión y soporte */}
            <tr className="bg-white/[0.02]">
              <td colSpan={6} className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-white mt-4 border-t border-transparent">E. Gestión y soporte</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-4 px-4 text-slate-400">Diagnóstico de cuenta</td>
              <td className="py-4 px-4 text-xs">Básico</td>
              <td className="py-4 px-4 text-xs text-white">Básico</td>
              <td className="py-4 px-4 text-xs font-medium text-white">Completo</td>
              <td className="py-4 px-4 text-xs font-bold text-brand-cyan bg-brand-cyan/[0.02] border-x border-brand-cyan/10">Completo</td>
              <td className="py-4 px-4 text-xs font-bold text-amber-500">Avanzado</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-4 px-4 text-slate-400">Soporte</td>
              <td className="py-4 px-4 text-xs">Autoayuda</td>
              <td className="py-4 px-4 text-xs text-white">Estándar</td>
              <td className="py-4 px-4 text-xs font-medium text-white">Estándar</td>
              <td className="py-4 px-4 text-xs font-bold text-brand-cyan bg-brand-cyan/[0.02] border-x border-brand-cyan/10">Prioritario</td>
              <td className="py-4 px-4 text-xs font-bold text-amber-500">Prioritario</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-4 px-4 text-slate-400">Seguridad / Auditoría</td>
              <td className="py-4 px-4 text-slate-600">—</td>
              <td className="py-4 px-4 text-slate-600">—</td>
              <td className="py-4 px-4 text-xs text-white">Básico</td>
              <td className="py-4 px-4 text-xs font-medium text-white bg-brand-cyan/[0.02] border-x border-brand-cyan/10">Básico</td>
              <td className="py-4 px-4 text-xs font-bold text-amber-500">Avanzado</td>
            </tr>
            <tr>
              <td className="py-2"></td>
              <td className="py-2"></td>
              <td className="py-2"></td>
              <td className="py-2"></td>
              <td className="py-2 bg-brand-cyan/[0.02] border-x border-b border-brand-cyan/10 rounded-b-2xl"></td>
              <td className="py-2"></td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>
  )
}
