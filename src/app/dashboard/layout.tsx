import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { signOut } from '@/app/auth/actions'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { ProfileProvider } from '@/providers/ProfileProvider'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  const initialUser = {
    id: user.id,
    email: user.email ?? null,
    name: user.user_metadata?.name ?? null,
  }

  return (
    <ProfileProvider initialUser={initialUser}>
      <DashboardShell>{children}</DashboardShell>
    </ProfileProvider>
  )
}
