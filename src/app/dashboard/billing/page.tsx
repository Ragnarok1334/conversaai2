import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PlanUsageCard } from '@/components/dashboard/PlanUsageCard'
import { PlanComparison } from '@/components/dashboard/PlanComparison'
import { PaymentHistory } from '@/components/dashboard/PaymentHistory'
import { PLAN_CONFIGS, normalizePlan, getPlanConfig, getPlanLimits } from '@/lib/plans'
import { Check, Lock, Sparkles, Receipt, CreditCard, Shield, Clock, Zap } from 'lucide-react'
import Link from 'next/link'

interface BillingPageProps {
  searchParams: Promise<{ payment?: string }>
}

export default async function BillingPage({ searchParams }: BillingPageProps) {
  const resolvedParams = await searchParams;
  const paymentStatus = resolvedParams?.payment;

  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) redirect('/login')

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .single()

  const { count: assistantsCount } = await supabase
    .from('assistants')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  const currentPlan = subscription?.plan || 'free'
  const planKey = normalizePlan(currentPlan)
  const planConfig = getPlanConfig(planKey)
  const planLimits = getPlanLimits(planKey)
  
  const assistantsUsed = assistantsCount ?? 0
  const messagesUsed = subscription?.current_messages_used ?? 0
  
  const messagesLimit = planLimits.messagesPerMonth === Infinity ? null : planLimits.messagesPerMonth
  const assistantsLimit = planLimits.assistants === Infinity ? null : planLimits.assistants
  
  const messagesPercentage = messagesLimit ? Math.round((messagesUsed / messagesLimit) * 100) : 0
  const assistantsPercentage = assistantsLimit ? Math.round((assistantsUsed / assistantsLimit) * 100) : 0

  const planProp = {
    key: planKey,
    label: planConfig.label,
    status: subscription?.status ?? 'active',
    channels: planConfig.channels,
    description: planConfig.description,
  }

  const usageProp = {
    assistantsUsed,
    assistantsLimit,
    messagesUsed,
    messagesLimit,
    messagesPercentage,
    assistantsPercentage,
  }

  const plans = [PLAN_CONFIGS.free, PLAN_CONFIGS.pro, PLAN_CONFIGS.business, PLAN_CONFIGS.enterprise]

  return (
    <div className="max-w-6xl mx-auto space-y-10">
      
      {/* Alert based on payment query param */}
      {paymentStatus === 'success' && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl flex items-center gap-3">
          <Check className="w-5 h-5" />
          <p>Pago aprobado. Tu plan se actualizará en unos momentos.</p>
        </div>
      )}
      {paymentStatus === 'pending' && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 p-4 rounded-xl flex items-center gap-3">
          <Clock className="w-5 h-5" />
          <p>Tu pago está pendiente de confirmación.</p>
        </div>
      )}
      {paymentStatus === 'rejected' && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3">
          <Lock className="w-5 h-5" />
          <p>El pago fue rechazado o cancelado.</p>
        </div>
      )}
      {paymentStatus === 'unknown' && (
        <div className="bg-slate-500/10 border border-slate-500/20 text-slate-300 p-4 rounded-xl flex items-center gap-3">
          <Sparkles className="w-5 h-5" />
          <p>Volviste desde Flow. Revisa el historial de pagos en unos momentos.</p>
        </div>
      )}

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
        <PlanUsageCard plan={planProp} usage={usageProp} />
        <p className="text-xs text-text-soft flex justify-end">
          El uso de mensajes se reinicia el primer día de cada ciclo de facturación.
        </p>
      </section>

      {/* Payment Section */}
      <section className="grid md:grid-cols-2 gap-6 h-full min-h-[300px]">
        <div className="bg-card-bg/80 backdrop-blur-2xl border border-card-border rounded-3xl p-8 relative overflow-hidden flex flex-col h-full">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-cyan/10 rounded-full blur-[50px] pointer-events-none" />
          <div className="flex items-center gap-3 mb-4 relative z-10">
            <div className="p-3 bg-white/[0.04] rounded-xl border border-white/[0.05]">
              <CreditCard className="w-6 h-6 text-brand-cyan" />
            </div>
            <h3 className="text-xl font-semibold">Pagos con Flow</h3>
          </div>
          <p className="text-text-secondary text-sm mb-6 max-w-sm flex-1 relative z-10">
            Activa tu plan usando Flow Sandbox. En producción podrás aceptar Webpay, tarjetas, transferencias y métodos disponibles en Chile.
          </p>
          <Link href="#plan-business" className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white/[0.04] border border-white/[0.1] text-sm font-medium text-white hover:bg-white/10 transition-colors text-center relative z-10">
            Probar pago con Flow
          </Link>
        </div>

        <PaymentHistory />
      </section>

      {/* Plan Comparison */}
      <PlanComparison plans={plans} currentPlan={currentPlan} />

    </div>
  )
}
