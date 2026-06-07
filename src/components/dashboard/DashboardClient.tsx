'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/providers/ProfileProvider'
import Link from 'next/link'
import {
  Plus, ArrowRight, Bot, Globe, Send, Pencil, Play,
  AlertCircle, CheckCircle, Loader2, RefreshCw, Activity, ArrowUpRight
} from 'lucide-react'
import { PlanUsageCard } from '@/components/dashboard/PlanUsageCard'
import { DashboardStatsRow } from '@/components/dashboard/DashboardStatsRow'
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
  webchat: {
    status: string
    label: string
    domain?: string
    lastSeenAt?: string
    lastSeenUrl?: string
    assistantId?: string
  }
  channels: { webchat: string; telegram: string; whatsapp: string }
  health: {
    score: number
    label: string
    items: { key: string; label: string; done: boolean; href: string }[]
  }
  nextAction: {
    type: string
    title: string
    description: string
    cta: string
    href: string
    priority: 'high' | 'medium' | 'low'
  }
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
  const isMounted = useRef(true)

  // Greeting based on current hour
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches'

  // Name priority: profile.full_name > email > 'Usuario'
  const userName = profile?.full_name || data?.profile?.full_name || profile?.email?.split('@')[0] || data?.profile?.email?.split('@')[0] || 'Usuario'

  const refreshDashboard = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true)
    try {
      const res = await fetch('/api/dashboard', { cache: 'no-store' })
      if (!res.ok) throw new Error('Error cargando datos')
      const json = await res.json()
      if (isMounted.current) {
        setData(json)
        setError(null)
      }
    } catch (err) {
      if (!silent && isMounted.current) setError('No se pudo actualizar el dashboard. Intenta nuevamente.')
    } finally {
      if (isMounted.current) {
        setRefreshing(false)
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    isMounted.current = true
    if (!initialData) refreshDashboard()
    return () => { isMounted.current = false }
  }, [initialData, refreshDashboard])

  // Supabase Realtime subscriptions
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase.channel(`dashboard-realtime-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assistants', filter: `user_id=eq.${userId}` }, () => refreshDashboard(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations', filter: `user_id=eq.${userId}` }, () => refreshDashboard(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads', filter: `user_id=eq.${userId}` }, () => refreshDashboard(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, () => refreshDashboard(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assistant_domains', filter: `user_id=eq.${userId}` }, () => refreshDashboard(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` }, () => refreshDashboard(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subscriptions', filter: `user_id=eq.${userId}` }, () => refreshDashboard(true))
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, refreshDashboard])

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

  if (error && !data) {
    return (
      <div className="max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertCircle className="w-12 h-12 text-brand-pink" />
        <p className="text-slate-300 font-medium">{error}</p>
        <button onClick={() => refreshDashboard()} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-violet/10 border border-brand-violet/20 text-brand-violet text-sm font-semibold hover:bg-brand-violet/20 transition-colors">
          <RefreshCw className="w-4 h-4" /> Reintentar
        </button>
      </div>
    )
  }

  if (!data) return null

  const firstAssistantId = data.recentAssistants[0]?.id

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* A. Header Compacto */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-text-soft text-sm mb-0.5 font-medium">{greeting} 👋</p>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-white">{userName}</h1>
          <p className="text-text-soft text-sm mt-1">Este es el estado actual de tu automatización.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => refreshDashboard(false)}
            className="p-2.5 rounded-xl border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08] transition-colors"
            title="Actualizar"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <Link
            href="/dashboard/create-assistant"
            className="gradient-btn inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-semibold hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(124,58,237,0.3)] transition-all glow-violet text-sm"
          >
            <Plus className="w-4 h-4" /> Crear asistente
          </Link>
        </div>
      </div>

      {/* H. Alertas y estado */}
      {data.alerts.length > 0 && (
        <div className="space-y-2">
          {data.alerts.map((alert, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 p-3 rounded-xl border text-sm font-medium ${
                alert.type === 'error'
                  ? 'bg-brand-pink/10 border-brand-pink/20 text-brand-pink'
                  : alert.type === 'warning'
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                  : 'bg-brand-cyan/10 border-brand-cyan/20 text-brand-cyan'
              }`}
            >
              {alert.type === 'error' ? <AlertCircle className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
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

      {/* B & C. Hero Operativo / Acción Recomendada */}
      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* Next Action & Health Panel */}
        <div className="lg:col-span-1 rounded-[2rem] bg-card-bg/80 backdrop-blur-2xl border border-card-border p-6 md:p-8 flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Activity className="w-32 h-32" />
          </div>
          
          <div className="relative z-10">
            <h2 className="text-xl font-bold text-white mb-6">Próxima acción</h2>
            
            <div className={`p-5 rounded-2xl mb-8 ${data.nextAction.priority === 'high' ? 'bg-brand-violet/10 border border-brand-violet/20' : 'bg-white/[0.04] border border-white/10'}`}>
              <h3 className="text-base font-bold text-white mb-2">{data.nextAction.title}</h3>
              <p className="text-sm text-text-soft mb-5 line-clamp-3">{data.nextAction.description}</p>
              <Link
                href={data.nextAction.href}
                className={`inline-flex items-center justify-center w-full gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  data.nextAction.priority === 'high'
                    ? 'bg-brand-violet text-white hover:bg-brand-violet/90 hover:shadow-[0_0_15px_rgba(124,58,237,0.3)]'
                    : 'bg-white/10 text-white hover:bg-white/15'
                }`}
              >
                {data.nextAction.cta} <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-white">Preparación de cuenta</span>
                <span className="text-xs font-bold text-brand-cyan">{data.health.score}%</span>
              </div>
              <div className="h-1.5 w-full bg-white/[0.04] rounded-full overflow-hidden mb-4">
                <div 
                  className="h-full bg-gradient-to-r from-brand-violet to-brand-cyan transition-all duration-1000" 
                  style={{ width: `${data.health.score}%` }} 
                />
              </div>
              <div className="space-y-2">
                {data.health.items.map(item => (
                  <Link key={item.key} href={item.href} className="flex items-center gap-2 group cursor-pointer">
                    <CheckCircle className={`w-3.5 h-3.5 ${item.done ? 'text-brand-success' : 'text-slate-600'}`} />
                    <span className={`text-xs font-medium transition-colors ${item.done ? 'text-slate-400' : 'text-slate-300 group-hover:text-white'}`}>
                      {item.label}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Plan & Usage */}
        <div className="lg:col-span-2 flex">
          <PlanUsageCard plan={data.plan} usage={data.usage} />
        </div>

      </div>

      {/* D. Métricas Clave */}
      <DashboardStatsRow stats={data.stats} usage={data.usage} />

      {/* E & F. Actividad Reciente & Canales */}
      <div className="grid lg:grid-cols-2 gap-6">
        <DashboardActivity activity={data.activity} />
        <DashboardChannels
          channels={data.channels}
          planKey={data.plan.key}
          firstAssistantId={firstAssistantId}
        />
      </div>

      {/* G. Asistentes Recientes */}
      <div className="bg-card-bg/60 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white">Asistentes recientes</h2>
          <Link href="/dashboard/assistants" className="text-xs font-semibold text-brand-cyan hover:text-brand-cyan/80 flex items-center gap-1 transition-colors">
            Ver todos <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {data.recentAssistants.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-white/10 rounded-2xl">
            <div className="w-14 h-14 rounded-2xl bg-brand-violet/10 border border-brand-violet/20 flex items-center justify-center mx-auto mb-3">
              <Bot className="w-7 h-7 text-brand-violet/50" />
            </div>
            <p className="font-bold text-white mb-1">Aún no tienes asistentes</p>
            <p className="text-xs text-text-soft mb-5">Crea tu primer asistente IA en minutos y automatiza tus ventas.</p>
            <Link
              href="/dashboard/create-assistant"
              className="gradient-btn inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-all glow-violet"
            >
              <Plus className="w-4 h-4" /> Crear asistente
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {data.recentAssistants.map((a) => (
              <div key={a.id} className="flex flex-col sm:flex-row sm:items-center gap-4 py-4 first:pt-0 last:pb-0 group">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-12 h-12 rounded-2xl gradient-btn flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-[0_0_15px_rgba(124,58,237,0.2)]">
                    {a.assistant_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">{a.assistant_name}</p>
                    <p className="text-xs font-medium text-text-soft truncate mt-0.5">{a.business_name}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 sm:ml-auto">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/5">
                    <span className={`w-1.5 h-1.5 rounded-full ${a.status === 'active' ? 'bg-brand-success shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-slate-500'}`} />
                    <span className="text-[11px] font-medium text-slate-300">
                      {a.status === 'active' ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  <span className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/5 text-slate-300">
                    {channelLabel[a.channel] || a.channel}
                  </span>
                  
                  <div className="flex items-center gap-1.5 ml-2">
                    <Link
                      href={`/dashboard/assistants/${a.id}`}
                      className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/10 border border-transparent hover:border-white/10 text-slate-400 hover:text-white transition-all"
                      title="Probar asistente"
                    >
                      <Play className="w-3.5 h-3.5" />
                    </Link>
                    <Link
                      href={`/dashboard/assistants/${a.id}?tab=edit`}
                      className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/10 border border-transparent hover:border-white/10 text-slate-400 hover:text-white transition-all"
                      title="Editar configuración"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Link>
                    <Link
                      href={`/dashboard/assistants/${a.id}?tab=install&channel=webchat`}
                      className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/10 border border-transparent hover:border-white/10 text-slate-400 hover:text-white transition-all"
                      title="Instalar Web Chat"
                    >
                      <Globe className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
