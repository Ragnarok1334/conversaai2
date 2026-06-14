import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PlanUsageCard } from '@/components/dashboard/PlanUsageCard'
import { PlanComparison } from '@/components/dashboard/PlanComparison'
import { PaymentHistory } from '@/components/dashboard/PaymentHistory'
import { SubscriptionManager } from '@/components/dashboard/SubscriptionManager'
import { PLAN_CONFIGS, normalizePlan, getPlanConfig, getPlanLimits } from '@/lib/plans'
import { getEffectiveSubscriptionStatus } from '@/lib/billing/subscription-status'
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('trial_used, trial_ends_at')
    .eq('id', user.id)
    .single()

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .single()

  const { count: assistantsCount } = await supabase
    .from('assistants')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  const currentPlan = subscription?.plan || 'trial'
  const planKey = normalizePlan(currentPlan)
  const planConfig = getPlanConfig(planKey)
  const planLimits = getPlanLimits(planKey)
  
  const assistantsUsed = assistantsCount ?? 0
  const messagesUsed = subscription?.current_messages_used ?? 0
  
  const messagesLimit = planLimits.messagesPerMonth === null ? null : planLimits.messagesPerMonth
  const assistantsLimit = planLimits.assistants === null ? null : planLimits.assistants
  
  const messagesPercentage = messagesLimit ? Math.round((messagesUsed / messagesLimit) * 100) : 0
  const assistantsPercentage = assistantsLimit ? Math.round((assistantsUsed / assistantsLimit) * 100) : 0

  const effectiveStatus = getEffectiveSubscriptionStatus(subscription, profile)
  
  let statusMessage = ''
  
  if (effectiveStatus === 'free') {
    statusMessage = profile?.trial_used 
      ? "Tu prueba gratuita terminó. Elige un plan para continuar usando funciones premium."
      : "Tu prueba gratis está disponible. Actívala cuando estés listo."
  } else if (effectiveStatus === 'trialing') {
    const d = new Date(profile?.trial_ends_at || '')
    statusMessage = `Tu prueba gratuita termina el ${d.toLocaleDateString('es-CL')}.`
  } else if (effectiveStatus === 'active' && planKey !== 'trial') {
    const d = new Date(subscription?.current_period_end || '')
    statusMessage = `Tu plan está activo hasta el ${d.toLocaleDateString('es-CL')}.`
  } else if (effectiveStatus === 'past_due') {
    const end = new Date(subscription?.current_period_end || '')
    const grace = new Date(subscription?.grace_ends_at || '')
    statusMessage = `Tu plan venció el ${end.toLocaleDateString('es-CL')}. Tienes hasta el ${grace.toLocaleDateString('es-CL')} para renovar antes de perder acceso premium.`
  } else if (effectiveStatus === 'expired' || effectiveStatus === 'cancelled') {
    statusMessage = "Tu plan finalizó. Renueva para recuperar funciones premium."
  }

  const planProp = {
    key: planKey,
    label: planConfig.label,
    status: effectiveStatus,
    channels: planConfig.channels,
    description: planConfig.description,
    statusMessage
  }

  const usageProp = {
    assistantsUsed,
    assistantsLimit,
    messagesUsed,
    messagesLimit,
    messagesPercentage,
    assistantsPercentage,
  }

  const plans = Object.values(PLAN_CONFIGS)
  const trialUsed = profile?.trial_used ?? false

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
            Puedes pagar de forma segura con Webpay, tarjetas de crédito y débito. Los planes se activan automáticamente tras confirmar el pago.
          </p>
          <div className="relative z-10 flex gap-2">
            <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-md text-xs text-text-soft">Webpay Plus</span>
            <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-md text-xs text-text-soft">Transferencia</span>
          </div>
        </div>

        <PaymentHistory />
      </section>

      {/* Cancel Subscription */}
      <SubscriptionManager 
        planKey={planKey}
        effectiveStatus={effectiveStatus}
        cancelAtPeriodEnd={subscription?.cancel_at_period_end ?? false}
        currentPeriodEnd={subscription?.current_period_end ?? null}
      />

      {/* Plan Comparison */}
      <PlanComparison plans={plans} currentPlan={currentPlan} trialUsed={trialUsed} />

    </div>
  )
}
