import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AssistantBuilder } from '@/components/dashboard/create-assistant/AssistantBuilder'
import { getPlanLimits, normalizePlan } from '@/lib/plans'

export default async function CreateAssistantPage() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  // 1. Contar asistentes existentes
  const { count, error: countErr } = await supabase
    .from('assistants')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  // 2. Obtener plan
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan, assistants_limit, status')
    .eq('user_id', user.id)
    .single()

  const isActiveSub = sub && sub.status === 'active'
  const rawPlan = isActiveSub ? sub.plan : 'free'
  const currentPlan = normalizePlan(rawPlan)
  const planLimits = getPlanLimits(currentPlan)
  
  // Usar el límite real del plan normalizado (si es Infinity en enterprise, pasarlo como null al frontend)
  const planLimit = planLimits.assistants === Infinity ? null : planLimits.assistants
  
  // Contar solo asistentes activos (sin deleted_at si existiera, aunque count ya filtra)
  const currentUsage = count || 0
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
