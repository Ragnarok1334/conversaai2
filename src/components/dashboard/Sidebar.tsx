'use client'

import Link from 'next/link'
import Image from 'next/image'
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
  CreditCard,
  HelpCircle,
} from 'lucide-react'

const navItems = [
  { label: 'Centro de control', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Asistentes', href: '/dashboard/assistants', icon: Bot },
  { label: 'Conversaciones', href: '/dashboard/conversations', icon: MessageSquare },
  { label: 'Leads', href: '/dashboard/leads', icon: Users },
  { label: 'Facturación', href: '/dashboard/billing', icon: CreditCard },
  { label: 'Configuración', href: '/dashboard/settings', icon: Settings },
  { label: 'Soporte', href: '/dashboard/support', icon: HelpCircle },
]

interface SidebarProps {
  onNavClick?: () => void;
}

export function Sidebar({ onNavClick }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="flex flex-col w-full lg:w-64 min-h-screen border-r border-white/[0.08] bg-[#050816]/80 backdrop-blur-2xl lg:sticky lg:top-0 h-screen overflow-y-auto">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-white/[0.06]">
        <Link href="/" className="flex items-center gap-3 group" onClick={onNavClick}>
          <Image src="/logo.png" alt="ConversaAI logo" width={36} height={36} className="rounded-xl shadow-[0_0_20px_rgba(124,58,237,0.4)]" />
          <div>
            <span className="text-lg font-bold tracking-tight block text-white">ConversaAI</span>
            <span className="text-[10px] uppercase font-bold tracking-widest text-brand-cyan">Panel SaaS</span>
          </div>
        </Link>
      </div>

      {/* Create CTA */}
      <div className="px-4 py-4">
        <Link
          href="/dashboard/create-assistant"
          onClick={onNavClick}
          className="gradient-btn w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white font-semibold text-sm hover:opacity-90 transition-all glow-violet shadow-lg"
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
            <Link key={item.href} href={item.href} onClick={onNavClick}>
              <motion.div
                whileHover={{ x: 2 }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative overflow-hidden group ${
                  isActive
                    ? 'text-white shadow-sm'
                    : 'text-text-soft hover:text-text-main hover:bg-white/[0.04]'
                }`}
              >
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-brand-violet/20 to-brand-cyan/5 border border-brand-violet/30 rounded-xl" />
                )}
                <item.icon className={`w-4 h-4 relative z-10 ${isActive ? 'text-brand-cyan' : 'group-hover:text-brand-cyan/70 transition-colors'}`} />
                <span className="relative z-10">{item.label}</span>
              </motion.div>
            </Link>
          )
        })}
      </nav>

      {/* Support Info */}
      <div className="p-4 border-t border-white/[0.06] mt-auto">
        <div className="px-2">
          <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-2">Ayuda y Soporte</p>
          <a href="mailto:soporte@conversaai.store" className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors group">
            <div className="w-6 h-6 rounded bg-white/5 flex items-center justify-center border border-white/10 group-hover:bg-brand-violet/20 group-hover:border-brand-violet/30 transition-colors">
              <HelpCircle className="w-3 h-3 text-brand-violet" />
            </div>
            soporte@conversaai.store
          </a>
        </div>
      </div>
    </aside>
  )
}
