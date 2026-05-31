'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/providers/ProfileProvider'
import Link from 'next/link'
import {
  Plus, ArrowRight, Bot, Globe, Send, Pencil, Play,
  AlertCircle, CheckCircle, Loader2, RefreshCw
} from 'lucide-react'
import { PlanUsageCard } from '@/components/dashboard/PlanUsageCard'
import { DashboardStatsRow } from '@/components/dashboard/DashboardStatsRow'
import { DashboardNextSteps } from '@/components/dashboard/DashboardNextSteps'
import { DashboardActivity } from '@/components/dashboard/DashboardActivity'
import { DashboardChannels } from '@/components/dashboard/DashboardChannels'

// Types mirroring API response
interface DashboardData {
  profile: { full_name: string | null; email: string | null }
  plan: { key: string; label: string; status: string; channels: string[]; description: string }
  usage: {
    assistantsUsed: number
    assistantsLimit: number | null
    messagesUsed: number
    messagesLimit: number | null
    messagesPercentage: number
    assistantsPercentage: number
    assistantsLimitFormatted: string
    messagesLimitFormatted: string
  }
  stats: {
    assistantCount: number
    activeAssistantCount: number
    conversationCount: number
    openConversationCount: number
    leadCount: number
    newLeadCount: number
  }
  recentAssistants: {
    id: string
    assistant_name: string
    business_name: string
    channel: string
    status: string
    created_at: string
    tone: string
  }[]
  channels: { webchat: string; telegram: string; whatsapp: string }
  alerts: { type: string; message: string; action?: string; href?: string }[]
  activity: { id: string; type: string; title: string; description: string; created_at: string; href?: string }[]
}

interface Props {
  initialData: DashboardData | null
  userId: string
}

const channelLabel: Record<string, string> = {
  webchat: 'Web Chat',
  telegram: 'Telegram',
  whatsapp: 'WhatsApp',
}

export function DashboardClient({ initialData, userId }: Props) {
  const { profile } = useProfile()
  const [data, setData] = useState<DashboardData | null>(initialData)
  const [loading, setLoading] = useState(!initialData)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // Greeting based on current hour
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches'

  // Name priority: profile.full_name > email > 'Usuario'
  const userName = profile?.full_name || data?.profile?.full_name || profile?.email?.split('@')[0] || data?.profile?.email?.split('@')[0] || 'Usuario'

  const refreshDashboard = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true)
    try {
      const res = await fetch('/api/dashboard')
      if (!res.ok) throw new Error('Error cargando datos')
      const json = await res.json()
      setData(json)
      setError(null)
    } catch (err) {
      if (!silent) setError('No se pudo actualizar el dashboard. Intenta nuevamente.')
    } finally {
      setRefreshing(false)
      setLoading(false)
    }
  }, [])

  // Initial load if no server data
  useEffect(() => {
    if (!initialData) {
      refreshDashboard()
    }
  }, [initialData, refreshDashboard])

  // Supabase Realtime subscriptions
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase.channel(`dashboard-realtime-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assistants', filter: `user_id=eq.${userId}` },
        () => refreshDashboard(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations', filter: `user_id=eq.${userId}` },
        () => refreshDashboard(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads', filter: `user_id=eq.${userId}` },
        () => refreshDashboard(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => refreshDashboard(true))
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, refreshDashboard])

  // Loading skeleton
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 animate-pulse">
        <div className="h-20 rounded-2xl bg-white/[0.04]" />
        <div className="h-40 rounded-3xl bg-white/[0.04]" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 rounded-2xl bg-white/[0.04]" />)}
        </div>
        <div className="h-48 rounded-2xl bg-white/[0.04]" />
      </div>
    )
  }

  // Error state
  if (error && !data) {
    return (
      <div className="max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertCircle className="w-12 h-12 text-brand-pink" />
        <p className="text-slate-300 font-medium">{error}</p>
        <button
          onClick={() => refreshDashboard()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-violet/10 border border-brand-violet/20 text-brand-violet text-sm font-semibold hover:bg-brand-violet/20 transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Reintentar
        </button>
      </div>
    )
  }

  if (!data) return null

  const firstAssistantId = data.recentAssistants[0]?.id

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* A. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-text-soft text-sm mb-0.5">{greeting} 👋</p>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-white">{userName}</h1>
          <p className="text-text-soft text-sm mt-1">Aquí tienes el resumen actualizado de tu cuenta.</p>
        </div>
        <div className="flex items-center gap-3">
          {refreshing && <Loader2 className="w-4 h-4 text-slate-500 animate-spin" />}
          <Link
            href="/dashboard/assistants"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-white/[0.04] text-white text-sm font-medium hover:bg-white/[0.08] transition-colors"
          >
            <Bot className="w-4 h-4" /> Ver asistentes
          </Link>
          <Link
            href="/dashboard/create-assistant"
            className="gradient-btn inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-semibold hover:scale-105 hover:opacity-90 transition-all glow-violet text-sm"
          >
            <Plus className="w-4 h-4" /> Crear asistente
          </Link>
        </div>
      </div>

      {/* H. Alerts banner */}
      {data.alerts.length > 0 && (
        <div className="space-y-2">
          {data.alerts.map((alert, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 p-3 rounded-xl border text-sm ${
                alert.type === 'error'
                  ? 'bg-brand-pink/10 border-brand-pink/20 text-brand-pink'
                  : alert.type === 'warning'
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                  : 'bg-brand-cyan/10 border-brand-cyan/20 text-brand-cyan'
              }`}
            >
              {alert.type === 'error' ? <AlertCircle className="w-4 h-4 flex-shrink-0" /> : <CheckCircle className="w-4 h-4 flex-shrink-0" />}
              <span className="flex-1">{alert.message}</span>
              {alert.href && alert.action && (
                <Link href={alert.href} className="font-semibold underline underline-offset-2 text-xs whitespace-nowrap">
                  {alert.action}
                </Link>
              )}
            </div>
          ))}
        </div>
      )}

      {/* B. Plan card */}
      <PlanUsageCard />

      {/* C. Stats row */}
      <DashboardStatsRow stats={data.stats} usage={data.usage} />

      {/* D. Next Steps */}
      <DashboardNextSteps
        assistantCount={data.stats.assistantCount}
        leadCount={data.stats.leadCount}
        planKey={data.plan.key}
        channels={data.channels}
        usage={{
          assistantsUsed: data.usage.assistantsUsed,
          assistantsLimit: data.usage.assistantsLimit,
          messagesPercentage: data.usage.messagesPercentage,
        }}
        recentAssistants={data.recentAssistants}
      />

      {/* E + F: Activity + Channels side by side */}
      <div className="grid lg:grid-cols-2 gap-6">
        <DashboardActivity activity={data.activity} />
        <DashboardChannels
          channels={data.channels}
          planKey={data.plan.key}
          firstAssistantId={firstAssistantId}
        />
      </div>

      {/* G. Recent assistants */}
      <div className="bg-card-bg/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-white">Asistentes recientes</h2>
          <Link href="/dashboard/assistants" className="text-xs text-brand-cyan hover:text-brand-cyan/80 flex items-center gap-1 transition-colors">
            Ver todos <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {data.recentAssistants.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-14 h-14 rounded-2xl bg-brand-violet/10 border border-brand-violet/20 flex items-center justify-center mx-auto mb-3">
              <Bot className="w-7 h-7 text-brand-violet/50" />
            </div>
            <p className="font-semibold text-sm text-white mb-1">Aún no tienes asistentes</p>
            <p className="text-xs text-slate-400 mb-4">Crea tu primer asistente IA en minutos.</p>
            <Link
              href="/dashboard/create-assistant"
              className="gradient-btn inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" /> Crear asistente
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {data.recentAssistants.map((a) => (
              <div key={a.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0 group">
                <div className="w-9 h-9 rounded-xl gradient-btn flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {a.assistant_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{a.assistant_name}</p>
                  <p className="text-xs text-slate-400 truncate">{a.business_name}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="hidden sm:block text-[10px] px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-slate-400">
                    {channelLabel[a.channel] || a.channel}
                  </span>
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${a.status === 'active' ? 'bg-brand-success' : 'bg-slate-600'}`} />
                </div>
                <div className="hidden sm:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Link
                    href={`/dashboard/assistants/${a.id}`}
                    className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white transition-colors"
                    title="Probar"
                  >
                    <Play className="w-3.5 h-3.5" />
                  </Link>
                  <Link
                    href={`/dashboard/assistants/${a.id}?tab=edit`}
                    className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white transition-colors"
                    title="Editar"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Link>
                  <Link
                    href={`/dashboard/assistants/${a.id}?tab=install&channel=webchat`}
                    className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white transition-colors"
                    title="Instalar"
                  >
                    <Globe className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
