import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Bot, MessageSquare, Users, Plus, ArrowRight, TrendingUp, Zap } from 'lucide-react'
import { PlanUsageCard } from '@/components/dashboard/PlanUsageCard'
import { DeleteAssistantButton } from '@/components/dashboard/DeleteAssistantButton'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) redirect('/login')

  const userName = user.user_metadata?.name || user.email?.split('@')[0] || 'Usuario'

  // Fetch real data
  const [{ count: assistantCount }, { count: convCount }, { count: leadCount }] = await Promise.all([
    supabase.from('assistants').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('conversations').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
  ])

  const { data: recentAssistants } = await supabase
    .from('assistants')
    .select('id, assistant_name, business_name, channel, status, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  const metrics = [
    { label: 'Asistentes', value: assistantCount ?? 0, icon: Bot, color: 'violet', trend: 'Actual' },
    { label: 'Conversaciones', value: convCount ?? 0, icon: MessageSquare, color: 'cyan', trend: 'Histórico' },
    { label: 'Leads captados', value: leadCount ?? 0, icon: Users, color: 'pink', trend: 'Histórico' },
  ]

  const colorMap: Record<string, string> = {
    violet: 'from-brand-violet/20 to-transparent border-brand-violet/20 text-brand-violet bg-brand-violet/10',
    cyan:   'from-brand-cyan/20 to-transparent border-brand-cyan/20 text-brand-cyan bg-brand-cyan/10',
    pink:   'from-brand-pink/20 to-transparent border-brand-pink/20 text-brand-pink bg-brand-pink/10',
    blue:   'from-brand-blue/20 to-transparent border-brand-blue/20 text-brand-blue bg-brand-blue/10',
  }

  const channelLabel: Record<string, string> = {
    webchat: 'Web Chat',
    telegram: 'Telegram',
    whatsapp: 'WhatsApp',
  }

  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches'

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-text-soft text-sm mb-1">{greeting} 👋</p>
          <h1 className="text-3xl font-bold tracking-tight">{userName}</h1>
          <p className="text-text-soft mt-1">Aquí tienes el resumen de tu actividad hoy.</p>
        </div>
        <Link
          href="/dashboard/create-assistant"
          className="gradient-btn inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold hover:scale-105 hover:opacity-90 transition-all glow-violet w-fit"
        >
          <Plus className="w-5 h-5" />
          Crear asistente
        </Link>
      </div>

      {/* Subscription Card */}
      <PlanUsageCard />

      {/* Metrics Grid */}
      <div className="grid sm:grid-cols-3 gap-5">
        {metrics.map((m) => {
          const classes = colorMap[m.color]
          const [fromClass, , borderClass, textClass, bgClass] = classes.split(' ')
          return (
            <div
              key={m.label}
              className={`relative overflow-hidden rounded-2xl p-6 bg-card-bg/80 backdrop-blur-2xl border ${borderClass} group hover:-translate-y-1 transition-transform`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${fromClass} to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-text-soft">{m.label}</span>
                  <div className={`w-10 h-10 rounded-xl ${bgClass} flex items-center justify-center`}>
                    <m.icon className={`w-5 h-5 ${textClass}`} />
                  </div>
                </div>
                <p className="text-4xl font-bold mb-1">{m.value.toLocaleString()}</p>
                <p className="text-xs text-text-soft flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-brand-success" />
                  {m.trend}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Two columns */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent assistants */}
        <div className="lg:col-span-2 bg-card-bg/80 backdrop-blur-2xl border border-card-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Asistentes recientes</h2>
            <Link href="/dashboard/assistants" className="text-sm text-brand-cyan hover:underline flex items-center gap-1">
              Ver todos <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {recentAssistants && recentAssistants.length > 0 ? (
            <div className="space-y-3">
              {recentAssistants.map((a) => (
                <div key={a.id} className="relative flex items-center gap-2 group">
                  <Link
                    href={`/dashboard/assistants/${a.id}`}
                    className="flex-1 flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.06] hover:border-white/10 transition-all min-w-0"
                  >
                    <div className="w-10 h-10 rounded-xl gradient-btn flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {a.assistant_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{a.assistant_name}</p>
                      <p className="text-xs text-text-soft truncate">{a.business_name}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs px-2 py-1 rounded-full bg-white/[0.06] border border-white/10 text-text-soft">
                        {channelLabel[a.channel] || a.channel}
                      </span>
                      <span className={`w-2 h-2 rounded-full ${a.status === 'active' ? 'bg-brand-success' : 'bg-text-soft'}`} />
                    </div>
                  </Link>
                  <DeleteAssistantButton assistantId={a.id} assistantName={a.assistant_name} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl gradient-btn/20 border border-brand-violet/20 flex items-center justify-center mx-auto mb-4">
                <Bot className="w-8 h-8 text-brand-violet/60" />
              </div>
              <p className="font-semibold mb-1">Aún no tienes asistentes</p>
              <p className="text-sm text-text-soft mb-4">Crea tu primer asistente de IA en minutos</p>
              <Link
                href="/dashboard/create-assistant"
                className="gradient-btn inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                <Plus className="w-4 h-4" />
                Crear asistente
              </Link>
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="space-y-4">
          <div className="bg-card-bg/80 backdrop-blur-2xl border border-card-border rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-4">Acciones rápidas</h2>
            <div className="space-y-3">
              <Link href="/dashboard/create-assistant" className="flex items-center gap-3 p-3 rounded-xl bg-brand-violet/10 border border-brand-violet/20 hover:bg-brand-violet/20 transition-colors group">
                <Plus className="w-5 h-5 text-brand-violet" />
                <span className="text-sm font-medium">Crear asistente</span>
                <ArrowRight className="w-4 h-4 ml-auto text-brand-violet/60 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link href="/dashboard/assistants" className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.04] transition-colors group">
                <Bot className="w-5 h-5 text-text-soft" />
                <span className="text-sm font-medium text-text-soft">Mis asistentes</span>
                <ArrowRight className="w-4 h-4 ml-auto text-text-soft/40 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link href="/dashboard/leads" className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.04] transition-colors group">
                <Users className="w-5 h-5 text-text-soft" />
                <span className="text-sm font-medium text-text-soft">Ver leads</span>
                <ArrowRight className="w-4 h-4 ml-auto text-text-soft/40 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

          <div className="bg-gradient-to-br from-brand-violet/20 via-brand-blue/10 to-brand-cyan/10 border border-brand-violet/20 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-5 h-5 text-brand-success" />
              <span className="font-semibold text-sm">Nuevas Integraciones</span>
            </div>
            <p className="text-xs text-text-soft">Las integraciones con Telegram, WhatsApp Business y Web Chat Widget ya se encuentran totalmente disponibles para configurar.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
