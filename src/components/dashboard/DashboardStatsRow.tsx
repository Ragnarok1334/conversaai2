'use client'

import { Bot, MessageSquare, Users, Zap, ArrowRight, TrendingUp } from 'lucide-react'
import Link from 'next/link'

interface Stats {
  assistantCount: number
  activeAssistantCount: number
  conversationCount: number
  openConversationCount: number
  leadCount: number
  newLeadCount: number
}

interface Usage {
  assistantsLimit: number | null
  messagesUsed: number
  messagesLimit: number | null
  messagesPercentage: number
}

interface Props {
  stats: Stats
  usage: Usage
}

function StatCard({
  icon: Icon,
  label,
  value,
  subtitle,
  color,
  href,
  ctaText
}: {
  icon: React.ElementType
  label: string
  value: number | string
  subtitle: string
  color: 'violet' | 'cyan' | 'pink' | 'green'
  href: string
  ctaText: string
}) {
  const colorMap = {
    violet: {
      bg: 'bg-brand-violet/10',
      border: 'border-brand-violet/20',
      icon: 'text-brand-violet',
      hover: 'hover:border-brand-violet/40',
      glow: 'hover:shadow-[0_0_20px_rgba(124,58,237,0.1)]',
    },
    cyan: {
      bg: 'bg-brand-cyan/10',
      border: 'border-brand-cyan/20',
      icon: 'text-brand-cyan',
      hover: 'hover:border-brand-cyan/40',
      glow: 'hover:shadow-[0_0_20px_rgba(34,211,238,0.1)]',
    },
    pink: {
      bg: 'bg-brand-pink/10',
      border: 'border-brand-pink/20',
      icon: 'text-brand-pink',
      hover: 'hover:border-brand-pink/40',
      glow: 'hover:shadow-[0_0_20px_rgba(236,72,153,0.1)]',
    },
    green: {
      bg: 'bg-brand-success/10',
      border: 'border-brand-success/20',
      icon: 'text-brand-success',
      hover: 'hover:border-brand-success/40',
      glow: 'hover:shadow-[0_0_20px_rgba(34,197,94,0.1)]',
    },
  }
  const c = colorMap[color]

  return (
    <div className={`group relative overflow-hidden rounded-3xl p-5 md:p-6 bg-card-bg/80 backdrop-blur-xl border ${c.border} flex flex-col justify-between`}>
      <div>
        <div className="flex items-start justify-between mb-4">
          <div className={`w-12 h-12 rounded-2xl ${c.bg} flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-6 h-6 ${c.icon}`} />
          </div>
        </div>
        <p className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        <p className="text-sm font-semibold text-white mb-1">{label}</p>
        <p className="text-xs text-text-soft flex items-center gap-1.5 mb-5">
          <span className={`w-1.5 h-1.5 rounded-full ${c.icon.replace('text-', 'bg-')}`} />
          {subtitle}
        </p>
      </div>
      
      <Link
        href={href}
        className={`flex items-center justify-between pt-4 mt-auto border-t border-white/5 text-xs font-medium text-text-secondary ${c.hover.replace('border-', 'text-').replace('/40', '')} transition-colors`}
      >
        {ctaText}
        <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
      </Link>
    </div>
  )
}

export function DashboardStatsRow({ stats, usage }: Props) {
  const assistantsLimitStr = usage.assistantsLimit ? ` de ${usage.assistantsLimit}` : ''
  
  const messagesAvailable = usage.messagesLimit 
    ? Math.max(0, usage.messagesLimit - usage.messagesUsed)
    : 'Ilimitados'

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
      <StatCard
        icon={Bot}
        label="Asistentes activos"
        value={stats.activeAssistantCount}
        subtitle={`${stats.assistantCount}${assistantsLimitStr} en total`}
        color="violet"
        href="/dashboard/assistants"
        ctaText="Ver asistentes"
      />
      <StatCard
        icon={MessageSquare}
        label="Conversaciones"
        value={stats.conversationCount}
        subtitle={`${stats.openConversationCount} abiertas actualmente`}
        color="cyan"
        href="/dashboard/conversations"
        ctaText="Ver conversaciones"
      />
      <StatCard
        icon={Users}
        label="Leads captados"
        value={stats.leadCount}
        subtitle={`${stats.newLeadCount} nuevos esta semana`}
        color="pink"
        href="/dashboard/leads"
        ctaText="Ver leads"
      />
      <StatCard
        icon={Zap}
        label="Mensajes del ciclo"
        value={usage.messagesUsed}
        subtitle={usage.messagesLimit ? `${messagesAvailable} disponibles (${100 - usage.messagesPercentage}%)` : 'Mensajes ilimitados'}
        color={usage.messagesPercentage >= 80 ? 'pink' : 'green'}
        href="/dashboard/billing"
        ctaText="Ver facturación"
      />
    </div>
  )
}
