import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PlanUsageCard } from '@/components/dashboard/PlanUsageCard'
import { PLAN_CONFIGS } from '@/lib/plans'
import { Check, Lock, Sparkles, Receipt, CreditCard, Shield, Clock, Zap } from 'lucide-react'
import Link from 'next/link'

export default async function BillingPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) redirect('/login')

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan')
    .eq('user_id', user.id)
    .single()

  const currentPlan = subscription?.plan || 'free'
  const plans = [PLAN_CONFIGS.free, PLAN_CONFIGS.pro, PLAN_CONFIGS.business, PLAN_CONFIGS.enterprise]

  return (
    <div className="max-w-6xl mx-auto space-y-10">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Planes y facturación</h1>
        <p className="text-text-soft">Elige el plan ideal para automatizar conversaciones, captar leads y atender clientes 24/7 con ConversaAI.</p>
        <div className="flex flex-wrap items-center gap-6 text-sm text-[#CBD5E1] mt-4">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-brand-cyan" />
            <span>Cancela cuando quieras</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand-cyan" />
            <span>Soporte incluido</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-brand-cyan" />
            <span>Actualización inmediata</span>
          </div>
        </div>
      </div>

      {/* Plan & Usage Overview */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-brand-violet" /> 
          Uso actual
        </h2>
        <PlanUsageCard />
        <p className="text-xs text-text-soft flex justify-end">
          El uso de mensajes se reinicia el primer día de cada ciclo de facturación.
        </p>
      </section>

      {/* Payment Section (Coming soon) */}
      <section className="grid md:grid-cols-2 gap-6">
        <div className="bg-card-bg/80 backdrop-blur-2xl border border-card-border rounded-3xl p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-cyan/10 rounded-full blur-[50px] pointer-events-none" />
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-white/[0.04] rounded-xl border border-white/[0.05]">
              <CreditCard className="w-6 h-6 text-brand-cyan" />
            </div>
            <h3 className="text-xl font-semibold">Método de pago</h3>
          </div>
          <p className="text-text-secondary text-sm mb-6 max-w-sm">
            Facturación próximamente. Pronto podrás actualizar tu plan y administrar tus tarjetas de crédito desde aquí.
          </p>
          <button disabled className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white/[0.04] border border-white/[0.1] text-sm font-medium text-text-soft opacity-70 cursor-not-allowed">
            Próximamente
          </button>
        </div>

        <div className="bg-card-bg/80 backdrop-blur-2xl border border-card-border rounded-3xl p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-violet/10 rounded-full blur-[50px] pointer-events-none" />
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-white/[0.04] rounded-xl border border-white/[0.05]">
              <Receipt className="w-6 h-6 text-brand-violet" />
            </div>
            <h3 className="text-xl font-semibold">Historial de facturas</h3>
          </div>
          <p className="text-text-secondary text-sm mb-6">
            Aún no tienes facturas. Cuando actives un plan de pago, tus comprobantes aparecerán aquí.
          </p>
        </div>
      </section>

      {/* Plan Comparison */}
      <section className="space-y-6 pt-4">
        <h2 className="text-xl font-semibold">Explorar planes</h2>
        
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const isCurrent = currentPlan === plan.key
            return (
              <div 
                key={plan.key}
                className={`relative rounded-[2rem] p-6 flex flex-col transition-all ${
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
                        ? 'bg-gradient-to-r from-[#7C3AED] via-[#2563EB] to-[#06B6D4] text-white'
                        : 'bg-white/[0.06] border border-white/10 text-white hover:bg-white/10'
                    }`}
                  >
                    {plan.cta}
                  </a>
                ) : (
                  <Link
                    href={plan.href}
                    className={`w-full py-3 rounded-xl text-sm font-semibold transition-all duration-300 text-center inline-block ${
                      plan.highlighted
                        ? 'bg-gradient-to-r from-[#7C3AED] via-[#2563EB] to-[#06B6D4] text-white'
                        : 'bg-white/[0.06] border border-white/10 text-white hover:bg-white/10'
                    }`}
                  >
                    {plan.cta}
                  </Link>
                )}
              </div>
            )
          })}
        </div>
      </section>

    </div>
  )
}
