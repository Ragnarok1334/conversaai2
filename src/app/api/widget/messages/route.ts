import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { checkRateLimit, validateWidgetDomain } from '@/lib/security'
import { getClientIp, isUuid, isVisitorId, widgetCorsHeaders } from '@/lib/http-security'

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: widgetCorsHeaders(request, true) })
}

export async function GET(request: NextRequest) {
  const privateHeaders = widgetCorsHeaders(request, false)
  const assistantId = request.nextUrl.searchParams.get('assistantId')
  const conversationId = request.nextUrl.searchParams.get('conversationId')
  const visitorId = request.nextUrl.searchParams.get('visitorId')
  const after = request.nextUrl.searchParams.get('after')

  if (!isUuid(assistantId) || !isUuid(conversationId) || !isVisitorId(visitorId)) {
    return NextResponse.json({ error: 'Sesión inválida.' }, { status: 400, headers: privateHeaders })
  }

  const allowed = await checkRateLimit(`widget-poll-${assistantId}-${getClientIp(request)}`, 'widget-poll', 30, 60)
  if (!allowed) return NextResponse.json({ error: 'Demasiadas consultas.' }, { status: 429, headers: privateHeaders })

  const domain = await validateWidgetDomain({ assistantId, req: request })
  if (!domain.isValid) return NextResponse.json({ error: 'Dominio no autorizado.' }, { status: 403, headers: privateHeaders })

  const admin = createSupabaseAdmin()
  const { data: conversation } = await admin.from('conversations')
    .select('id, ai_paused, handoff_status')
    .eq('id', conversationId)
    .eq('assistant_id', assistantId)
    .eq('visitor_id', visitorId)
    .maybeSingle()

  if (!conversation) return NextResponse.json({ error: 'Conversación no encontrada.' }, { status: 404, headers: privateHeaders })

  let query = admin.from('messages')
    .select('id, role, sender_type, content, created_at')
    .eq('conversation_id', conversationId)
    .eq('assistant_id', assistantId)
    .eq('sender_type', 'human')
    .order('created_at', { ascending: true })
    .limit(30)

  if (after && !Number.isNaN(Date.parse(after))) query = query.gt('created_at', after)
  const { data: messages, error } = await query
  if (error) return NextResponse.json({ error: 'No se pudieron consultar los mensajes.' }, { status: 500, headers: privateHeaders })

  return NextResponse.json({ messages: messages || [], aiPaused: conversation.ai_paused, handoffStatus: conversation.handoff_status }, {
    headers: { ...widgetCorsHeaders(request, true), 'Cache-Control': 'no-store' },
  })
}
