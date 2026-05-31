import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardClient } from '@/components/dashboard/DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) redirect('/login')

  // Server-side initial fetch (avoids client loading flash)
  let initialData = null
  try {
    const { headers } = await import('next/headers')
    const headersStore = await headers()
    const cookie = headersStore.get('cookie') ?? ''

    const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/api/dashboard`, {
      headers: { cookie },
      cache: 'no-store',
    })
    if (res.ok) {
      initialData = await res.json()
    }
  } catch {
    // Let the client component handle its own fetch
    initialData = null
  }

  return (
    <div className="w-full p-4 lg:p-8">
      <DashboardClient initialData={initialData} userId={user.id} />
    </div>
  )
}
