import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AssistantBuilder } from '@/components/dashboard/create-assistant/AssistantBuilder'
import { getPlanLimits, normalizePlan } from '@/lib/plans'
import { getEffectiveSubscriptionStatus } from '@/lib/billing/subscription-status'
import Link from 'next/link'
import { Lock } from 'lucide-react'

export default async function CreateAssistantPage() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  // Fetch plan and profile
  const [subRes, profileRes, countRes] = await Promise.all([
    supabase
      .from('subscriptions')
      .select('plan, assistants_limit, status, current_period_end, grace_ends_at, cancel_at_period_end')
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('profiles')
      .select('trial_used, trial_ends_at')
      .eq('id', user.id)
      .single(),
    supabase
      .from('assistants')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
  ])

  const sub = subRes.data
  const profile = profileRes.data
  const count = countRes.count || 0

  const effectiveStatus = getEffectiveSubscriptionStatus(sub, profile)

  if (effectiveStatus === 'free' || effectiveStatus === 'expired' || effectiveStatus === 'cancelled') {
    const trialUsed = profile?.trial_used ?? false
    return (
      <div className="w-full h-full p-4 lg:p-8 flex items-center justify-center min-h-[600px]">
        <div className="max-w-md w-full bg-card-bg/60 backdrop-blur border border-white/10 rounded-3xl p-8 text-center space-y-6 shadow-xl">
          <div className="w-16 h-16 rounded-full bg-brand-cyan/10 flex items-center justify-center mx-auto mb-2">
            <Lock className="w-8 h-8 text-brand-cyan" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Función Premium</h2>
            <p className="text-slate-400 text-sm">
              Necesitas un plan activo o en prueba para crear asistentes de Inteligencia Artificial.
            </p>
          </div>
          
          <div className="pt-4">
            {!trialUsed ? (
              <Link 
                href="/dashboard/billing"
                className="w-full block bg-gradient-to-r from-brand-violet to-brand-cyan py-3.5 rounded-xl text-white font-bold shadow-[0_0_20px_rgba(34,211,238,0.2)] hover:scale-[1.02] transition-all"
              >
                Activar prueba gratis
              </Link>
            ) : (
              <Link 
                href="/dashboard/billing"
                className="w-full block bg-gradient-to-r from-brand-violet to-brand-cyan py-3.5 rounded-xl text-white font-bold shadow-[0_0_20px_rgba(34,211,238,0.2)] hover:scale-[1.02] transition-all"
              >
                Ver planes disponibles
              </Link>
            )}
            <Link
              href="/dashboard/assistants"
              className="w-full block mt-3 py-3 rounded-xl border border-white/10 text-white font-medium hover:bg-white/5 transition-all"
            >
              Volver a mis asistentes
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const rawPlan = sub ? sub.plan : 'free'
  const currentPlan = normalizePlan(rawPlan)
  const planLimits = getPlanLimits(currentPlan)
  
  const planLimit = planLimits.assistants === Infinity ? null : planLimits.assistants
  const currentUsage = count
  const hasReachedLimit = planLimit !== null && currentUsage >= planLimit

  return (
    <div className="w-full h-full p-4 lg:p-8">
      <AssistantBuilder 
        userId={user.id}
        hasReachedLimit={hasReachedLimit} 
        currentUsage={currentUsage} 
        planLimit={planLimit} 
        currentPlan={currentPlan}
      />
    </div>
  )
}
