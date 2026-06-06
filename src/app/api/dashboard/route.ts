import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { normalizePlan, getPlanConfig, getPlanLimits, getUsagePercentage, formatLimit } from '@/lib/plans'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const supabaseAdmin = createSupabaseAdmin()

    // Fetch all data in parallel
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
    ] = await Promise.all([
      // Profile
      supabase.from('profiles').select('full_name, email').eq('id', user.id).single(),
      // Subscription
      supabase.from('subscriptions').select('*').eq('user_id', user.id).single(),
      // Total assistants
      supabase.from('assistants').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      // Active assistants
      supabase.from('assistants').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'active'),
      // Total conversations
      supabase.from('conversations').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      // Open conversations
      supabase.from('conversations').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'open'),
      // Total leads
      supabase.from('leads').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      // New leads (last 7 days)
      supabase.from('leads').select('*', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      // assistant_channels (check if table exists and has data)
      supabase.from('assistant_channels').select('channel, is_enabled, config, assistant_id').eq('user_id', user.id).eq('is_enabled', true).limit(50),
      // Recent notifications (activity feed)
      supabase.from('notifications').select('id, title, message, type, created_at, metadata').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
      // Recent assistants
      supabase.from('assistants').select('id, assistant_name, business_name, channel, status, created_at, tone').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
      // Recent conversations (for activity fallback)
      supabase.from('conversations').select('id, created_at, status, last_message').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
      // Recent leads (for activity fallback)
      supabase.from('leads').select('id, created_at, name, email, source').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
      // Assistant domains for real webchat verification
      supabase.from('assistant_domains').select('is_verified, verification_status, last_seen_at').eq('user_id', user.id),
    ])

    // --- Plan & Usage ---
    let subscription = subscriptionResult.data

    // Fallback: create free subscription if none found
    if (!subscription) {
      const planCfg = getPlanConfig('free')
      const { data: newSub } = await supabaseAdmin
        .from('subscriptions')
        .insert({
          user_id: user.id,
          plan: 'free',
          status: 'active',
          assistants_limit: planCfg.assistantsLimit ?? 1,
          messages_limit: planCfg.messagesLimit ?? 100,
          current_messages_used: 0,
        })
        .select()
        .single()
      subscription = newSub
    }

    const planKey = normalizePlan(subscription?.plan ?? 'free')
    const planConfig = getPlanConfig(planKey)
    const planLimits = getPlanLimits(planKey)
    const assistantsUsed = assistantsResult.count ?? 0
    const messagesUsed = subscription?.current_messages_used ?? 0
    const messagesLimit = planLimits.messagesPerMonth === Infinity ? null : planLimits.messagesPerMonth
    const assistantsLimit = planLimits.assistants === Infinity ? null : planLimits.assistants

    // --- Channel Status ---
    const channelRows = assistantChannelsResult.data ?? []
    
    // Web Chat Status derivation
    const domains = assistantDomainsResult.data ?? []
    let webchatStatus = 'missing_domain'

    if (assistantsUsed > 0) {
      if (domains.length === 0) {
        webchatStatus = 'missing_domain'
      } else {
        // Find if any domain is blocked
        const hasBlocked = domains.some(d => d.verification_status === 'blocked')
        // Find if any is verified and has last_seen_at
        const hasVerified = domains.some(d => d.is_verified && d.last_seen_at)
        
        if (hasBlocked && !hasVerified) {
          webchatStatus = 'blocked'
        } else if (hasVerified) {
          webchatStatus = 'installed'
        } else {
          webchatStatus = 'pending'
        }
      }
    } else {
      webchatStatus = 'missing_domain' // Will show "crea tu primer asistente"
    }

    const hasTelegramActive = channelRows.some(
      (r) => r.channel === 'telegram' && r.is_enabled === true && (r.config as any)?.telegram_token
    )
    const telegramAllowed = planConfig.channels.includes('telegram')
    const telegramStatus = !telegramAllowed ? 'locked' : hasTelegramActive ? 'connected' : 'pending'

    const channels = {
      webchat: webchatStatus,
      telegram: telegramStatus,
      whatsapp: 'coming_soon', // Always, never mark as connected
    }

    // --- Alerts ---
    const messagesPercentage = messagesLimit ? Math.round((messagesUsed / messagesLimit) * 100) : 0
    const assistantsPercentage = assistantsLimit ? Math.round((assistantsUsed / assistantsLimit) * 100) : 0
    const alerts: { type: string; message: string; action?: string; href?: string }[] = []

    if (subscription?.status !== 'active') {
      alerts.push({ type: 'error', message: 'Tu suscripción no está activa. Revisa tu facturación.', action: 'Ver facturación', href: '/dashboard/billing' })
    }
    if (messagesLimit && messagesPercentage >= 90) {
      alerts.push({ type: 'warning', message: `Usaste el ${messagesPercentage}% de tus mensajes este ciclo.`, action: planKey === 'business' ? 'Administrar' : 'Mejorar plan', href: '/dashboard/billing' })
    } else if (messagesLimit && messagesPercentage >= 80) {
      alerts.push({ type: 'info', message: `Llevas el ${messagesPercentage}% de tus mensajes este ciclo.`, action: 'Ver uso', href: '/dashboard/billing' })
    }
    if (assistantsLimit && assistantsUsed >= assistantsLimit) {
      alerts.push({ type: 'warning', message: 'Alcanzaste el límite de asistentes de tu plan.', action: planKey === 'business' || planKey === 'enterprise' ? 'Administrar' : 'Mejorar plan', href: '/dashboard/billing' })
    }

    // --- Activity Feed ---
    let activity: { id: string; type: string; title: string; description: string; created_at: string; href?: string }[] = []

    if (notificationsResult.data && notificationsResult.data.length > 0) {
      // Use notifications table as feed
      activity = notificationsResult.data.map((n) => ({
        id: n.id,
        type: n.type ?? 'notification',
        title: n.title,
        description: n.message,
        created_at: n.created_at,
        href: (n.metadata as any)?.assistantId ? `/dashboard/assistants/${(n.metadata as any).assistantId}` : undefined,
      }))
    } else {
      // Fallback: combine assistants, conversations, leads
      const assistantItems = (recentAssistantsResult.data ?? []).map((a) => ({
        id: `assistant-${a.id}`,
        type: 'assistant',
        title: 'Asistente creado',
        description: `"${a.assistant_name}" fue configurado.`,
        created_at: a.created_at,
        href: `/dashboard/assistants/${a.id}`,
      }))
      const convItems = (recentConversationsResult.data ?? []).map((c) => ({
        id: `conv-${c.id}`,
        type: 'conversation',
        title: 'Nueva conversación',
        description: c.last_message ? `"${String(c.last_message).substring(0, 60)}..."` : 'Iniciada desde Web Chat.',
        created_at: c.created_at,
        href: '/dashboard/conversations',
      }))
      const leadItems = (recentLeadsResult.data ?? []).map((l) => ({
        id: `lead-${l.id}`,
        type: 'lead',
        title: 'Nuevo lead captado',
        description: l.name ? `${l.name} dejó sus datos vía ${l.source ?? 'widget'}.` : `Lead capturado vía ${l.source ?? 'widget'}.`,
        created_at: l.created_at,
        href: '/dashboard/leads',
      }))

      activity = [...assistantItems, ...convItems, ...leadItems]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10)
    }

    // --- Response ---
    return NextResponse.json({
      profile: {
        full_name: profileResult.data?.full_name || user.user_metadata?.full_name || null,
        email: user.email ?? null,
      },
      plan: {
        key: planKey,
        label: planConfig.label,
        status: subscription?.status ?? 'active',
        channels: planConfig.channels,
        description: planConfig.description,
      },
      usage: {
        assistantsUsed,
        assistantsLimit,
        messagesUsed,
        messagesLimit,
        messagesPercentage,
        assistantsPercentage,
        assistantsLimitFormatted: formatLimit(assistantsLimit),
        messagesLimitFormatted: formatLimit(messagesLimit),
      },
      stats: {
        assistantCount: assistantsUsed,
        activeAssistantCount: activeAssistantsResult.count ?? 0,
        conversationCount: conversationsResult.count ?? 0,
        openConversationCount: openConversationsResult.count ?? 0,
        leadCount: leadsResult.count ?? 0,
        newLeadCount: newLeadsResult.count ?? 0,
      },
      recentAssistants: (recentAssistantsResult.data ?? []).map((a) => ({
        id: a.id,
        assistant_name: a.assistant_name,
        business_name: a.business_name,
        channel: a.channel,
        status: a.status,
        created_at: a.created_at,
        tone: a.tone,
      })),
      channels,
      alerts,
      activity,
    })
  } catch (err) {
    console.error('[GET /api/dashboard]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
