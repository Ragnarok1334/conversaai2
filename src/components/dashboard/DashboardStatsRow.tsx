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
  messagesUsed: number
  messagesLimit: number | null
  messagesPercentage: number
  messagesLimitFormatted: string
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
  trend,
  color,
  href,
}: {
  icon: React.ElementType
  label: string
  value: number | string
  subtitle: string
  trend?: string
  color: 'violet' | 'cyan' | 'pink' | 'green'
  href: string
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
    <Link
      href={href}
      className={`group relative overflow-hidden rounded-2xl p-5 bg-card-bg/80 backdrop-blur-xl border ${c.border} ${c.hover} ${c.glow} hover:-translate-y-0.5 transition-all duration-200`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${c.icon}`} />
        </div>
        <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all" />
      </div>
      <p className="text-3xl font-bold text-white mb-1">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      <p className="text-xs font-medium text-slate-400 mb-1">{label}</p>
      {subtitle && (
        <p className="text-[11px] text-slate-500 flex items-center gap-1">
          <TrendingUp className="w-3 h-3 text-brand-success" />
          {subtitle}
        </p>
      )}
    </Link>
  )
}

export function DashboardStatsRow({ stats, usage }: Props) {
  const messagesLabel = usage.messagesLimit
    ? `${usage.messagesUsed.toLocaleString()} / ${usage.messagesLimitFormatted}`
    : `${usage.messagesUsed.toLocaleString()} usados`

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        icon={Bot}
        label="Asistentes"
        value={stats.assistantCount}
        subtitle={`${stats.activeAssistantCount} activos`}
        color="violet"
        href="/dashboard/assistants"
      />
      <StatCard
        icon={MessageSquare}
        label="Conversaciones"
        value={stats.conversationCount}
        subtitle={`${stats.openConversationCount} abiertas`}
        color="cyan"
        href="/dashboard/conversations"
      />
      <StatCard
        icon={Users}
        label="Leads captados"
        value={stats.leadCount}
        subtitle={`${stats.newLeadCount} nuevos esta semana`}
        color="pink"
        href="/dashboard/leads"
      />
      <StatCard
        icon={Zap}
        label="Mensajes del ciclo"
        value={messagesLabel}
        subtitle={usage.messagesLimit ? `${usage.messagesPercentage}% usado` : 'Sin límite'}
        color={usage.messagesPercentage >= 80 ? 'pink' : 'green'}
        href="/dashboard/billing"
      />
    </div>
  )
}
