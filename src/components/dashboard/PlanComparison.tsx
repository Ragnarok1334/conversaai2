'use client'

import { useState } from 'react'
import { Bot, Check, Globe2, MessageCircle, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { PlanConfig } from '@/lib/plans'
import { PAYMENT_PROVIDERS, type PaymentProvider } from '@/lib/payment-providers'
import { PaymentProviderSelector } from './PaymentProviderSelector'

interface Props { plans: PlanConfig[]; currentPlan: string; trialUsed: boolean; trialEligible: boolean; trialEndsAt?: string | null }
const limit = (value: number | null) => value === null ? 'Sin límite' : value.toLocaleString('es-CL')

export function PlanComparison({ plans, currentPlan, trialUsed, trialEligible, trialEndsAt }: Props) {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [startingTrial, setStartingTrial] = useState(false)
  const [showTrialModal, setShowTrialModal] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider>('flow')
  const router = useRouter()
  const provider = PAYMENT_PROVIDERS[selectedProvider]
  const paidPlans = plans.filter((plan) => ['starter', 'pro', 'growth'].includes(plan.key))
  const hasPaidPlan = !['trial', 'free'].includes(currentPlan)

  const checkout = async (planKey: string) => {
    if (!provider.available) return setError(`${provider.label} estará disponible próximamente.`)
    setLoadingPlan(planKey); setError(null)
    try {
      const response = await fetch(provider.checkoutEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan: planKey, provider: selectedProvider }) })
      if (!(response.headers.get('content-type') || '').includes('application/json')) throw new Error('El servidor devolvió una respuesta inválida.')
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No se pudo iniciar el pago.')
      if (data.url) window.location.assign(data.url)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo iniciar el pago.'); setLoadingPlan(null)
    }
  }

  const startTrial = async () => {
    setStartingTrial(true); setError(null)
    try {
      const response = await fetch('/api/billing/trial/start', { method: 'POST' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No se pudo iniciar la prueba.')
      setShowTrialModal(false); router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo iniciar la prueba.'); setStartingTrial(false)
    }
  }

  return <div className="space-y-8 pt-4">
    {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-500">{error}</div>}

    {!hasPaidPlan && (currentPlan === 'trial' || trialEligible) && <section className="rounded-3xl border border-brand-cyan/20 bg-card-bg/80 p-6 md:p-8">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
        <div><div className="mb-2 flex items-center gap-3"><h2 className="text-xl font-bold">{currentPlan === 'trial' ? 'Tu prueba está activa' : trialUsed ? 'Tu prueba terminó' : 'Prueba ConversaAI durante 7 días'}</h2><span className="rounded-full bg-brand-cyan/10 px-3 py-1 text-xs font-bold text-brand-cyan">7 días</span></div>
          <p className="max-w-2xl text-sm text-text-soft">{currentPlan === 'trial' ? `Incluye 1 asistente, Web Chat y 50 respuestas de IA${trialEndsAt ? ` hasta el ${new Date(trialEndsAt).toLocaleDateString('es-CL')}` : ''}.` : trialUsed ? 'Elige uno de los tres planes para seguir atendiendo.' : 'Disponible durante los primeros 7 días desde tu registro. Incluye 1 asistente, Web Chat y 50 respuestas de IA.'}</p></div>
        {!trialUsed && currentPlan !== 'trial' && <button onClick={() => setShowTrialModal(true)} className="cursor-pointer rounded-xl border border-brand-cyan/30 bg-brand-cyan/10 px-6 py-3 text-sm font-semibold text-brand-cyan hover:bg-brand-cyan/20">Activar prueba</button>}
      </div>
    </section>}

    <div className="rounded-2xl border border-card-border bg-card-bg/70 p-4"><p className="mb-3 text-sm font-semibold">¿Cómo quieres pagar?</p><PaymentProviderSelector selected={selectedProvider} onChange={(value) => { setSelectedProvider(value); setError(null) }} /></div>

    <section><div className="mb-5"><h2 className="text-2xl font-bold">Elige un plan</h2><p className="mt-1 text-sm text-text-soft">Tres opciones claras. Puedes cambiar cuando tu negocio lo necesite.</p></div>
      <div className="grid gap-5 lg:grid-cols-3">{paidPlans.map((plan) => {
        const isCurrent = currentPlan === plan.key
        const price = selectedProvider === 'flow' ? plan.priceLabelCLP : plan.priceLabelUSD
        return <article id={`plan-${plan.key}`} key={plan.key} className={`relative flex flex-col rounded-3xl border p-6 ${plan.recommended ? 'border-brand-violet bg-brand-violet/[0.06] shadow-[0_14px_50px_rgba(124,58,237,0.13)]' : 'border-card-border bg-card-bg/80'}`}>
          {plan.recommended && <span className="absolute right-5 top-5 rounded-full bg-brand-violet px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">Recomendado</span>}
          <h3 className="text-xl font-bold">{plan.label}</h3><p className="mt-2 min-h-16 text-sm leading-6 text-text-soft">{plan.description}</p>
          <div className="my-5"><strong className="text-3xl">{price}</strong><span className="text-sm text-text-soft"> / mes</span></div>
          <div className="mb-5 grid grid-cols-3 gap-2">
            <Metric icon={<Bot />} value={limit(plan.limits.assistants)} label="asistentes" />
            <Metric icon={<MessageCircle />} value={limit(plan.limits.messagesPerMonth)} label="respuestas IA" />
            <Metric icon={<Globe2 />} value={limit(plan.limits.domains)} label="dominios" />
          </div>
          <ul className="mb-6 flex-1 space-y-3">{plan.features.slice(3).map((feature) => <li key={feature} className="flex gap-2 text-sm text-text-secondary"><Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-success"/>{feature}</li>)}</ul>
          {plan.futureFeatures.length > 0 && <div className="mb-5 rounded-xl border border-brand-cyan/15 bg-brand-cyan/5 p-3 text-xs text-text-soft"><Sparkles className="mr-1 inline h-3.5 w-3.5 text-brand-cyan"/><strong>Próximamente:</strong> {plan.futureFeatures.join(', ')}.</div>}
          <button onClick={() => checkout(plan.key)} disabled={isCurrent || Boolean(loadingPlan)} className={`w-full rounded-xl py-3 text-sm font-bold transition ${isCurrent ? 'cursor-not-allowed border border-card-border text-text-soft' : plan.recommended ? 'cursor-pointer bg-gradient-to-r from-brand-violet to-brand-cyan text-white hover:opacity-90' : 'cursor-pointer border border-card-border hover:bg-card-bg'}`}>{isCurrent ? 'Plan actual' : loadingPlan === plan.key ? 'Conectando…' : plan.cta}</button>
        </article>
      })}</div>
    </section>

    <div className="rounded-2xl border border-brand-cyan/15 bg-brand-cyan/5 p-5 text-sm text-text-secondary"><strong>Uso transparente:</strong> solo cuentan las respuestas generadas por IA. Los mensajes del visitante y las respuestas de una persona desde el panel no consumen el límite.</div>

    {showTrialModal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"><div className="w-full max-w-md rounded-3xl border border-card-border bg-page-bg p-7 shadow-2xl"><h3 className="text-xl font-bold">Activar prueba de 7 días</h3><p className="my-4 text-sm leading-6 text-text-soft">Los 7 días comienzan ahora. Tendrás 1 asistente, Web Chat y 50 respuestas de IA.</p><div className="flex justify-end gap-3"><button onClick={() => setShowTrialModal(false)} disabled={startingTrial} className="cursor-pointer rounded-xl border border-card-border px-5 py-2.5 text-sm">Cancelar</button><button onClick={startTrial} disabled={startingTrial} className="cursor-pointer rounded-xl bg-brand-violet px-5 py-2.5 text-sm font-bold text-white">{startingTrial ? 'Activando…' : 'Activar prueba'}</button></div></div></div>}
  </div>
}

function Metric({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return <div className="min-w-0 rounded-xl bg-page-bg/60 p-3"><span className="mb-2 block h-4 w-4 text-brand-cyan [&>svg]:h-4 [&>svg]:w-4">{icon}</span><strong className="block truncate text-sm">{value}</strong><span className="text-[10px] text-text-soft">{label}</span></div>
}
