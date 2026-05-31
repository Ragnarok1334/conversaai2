import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Lead detail
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*, assistant:assistants(assistant_name, business_name), conversation:conversations(last_message)')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (leadError || !lead) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({ lead })
  } catch (error) {
    console.error('[GET /api/leads/[id]]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status, notes, name, email, phone } = body

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (status && !['new', 'contacted', 'qualified', 'converted', 'discarded'].includes(status)) {
      return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
    }

    // Verify ownership via RLS select first
    const { data: verify } = await supabase.from('leads').select('id').eq('id', id).single()
    if (!verify) return NextResponse.json({ error: 'Not found or forbidden' }, { status: 404 })

    // Update using admin because frontend cannot UPDATE directly based on our new max security RLS
    const supabaseAdmin = createSupabaseAdmin()
    const updates: Record<string, any> = {}
    
    if (status !== undefined) updates.status = status
    if (notes !== undefined) updates.notes = notes
    if (name !== undefined) updates.name = name
    if (email !== undefined) updates.email = email
    if (phone !== undefined) updates.phone = phone

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabaseAdmin
        .from('leads')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)

      if (updateError) throw updateError
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[PATCH /api/leads/[id]]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
