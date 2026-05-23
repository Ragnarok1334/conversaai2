import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { signOut } from '@/app/auth/actions'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { Bell, LogOut, Menu } from 'lucide-react'
import Link from 'next/link'
import { NotificationsBell } from '@/components/dashboard/NotificationsBell'

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

  const userName = user.user_metadata?.name || user.email?.split('@')[0] || 'Usuario'
  const userInitial = userName.charAt(0).toUpperCase()

  return (
    <div className="min-h-screen bg-dark-bg text-text-main flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-10 border-b border-white/[0.08] bg-[#050816]/70 backdrop-blur-xl">
          <div className="flex items-center justify-between px-4 md:px-8 h-16">
            {/* Mobile menu placeholder */}
            <button className="lg:hidden text-text-soft hover:text-text-main transition-colors">
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden lg:block" />

            <div className="flex items-center gap-3 sm:gap-4">
              <NotificationsBell />

              <div className="h-8 w-[1px] bg-white/[0.08] hidden sm:block" />

              <div className="flex items-center gap-2 sm:gap-3">
                <div className="flex items-center gap-2.5 py-1 px-1 sm:pr-4 rounded-full bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.06] hover:border-white/10 transition-all cursor-default shadow-sm group">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-violet to-brand-cyan flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-brand-cyan/20 group-hover:scale-105 transition-transform">
                    {userInitial}
                  </div>
                  <span className="text-sm font-semibold hidden sm:block text-text-main pr-1">{userName}</span>
                </div>

                <form action={signOut}>
                  <button
                    type="submit"
                    className="flex items-center justify-center w-10 h-10 rounded-xl bg-card-bg border border-card-border text-text-soft hover:text-text-main hover:bg-white/[0.08] hover:border-white/20 hover:shadow-lg transition-all group"
                    title="Cerrar sesión"
                  >
                    <LogOut className="w-[18px] h-[18px] group-hover:-translate-x-0.5 transition-transform" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-8 relative overflow-auto">
          {/* Background glows */}
          <div className="pointer-events-none fixed top-0 right-0 w-[600px] h-[600px] bg-brand-violet/5 rounded-full blur-[120px]" />
          <div className="pointer-events-none fixed bottom-0 left-0 w-[400px] h-[400px] bg-brand-cyan/5 rounded-full blur-[100px]" />
          {children}
        </main>
      </div>
    </div>
  )
}
