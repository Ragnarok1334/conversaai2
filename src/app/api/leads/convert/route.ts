import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { conversation_id, assistant_id, source, name, email, phone, notes } = body

    if (!conversation_id) {
      return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 })
    }

    // Comprobar si ya existe un lead para esta conversación
    const { data: existingLead } = await supabase
      .from('leads')
      .select('id')
      .eq('conversation_id', conversation_id)
      .single()

    if (existingLead) {
      return NextResponse.json({ error: 'Ya existe un lead para esta conversación' }, { status: 400 })
    }

    // Insertar el lead
    const { data: newLead, error } = await supabase
      .from('leads')
      .insert([
        {
          user_id: user.id,
          assistant_id,
          conversation_id,
          source: source || 'webchat',
          name,
          email,
          phone,
          notes,
          status: 'new'
        }
      ])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, lead: newLead })
  } catch (error: any) {
    console.error('[POST /api/leads/convert]', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
