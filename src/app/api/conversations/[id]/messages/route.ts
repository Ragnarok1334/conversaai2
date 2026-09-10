import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { HttpInputError, isUuid, readJsonBody } from '@/lib/http-security'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    if (!isUuid(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await readJsonBody<{ content?: unknown }>(request, 4_096)
    const content = typeof body.content === 'string' ? body.content.trim() : ''
    if (!content || content.length > 2000) {
      return NextResponse.json({ error: 'El mensaje debe tener entre 1 y 2000 caracteres.' }, { status: 400 })
    }

    const admin = createSupabaseAdmin()
    const { data: conversation } = await admin
      .from('conversations')
      .select('id, assistant_id, channel')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!conversation) return NextResponse.json({ error: 'Conversación no encontrada' }, { status: 404 })

    const now = new Date().toISOString()
    const { data: message, error: messageError } = await admin.from('messages').insert({
      conversation_id: id,
      user_id: user.id,
      assistant_id: conversation.assistant_id,
      channel: conversation.channel || 'webchat',
      role: 'assistant',
      sender_type: 'human',
      content,
    }).select().single()

    if (messageError) throw messageError

    const { error: conversationError } = await admin.from('conversations').update({
      ai_paused: true,
      handoff_status: 'human',
      assigned_to: user.id,
      assigned_at: now,
      status: 'open',
      last_message: content.slice(0, 100),
      last_message_at: now,
    }).eq('id', id).eq('user_id', user.id)

    if (conversationError) throw conversationError
    return NextResponse.json({ message, handoffStatus: 'human' })
  } catch (error) {
    if (error instanceof HttpInputError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error('[POST /api/conversations/[id]/messages]', error)
    return NextResponse.json({ error: 'No se pudo enviar el mensaje.' }, { status: 500 })
  }
}
