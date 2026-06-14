'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/providers/ProfileProvider'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Plus, ArrowRight, Bot, Globe, Send, Pencil, Play,
  AlertCircle, CheckCircle, Loader2, RefreshCw, Activity, ArrowUpRight
} from 'lucide-react'
import { PlanUsageCard } from '@/components/dashboard/PlanUsageCard'
import { DashboardStatsRow } from '@/components/dashboard/DashboardStatsRow'
import { DashboardActivity } from '@/components/dashboard/DashboardActivity'
import { DashboardChannels } from '@/components/dashboard/DashboardChannels'
import { ExecutiveSummaryCard, ExecutiveSummary } from '@/components/dashboard/ExecutiveSummaryCard'
import { QuickActions } from '@/components/dashboard/QuickActions'
import { SetupChecklist } from '@/components/dashboard/SetupChecklist'
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

      if (!contentType.includes("application/json")) {
        const text = await res.text()
        console.error("[dashboard] Expected JSON, received:", text.slice(0, 300))
        throw new Error("No se pudo actualizar el dashboard. Formato incorrecto.")
      }

      const json = await res.json()

      if (!res.ok) {
        throw new Error(json?.error || "Error cargando datos")
      }

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

  const firstAssistantId = data.recentAssistants[0]?.id

  const formatUpdateTime = (isoStr?: string) => {
    if (!isoStr) return ''
    const d = new Date(isoStr)
    return d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* A. Header Compacto */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-text-soft text-sm mb-0.5 font-medium">{greeting} 👋</p>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-white">{userName}</h1>
            {data.timestamps?.lastUpdatedAt && (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-success/10 border border-brand-success/20 text-brand-success text-[10px] font-semibold mt-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-success opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-success"></span>
                </span>
                En vivo · Actualizado {formatUpdateTime(data.timestamps.lastUpdatedAt)}
              </div>
            )}
          </div>
          <p className="text-text-soft text-sm mt-1">Monitorea tus asistentes, conversaciones, leads, canales y uso del plan desde un solo lugar.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => refreshDashboard(false)}
            disabled={refreshing}
            className="p-2.5 rounded-xl border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08] transition-colors disabled:opacity-50"
            title="Actualizar dashboard"
            aria-label="Actualizar dashboard"
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

      {/* B. Resumen Ejecutivo */}
      <ExecutiveSummaryCard summary={{
        ...data.executiveSummary,
        // Override "attention" to "setup" if there are no assistants yet (avoiding false alarms)
        status: (data.executiveSummary.status === 'attention' && data.stats.assistantCount === 0) ? 'setup' : data.executiveSummary.status
      }} />

      {/* C. Indicadores Clave */}
      <DashboardStatsRow stats={data.stats} usage={data.usage} />

      {/* D & E. Onboarding y Acciones Rápidas */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <SetupChecklist steps={data.health.items.map(item => ({
            id: item.key,
            label: item.label,
            completed: item.done,
            href: item.href
          }))} />
        </div>
        <div className="lg:col-span-2 flex flex-col justify-center">
          <h2 className="text-lg font-bold text-white mb-4">Acciones Rápidas</h2>
          <QuickActions hasAssistant={data.stats.assistantCount > 0} />
        </div>
      </div>

      {/* F & G. Canales y Actividad Reciente */}
      <div className="grid lg:grid-cols-2 gap-6">
        <DashboardChannels
          channels={data.channels}
          planKey={data.plan.key}
          firstAssistantId={firstAssistantId}
        />
        <DashboardActivity activity={data.activity} />
      </div>

      {/* H. Asistentes Recientes */}
      <DashboardCard className="relative z-0">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white">Asistentes recientes</h2>
          <Link href="/dashboard/assistants" className="text-xs font-semibold text-brand-cyan hover:text-brand-cyan/80 flex items-center gap-1 transition-colors">
            Ver todos <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {data.recentAssistants.length === 0 ? (
          <EmptyState 
            icon={Bot}
            title="Crea tu primer asistente IA"
            description="Configura la información de tu negocio, instala el Web Chat y empieza a capturar conversaciones útiles."
            actionLabel="Crear asistente"
            actionHref="/dashboard/create-assistant"
          />
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
      </DashboardCard>

      {/* I. Plan Usage */}
      <div className="mt-8">
        <PlanUsageCard plan={data.plan} usage={data.usage} />
      </div>
    </div>
  )
}
