import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PlanUsageCard } from '@/components/dashboard/PlanUsageCard'
import { PLAN_CONFIGS } from '@/lib/plans'
import { Check, Lock, Sparkles, Receipt, CreditCard } from 'lucide-react'

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
        <h1 className="text-3xl font-bold tracking-tight mb-2">Facturación</h1>
        <p className="text-text-soft">Administra tu plan, uso mensual y métodos de pago.</p>
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
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((plan) => {
            const isCurrent = currentPlan === plan.key
            return (
              <div 
                key={plan.key}
                className={`relative rounded-2xl p-6 flex flex-col bg-card-bg border transition-all ${
                  isCurrent 
                    ? 'border-brand-violet/50 shadow-[0_0_30px_rgba(124,58,237,0.15)] bg-gradient-to-b from-brand-violet/10 to-transparent' 
                    : 'border-card-border hover:border-white/20'
                }`}
              >
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-brand-violet text-white text-xs font-bold shadow-lg">
                    Plan actual
                  </div>
                )}
                
                <h3 className="text-lg font-bold mb-1 mt-2">{plan.label}</h3>
                <div className="mb-4">
                  <span className="text-2xl font-bold">{plan.price}</span>
                  <span className="text-text-soft text-sm">{plan.period}</span>
                </div>
                
                <ul className="space-y-3 flex-1 mb-6">
                  {plan.features.slice(0, 4).map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                      <Check className="w-4 h-4 text-brand-success shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                  {plan.features.length > 4 && (
                    <li className="text-xs text-text-soft pl-6 italic">
                      + {plan.features.length - 4} características más
                    </li>
                  )}
                </ul>

                {!isCurrent && (
                  <button disabled className="w-full py-2.5 rounded-lg text-sm font-semibold border border-white/10 bg-white/[0.02] text-text-soft opacity-60 cursor-not-allowed flex items-center justify-center gap-2">
                    <Lock className="w-3 h-3" />
                    Mejorar próximamente
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </section>

    </div>
  )
}
