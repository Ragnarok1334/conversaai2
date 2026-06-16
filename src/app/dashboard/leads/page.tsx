import LeadsClient from '@/components/dashboard/LeadsClient'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function LeadsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: assistants } = await supabase
    .from('assistants')
    .select('id, assistant_name, status')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  const { data: profile } = await supabase
    .from('profiles')
    .select('trial_used, trial_ends_at')
    .eq('id', user.id)
    .single()

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan, assistants_limit, status, current_period_end, grace_ends_at, cancel_at_period_end')
    .eq('user_id', user.id)
    .single()

  const { getEffectiveSubscriptionStatus } = await import('@/lib/billing/subscription-status')
  const effectiveStatus = getEffectiveSubscriptionStatus(sub, profile)

  const currentPlan = sub?.plan || 'free'

  return <LeadsClient user={user} assistants={assistants || []} currentPlan={currentPlan} effectiveStatus={effectiveStatus} />
}
