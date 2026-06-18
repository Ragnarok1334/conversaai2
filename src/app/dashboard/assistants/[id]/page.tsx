import { createClient } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { AssistantPlayground } from '@/components/dashboard/AssistantPlayground'
import { AssistantInstallation } from '@/components/dashboard/AssistantInstallation'
import { getPlanLimits, normalizePlan } from '@/lib/plans'
import { calculateAssistantHealth } from '@/lib/assistant/assistant-health'
import { Bot, Globe, MessageCircle, Send, Calendar, CheckCircle2, XCircle, ArrowLeft, Pencil, Settings, Play, Info, Activity, Users, Plug, Target, ShieldAlert, Sparkles, Lock, Palette } from 'lucide-react'
import Link from 'next/link'
import { getEffectiveSubscriptionStatus } from '@/lib/billing/subscription-status'
import { AssistantBuilder } from '@/components/dashboard/create-assistant/AssistantBuilder'
import { AssistantCustomization } from '@/components/dashboard/AssistantCustomization'

const channelLabel: Record<string, string> = { webchat: 'Web Chat', telegram: 'Telegram', whatsapp: 'WhatsApp' }
const channelIcon: Record<string, React.ReactNode> = {
  webchat: <Globe className="w-4 h-4" />,
  telegram: <Send className="w-4 h-4" />,
  whatsapp: <MessageCircle className="w-4 h-4" />,
}

export default async function AssistantDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string; channel?: string }>
}) {
  const { id } = await params
  const { tab: rawTab = 'overview', channel = 'webchat' } = await searchParams
  const tab = rawTab === 'installation' ? 'install' : rawTab

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  // Use Admin to get plan and profile
  const supabaseAdmin = createSupabaseAdmin()
  const [{ data: sub }, { data: profile }] = await Promise.all([
    supabaseAdmin.from('subscriptions').select('*').eq('user_id', user.id).single(),
    supabaseAdmin.from('profiles').select('*').eq('id', user.id).single()
  ])

  const effStatus = sub && profile ? getEffectiveSubscriptionStatus(sub, profile) : 'free'
  const canEdit = effStatus === 'active' || effStatus === 'trialing' || effStatus === 'past_due'

  const planLimits = sub && ['active', 'trialing', 'past_due'].includes(effStatus)
    ? getPlanLimits(normalizePlan(sub.plan)) 
    : getPlanLimits('free')

  const { data: assistant } = await supabase
    .from('assistants')
    .select(`
      *, 
      assistant_test_messages(id, user_message, assistant_reply, created_at),
      assistant_domains(verification_status)
    `)
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!assistant) notFound()

  const [{ count: convCount }, { count: leadsCount }, { count: assistantCount }] = await Promise.all([
    supabase.from('conversations').select('*', { count: 'exact', head: true }).eq('assistant_id', id),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('assistant_id', id),
    supabaseAdmin.from('assistants').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
  ])

  const conversationsCount = convCount || 0
  const leadsCountRes = leadsCount || 0

  const health = calculateAssistantHealth(
    assistant,
    assistant.assistant_domains || [],
    { conversations: conversationsCount, leads: leadsCountRes }
  )

  const testMessages = (assistant.assistant_test_messages || []).sort(
    (a: { created_at: string }, b: { created_at: string }) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  const config = {
    assistantName: assistant.assistant_name,
    businessName: assistant.business_name,
    businessType: assistant.business_type,
    channel: assistant.channel,
    tone: assistant.tone,
    mainGoal: assistant.main_goal,
    instructions: assistant.instructions,
    faqs: assistant.faqs,
    services: assistant.services,
    schedule: assistant.schedule,
    fallbackMessage: assistant.fallback_message,
    language: assistant.language,
  }

  const initialData = {
    assistant_name: assistant.assistant_name || '',
    business_name: assistant.business_name || '',
    business_type: assistant.business_type || '',
    instructions: assistant.instructions || '',
    language: assistant.language || 'es',
    faqs: assistant.faqs || '',
    services: assistant.services || '',
    schedule: assistant.schedule || '',
    fallback_message: assistant.fallback_message || '',
    behavior: {
      initialChannel: assistant.channel || 'webchat',
      tone: assistant.tone || 'professional',
      goal: assistant.main_goal || 'support',
      salesLevel: assistant.behavior?.salesLevel || 'soft',
      rules: {
        askName: assistant.behavior?.rules?.askName ?? true,
        askContact: assistant.behavior?.rules?.askContact ?? false,
        offerPricesWhenAsked: assistant.behavior?.rules?.offerPricesWhenAsked ?? true,
        suggestAppointment: assistant.behavior?.rules?.suggestAppointment ?? false,
        escalateIfUnknown: assistant.behavior?.rules?.escalateIfUnknown ?? true,
        doNotInvent: assistant.behavior?.rules?.doNotInvent ?? true,
        alwaysSpanish: assistant.behavior?.rules?.alwaysSpanish ?? true,
      }
    },
    channels: {
      webchat: { enabled: true, domains: [] },
      telegram: { enabled: false, token: '' },
      whatsapp: { enabled: false, phone: '', provider: 'meta' }
    },
    knowledgeBlocks: assistant.knowledge_blocks || []
  }

  const tabs = [
    { id: 'overview', label: 'General', icon: <Info className="w-4 h-4" /> },
    { id: 'edit', label: 'Configuración', icon: <Settings className="w-4 h-4" /> },
    { id: 'appearance', label: 'Apariencia', icon: <Palette className="w-4 h-4" /> },
    { id: 'install', label: 'Instalación', icon: <Plug className="w-4 h-4" /> },
    { id: 'test', label: 'Playground', icon: <Play className="w-4 h-4" /> },
  ]

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const getScoreColor = (level: string) => {
    switch (level) {
      case 'Excelente': return 'text-brand-success'
      case 'Bueno': return 'text-brand-cyan'
      case 'Medio': return 'text-amber-500'
      case 'Bajo': return 'text-brand-pink'
      default: return 'text-slate-400'
    }
  }

  const getBaseStateColor = (state: string) => {
    switch (state) {
      case 'Activo': return 'bg-brand-success/10 text-brand-success border-brand-success/20'
      case 'Falta instalación': return 'bg-brand-cyan/10 text-brand-cyan border-brand-cyan/20'
      case 'Falta canal': return 'bg-white/10 text-slate-300 border-white/20'
      case 'Necesita entrenamiento': return 'bg-amber-500/10 text-amber-500 border-amber-500/20'
      case 'Requiere atención': return 'bg-brand-pink/10 text-brand-pink border-brand-pink/20'
      default: return 'bg-white/10 text-slate-300 border-white/20'
    }
  }

  const blocksCount = assistant.knowledge_blocks ? assistant.knowledge_blocks.filter((b: any) => b.is_active && (b.content?.trim()?.length || 0) >= 80).length : 0

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/assistants" className="p-2.5 rounded-xl bg-card-bg border border-card-border hover:bg-white/10 transition-colors text-slate-400 hover:text-white flex items-center gap-2">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center text-sm font-medium text-slate-400">
            <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
            <span className="mx-2">/</span>
            <Link href="/dashboard/assistants" className="hover:text-white transition-colors">Asistentes</Link>
            <span className="mx-2">/</span>
            <span className="text-white">{assistant.assistant_name}</span>
          </div>
        </div>
      </div>
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl gradient-btn flex items-center justify-center text-white font-bold text-xl shadow-lg">
              {assistant.assistant_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold leading-tight text-white">{assistant.assistant_name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-0.5 rounded-full border text-xs font-semibold ${getBaseStateColor(health.baseState)}`}>
                  {health.baseState}
                </span>
                <span className="text-slate-400 text-sm truncate max-w-[200px]">{assistant.business_name}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/assistants/${id}?tab=edit`}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-sm font-semibold text-white"
          >
            <Pencil className="w-4 h-4" />
            Editar asistente
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-white/5 scrollbar-hide">
        {tabs.map((t) => {
          const isActive = tab === t.id
          return (
            <Link
              key={t.id}
              href={`/dashboard/assistants/${id}?tab=${t.id}${t.id === 'install' ? '&channel=webchat' : ''}`}
              className={`flex items-center gap-2 px-5 py-3 rounded-t-xl font-medium text-sm transition-colors border-b-2 ${
                isActive
                  ? 'border-brand-violet text-white bg-brand-violet/5'
                  : 'border-transparent text-slate-400 hover:text-white hover:bg-white/[0.02]'
              }`}
            >
              {t.icon}
              {t.label}
            </Link>
          )
        })}
      </div>

      {/* TAB CONTENT: OVERVIEW */}
      {tab === 'overview' && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Columna Izquierda: Estado, Entrenamiento, Instalación */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* A. ESTADO GENERAL */}
            <div className="bg-card-bg/60 backdrop-blur border border-white/10 rounded-3xl p-6 shadow-md">
              <h2 className="font-semibold text-lg text-white mb-4 flex items-center gap-2"><Activity className="w-5 h-5 text-brand-violet" /> Estado General</h2>
              
              <div className="flex items-center justify-between bg-black/20 rounded-xl p-4 border border-white/[0.05] mb-4">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Health Score</p>
                  <span className={`text-3xl font-black ${getScoreColor(health.scoreLevel)}`}>{health.score}</span><span className="text-slate-500 font-bold">/100</span>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Estado</p>
                  <span className={`text-sm font-semibold px-2.5 py-1 rounded-lg border ${getBaseStateColor(health.baseState)}`}>{health.baseState}</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-gradient-to-br from-brand-violet/10 to-brand-cyan/5 border border-brand-violet/20 flex gap-2 items-start">
                  <Target className="w-4 h-4 text-brand-cyan shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] text-brand-cyan font-semibold uppercase tracking-wider mb-0.5">Siguiente paso recomendado</p>
                    <p className="text-xs text-slate-300 leading-relaxed">{health.nextStep}</p>
                  </div>
                </div>
                <p className="text-xs text-slate-400 flex items-center gap-1.5 px-1"><Calendar className="w-3.5 h-3.5" /> Creado el {formatDate(assistant.created_at)}</p>
              </div>
            </div>

            {/* B. ENTRENAMIENTO */}
            <div className="bg-card-bg/60 backdrop-blur border border-white/10 rounded-3xl p-6 shadow-md">
              <h2 className="font-semibold text-lg text-white mb-4 flex items-center gap-2"><Sparkles className="w-5 h-5 text-brand-cyan" /> Entrenamiento</h2>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">Calidad base</span>
                  <span className="text-sm font-semibold text-white">{health.trainingQuality}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">Bloques completos</span>
                  <span className="text-sm font-semibold text-white">{blocksCount}</span>
                </div>
                
                <Link href={`/dashboard/assistants/${id}?tab=edit`} className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-sm font-semibold text-white">
                  <Pencil className="w-4 h-4" /> Editar conocimiento
                </Link>
              </div>
            </div>

            {/* C. INSTALACIÓN */}
            <div className="bg-card-bg/60 backdrop-blur border border-white/10 rounded-3xl p-6 shadow-md">
              <h2 className="font-semibold text-lg text-white mb-4 flex items-center gap-2"><Plug className="w-5 h-5 text-brand-success" /> Instalación</h2>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">Web Chat</span>
                  <span className="text-sm font-semibold text-white flex items-center gap-1">
                    {health.badges.hasVerifiedDomain ? <CheckCircle2 className="w-4 h-4 text-brand-success" /> : <XCircle className="w-4 h-4 text-slate-500" />}
                    {health.badges.hasVerifiedDomain ? 'Verificado' : 'Pendiente'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">Dominios autorizados</span>
                  <span className="text-sm font-semibold text-white">{assistant.assistant_domains?.length || 0}</span>
                </div>

                <Link href={`/dashboard/assistants/${id}?tab=install`} className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-sm font-semibold text-white">
                  <Globe className="w-4 h-4" /> Ver instrucciones
                </Link>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Actividad, Acciones rápidas y Playground histórico */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* D. ACTIVIDAD */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-card-bg/60 backdrop-blur border border-white/10 rounded-3xl p-6 shadow-md flex flex-col justify-center">
                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2 flex items-center gap-1.5"><MessageCircle className="w-4 h-4"/> Conversaciones</span>
                <span className="text-3xl font-bold text-white">{conversationsCount}</span>
                {conversationsCount === 0 && <span className="text-xs text-slate-400 mt-2">Aún no hay conversaciones</span>}
              </div>
              <div className="bg-card-bg/60 backdrop-blur border border-white/10 rounded-3xl p-6 shadow-md flex flex-col justify-center">
                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2 flex items-center gap-1.5"><Users className="w-4 h-4"/> Leads generados</span>
                <span className="text-3xl font-bold text-white">{leadsCountRes}</span>
                {leadsCountRes === 0 && <span className="text-xs text-slate-400 mt-2">Aún no hay leads capturados</span>}
              </div>
            </div>

            {/* E. ACCIONES RÁPIDAS */}
            <div className="bg-card-bg/60 backdrop-blur border border-white/10 rounded-3xl p-6 shadow-md">
              <h2 className="font-semibold text-lg text-white mb-4">Acciones rápidas</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Link href={`/dashboard/assistants/${id}?tab=test`} className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-center">
                  <Play className="w-6 h-6 text-brand-violet" />
                  <span className="text-xs font-semibold text-slate-300">Probar</span>
                </Link>
                <Link href={`/dashboard/assistants/${id}?tab=edit`} className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-center">
                  <Pencil className="w-6 h-6 text-brand-cyan" />
                  <span className="text-xs font-semibold text-slate-300">Editar</span>
                </Link>
                <Link href={`/dashboard/conversations?assistantId=${id}`} className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-center">
                  <MessageCircle className="w-6 h-6 text-brand-success" />
                  <span className="text-xs font-semibold text-slate-300">Ver chats</span>
                </Link>
                <Link href={`/dashboard/leads?assistantId=${id}`} className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-center">
                  <Users className="w-6 h-6 text-amber-500" />
                  <span className="text-xs font-semibold text-slate-300">Ver leads</span>
                </Link>
              </div>
            </div>

            {/* Historial Playground */}
            <div className="bg-card-bg/80 backdrop-blur-2xl border border-card-border rounded-3xl p-6 shadow-md">
              <h2 className="font-semibold text-lg text-white border-b border-white/[0.06] pb-3 mb-4 flex items-center gap-2"><Bot className="w-5 h-5 opacity-70" /> Historial de Pruebas</h2>
              {testMessages.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-400 mb-4 text-sm">Prueba tu asistente para ver sus respuestas aquí.</p>
                  <Link href={`/dashboard/assistants/${id}?tab=test`} className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 font-semibold hover:bg-white/10 transition-colors text-sm">
                    Ir al Playground
                  </Link>
                </div>
              ) : (
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {testMessages.slice(0, 10).map((m: { id: string; user_message: string; assistant_reply: string; created_at: string }) => (
                    <div key={m.id} className="text-sm space-y-2 pb-4 border-b border-white/[0.05] last:border-0">
                      <p className="text-[10px] text-slate-500 font-medium">
                        {new Date(m.created_at).toLocaleString('es', { dateStyle: 'long', timeStyle: 'short' })}
                      </p>
                      <div className="bg-brand-violet/10 border border-brand-violet/20 rounded-2xl px-4 py-3 rounded-tr-sm self-end">
                        <strong className="text-brand-purple text-xs block mb-1">Tú:</strong>
                        <p className="text-white/90">{m.user_message}</p>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 rounded-tl-sm self-start">
                        <strong className="text-brand-cyan text-xs block mb-1">Asistente:</strong>
                        <p className="text-slate-300 whitespace-pre-wrap">{m.assistant_reply}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: TEST */}
      {tab === 'test' && (
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-bold">Prueba tu asistente</h2>
            <p className="text-slate-400 mt-1">Valida sus respuestas antes de instalarlo con tus clientes. <strong className="text-brand-cyan">Los mensajes enviados consumen tu límite mensual.</strong></p>
          </div>
          <AssistantPlayground
            assistantId={assistant.id}
            assistantConfig={config}
            title={assistant.assistant_name}
          />
        </div>
      )}

      {/* TAB CONTENT: INSTALL */}
      {tab === 'install' && (
        <div className="space-y-6">
          <AssistantInstallation assistantId={assistant.id} planLimits={planLimits} effectivePlanStatus={effStatus} />
        </div>
      )}

      {/* TAB CONTENT: SETTINGS (EDIT) */}
      {(tab === 'settings' || tab === 'edit') && (
        !canEdit ? (
          <div className="max-w-3xl bg-card-bg/80 backdrop-blur-2xl border border-card-border rounded-3xl p-8 text-center mx-auto">
            <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-amber-500" />
            </div>
            <h2 className="text-xl font-bold mb-2">Edición bloqueada</h2>
            <p className="text-slate-400 mb-6">Tu plan actual no te permite editar asistentes. Mejora tu plan para continuar.</p>
            <Link href="/dashboard/billing" className="gradient-btn px-6 py-3 rounded-xl font-semibold text-white inline-block">
              Ver planes
            </Link>
          </div>
        ) : (
          <AssistantBuilder 
            mode="edit"
            assistantId={assistant.id}
            initialData={initialData}
            userId={user.id}
            hasReachedLimit={false}
            currentUsage={assistantCount || 0}
            planLimit={planLimits.assistants}
            currentPlan={sub ? normalizePlan(sub.plan) : 'free'}
          />
        )
      )}

      {/* TAB CONTENT: APPEARANCE */}
      {tab === 'appearance' && (
        !canEdit ? (
          <div className="max-w-3xl bg-card-bg/80 backdrop-blur-2xl border border-card-border rounded-3xl p-8 text-center mx-auto">
            <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-amber-500" />
            </div>
            <h2 className="text-xl font-bold mb-2">Edición bloqueada</h2>
            <p className="text-slate-400 mb-6">Tu plan actual no te permite modificar la apariencia. Mejora tu plan para continuar.</p>
            <Link href="/dashboard/billing" className="gradient-btn px-6 py-3 rounded-xl font-semibold text-white inline-block">
              Ver planes
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <AssistantCustomization 
              assistantId={assistant.id}
              initialConfig={assistant.widget_config || {}}
              currentPlan={sub ? normalizePlan(sub.plan) : 'free'}
            />
          </div>
        )
      )}

    </div>
  )
}
