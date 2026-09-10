import { createClient } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { notFound, redirect } from 'next/navigation'
import { isUuid } from '@/lib/http-security'
import { AssistantPlayground } from '@/components/dashboard/AssistantPlayground'
import { getPlanLimits, normalizePlan } from '@/lib/plans'
import { calculateAssistantHealth } from '@/lib/assistant/assistant-health'
import { Bot, MessageCircle, Send, Calendar, CheckCircle2, ArrowLeft, Pencil, Settings, Play, Info, Activity, Users, Plug, Target, Lock, Palette, Globe } from 'lucide-react'
import Link from 'next/link'
import { getEffectiveSubscriptionStatus } from '@/lib/billing/subscription-status'
import { AssistantBuilder } from '@/components/dashboard/create-assistant/AssistantBuilder'
import { AssistantWebChatTab } from '@/components/dashboard/AssistantWebChatTab'
import { AssistantKnowledgeTab } from '@/components/dashboard/AssistantKnowledgeTab'
import { AssistantOverview } from '@/components/dashboard/AssistantOverview'

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
  if (!user) redirect(`/login?next=${encodeURIComponent(`/dashboard/assistants/${id}?tab=${rawTab}`)}`)
  if (!isUuid(id)) notFound()

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

  // Resolve the owned assistant independently. Optional related records must
  // never turn an existing assistant into a false 404.
  const { data: assistant, error: assistantError } = await supabaseAdmin
    .from('assistants')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (assistantError) {
    console.error('[AssistantDetailPage] assistant query failed:', assistantError.code)
    throw new Error('No se pudo cargar el asistente')
  }
  if (!assistant) notFound()

  const [
    { data: testMessageRows, error: testMessagesError },
    { data: domainRows, error: domainsError },
  ] = await Promise.all([
    supabaseAdmin
      .from('assistant_test_messages')
      .select('id, user_message, assistant_reply, created_at')
      .eq('assistant_id', id)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('assistant_domains')
      .select('id, domain, is_verified, verification_status, last_seen_at')
      .eq('assistant_id', id)
      .eq('user_id', user.id),
  ])

  if (testMessagesError) console.error('[AssistantDetailPage] test messages query failed:', testMessagesError.code)
  if (domainsError) console.error('[AssistantDetailPage] domains query failed:', domainsError.code)

  const [{ count: convCount }, { count: leadsCount }, { count: assistantCount }] = await Promise.all([
    supabaseAdmin.from('conversations').select('*', { count: 'exact', head: true }).eq('assistant_id', id).eq('user_id', user.id),
    supabaseAdmin.from('leads').select('*', { count: 'exact', head: true }).eq('assistant_id', id).eq('user_id', user.id),
    supabaseAdmin.from('assistants').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
  ])

  const conversationsCount = convCount || 0
  const leadsCountRes = leadsCount || 0
  const domains = domainRows || []

  const health = calculateAssistantHealth(
    assistant,
    domains,
    { conversations: conversationsCount, leads: leadsCountRes }
  )

  const testMessages = testMessageRows || []

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
      responseStyle: assistant.behavior?.responseStyle || 'Detalladas',
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
      whatsapp: { enabled: false, phone: '', provider: 'meta' },
      instagram: { enabled: false },
      facebook: { enabled: false }
    },
    knowledgeBlocks: assistant.knowledge_blocks || []
  }

  const tabs = [
    { id: 'overview', label: 'Resumen', icon: <Info className="w-4 h-4" /> },
    { id: 'knowledge', label: 'Conocimiento', icon: <Settings className="w-4 h-4" /> },
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

  const activeBlocksCount = assistant.knowledge_blocks ? assistant.knowledge_blocks.filter((b: any) => b.is_active && (b.content?.trim()?.length || 0) >= 60).length : 0
  const coreKnowledgeCount = [assistant.instructions, assistant.services, assistant.faqs, assistant.schedule].filter(value => (value || '').trim().length >= 40).length
  const blocksCount = activeBlocksCount + coreKnowledgeCount

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
            Configuración avanzada
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
        <AssistantOverview
          assistantId={assistant.id}
          health={health}
          conversationsCount={conversationsCount}
          leadsCount={leadsCountRes}
          blocksCount={blocksCount}
          isCustomized={isCustomized}
          hasDomain={hasDomain}
          isDetected={isDetected}
          tests={testMessages}
        />
      )}

      {/* Kept temporarily for backwards-compatible markup; no longer rendered. */}

      {/* TAB CONTENT: KNOWLEDGE */}
      {tab === 'knowledge' && (
        <AssistantKnowledgeTab
          assistantId={assistant.id}
          assistantName={assistant.assistant_name}
          canEdit={canEdit}
          initialData={{
            instructions: assistant.instructions || '',
            services: assistant.services || '',
            faqs: assistant.faqs || '',
            schedule: assistant.schedule || '',
          }}
        />
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
          assistantName={assistant.assistant_name || 'Asistente virtual'}
          businessName={assistant.business_name || 'Tu negocio'}
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
