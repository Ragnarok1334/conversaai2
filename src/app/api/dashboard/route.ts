import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { normalizePlan, getPlanConfig, getPlanLimits, getUsagePercentage, formatLimit } from '@/lib/plans'

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

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const [
      profileResult,
      subscriptionResult,
      assistantsResult,
      activeAssistantsResult,
      conversationsResult,
      openConversationsResult,
      leadsResult,
      newLeadsResult,
      assistantChannelsResult,
      notificationsResult,
      recentAssistantsResult,
      recentConversationsResult,
      recentLeadsResult,
      assistantDomainsResult,
      auditLogsResult,
    ] = await Promise.all([
      supabase.from('profiles').select('full_name, email').eq('id', user.id).single(),
      supabase.from('subscriptions').select('*').eq('user_id', user.id).single(),
      supabase.from('assistants').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('assistants').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'active'),
      supabase.from('conversations').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('conversations').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'open'),
      supabase.from('leads').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('leads').select('*', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      supabase.from('assistant_channels').select('channel, is_enabled, config, assistant_id').eq('user_id', user.id).eq('is_enabled', true).limit(50),
      supabase.from('notifications').select('id, title, message, type, created_at, metadata').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
      supabase.from('assistants').select('id, assistant_name, business_name, channel, status, created_at, tone').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
      supabase.from('conversations').select('id, created_at, status, last_message').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
      supabase.from('leads').select('id, created_at, name, email, source').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
      supabase.from('assistant_domains').select('domain, is_verified, verification_status, last_seen_at, last_seen_url, assistant_id').eq('user_id', user.id),
      supabase.from('audit_logs').select('id, action, details, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
    ])

    const subscription = subscriptionResult.data || {
      id: 'fallback',
      user_id: user.id,
      plan: 'trial',
      status: 'active',
      current_messages_used: 0,
    }

    const planKey = normalizePlan(subscription.plan ?? 'trial')
    const planConfig = getPlanConfig(planKey)
    const planLimits = getPlanLimits(planKey)
    
    const assistantsUsed = assistantsResult.count ?? 0
    const messagesUsed = subscription.current_messages_used ?? 0
    
    const messagesLimit = planLimits.messagesPerMonth === Infinity ? null : planLimits.messagesPerMonth
    const assistantsLimit = planLimits.assistants === Infinity ? null : planLimits.assistants
    
    const messagesPercentage = messagesLimit ? Math.round((messagesUsed / messagesLimit) * 100) : 0
    const assistantsPercentage = assistantsLimit ? Math.round((assistantsUsed / assistantsLimit) * 100) : 0

    // --- Timestamps ---
    const lastConversationAt = recentConversationsResult.data?.[0]?.created_at
    const lastLeadAt = recentLeadsResult.data?.[0]?.created_at
    const lastAssistantCreatedAt = recentAssistantsResult.data?.[0]?.created_at

    const domains = assistantDomainsResult.data ?? []
    
    let webchatObj = {
      status: 'missing_domain',
      label: 'Falta agregar dominio',
      domain: undefined as string | undefined,
      lastSeenAt: undefined as string | undefined,
      lastSeenUrl: undefined as string | undefined,
      assistantId: undefined as string | undefined
    }

    if (assistantsUsed === 0) {
      webchatObj.label = 'Crea un asistente primero'
    } else if (domains.length > 0) {
      const blocked = domains.find(d => d.verification_status === 'blocked')
      const installed = domains.find(d => d.is_verified && d.verification_status === 'verified' && d.last_seen_at)
      const pending = domains.find(d => !d.is_verified || d.verification_status === 'pending' || !d.last_seen_at)

      if (blocked) {
        webchatObj = { status: 'blocked', label: 'Dominio bloqueado', domain: blocked.domain, lastSeenAt: blocked.last_seen_at || undefined, lastSeenUrl: blocked.last_seen_url || undefined, assistantId: blocked.assistant_id }
      } else if (installed) {
        webchatObj = { status: 'installed', label: 'Instalado', domain: installed.domain, lastSeenAt: installed.last_seen_at || undefined, lastSeenUrl: installed.last_seen_url || undefined, assistantId: installed.assistant_id }
      } else if (pending) {
        webchatObj = { status: 'pending', label: 'Pendiente de instalación', domain: pending.domain, lastSeenAt: undefined, lastSeenUrl: undefined, assistantId: pending.assistant_id }
      }
    }

    const channelRows = assistantChannelsResult.data ?? []
    const hasTelegramActive = channelRows.some((r) => r.channel === 'telegram' && r.is_enabled === true && (r.config as any)?.telegram_token)
    const telegramAllowed = planConfig.channels.telegram
    const telegramStatus = !telegramAllowed ? 'locked' : hasTelegramActive ? 'connected' : 'pending'

    const channels = {
      webchat: webchatObj.status,
      telegram: telegramStatus,
      whatsapp: 'coming_soon',
    }

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

    const healthLabel = score === 0 ? "Cuenta nueva" : score < 60 ? "Configuración pendiente" : score < 100 ? "Casi listo" : "Operación óptima"

    const health = {
      score,
      label: healthLabel,
      items: [
        { key: 'assistant', label: 'Asistente creado', done: hasAssistant, desc: hasAssistant ? formatTimeAgo(lastAssistantCreatedAt) : 'Crear asistente', href: '/dashboard/create-assistant' },
        { key: 'domain', label: 'Dominio autorizado', done: hasDomain, desc: hasDomain ? 'Completado' : 'Agregar dominio', href: '/dashboard/assistants' },
        { key: 'widget', label: 'Web Chat detectado', done: hasVerifiedWidget, desc: hasVerifiedWidget ? formatTimeAgo(webchatObj.lastSeenAt) : 'Instalar script', href: '/dashboard/assistants' },
        { key: 'conversations', label: 'Primera conversación', done: hasConversations, desc: hasConversations ? `${conversationsResult.count} recibidas` : 'Probar Web Chat', href: '/dashboard/conversations' },
        { key: 'leads', label: 'Primer lead captado', done: hasLeads, desc: hasLeads ? `${leadsResult.count} captados` : 'Revisar reglas de captura', href: '/dashboard/leads' },
      ]
    }

    let execStatus: "empty" | "setup" | "ready" | "active" | "attention" = "empty"
    let execTitle = ""
    let execMessage = ""
    let execNextStep = { title: "", description: "", cta: "", href: "" }

    if (messagesLimit && messagesPercentage >= 100) {
      execStatus = "attention"
      execTitle = "Límite de mensajes alcanzado"
      execMessage = "Has consumido el 100% de tus mensajes. Tu asistente está pausado. Mejora tu plan para reactivarlo."
      execNextStep = { title: "Límite de plan alcanzado", description: "Mejora tu plan para continuar operando.", cta: "Mejorar plan", href: "/dashboard/billing" }
    } else if (messagesLimit && messagesPercentage >= 90) {
      execStatus = "attention"
      execTitle = "Tu cuenta requiere atención"
      execMessage = `Estás cerca del límite de mensajes de tu plan. Revisa tu consumo para evitar interrupciones.`
      execNextStep = { title: "Consumo elevado", description: "Evita interrupciones gestionando tu plan mensual.", cta: "Gestionar plan", href: "/dashboard/billing" }
    } else {
      if (!hasAssistant) {
        execStatus = "empty"
        execTitle = "Tu cuenta está lista para comenzar"
        execMessage = "Crea tu primer asistente para empezar a responder clientes, capturar leads e instalar el Web Chat en tu sitio."
        execNextStep = { title: "Crea tu primer asistente", description: "Configura la IA que responderá por ti.", cta: "Crear asistente", href: "/dashboard/create-assistant" }
      } else if (!hasDomain) {
        execStatus = "setup"
        execTitle = "Tu asistente ya está creado"
        execMessage = "Ahora agrega el dominio de tu sitio para poder instalar el Web Chat y empezar a recibir conversaciones."
        execNextStep = { title: "Agrega tu dominio", description: "Autoriza tu web para instalar el chat.", cta: "Agregar dominio", href: `/dashboard/assistants/${recentAssistantsResult.data?.[0]?.id || ''}?tab=install` }
      } else if (!hasVerifiedWidget) {
        execStatus = "setup"
        execTitle = "Falta instalar el Web Chat"
        execMessage = "El dominio ya está autorizado, pero todavía no detectamos el script instalado en tu sitio."
        execNextStep = { title: "Instala el Web Chat", description: "Copia y pega el código en tu sitio web.", cta: "Ver instrucciones", href: `/dashboard/assistants/${recentAssistantsResult.data?.[0]?.id || ''}?tab=install` }
      } else if (!hasConversations) {
        execStatus = "ready"
        execTitle = "Web Chat instalado correctamente"
        execMessage = "El asistente ya está listo en tu sitio. Prueba una conversación para validar cómo responde."
        execNextStep = { title: "Prueba tu asistente", description: "Asegúrate de que todo funciona bien.", cta: "Probar asistente", href: `/dashboard/assistants/${recentAssistantsResult.data?.[0]?.id || ''}?tab=playground` }
      } else if (!hasLeads) {
        execStatus = "active"
        execTitle = "Tu asistente ya está atendiendo conversaciones"
        execMessage = "Aún no se han captado leads. Revisa si el asistente está solicitando nombre, correo o teléfono cuando corresponde."
        execNextStep = { title: "Ver conversaciones en curso", description: "Monitorea cómo responde tu IA a los clientes.", cta: "Ver conversaciones", href: "/dashboard/conversations" }
      } else {
        execStatus = "active"
        execTitle = "Tu automatización ya está generando oportunidades"
        execMessage = "Tu asistente ya captó leads. Revisa los prospectos nuevos y dales seguimiento."
        execNextStep = { title: "Revisa tus prospectos", description: "Contacta a los clientes que dejaron sus datos.", cta: "Ver leads", href: "/dashboard/leads" }
      }
    }

    const execHighlights = [
      { label: "Plan", value: planConfig.label, status: messagesPercentage >= 90 ? "attention" : "neutral", desc: subscription?.status !== 'active' ? 'Inactivo' : 'Activo' },
      { label: "Web Chat", value: webchatObj.label, status: webchatObj.status === 'installed' ? "success" : webchatObj.status === 'pending' || webchatObj.status === 'missing_domain' ? "warning" : "danger", desc: webchatObj.status === 'installed' ? `Detectado ${formatTimeAgo(webchatObj.lastSeenAt)}` : 'Script no detectado' },
      { label: "Asistentes", value: `${assistantsUsed} / ${formatLimit(assistantsLimit)}`, status: assistantsUsed >= (assistantsLimit || Infinity) ? "warning" : "neutral", desc: `${activeAssistantsResult.count || 0} activos` },
      { label: "Conversaciones", value: String(conversationsResult.count ?? 0), status: (conversationsResult.count ?? 0) > 0 ? "success" : "neutral", desc: hasConversations ? `Última ${formatTimeAgo(lastConversationAt)}` : 'Ninguna' },
      { label: "Leads", value: String(leadsResult.count ?? 0), status: (leadsResult.count ?? 0) > 0 ? "success" : "neutral", desc: hasLeads ? `Último ${formatTimeAgo(lastLeadAt)}` : 'Ninguno' },
    ].slice(0, 5)

    const executiveSummary = {
      status: execStatus,
      title: execTitle,
      message: execMessage,
      highlights: execHighlights,
      nextStep: execNextStep
    }

    const alerts: { type: string; message: string; action?: string; href?: string }[] = []

    if (subscription?.status !== 'active') {
      alerts.push({ type: 'error', message: 'Tu suscripción no está activa. El asistente no responderá.', action: 'Ver facturación', href: '/dashboard/billing' })
    }
    if (webchatObj.status === 'blocked') {
      alerts.push({ type: 'error', message: 'Tu dominio de Web Chat se encuentra bloqueado por políticas de seguridad.', action: 'Soporte', href: '/contact' })
    }
    if (messagesLimit && messagesPercentage >= 90) {
      alerts.push({ type: 'warning', message: `Usaste el ${messagesPercentage}% de tus mensajes este ciclo.`, action: planKey === 'business' ? 'Administrar' : 'Mejorar plan', href: '/dashboard/billing' })
    }
    if (assistantsLimit && assistantsUsed >= assistantsLimit) {
      alerts.push({ type: 'warning', message: 'Alcanzaste el límite de asistentes de tu plan.', action: planKey === 'business' || planKey === 'enterprise' ? 'Administrar' : 'Mejorar plan', href: '/dashboard/billing' })
    }

    // --- Activity Feed ---
    let activity: { id: string; type: string; title: string; description: string; created_at: string; href?: string }[] = []

    const auditLogs = auditLogsResult.data ?? []
    if (auditLogs.length > 0) {
      activity = auditLogs.map(log => {
        let title = 'Acción de seguridad'
        let description = 'Se ha registrado una actividad en tu cuenta.'
        let href = '/dashboard'
        
        switch (log.action) {
          case 'lead_status_updated':
            title = 'Estado de Lead actualizado'
            description = `El lead cambió al estado ${(log.details as any)?.new_status || ''}.`
            href = '/dashboard/leads'
            break
          case 'assistant_created':
            title = 'Asistente creado'
            description = `Se creó el asistente ${(log.details as any)?.assistant_name || ''}.`
            href = '/dashboard/assistants'
            break
          case 'domain_verified':
            title = 'Web Chat detectado'
            description = `Se verificó el dominio ${(log.details as any)?.domain || ''}.`
            href = '/dashboard/assistants'
            break
          case 'profile_updated':
            title = 'Perfil actualizado'
            description = 'Se actualizaron los datos de tu empresa.'
            href = '/dashboard/settings'
            break
          default:
            title = 'Actividad registrada'
            description = String(log.action)
        }
        return { id: log.id, type: 'activity', title, description, created_at: log.created_at, href }
      })
    } else {
      const assistantItems = (recentAssistantsResult.data ?? []).map((a) => ({ id: `assistant-${a.id}`, type: 'assistant', title: 'Asistente creado', description: `"${a.assistant_name}" fue configurado.`, created_at: a.created_at, href: `/dashboard/assistants/${a.id}` }))
      const convItems = (recentConversationsResult.data ?? []).map((c) => ({ id: `conv-${c.id}`, type: 'conversation', title: 'Nueva conversación', description: c.last_message ? `Mensaje: "${String(c.last_message).substring(0, 40)}..."` : 'Iniciada desde Web Chat.', created_at: c.created_at, href: '/dashboard/conversations' }))
      const leadItems = (recentLeadsResult.data ?? []).map((l) => ({ id: `lead-${l.id}`, type: 'lead', title: 'Nuevo lead captado', description: l.name ? `${l.name} dejó sus datos.` : 'Lead capturado vía widget.', created_at: l.created_at, href: '/dashboard/leads' }))

      activity = [...assistantItems, ...convItems, ...leadItems]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 3)
    }

    const timestamps = {
      lastUpdatedAt: new Date().toISOString(),
      lastConversationAt,
      lastLeadAt,
      lastAssistantCreatedAt,
      webchatLastSeenAt: webchatObj.lastSeenAt
    }

    return NextResponse.json({
      profile: { full_name: profileResult.data?.full_name || user.user_metadata?.full_name || null, email: user.email ?? null },
      plan: { key: planKey, label: planConfig.label, status: subscription?.status ?? 'active', channels: planConfig.channels, description: planConfig.description },
      usage: { assistantsUsed, assistantsLimit, messagesUsed, messagesLimit, messagesPercentage, assistantsPercentage, assistantsLimitFormatted: formatLimit(assistantsLimit), messagesLimitFormatted: formatLimit(messagesLimit) },
      stats: { assistantCount: assistantsUsed, activeAssistantCount: activeAssistantsResult.count ?? 0, conversationCount: conversationsResult.count ?? 0, openConversationCount: openConversationsResult.count ?? 0, leadCount: leadsResult.count ?? 0, newLeadCount: newLeadsResult.count ?? 0 },
      recentAssistants: (recentAssistantsResult.data ?? []).map((a) => ({ id: a.id, assistant_name: a.assistant_name, business_name: a.business_name, channel: a.channel, status: a.status, created_at: a.created_at, tone: a.tone })),
      webchat: webchatObj,
      channels,
      health,
      timestamps,
      executiveSummary,
      alerts,
      activity: activity.slice(0, 3),
    }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Pragma': 'no-cache' }
    })
  } catch (err) {
    console.error('[GET /api/dashboard]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
