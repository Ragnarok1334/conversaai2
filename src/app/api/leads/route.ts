import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const offset = (page - 1) * limit
    
    // Filtros opcionales
    const status = searchParams.get('status')
    const source = searchParams.get('source')
    const assistantId = searchParams.get('assistantId')
    const search = searchParams.get('search')
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

    let query = supabase
      .from('leads')
      .select('*, assistant:assistants(assistant_name, business_name), conversation:conversations(last_message)', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status && status !== 'all') query = query.eq('status', status)
    if (source && source !== 'all') query = query.eq('source', source)
    if (assistantId && assistantId !== 'all') query = query.eq('assistant_id', assistantId)
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

    const { data, count, error } = await query

    if (error) throw error

    // Fetch stats
    const { data: allLeads } = await supabase.from('leads').select('status, source').eq('user_id', user.id)
    
    const stats = {
      total: allLeads?.length || 0,
      new: allLeads?.filter(l => l.status === 'new').length || 0,
      contacted: allLeads?.filter(l => l.status === 'contacted').length || 0,
      qualified: allLeads?.filter(l => l.status === 'qualified').length || 0,
      converted: allLeads?.filter(l => l.status === 'converted').length || 0,
      discarded: allLeads?.filter(l => l.status === 'discarded').length || 0,
      webchat: allLeads?.filter(l => l.source === 'webchat').length || 0,
    }

    return NextResponse.json({ leads: data || [], stats, count: count || 0 })
  } catch (error) {
    console.error('[GET /api/leads]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
