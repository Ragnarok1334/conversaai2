import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SupportClient from '@/components/dashboard/SupportClient'

export const dynamic = 'force-dynamic'

export default async function SupportPage() {
  const supabase = await createClient()

  // 1. Verify session
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/login')
  }

  // 2. Fetch Subscription
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_id')
    .eq('id', user.id)
    .single()

  let subscription = null
  if (profile?.subscription_id) {
    const { data: subData } = await supabase
      .from('subscriptions')
      .select('plan, status')
      .eq('id', profile.subscription_id)
      .single()
    
    if (subData) {
      subscription = subData
    }
  }

  // 3. Fetch Assistants with domain verification
  const { data: assistants } = await supabase
    .from('assistants')
    .select(`
      id,
      assistant_name,
      assistant_domains (
        verification_status
      )
    `)
    .eq('user_id', user.id)

  return (
    <div className="flex-1 w-full p-4 lg:p-8 overflow-y-auto custom-scrollbar relative z-10">
      <SupportClient 
        user={user}
        subscription={subscription}
        assistants={assistants || []}
      />
    </div>
  )
}
