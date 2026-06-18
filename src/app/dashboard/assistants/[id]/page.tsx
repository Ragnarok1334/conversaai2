import { createClient } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { AssistantPlayground } from '@/components/dashboard/AssistantPlayground'
import { getPlanLimits, normalizePlan } from '@/lib/plans'
import { calculateAssistantHealth } from '@/lib/assistant/assistant-health'
import { Bot, MessageCircle, Send, Calendar, CheckCircle2, ArrowLeft, Pencil, Settings, Play, Info, Activity, Users, Plug, Target, Lock, Palette, Globe } from 'lucide-react'
import Link from 'next/link'
import { getEffectiveSubscriptionStatus } from '@/lib/billing/subscription-status'
import { AssistantBuilder } from '@/components/dashboard/create-assistant/AssistantBuilder'
import { AssistantWebChatTab } from '@/components/dashboard/AssistantWebChatTab'

export default async function AssistantDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string; channel?: string }>
}) {
  const { id } = await params
  const { tab: rawTab = 'overview' } = await searchParams
  
  let tab = rawTab === 'installation' ? 'install' : rawTab
  let initialFocus: 'appearance' | 'install' | null = null

  if (tab === 'appearance' || tab === 'install') {
    initialFocus = tab
    tab = 'webchat'
  }

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
      assistant_domains(id, domain, is_verified, verification_status, last_seen_at)
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
  const domains = assistant.assistant_domains || []

  const health = calculateAssistantHealth(
    assistant,
    domains,
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
    { id: 'overview', label: 'Resumen', icon: <Info className="w-4 h-4" /> },
    { id: 'edit', label: 'Entrenamiento', icon: <Settings className="w-4 h-4" /> },
    { id: 'webchat', label: 'Web Chat', icon: <Palette className="w-4 h-4" /> },
    { id: 'test', label: 'Prueba', icon: <Play className="w-4 h-4" /> },
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

  // Derive explicit publication state for the Overview map
  const isCustomized = Boolean(assistant.widget_config && Object.keys(assistant.widget_config).length > 0)
  const hasDomain = domains.length > 0
  const isDetected = domains.some((d: any) => d.last_seen_at !== null)
  const hasConversations = conversationsCount > 0

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
              href={`/dashboard/assistants/${id}?tab=${t.id}`}
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
          {/* Columna Izquierda: Estado de Publicación y General */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* ESTADO DE PUBLICACIÓN (NUEVO MAPA DEL CLIENTE) */}
            <div className="bg-card-bg/60 backdrop-blur border border-white/10 rounded-3xl p-6 shadow-md">
              <h2 className="font-semibold text-lg text-white mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-brand-cyan" /> Estado de publicación
              </h2>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-success/20 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-brand-success" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">Entrenamiento</p>
                      <p className="text-xs text-slate-400">Asistente creado ({blocksCount} bloques)</p>
                    </div>
                  </div>
                </div>

                <div className={`flex justify-between items-center p-3 rounded-lg border ${
                  isCustomized ? 'bg-white/5 border-white/5' : 'bg-brand-cyan/10 border-brand-cyan/30'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isCustomized ? 'bg-brand-success/20' : 'bg-brand-cyan/20'
                    }`}>
                      {isCustomized ? <CheckCircle2 className="w-4 h-4 text-brand-success" /> : <Palette className="w-4 h-4 text-brand-cyan" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">Apariencia</p>
                      <p className={`text-xs ${isCustomized ? 'text-slate-400' : 'text-brand-cyan'}`}>
                        {isCustomized ? 'Personalización lista' : 'Pendiente'}
                      </p>
                    </div>
                  </div>
                  {!isCustomized && (
                    <Link href={`/dashboard/assistants/${id}?tab=webchat`} className="text-xs bg-brand-cyan/20 text-brand-cyan px-3 py-1.5 rounded-lg hover:bg-brand-cyan/30 transition-colors font-medium">Personalizar</Link>
                  )}
                </div>

                <div className={`flex justify-between items-center p-3 rounded-lg border ${
                  hasDomain ? 'bg-white/5 border-white/5' : (isCustomized ? 'bg-brand-cyan/10 border-brand-cyan/30' : 'bg-white/[0.02] border-transparent opacity-60')
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      hasDomain ? 'bg-brand-success/20' : 'bg-slate-800'
                    }`}>
                      {hasDomain ? <CheckCircle2 className="w-4 h-4 text-brand-success" /> : <Globe className="w-4 h-4 text-slate-400" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">Dominio</p>
                      <p className={`text-xs ${hasDomain ? 'text-slate-400' : 'text-slate-500'}`}>
                        {hasDomain ? 'Autorizado' : 'Sin dominio'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className={`flex justify-between items-center p-3 rounded-lg border ${
                  isDetected ? 'bg-white/5 border-white/5' : (hasDomain ? 'bg-amber-500/10 border-amber-500/30' : 'bg-white/[0.02] border-transparent opacity-60')
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isDetected ? 'bg-brand-success/20' : 'bg-slate-800'
                    }`}>
                      {isDetected ? <CheckCircle2 className="w-4 h-4 text-brand-success" /> : <Plug className="w-4 h-4 text-slate-400" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">Instalación</p>
                      <p className={`text-xs ${isDetected ? 'text-slate-400' : 'text-slate-500'}`}>
                        {isDetected ? 'Script detectado' : 'Pendiente de código'}
                      </p>
                    </div>
                  </div>
                  {hasDomain && !isDetected && (
                    <Link href={`/dashboard/assistants/${id}?tab=install`} className="text-xs text-amber-500 bg-amber-500/10 px-3 py-1.5 rounded-lg hover:bg-amber-500/20 font-medium transition-colors">Instalar</Link>
                  )}
                </div>

                <div className="pt-4 mt-4 border-t border-white/10">
                  {!isCustomized ? (
                    <Link href={`/dashboard/assistants/${id}?tab=webchat`} className="w-full flex justify-center py-2.5 rounded-xl bg-brand-cyan text-slate-900 font-bold hover:bg-brand-cyan/90 transition-colors">
                      Personalizar Web Chat
                    </Link>
                  ) : !hasDomain ? (
                    <Link href={`/dashboard/assistants/${id}?tab=install`} className="w-full flex justify-center py-2.5 rounded-xl bg-brand-cyan text-slate-900 font-bold hover:bg-brand-cyan/90 transition-colors">
                      Autorizar Dominio
                    </Link>
                  ) : !isDetected ? (
                    <Link href={`/dashboard/assistants/${id}?tab=install`} className="w-full flex justify-center py-2.5 rounded-xl bg-amber-500 text-amber-950 font-bold hover:bg-amber-400 transition-colors">
                      Ver código de instalación
                    </Link>
                  ) : (
                    <Link href={`/dashboard/conversations?assistantId=${id}`} className="w-full flex justify-center py-2.5 rounded-xl bg-brand-violet text-white font-bold hover:bg-brand-violet/90 transition-colors">
                      Ver conversaciones
                    </Link>
                  )}
                </div>
              </div>
            </div>

            {/* ESTADO GENERAL DE SALUD */}
            <div className="bg-card-bg/60 backdrop-blur border border-white/10 rounded-3xl p-6 shadow-md">
              <h2 className="font-semibold text-lg text-white mb-4 flex items-center gap-2"><Activity className="w-5 h-5 text-brand-violet" /> Análisis de rendimiento</h2>
              
              <div className="flex items-center justify-between bg-black/20 rounded-xl p-4 border border-white/[0.05] mb-4">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Health Score</p>
                  <span className={`text-3xl font-black ${getScoreColor(health.scoreLevel)}`}>{health.score}</span><span className="text-slate-500 font-bold">/100</span>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Calidad</p>
                  <span className={`text-sm font-semibold px-2.5 py-1 rounded-lg border text-brand-cyan border-brand-cyan/20 bg-brand-cyan/10`}>{health.trainingQuality}</span>
                </div>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 px-1"><Calendar className="w-3.5 h-3.5" /> Creado el {formatDate(assistant.created_at)}</p>
            </div>
          </div>

          {/* Columna Derecha: Actividad, Acciones rápidas y Playground histórico */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* ACTIVIDAD */}
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

            {/* ACCIONES RÁPIDAS */}
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

      {/* TAB CONTENT: WEB CHAT (HUB + CUSTOMIZATION + INSTALLATION) */}
      {tab === 'webchat' && (
        <AssistantWebChatTab
          assistantId={assistant.id}
          widgetConfig={assistant.widget_config}
          domains={domains}
          conversationsCount={conversationsCount}
          leadsCount={leadsCountRes}
          currentPlan={sub ? normalizePlan(sub.plan) : 'free'}
          planLimits={planLimits}
          effectivePlanStatus={effStatus}
          initialFocus={initialFocus}
        />
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

    </div>
  )
}
