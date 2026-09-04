import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { normalizePlan, getPlanConfig, getPlanLimits, formatLimit } from '@/lib/plans'
import { getEffectiveSubscriptionStatus } from '@/lib/billing/subscription-status'
import { checkRateLimit } from '@/lib/security'

export const dynamic = 'force-dynamic'

function formatTimeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  if (days > 0) return `hace ${days} d`
  if (hours > 0) return `hace ${hours} h`
  if (minutes > 0) return `hace ${minutes} min`
  return 'hace unos segundos'
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const isAllowed = await checkRateLimit(`dashboard-read-${user.id}`, 'dashboard-read', 60, 60)
    if (!isAllowed) return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta nuevamente en un momento.' }, { status: 429 })

    const [
      profileResult, subscriptionResult, assistantsResult, activeAssistantsResult,
      conversationsResult, openConversationsResult, leadsResult, newLeadsResult,
      assistantChannelsResult, notificationsResult, recentAssistantsResult,
      recentConversationsResult, recentLeadsResult, assistantDomainsResult, auditLogsResult,
    ] = await Promise.all([
      supabase.from('profiles').select('full_name, email').eq('id', user.id).single(),
      supabase.from('subscriptions').select('id, user_id, plan, status, current_messages_used, current_period_start, current_period_end').eq('user_id', user.id).maybeSingle(),
      supabase.from('assistants').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('assistants').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'active'),
      supabase.from('conversations').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('conversations').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'open'),
      supabase.from('leads').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('leads').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      // Never select channel config here: it can contain provider credentials/tokens.
      supabase.from('assistant_channels').select('channel, is_enabled, assistant_id').eq('user_id', user.id).eq('is_enabled', true).limit(50),
      supabase.from('notifications').select('id, title, message, type, created_at, metadata').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
      supabase.from('assistants').select('id, assistant_name, business_name, channel, status, created_at, tone').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
      supabase.from('conversations').select('id, created_at, status, last_message').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
      supabase.from('leads').select('id, created_at, name, email, source').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
      supabase.from('assistant_domains').select('domain, is_verified, verification_status, last_seen_at, last_seen_url, assistant_id').eq('user_id', user.id),
      supabase.from('audit_logs').select('id, action, details, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
    ])

    if (assistantDomainsResult.error) console.error('[GET /api/dashboard] assistantDomains:', assistantDomainsResult.error.message)
    if (recentAssistantsResult.error) console.error('[GET /api/dashboard] recentAssistants:', recentAssistantsResult.error.message)
    if (assistantsResult.error) console.error('[GET /api/dashboard] assistants:', assistantsResult.error.message)

    const subscription = subscriptionResult.data || {
      id: 'fallback', user_id: user.id, plan: 'free', status: 'active', current_messages_used: 0,
    }
    const profileData = profileResult.data
    const planKey = normalizePlan(subscription.plan ?? 'free')
    const effectiveStatus = getEffectiveSubscriptionStatus(subscription, profileData)
    const isPremiumActive = ['active', 'trialing', 'past_due'].includes(effectiveStatus)
    const activePlanKey = isPremiumActive ? planKey : 'free'
    const planConfig = getPlanConfig(planKey)
    const activePlanLimits = getPlanLimits(activePlanKey)
    const activePlanConfig = getPlanConfig(activePlanKey)
    const assistantsUsed = assistantsResult.count ?? 0
    const messagesUsed = subscription.current_messages_used ?? 0
    const messagesLimit = activePlanLimits.messagesPerMonth === Infinity ? null : activePlanLimits.messagesPerMonth
    const assistantsLimit = activePlanLimits.assistants === Infinity ? null : activePlanLimits.assistants
    const messagesPercentage = messagesLimit ? Math.round((messagesUsed / messagesLimit) * 100) : 0
    const assistantsPercentage = assistantsLimit ? Math.round((assistantsUsed / assistantsLimit) * 100) : 0

    const lastConversationAt = recentConversationsResult.data?.[0]?.created_at
    const lastLeadAt = recentLeadsResult.data?.[0]?.created_at
    const lastAssistantCreatedAt = recentAssistantsResult.data?.[0]?.created_at
    const domains = assistantDomainsResult.data ?? []

    let webchatObj = { status: 'missing_domain', label: 'Falta agregar dominio', domain: undefined as string | undefined, lastSeenAt: undefined as string | undefined, lastSeenUrl: undefined as string | undefined, assistantId: undefined as string | undefined }
    if (assistantsUsed === 0) webchatObj.label = 'Crea un asistente primero'
    else if (domains.length > 0) {
      const blocked = domains.find(d => d.verification_status === 'blocked')
      const installed = domains.find(d => d.is_verified && d.verification_status === 'verified' && d.last_seen_at)
      const pending = domains.find(d => !d.is_verified || d.verification_status === 'pending' || !d.last_seen_at)
      if (blocked) webchatObj = { status: 'blocked', label: 'Dominio bloqueado', domain: blocked.domain, lastSeenAt: blocked.last_seen_at || undefined, lastSeenUrl: blocked.last_seen_url || undefined, assistantId: blocked.assistant_id }
      else if (installed) webchatObj = { status: 'installed', label: 'Instalado', domain: installed.domain, lastSeenAt: installed.last_seen_at || undefined, lastSeenUrl: installed.last_seen_url || undefined, assistantId: installed.assistant_id }
      else if (pending) webchatObj = { status: 'pending', label: 'Pendiente de instalación', domain: pending.domain, lastSeenAt: undefined, lastSeenUrl: undefined, assistantId: pending.assistant_id }
    }

    const channelRows = assistantChannelsResult.data ?? []
    const hasTelegramActive = channelRows.some(r => r.channel === 'telegram' && r.is_enabled === true)
    const telegramAllowed = activePlanConfig.channels.telegram
    const telegramStatus = !telegramAllowed ? 'locked' : hasTelegramActive ? 'connected' : 'pending'
    const channels = { webchat: webchatObj.status, telegram: telegramStatus, whatsapp: 'coming_soon' }

    const hasAssistant = assistantsUsed > 0
    const hasDomain = domains.length > 0
    const hasVerifiedWidget = webchatObj.status === 'installed'
    const hasConversations = (conversationsResult.count ?? 0) > 0
    const hasLeads = (leadsResult.count ?? 0) > 0
    let score = 0
    if (hasAssistant) score += 20
    if (hasDomain) score += 20
    if (hasVerifiedWidget) score += 20
    if (hasConversations) score += 20
    if (hasLeads) score += 20
    const healthLabel = score === 0 ? 'Cuenta nueva' : score < 60 ? 'Configuración pendiente' : score < 100 ? 'Casi listo' : 'Operación óptima'
    const health = {
      score, label: healthLabel,
      items: [
        { key: 'assistant', label: 'Asistente creado', done: hasAssistant, desc: hasAssistant ? formatTimeAgo(lastAssistantCreatedAt) : 'Crear asistente', href: '/dashboard/create-assistant' },
        { key: 'domain', label: 'Dominio autorizado', done: hasDomain, desc: hasDomain ? 'Completado' : 'Agregar dominio', href: '/dashboard/assistants' },
        { key: 'widget', label: 'Web Chat detectado', done: hasVerifiedWidget, desc: hasVerifiedWidget ? formatTimeAgo(webchatObj.lastSeenAt) : 'Instalar script', href: '/dashboard/assistants' },
        { key: 'conversations', label: 'Primera conversación', done: hasConversations, desc: hasConversations ? `${conversationsResult.count} recibidas` : 'Probar Web Chat', href: '/dashboard/conversations' },
        { key: 'leads', label: 'Primer lead captado', done: hasLeads, desc: hasLeads ? `${leadsResult.count} captados` : 'Revisar reglas de captura', href: '/dashboard/leads' },
      ]
    }

    let execStatus: 'empty' | 'setup' | 'ready' | 'active' | 'attention' = 'empty'
    let execTitle = '', execMessage = ''
    let execNextStep = { title: '', description: '', cta: '', href: '' }
    if (messagesLimit && messagesPercentage >= 100) {
      execStatus = 'attention'; execTitle = 'Límite de mensajes alcanzado'; execMessage = 'Has consumido el 100% de tus mensajes. Tu asistente está pausado. Mejora tu plan para reactivarlo.'
      execNextStep = { title: 'Límite de plan alcanzado', description: 'Mejora tu plan para continuar operando.', cta: 'Mejorar plan', href: '/dashboard/billing' }
    } else if (messagesLimit && messagesPercentage >= 90) {
      execStatus = 'attention'; execTitle = 'Tu cuenta requiere atención'; execMessage = 'Estás cerca del límite de mensajes de tu plan. Revisa tu consumo para evitar interrupciones.'
      execNextStep = { title: 'Consumo elevado', description: 'Evita interrupciones gestionando tu plan mensual.', cta: 'Gestionar plan', href: '/dashboard/billing' }
    } else if (!hasAssistant) {
      execStatus = 'empty'; execTitle = 'Configura tu centro de atención IA'; execMessage = 'Crea tu primer asistente, instala el Web Chat y empieza a capturar conversaciones desde tu sitio.'
      execNextStep = { title: 'Siguiente acción recomendada', description: 'Prueba el Web Chat o instala el asistente en tu sitio para empezar a recibir conversaciones.', cta: 'Crear asistente', href: '/dashboard/create-assistant' }
    } else if (!hasDomain || !hasVerifiedWidget || !hasConversations) {
      execStatus = 'setup'; execTitle = 'Hay pasos pendientes para activar tu asistente'; execMessage = 'Completa la configuración recomendada para que ConversaAI pueda atender visitantes y capturar leads.'
      execNextStep = { title: 'Siguiente acción recomendada', description: 'Completa la instalación y prueba el Web Chat para empezar a recibir conversaciones.', cta: !hasDomain ? 'Agregar dominio' : !hasVerifiedWidget ? 'Instalar Web Chat' : 'Probar asistente', href: `/dashboard/assistants/${recentAssistantsResult.data?.[0]?.id || ''}?tab=${!hasConversations ? 'playground' : 'install'}` }
    } else if (!hasLeads) {
      execStatus = 'active'; execTitle = 'Tu sistema ya está captando oportunidades'; execMessage = 'Revisa nuevos leads, conversaciones recientes y el estado de tus asistentes desde este resumen.'
      execNextStep = { title: 'Siguiente acción recomendada', description: 'Revisa los leads capturados y da seguimiento a los contactos recientes.', cta: 'Ver conversaciones', href: '/dashboard/conversations' }
    } else {
      execStatus = 'active'; execTitle = 'Tu sistema ya está captando oportunidades'; execMessage = 'Revisa nuevos leads, conversaciones recientes y el estado de tus asistentes desde este resumen.'
      execNextStep = { title: 'Siguiente acción recomendada', description: 'Revisa los leads capturados y da seguimiento a los contactos recientes.', cta: 'Ver leads', href: '/dashboard/leads' }
    }

    const execHighlights = [
      { label: 'Plan', value: planConfig.label, status: messagesPercentage >= 90 ? 'attention' : 'neutral', desc: subscription?.status !== 'active' ? 'Inactivo' : 'Activo' },
      { label: 'Web Chat', value: webchatObj.label, status: webchatObj.status === 'installed' ? 'success' : webchatObj.status === 'pending' || webchatObj.status === 'missing_domain' ? 'warning' : 'danger', desc: webchatObj.status === 'installed' ? `Detectado ${formatTimeAgo(webchatObj.lastSeenAt)}` : 'Script no detectado' },
      { label: 'Asistentes', value: `${assistantsUsed} / ${formatLimit(assistantsLimit)}`, status: assistantsUsed >= (assistantsLimit || Infinity) ? 'warning' : 'neutral', desc: `${activeAssistantsResult.count || 0} activos` },
      { label: 'Conversaciones', value: String(conversationsResult.count ?? 0), status: (conversationsResult.count ?? 0) > 0 ? 'success' : 'neutral', desc: hasConversations ? `Última ${formatTimeAgo(lastConversationAt)}` : 'Ninguna' },
      { label: 'Leads', value: String(leadsResult.count ?? 0), status: (leadsResult.count ?? 0) > 0 ? 'success' : 'neutral', desc: hasLeads ? `Último ${formatTimeAgo(lastLeadAt)}` : 'Ninguno' },
    ].slice(0, 5)
    const executiveSummary = { status: execStatus, title: execTitle, message: execMessage, highlights: execHighlights, nextStep: execNextStep }

    const alerts: { type: string; message: string; action?: string; href?: string }[] = []
    if (effectiveStatus === 'expired' || effectiveStatus === 'cancelled') alerts.push({ type: 'error', message: 'Tu suscripción ha finalizado. Renueva para recuperar funciones premium.', action: 'Renovar', href: '/dashboard/billing' })
    else if (effectiveStatus === 'past_due') alerts.push({ type: 'warning', message: 'Tu plan venció y se encuentra en periodo de gracia. Renueva para no perder acceso.', action: 'Renovar', href: '/dashboard/billing' })
    else if (subscription?.status !== 'active') alerts.push({ type: 'error', message: 'Tu suscripción no está activa. El asistente no responderá.', action: 'Ver facturación', href: '/dashboard/billing' })
    if (webchatObj.status === 'blocked') alerts.push({ type: 'error', message: 'Tu dominio de Web Chat se encuentra bloqueado por políticas de seguridad.', action: 'Soporte', href: '/contact' })
    if (messagesLimit && messagesPercentage >= 90) alerts.push({ type: 'warning', message: `Usaste el ${messagesPercentage}% de tus mensajes este ciclo.`, action: planKey === 'business' ? 'Administrar' : 'Mejorar plan', href: '/dashboard/billing' })
    if (assistantsLimit && assistantsUsed >= assistantsLimit) alerts.push({ type: 'warning', message: 'Alcanzaste el límite de asistentes de tu plan.', action: planKey === 'business' ? 'Administrar' : 'Mejorar plan', href: '/dashboard/billing' })

    return NextResponse.json({
      profile: profileData,
      subscription: {
        plan: activePlanConfig.label,
        planKey: activePlanKey,
        status: effectiveStatus,
        messagesUsed,
        messagesLimit,
        messagesPercentage,
        currentPeriodStart: subscription.current_period_start,
        currentPeriodEnd: subscription.current_period_end,
      },
      assistants: { total: assistantsUsed, active: activeAssistantsResult.count ?? 0, limit: assistantsLimit, percentage: assistantsPercentage },
      conversations: { total: conversationsResult.count ?? 0, open: openConversationsResult.count ?? 0 },
      leads: { total: leadsResult.count ?? 0, newLast7Days: newLeadsResult.count ?? 0 },
      channels,
      notifications: notificationsResult.data ?? [],
      recentAssistants: recentAssistantsResult.data ?? [],
      recentConversations: recentConversationsResult.data ?? [],
      recentLeads: recentLeadsResult.data ?? [],
      domains,
      auditLogs: auditLogsResult.data ?? [],
      health,
      executiveSummary,
      alerts,
    })
  } catch (error) {
    console.error('[GET /api/dashboard] Error:', error instanceof Error ? error.message : 'unknown')
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
