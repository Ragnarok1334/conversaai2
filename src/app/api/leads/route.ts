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
    const limit = parseBoundedInteger(searchParams.get('limit'), 50, 1, 100)
    const page = parseBoundedInteger(searchParams.get('page'), 1, 1, 10_000)
    const offset = (page - 1) * limit
    
    // Filtros opcionales
    const status = searchParams.get('status')
    const source = searchParams.get('source')
    const assistantId = searchParams.get('assistantId')
    const search = normalizeSearchTerm(searchParams.get('search'))
    const dateFilter = searchParams.get('dateFilter')

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
      return NextResponse.json({ error: 'Plan inválido para ver leads' }, { status: 403 })
    }

    // Query owned leads first and resolve optional relations separately. A
    // missing PostgREST relationship must not hide valid webchat leads.
    let query = supabaseAdmin
      .from('leads')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status === 'followup') {
      query = query.in('status', ['contacted', 'qualified'])
    } else if (status && status !== 'all' && ['new', 'contacted', 'qualified', 'converted', 'lost'].includes(status)) {
      query = query.eq('status', status)
    }
    if (source && source !== 'all' && ['webchat', 'telegram', 'whatsapp', 'instagram', 'facebook'].includes(source)) query = query.eq('source', source)
    if (assistantId && assistantId !== 'all' && isUuid(assistantId)) query = query.eq('assistant_id', assistantId)
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
    }
    if (dateFilter && dateFilter !== 'all') {
      const now = new Date()
      if (dateFilter === 'today') {
        const start = new Date(now.setHours(0,0,0,0)).toISOString()
        query = query.gte('created_at', start)
      } else if (dateFilter === '7days') {
        const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
        query = query.gte('created_at', start)
      } else if (dateFilter === '30days') {
        const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
        query = query.gte('created_at', start)
      }
    }

    const { data: leadRows, count, error } = await query

    if (error) throw error

    const assistantIds = [...new Set((leadRows ?? []).map((lead) => lead.assistant_id).filter(Boolean))]
    const conversationIds = [...new Set((leadRows ?? []).map((lead) => lead.conversation_id).filter(Boolean))]

    const [assistantsResult, conversationsResult] = await Promise.all([
      assistantIds.length
        ? supabaseAdmin.from('assistants').select('id, assistant_name, business_name').eq('user_id', user.id).in('id', assistantIds)
        : Promise.resolve({ data: [], error: null }),
      conversationIds.length
        ? supabaseAdmin.from('conversations').select('id, last_message').eq('user_id', user.id).in('id', conversationIds)
        : Promise.resolve({ data: [], error: null }),
    ])

    if (assistantsResult.error) console.error('[GET /api/leads] assistants:', assistantsResult.error)
    if (conversationsResult.error) console.error('[GET /api/leads] conversations:', conversationsResult.error)

    const assistantsById = new Map((assistantsResult.data ?? []).map((assistant) => [assistant.id, assistant]))
    const conversationsById = new Map((conversationsResult.data ?? []).map((conversation) => [conversation.id, conversation]))
    const data = (leadRows ?? []).map((lead) => ({
      ...lead,
      assistant: lead.assistant_id ? assistantsById.get(lead.assistant_id) ?? null : null,
      conversation: lead.conversation_id ? conversationsById.get(lead.conversation_id) ?? null : null,
    }))

    // Fetch stats
    const { data: allLeads, error: statsError } = await supabaseAdmin
      .from('leads')
      .select('status, source')
      .eq('user_id', user.id)

    if (statsError) throw statsError
    
    const stats = {
      total: allLeads?.length || 0,
      new: allLeads?.filter(l => l.status === 'new').length || 0,
      contacted: allLeads?.filter(l => l.status === 'contacted').length || 0,
      qualified: allLeads?.filter(l => l.status === 'qualified').length || 0,
      converted: allLeads?.filter(l => l.status === 'converted').length || 0,
      lost: allLeads?.filter(l => l.status === 'lost').length || 0,
      webchat: allLeads?.filter(l => l.source === 'webchat').length || 0,
    }

    return NextResponse.json({ leads: data || [], stats, count: count || 0 })
  } catch (error) {
    console.error('[GET /api/leads]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
