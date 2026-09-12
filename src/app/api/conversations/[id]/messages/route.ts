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
      .select('id, assistant_id, channel, external_chat_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!conversation) return NextResponse.json({ error: 'Conversación no encontrada' }, { status: 404 })

    let providerMessageId: string | null = null
    if (conversation.channel === 'whatsapp') {
      if (!conversation.external_chat_id) return NextResponse.json({ error: 'La conversación no tiene un destinatario de WhatsApp válido.' }, { status: 409 })
      const { data: whatsappChannel } = await admin.from('whatsapp_channels').select('*')
        .eq('assistant_id', conversation.assistant_id).eq('user_id', user.id).eq('status', 'connected').maybeSingle()
      if (!whatsappChannel) return NextResponse.json({ error: 'El canal de WhatsApp está desconectado.' }, { status: 409 })
      try {
        const { sendWhatsAppText } = await import('@/lib/whatsapp/client')
        const sent = await sendWhatsAppText(whatsappChannel, conversation.external_chat_id, content)
        providerMessageId = sent.messages?.[0]?.id || null
      } catch (error) {
        console.error('[WhatsApp human reply]', error instanceof Error ? error.message : 'unknown')
        return NextResponse.json({ error: 'Meta no pudo entregar el mensaje. Revisa la conexión de WhatsApp.' }, { status: 502 })
      }
    }

    const now = new Date().toISOString()
    const { data: message, error: messageError } = await admin.from('messages').insert({
      conversation_id: id,
      user_id: user.id,
      assistant_id: conversation.assistant_id,
      channel: conversation.channel || 'webchat',
      role: 'assistant',
      sender_type: 'human',
      content,
      provider_message_id: providerMessageId,
      metadata: providerMessageId ? { delivery_status: 'accepted' } : {},
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
