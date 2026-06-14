'use client'

import { Menu, LogOut } from 'lucide-react'
import { NotificationsBell } from '@/components/dashboard/NotificationsBell'
import { signOut } from '@/app/auth/actions'
import { useProfile } from '@/providers/ProfileProvider'
import { usePathname } from 'next/navigation'

interface TopbarProps {
  onMenuClick?: () => void;
}

const routeMap: Record<string, string> = {
  '/dashboard': 'Centro de control',
  '/dashboard/assistants': 'Tus Asistentes',
  '/dashboard/conversations': 'Conversaciones',
  '/dashboard/leads': 'Leads Capturados',
  '/dashboard/billing': 'Facturación y Plan',
  '/dashboard/settings': 'Configuración',
  '/dashboard/support': 'Soporte',
  '/dashboard/create-assistant': 'Crear Asistente',
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { profile } = useProfile()
  const pathname = usePathname()

  const userName = profile?.full_name || profile?.email?.split('@')[0] || 'Usuario'
  const userInitial = userName.charAt(0).toUpperCase()

  const currentSection = routeMap[pathname] || 'Dashboard'

  return (
    <header className="sticky top-0 z-10 border-b border-white/[0.08] bg-[#050816]/70 backdrop-blur-xl">
      <div className="flex items-center justify-between px-4 md:px-8 h-16">
        {/* Mobile menu */}
        <button onClick={onMenuClick} className="lg:hidden text-text-soft hover:text-white transition-colors p-2 -ml-2 rounded-lg hover:bg-white/5">
          <Menu className="w-5 h-5" />
        </button>

        {/* Breadcrumb Desktop */}
        <div className="hidden lg:flex items-center gap-2 text-sm">
          <span className="text-slate-500">Dashboard</span>
          <span className="text-slate-600">/</span>
          <span className="text-white font-medium">{currentSection}</span>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <NotificationsBell />

          <div className="h-8 w-[1px] bg-white/[0.08] hidden sm:block" />

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2.5 py-1 px-1 sm:pr-4 rounded-full bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.06] hover:border-white/10 transition-all cursor-default shadow-sm group">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-violet to-brand-cyan flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-brand-cyan/20 group-hover:scale-105 transition-transform shrink-0">
                {userInitial}
              </div>
              <span className="text-sm font-semibold hidden sm:block text-text-main pr-1 max-w-[150px] truncate" title={userName}>
                {userName}
              </span>
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
  )
}
