import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { signOut } from '@/app/auth/actions'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { Topbar } from '@/components/dashboard/Topbar'
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
      <div className="min-h-screen bg-dark-bg text-text-main flex">
        {/* Sidebar */}
        <Sidebar />

        {/* Main */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          <Topbar />

          {/* Page content */}
          <main className="flex-1 p-4 md:p-8 relative overflow-auto">
            {/* Background glows */}
            <div className="pointer-events-none fixed top-0 right-0 w-[600px] h-[600px] bg-brand-violet/5 rounded-full blur-[120px]" />
            <div className="pointer-events-none fixed bottom-0 left-0 w-[400px] h-[400px] bg-brand-cyan/5 rounded-full blur-[100px]" />
            {children}
          </main>
        </div>
      </div>
    </ProfileProvider>
  )
}
