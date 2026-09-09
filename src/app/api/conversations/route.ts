import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isUuid, normalizeSearchTerm, parseBoundedInteger } from '@/lib/http-security'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseBoundedInteger(searchParams.get('limit'), 25, 1, 100)
    const page = parseBoundedInteger(searchParams.get('page'), 1, 1, 10_000)
    const offset = (page - 1) * limit
    
    // Filtros opcionales
    const status = searchParams.get('status')
    const channel = searchParams.get('channel')
    const assistantId = searchParams.get('assistantId')
    const search = normalizeSearchTerm(searchParams.get('search'))

    const { createSupabaseAdmin } = await import('@/lib/supabase/admin')
    const supabaseAdmin = createSupabaseAdmin()

    // Validate plan access
    const [subRes, profileRes] = await Promise.all([
      supabaseAdmin.from('subscriptions').select('plan, status, current_period_end, grace_ends_at, cancel_at_period_end').eq('user_id', user.id).single(),
      supabaseAdmin.from('profiles').select('trial_used, trial_ends_at').eq('id', user.id).single()
    ])
    const { getEffectiveSubscriptionStatus } = await import('@/lib/billing/subscription-status')
    const effectiveStatus = getEffectiveSubscriptionStatus(subRes.data, profileRes.data)
    
    if (['free', 'expired', 'cancelled'].includes(effectiveStatus)) {
      return NextResponse.json({ error: 'Plan inválido para ver conversaciones' }, { status: 403 })
    }

    // Use the server-only client after authenticating the request. Keeping the
    // joins separate prevents an optional PostgREST relationship/grant from
    // taking down the complete conversations endpoint.
    let query = supabaseAdmin
      .from('conversations')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('last_message_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status && status !== 'all' && ['open', 'pending', 'closed'].includes(status)) query = query.eq('status', status)
    if (channel && channel !== 'all' && ['webchat', 'telegram', 'whatsapp', 'instagram', 'facebook'].includes(channel)) query = query.eq('channel', channel)
    if (assistantId && assistantId !== 'all' && isUuid(assistantId)) query = query.eq('assistant_id', assistantId)
    if (search) {
      query = query.or(`visitor_name.ilike.%${search}%,visitor_email.ilike.%${search}%,visitor_phone.ilike.%${search}%,last_message.ilike.%${search}%`)
    }

    const { data: conversationRows, count, error } = await query

    if (error) throw error

    const assistantIds = [...new Set((conversationRows ?? []).map((row) => row.assistant_id).filter(Boolean))]
    const conversationIds = (conversationRows ?? []).map((row) => row.id)

    const [assistantsResult, leadsResult] = await Promise.all([
      assistantIds.length
        ? supabaseAdmin.from('assistants').select('id, assistant_name, business_name').eq('user_id', user.id).in('id', assistantIds)
        : Promise.resolve({ data: [], error: null }),
      conversationIds.length
        ? supabaseAdmin.from('leads').select('id, conversation_id').eq('user_id', user.id).in('conversation_id', conversationIds)
        : Promise.resolve({ data: [], error: null }),
    ])

    if (assistantsResult.error) console.error('[GET /api/conversations] assistants:', assistantsResult.error)
    if (leadsResult.error) console.error('[GET /api/conversations] leads:', leadsResult.error)

    const assistantsById = new Map((assistantsResult.data ?? []).map((assistant) => [assistant.id, assistant]))
    const leadsByConversation = new Map<string, Array<{ id: string }>>()
    for (const lead of leadsResult.data ?? []) {
      if (!lead.conversation_id) continue
      const existing = leadsByConversation.get(lead.conversation_id) ?? []
      existing.push({ id: lead.id })
      leadsByConversation.set(lead.conversation_id, existing)
    }

    const data = (conversationRows ?? []).map((conversation) => ({
      ...conversation,
      assistant: conversation.assistant_id ? assistantsById.get(conversation.assistant_id) ?? null : null,
      lead: leadsByConversation.get(conversation.id) ?? [],
    }))

    // Fetch stats
    const { data: allConvs, error: statsError } = await supabaseAdmin
      .from('conversations')
      .select('status, channel')
      .eq('user_id', user.id)

    if (statsError) throw statsError
    
    const stats = {
      total: allConvs?.length || 0,
      open: allConvs?.filter(c => c.status === 'open').length || 0,
      closed: allConvs?.filter(c => c.status === 'closed').length || 0,
      pending: allConvs?.filter(c => c.status === 'pending').length || 0,
      webchat: allConvs?.filter(c => c.channel === 'webchat').length || 0,
      telegram: allConvs?.filter(c => c.channel === 'telegram').length || 0,
      whatsapp: allConvs?.filter(c => c.channel === 'whatsapp').length || 0,
      instagram: allConvs?.filter(c => c.channel === 'instagram').length || 0,
      facebook: allConvs?.filter(c => c.channel === 'facebook').length || 0,
    }

    return NextResponse.json({ conversations: data || [], stats, count: count || 0 })
  } catch (error) {
    console.error('[GET /api/conversations]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
