'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  Bot,
  MessageSquare,
  Users,
  Settings,
  Plus,
  ChevronRight,
  Zap,
} from 'lucide-react'

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Asistentes', href: '/dashboard/assistants', icon: Bot },
  { label: 'Conversaciones', href: '/dashboard/conversations', icon: MessageSquare },
  { label: 'Leads', href: '/dashboard/leads', icon: Users },
  { label: 'Configuración', href: '/dashboard/settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:flex flex-col w-64 min-h-screen border-r border-white/[0.08] bg-[#050816]/60 backdrop-blur-xl sticky top-0 h-screen">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-white/[0.06]">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl gradient-btn flex items-center justify-center font-bold text-white text-sm shadow-[0_0_20px_rgba(124,58,237,0.4)]">
            C
          </div>
          <span className="text-lg font-bold tracking-tight">ConversaAI</span>
        </Link>
      </div>

      {/* Create CTA */}
      <div className="px-4 py-4">
        <Link
          href="/dashboard/create-assistant"
          className="gradient-btn w-full flex items-center gap-2 px-4 py-3 rounded-xl text-white font-semibold text-sm hover:opacity-90 transition-opacity glow-violet"
        >
          <Plus className="w-4 h-4" />
          Crear asistente
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ x: 2 }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-brand-violet/20 text-white border border-brand-violet/30'
                    : 'text-text-soft hover:text-text-main hover:bg-white/[0.04]'
                }`}
              >
                <item.icon className={`w-4 h-4 ${isActive ? 'text-brand-violet' : ''}`} />
                {item.label}
                {isActive && <ChevronRight className="w-3 h-3 ml-auto text-brand-violet/60" />}
              </motion.div>
            </Link>
          )
        })}
      </nav>

      {/* Upgrade Banner */}
      <div className="p-4 border-t border-white/[0.06]">
        <div className="bg-gradient-to-br from-brand-violet/20 to-brand-cyan/10 border border-brand-violet/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-brand-cyan" />
            <span className="text-sm font-semibold text-white">Plan Pro</span>
          </div>
          <p className="text-xs text-text-soft mb-3">Canales ilimitados y conversaciones sin límite</p>
          <button className="w-full text-xs font-semibold gradient-btn py-2 rounded-lg text-white hover:opacity-90 transition-opacity">
            Mejorar plan
          </button>
        </div>
      </div>
    </aside>
  )
}
