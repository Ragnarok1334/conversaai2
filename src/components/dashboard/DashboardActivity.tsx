'use client'

import { Bot, MessageSquare, Users, Bell, Clock, Activity } from 'lucide-react'
import Link from 'next/link'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { DashboardCard } from '@/components/dashboard/DashboardCard'

interface ActivityItem {
  id: string
  type: string
  title: string
  description: string
  created_at: string
  href?: string
}

interface Props {
  activity: ActivityItem[]
}

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return 'hace unos segundos'
  if (diffMin < 60) return `hace ${diffMin} min`
  if (diffHours < 24) return `hace ${diffHours}h`
  if (diffDays === 1) return 'ayer'
  if (diffDays < 7) return `hace ${diffDays} días`
  return new Date(dateStr).toLocaleDateString('es', { day: '2-digit', month: 'short' })
}

function getIcon(type: string) {
  switch (type) {
    case 'assistant': return { icon: Bot, color: 'text-brand-violet', bg: 'bg-brand-violet/10' }
    case 'conversation': return { icon: MessageSquare, color: 'text-brand-cyan', bg: 'bg-brand-cyan/10' }
    case 'lead': return { icon: Users, color: 'text-brand-pink', bg: 'bg-brand-pink/10' }
    default: return { icon: Bell, color: 'text-slate-400', bg: 'bg-white/[0.04]' }
  }
}

export function DashboardActivity({ activity }: Props) {
  return (
    <DashboardCard className="h-full">
      <div className="flex items-center gap-2 mb-5">
        <Clock className="w-4 h-4 text-slate-400" />
        <h2 className="text-base font-semibold text-white">Actividad reciente</h2>
      </div>

      {activity.length === 0 ? (
        <EmptyState 
          icon={Activity}
          title="Tu actividad aparecerá aquí"
          description="Cuando tus asistentes reciban conversaciones, capturen leads o actualices configuraciones, lo verás en este timeline."
        />
      ) : (
        <div className="space-y-1">
          {activity.map((item, i) => {
            const { icon: Icon, color, bg } = getIcon(item.type)
            const content = (
              <div
                className={`flex items-start gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                  item.href ? 'hover:bg-white/[0.04] cursor-pointer' : ''
                }`}
              >
                <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white leading-tight">{item.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">{item.description}</p>
                </div>
                <span className="text-[10px] text-slate-500 whitespace-nowrap flex-shrink-0 mt-0.5">
                  {timeAgo(item.created_at)}
                </span>
              </div>
            )

            return item.href ? (
              <Link key={item.id} href={item.href}>{content}</Link>
            ) : (
              <div key={item.id}>{content}</div>
            )
          })}
        </div>
      )}
    </DashboardCard>
  )
}
