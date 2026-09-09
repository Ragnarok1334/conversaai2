'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/providers/ProfileProvider'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Plus, ArrowRight, Bot, Globe, MessageCircle, Users,
  AlertCircle, CheckCircle2, RefreshCw, Settings, Sparkles
} from 'lucide-react'
import { DashboardActivity } from '@/components/dashboard/DashboardActivity'
import type { ExecutiveSummary } from '@/components/dashboard/ExecutiveSummaryCard'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { DashboardCard } from '@/components/dashboard/DashboardCard'

// Types mirroring API response
interface DashboardData {
  profile: { full_name: string | null; email: string | null }
  plan: { key: string; label: string; status: string; channels: { [key: string]: boolean }; description: string }
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
  executiveSummary: ExecutiveSummary
  timestamps?: {
    lastUpdatedAt: string
    lastConversationAt?: string
    lastLeadAt?: string
    lastAssistantCreatedAt?: string
    webchatLastSeenAt?: string
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
  const router = useRouter()

  // Greeting based on current hour
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches'

  // Name priority: profile.full_name > email > 'Usuario'
  const userName = profile?.full_name || data?.profile?.full_name || profile?.email?.split('@')[0] || data?.profile?.email?.split('@')[0] || 'Usuario'

  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const refreshDashboard = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true)
    try {
      const res = await fetch('/api/dashboard', { cache: 'no-store' })
      const contentType = res.headers.get("content-type") || ""

      if (!res.ok) {
        if (!contentType.includes("application/json")) {
          const text = await res.text()
          if (process.env.NODE_ENV === 'development') {
            console.error("[dashboard] Expected JSON, received HTML:", text.slice(0, 300))
          }
          throw new Error("No pudimos actualizar el dashboard en este momento.")
        }
        const json = await res.json()
        throw new Error(json?.error || "Error cargando datos")
      }

      if (!contentType.includes("application/json")) {
        const text = await res.text()
        if (process.env.NODE_ENV === 'development') {
          console.error("[dashboard] Expected JSON, received HTML on success:", text.slice(0, 300))
        }
        throw new Error("No pudimos actualizar el dashboard en este momento.")
      }

      const json = await res.json()

      if (isMounted.current) {
        setData(json)
        setError(null)
      }
    } catch (err: any) {
      if (!silent && isMounted.current) setError(err.message || 'No se pudo actualizar el dashboard. Intenta nuevamente.')
    } finally {
      if (isMounted.current) {
        setRefreshing(false)
        setLoading(false)
      }
      if (!silent) {
        router.refresh()
      }
    }
  }, [router])

  const debouncedRefresh = useCallback(() => {
    if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current)
    refreshTimeoutRef.current = setTimeout(() => {
      refreshDashboard(true)
    }, 400)
  }, [refreshDashboard])

  useEffect(() => {
    isMounted.current = true
    if (!initialData) refreshDashboard()
    return () => { isMounted.current = false }
  }, [initialData, refreshDashboard])

  // Supabase Realtime subscriptions
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase.channel(`dashboard-realtime-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assistants', filter: `user_id=eq.${userId}` }, debouncedRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations', filter: `user_id=eq.${userId}` }, debouncedRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads', filter: `user_id=eq.${userId}` }, debouncedRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, debouncedRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assistant_domains', filter: `user_id=eq.${userId}` }, debouncedRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` }, debouncedRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subscriptions', filter: `user_id=eq.${userId}` }, debouncedRefresh)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current)
    }
  }, [userId, debouncedRefresh])

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

  const webchatReady = data.webchat.status === 'installed'
  const assistantsReady = data.stats.activeAssistantCount > 0

  const formatUpdateTime = (isoStr?: string) => {
    if (!isoStr) return ''
    const d = new Date(isoStr)
    return d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
  }

  const metrics = [
    {
      label: 'Leads nuevos',
      value: data.stats.newLeadCount,
      detail: data.stats.newLeadCount > 0 ? 'Requieren atención' : 'Todo al día',
      href: '/dashboard/leads',
      icon: Users,
      tone: 'text-brand-pink bg-brand-pink/10',
    },
    {
      label: 'Conversaciones abiertas',
      value: data.stats.openConversationCount,
      detail: `${data.stats.conversationCount} en total`,
      href: '/dashboard/conversations',
      icon: MessageCircle,
      tone: 'text-brand-cyan bg-brand-cyan/10',
    },
    {
      label: 'Asistentes activos',
      value: data.stats.activeAssistantCount,
      detail: `${data.stats.assistantCount} creados`,
      href: '/dashboard/assistants',
      icon: Bot,
      tone: 'text-brand-violet bg-brand-violet/10',
    },
    {
      label: 'Web Chat',
      value: webchatReady ? 'Conectado' : 'Pendiente',
      detail: data.webchat.domain || 'Sin dominio',
      href: data.webchat.assistantId
        ? `/dashboard/assistants/${data.webchat.assistantId}?tab=webchat`
        : '/dashboard/assistants',
      icon: Globe,
      tone: webchatReady
        ? 'text-brand-success bg-brand-success/10'
        : 'text-amber-500 bg-amber-500/10',
    },
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-text-soft text-sm font-medium">{greeting} 👋</p>
          <div className="flex flex-wrap items-center gap-3 mt-1">
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-white">{userName}</h1>
            {data.timestamps?.lastUpdatedAt && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-success/10 border border-brand-success/20 text-brand-success text-[10px] font-semibold">
                <span className="w-2 h-2 rounded-full bg-brand-success" />
                En vivo · {formatUpdateTime(data.timestamps.lastUpdatedAt)}
              </span>
            )}
          </div>
          <p className="text-text-soft text-sm mt-1">Lo importante de tu negocio, en un solo lugar.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refreshDashboard(false)}
            disabled={refreshing}
            className="p-2.5 rounded-xl border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08] transition-colors disabled:opacity-50"
            title="Actualizar"
            aria-label="Actualizar dashboard"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <Link href="/dashboard/create-assistant" className="gradient-btn inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-semibold text-sm">
            <Plus className="w-4 h-4" /> Nuevo asistente
          </Link>
        </div>
      </div>

      {data.alerts.length > 0 && (
        <div className="space-y-2">
          {data.alerts.slice(0, 2).map((alert, index) => (
            <div key={index} className="flex items-center gap-3 p-3 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-500 text-sm font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="flex-1">{alert.message}</span>
              {alert.href && alert.action && (
                <Link href={alert.href} className="text-xs font-semibold underline underline-offset-2">
                  {alert.action}
                </Link>
              )}
            </div>
          ))}
        </div>
      )}

      <section aria-labelledby="summary-title">
        <div className="flex items-center justify-between mb-3">
          <h2 id="summary-title" className="text-sm font-bold text-white">Resumen</h2>
          <span className="text-xs text-text-soft">Actualización automática</span>
        </div>
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {metrics.map((metric) => {
            const Icon = metric.icon
            return (
              <Link key={metric.label} href={metric.href} className="group bg-card-bg/80 border border-card-border rounded-2xl p-4 hover:border-brand-violet/30 transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${metric.tone}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-text-soft group-hover:text-brand-violet group-hover:translate-x-0.5 transition-all" />
                </div>
                <p className="text-xs text-text-soft font-semibold mt-4">{metric.label}</p>
                <p className="text-xl font-bold text-white mt-0.5 truncate">{metric.value}</p>
                <p className="text-xs text-text-soft mt-1 truncate">{metric.detail}</p>
              </Link>
            )
          })}
        </div>
      </section>

      <div className="grid lg:grid-cols-3 gap-6">
        <DashboardCard className="lg:col-span-2">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-brand-pink/10 text-brand-pink flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold uppercase tracking-wider text-brand-pink">Prioridad de hoy</p>
              <h2 className="text-xl font-bold text-white mt-1">
                {data.stats.newLeadCount > 0
                  ? `Tienes ${data.stats.newLeadCount} ${data.stats.newLeadCount === 1 ? 'lead nuevo' : 'leads nuevos'}`
                  : 'No tienes leads nuevos pendientes'}
              </h2>
              <p className="text-sm text-text-soft mt-1">
                {data.stats.newLeadCount > 0
                  ? 'Revisa sus datos y registra el próximo seguimiento.'
                  : 'Cuando llegue una oportunidad nueva aparecerá destacada aquí.'}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <Link href="/dashboard/leads" className="gradient-btn inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-white text-sm font-semibold">
              <Users className="w-4 h-4" /> Gestionar leads
            </Link>
            <Link href="/dashboard/conversations" className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-card-border bg-white/[0.03] text-white text-sm font-semibold hover:bg-white/[0.07] transition-colors">
              <MessageCircle className="w-4 h-4" /> Ver conversaciones
            </Link>
          </div>
        </DashboardCard>

        <DashboardCard>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-white">Estado del sistema</h2>
            <Link href="/dashboard/settings" className="text-xs font-semibold text-brand-violet hover:opacity-80">Configurar</Link>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-text-soft">Asistentes</span>
              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${assistantsReady ? 'text-brand-success' : 'text-amber-500'}`}>
                <span className={`w-2 h-2 rounded-full ${assistantsReady ? 'bg-brand-success' : 'bg-amber-500'}`} />
                {assistantsReady ? 'Activo' : 'Pendiente'}
              </span>
            </div>
            <div className="h-px bg-white/[0.06]" />
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-text-soft">Web Chat</span>
              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${webchatReady ? 'text-brand-success' : 'text-amber-500'}`}>
                <span className={`w-2 h-2 rounded-full ${webchatReady ? 'bg-brand-success' : 'bg-amber-500'}`} />
                {webchatReady ? 'Conectado' : 'Configurar'}
              </span>
            </div>
            <div className="h-px bg-white/[0.06]" />
            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-soft">Mensajes del plan</span>
                <span className="font-semibold text-white">{data.usage.messagesUsed} / {data.usage.messagesLimitFormatted}</span>
              </div>
              <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden mt-2">
                <div className="h-full rounded-full gradient-btn" style={{ width: `${Math.min(data.usage.messagesPercentage, 100)}%` }} />
              </div>
            </div>
          </div>
        </DashboardCard>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <DashboardActivity activity={data.activity} />

        <DashboardCard>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-white">Tus asistentes</h2>
              <p className="text-xs text-text-soft mt-1">Acceso rápido para administrar.</p>
            </div>
            <Link href="/dashboard/assistants" className="text-xs font-semibold text-brand-cyan inline-flex items-center gap-1">
              Ver todos <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {data.recentAssistants.length === 0 ? (
            <EmptyState
              icon={Bot}
              title="Crea tu primer asistente"
              description="Configura tu negocio y empieza a recibir oportunidades."
              actionLabel="Crear asistente"
              actionHref="/dashboard/create-assistant"
            />
          ) : (
            <div className="space-y-2">
              {data.recentAssistants.slice(0, 3).map((assistant) => (
                <Link
                  key={assistant.id}
                  href={`/dashboard/assistants/${assistant.id}`}
                  className="flex items-center gap-3 p-3 rounded-xl border border-transparent hover:border-card-border hover:bg-white/[0.03] transition-all"
                >
                  <div className="w-10 h-10 rounded-xl gradient-btn text-white font-bold flex items-center justify-center shrink-0">
                    {assistant.assistant_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-white truncate">{assistant.assistant_name}</p>
                    <p className="text-xs text-text-soft truncate">{assistant.business_name} · {channelLabel[assistant.channel] || assistant.channel}</p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${assistant.status === 'active' ? 'text-brand-success bg-brand-success/10' : 'text-text-soft bg-white/[0.05]'}`}>
                    {assistant.status === 'active' ? 'Activo' : 'Inactivo'}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </DashboardCard>
      </div>
    </div>
  )
}
