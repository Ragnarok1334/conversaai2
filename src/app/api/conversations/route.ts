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
    const limit = parseInt(searchParams.get('limit') || '25', 10)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const offset = (page - 1) * limit
    
    // Filtros opcionales
    const status = searchParams.get('status')
    const channel = searchParams.get('channel')
    const assistantId = searchParams.get('assistantId')
    const search = searchParams.get('search')

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

    let query = supabase
      .from('conversations')
      .select('*, assistant:assistants(assistant_name, business_name), lead:leads(id)', { count: 'exact' })
      .eq('user_id', user.id)
      .order('last_message_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status && status !== 'all') query = query.eq('status', status)
    if (channel && channel !== 'all') query = query.eq('channel', channel)
    if (assistantId && assistantId !== 'all') query = query.eq('assistant_id', assistantId)
    if (search) {
      query = query.or(`visitor_name.ilike.%${search}%,visitor_email.ilike.%${search}%,visitor_phone.ilike.%${search}%,last_message.ilike.%${search}%`)
    }

    const { data, count, error } = await query

    if (error) throw error

    // Fetch stats
    const { data: allConvs } = await supabase.from('conversations').select('status, channel').eq('user_id', user.id)
    
    const stats = {
      total: allConvs?.length || 0,
      open: allConvs?.filter(c => c.status === 'open').length || 0,
      closed: allConvs?.filter(c => c.status === 'closed').length || 0,
      pending: allConvs?.filter(c => c.status === 'pending').length || 0,
      webchat: allConvs?.filter(c => c.channel === 'webchat').length || 0,
      telegram: allConvs?.filter(c => c.channel === 'telegram').length || 0,
      whatsapp: allConvs?.filter(c => c.channel === 'whatsapp').length || 0,
    }

    return NextResponse.json({ conversations: data || [], stats, count: count || 0 })
  } catch (error) {
    console.error('[GET /api/conversations]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
