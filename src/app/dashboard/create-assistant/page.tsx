import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AssistantForm } from '@/components/dashboard/AssistantForm'

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
  const currentPlan = isActiveSub ? sub.plan : 'free'
  const planLimit = isActiveSub ? sub.assistants_limit : 1
  const currentUsage = count || 0
  const hasReachedLimit = planLimit !== null && currentUsage >= planLimit

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Crear asistente de IA</h1>
        <p className="text-text-soft">Configura tu asistente y pruébalo en tiempo real antes de guardarlo.</p>
      </div>
      <AssistantForm 
        hasReachedLimit={hasReachedLimit} 
        currentUsage={currentUsage} 
        planLimit={planLimit} 
        currentPlan={currentPlan}
      />
    </div>
  )
}
