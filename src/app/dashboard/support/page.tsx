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

  return (
    <div className="flex-1 w-full overflow-y-auto custom-scrollbar relative z-10 bg-[#020510] min-h-screen">
      <SupportClient user={user} />
    </div>
  )
}
