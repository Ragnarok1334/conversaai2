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
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Asistentes', href: '/dashboard/assistants', icon: Bot },
  { label: 'Conversaciones', href: '/dashboard/conversations', icon: MessageSquare },
  { label: 'Leads', href: '/dashboard/leads', icon: Users },
  { label: 'Configuración', href: '/dashboard/settings', icon: Settings },
  { label: 'Soporte', href: '/dashboard/support', icon: HelpCircle },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:flex flex-col w-64 min-h-screen border-r border-white/[0.08] bg-[#050816]/60 backdrop-blur-xl sticky top-0 h-screen">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-white/[0.06]">
        <Link href="/" className="flex items-center gap-3 group">
          <Image src="/logo.png" alt="ConversaAI logo" width={36} height={36} className="rounded-xl shadow-[0_0_20px_rgba(124,58,237,0.4)]" />
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

      {/* Billing Link */}
      <div className="p-4 border-t border-white/[0.06]">
        <Link href="/dashboard/billing" className="group flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-br from-white/[0.02] to-white/[0.04] border border-white/[0.05] hover:border-white/[0.1] hover:bg-white/[0.06] transition-all">
          <div className="w-8 h-8 rounded-lg bg-brand-violet/20 border border-brand-violet/30 flex items-center justify-center group-hover:scale-105 transition-transform">
            <CreditCard className="w-4 h-4 text-brand-violet" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white group-hover:text-brand-violet transition-colors">Facturación</p>
            <p className="text-xs text-text-soft truncate">Administrar suscripción</p>
          </div>
        </Link>
      </div>
    </aside>
  )
}
