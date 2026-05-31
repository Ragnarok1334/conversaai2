import ConversationsClient from '@/components/dashboard/ConversationsClient'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function ConversationsPage() {
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

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan')
    .eq('user_id', user.id)
    .single()

  const currentPlan = sub?.plan || 'free'

  return <ConversationsClient user={user} assistants={assistants || []} currentPlan={currentPlan} />
}
