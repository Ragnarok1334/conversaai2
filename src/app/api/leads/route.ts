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
    
    // Filtros opcionales
    const status = searchParams.get('status')
    const source = searchParams.get('source')
    const assistantId = searchParams.get('assistantId')
    const search = searchParams.get('search')

    let query = supabase
      .from('leads')
      .select('*, assistant:assistants(assistant_name, business_name), conversation:conversations(last_message)', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (status && status !== 'all') query = query.eq('status', status)
    if (source && source !== 'all') query = query.eq('source', source)
    if (assistantId && assistantId !== 'all') query = query.eq('assistant_id', assistantId)
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
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
