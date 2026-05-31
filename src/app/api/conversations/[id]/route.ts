import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Conversation
    const { data: conv, error: convError } = await supabase
      .from('conversations')
      .select('*, assistant:assistants(assistant_name, business_name, channel)')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (convError || !conv) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Messages
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', id)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (msgError) throw msgError

    return NextResponse.json({ conversation: conv, messages: messages || [] })
  } catch (error) {
    console.error('[GET /api/conversations/[id]]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status } = body

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (status && !['open', 'pending', 'closed'].includes(status)) {
      return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
    }

    // Verify ownership via RLS select first
    const { data: verify } = await supabase.from('conversations').select('id').eq('id', id).single()
    if (!verify) return NextResponse.json({ error: 'Not found or forbidden' }, { status: 404 })

    // Update using admin because frontend cannot UPDATE directly based on our new max security RLS
    const supabaseAdmin = createSupabaseAdmin()
    const updates: Record<string, any> = {}
    if (status) updates.status = status

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabaseAdmin
        .from('conversations')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)

      if (updateError) throw updateError
    }

    return NextResponse.json({ success: true, status })
  } catch (error) {
    console.error('[PATCH /api/conversations/[id]]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
