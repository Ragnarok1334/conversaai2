import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/security'

export const dynamic = 'force-dynamic'

const MAX_LIMIT = 100
const MAX_SEARCH_LENGTH = 100
const MAX_FILTER_LENGTH = 64

function clampPositiveInt(value: string | null, fallback: number, max: number): number {
  const parsed = Number.parseInt(value || '', 10)
  if (!Number.isFinite(parsed) || parsed < 1) return fallback
  return Math.min(parsed, max)
}

function escapePostgrestLike(value: string): string {
  return value.replace(/[\\%_,.()]/g, (char) => `\\${char}`)
}

function safeFilter(value: string | null): string | null {
  if (!value) return null
  const trimmed = value.trim()
  return trimmed && trimmed.length <= MAX_FILTER_LENGTH ? trimmed : null
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const allowed = await checkRateLimit(`user:${user.id}`, 'leads-list', 60, 60)
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const { searchParams } = new URL(request.url)
    const limit = clampPositiveInt(searchParams.get('limit'), 50, MAX_LIMIT)
    const page = clampPositiveInt(searchParams.get('page'), 1, 1000000)
    const offset = (page - 1) * limit

    const status = safeFilter(searchParams.get('status'))
    const source = safeFilter(searchParams.get('source'))
    const assistantId = safeFilter(searchParams.get('assistantId'))
    const rawSearch = searchParams.get('search')?.trim() || ''
    const dateFilter = safeFilter(searchParams.get('dateFilter'))

    if (rawSearch.length > MAX_SEARCH_LENGTH) {
      return NextResponse.json({ error: 'Búsqueda demasiado larga' }, { status: 400 })
    }

    if (assistantId && assistantId !== 'all' && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(assistantId)) {
      return NextResponse.json({ error: 'assistantId inválido' }, { status: 400 })
    }

    const { createSupabaseAdmin } = await import('@/lib/supabase/admin')
    const supabaseAdmin = createSupabaseAdmin()

    const [subRes, profileRes] = await Promise.all([
      supabaseAdmin
        .from('subscriptions')
        .select('plan, status, current_period_end, grace_ends_at, cancel_at_period_end')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabaseAdmin
        .from('profiles')
        .select('trial_used, trial_ends_at')
        .eq('id', user.id)
        .maybeSingle(),
    ])

    if (subRes.error || profileRes.error) {
      console.error('[GET /api/leads] subscription/profile lookup failed')
      return NextResponse.json({ error: 'No se pudo validar el acceso' }, { status: 500 })
    }

    const { getEffectiveSubscriptionStatus } = await import('@/lib/billing/subscription-status')
    const effectiveStatus = getEffectiveSubscriptionStatus(subRes.data, profileRes.data)

    if (['free', 'expired', 'cancelled'].includes(effectiveStatus)) {
      return NextResponse.json({ error: 'Plan inválido para ver leads' }, { status: 403 })
    }

    let query = supabase
      .from('leads')
      .select('id, user_id, assistant_id, conversation_id, name, email, phone, company, notes, status, source, created_at, updated_at, assistant:assistants(assistant_name, business_name), conversation:conversations(last_message)', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status && status !== 'all') query = query.eq('status', status)
    if (source && source !== 'all') query = query.eq('source', source)
    if (assistantId && assistantId !== 'all') query = query.eq('assistant_id', assistantId)
    if (rawSearch) {
      const search = escapePostgrestLike(rawSearch)
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
    }

    if (dateFilter && dateFilter !== 'all') {
      const now = new Date()
      if (dateFilter === 'today') {
        const start = new Date(now)
        start.setHours(0, 0, 0, 0)
        query = query.gte('created_at', start.toISOString())
      } else if (dateFilter === '7days') {
        query = query.gte('created_at', new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString())
      } else if (dateFilter === '30days') {
        query = query.gte('created_at', new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString())
      } else {
        return NextResponse.json({ error: 'dateFilter inválido' }, { status: 400 })
      }
    }

    const [{ data, count, error }, { data: allLeads, error: statsError }] = await Promise.all([
      query,
      supabase.from('leads').select('status, source').eq('user_id', user.id),
    ])

    if (error || statsError) {
      console.error('[GET /api/leads] query failed')
      return NextResponse.json({ error: 'No se pudieron cargar los leads' }, { status: 500 })
    }

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
    console.error('[GET /api/leads] Error:', error instanceof Error ? error.message : 'unknown')
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}