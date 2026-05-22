import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { signOut } from '@/app/auth/actions'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { Bell, LogOut, Menu } from 'lucide-react'
import Link from 'next/link'

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

            <div className="flex items-center gap-3">
              <button className="relative w-9 h-9 rounded-xl bg-card-bg border border-card-border flex items-center justify-center hover:bg-white/10 transition-colors">
                <Bell className="w-4 h-4 text-text-soft" />
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-brand-cyan rounded-full" />
              </button>

              <div className="flex items-center gap-2 pl-3 border-l border-white/[0.08]">
                <div className="w-8 h-8 rounded-full gradient-btn flex items-center justify-center text-white text-sm font-bold">
                  {userInitial}
                </div>
                <span className="text-sm font-medium hidden sm:block">{userName}</span>
              </div>

              <form action={signOut}>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card-bg border border-card-border text-text-soft hover:text-text-main hover:bg-white/[0.08] transition-all text-sm"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:block">Salir</span>
                </button>
              </form>
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
