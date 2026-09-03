import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { validateWidgetDomain, checkRateLimit } from '@/lib/security'
import { logSecurityEvent, logAuditEvent } from '@/lib/audit'

const MAX_BODY_BYTES = 8 * 1024
const MAX_PAGE_URL_LENGTH = 2048
const MAX_VISITOR_ID_LENGTH = 128
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function POST(req: Request) {
  const isDev = process.env.NODE_ENV === 'development'

  try {
    const contentLength = req.headers.get('content-length')
    if (contentLength) {
      const parsed = Number(contentLength)
      if (!Number.isFinite(parsed) || parsed > MAX_BODY_BYTES) return NextResponse.json({ error: 'Solicitud demasiado grande.' }, { status: 413, headers: corsHeaders })
    }

    const rawBody = await req.text()
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) return NextResponse.json({ error: 'Solicitud demasiado grande.' }, { status: 413, headers: corsHeaders })

    let parsedBody: unknown
    try { parsedBody = JSON.parse(rawBody) } catch { return NextResponse.json({ error: 'Body no válido.' }, { status: 400, headers: corsHeaders }) }
    if (!isPlainObject(parsedBody)) return NextResponse.json({ error: 'Body no válido.' }, { status: 400, headers: corsHeaders })

    const allowedKeys = new Set(['assistantId', 'pageUrl', 'visitorId'])
    if (Object.keys(parsedBody).some((key) => !allowedKeys.has(key))) return NextResponse.json({ error: 'Body no válido.' }, { status: 400, headers: corsHeaders })

    const assistantId = typeof parsedBody.assistantId === 'string' ? parsedBody.assistantId.trim() : ''
    const pageUrl = typeof parsedBody.pageUrl === 'string' ? parsedBody.pageUrl.trim() : undefined
    const visitorId = typeof parsedBody.visitorId === 'string' ? parsedBody.visitorId.trim() : undefined

    if (!UUID_RE.test(assistantId)) return NextResponse.json({ error: 'assistantId inválido.' }, { status: 400, headers: corsHeaders })
    if (pageUrl && pageUrl.length > MAX_PAGE_URL_LENGTH) return NextResponse.json({ error: 'pageUrl inválida.' }, { status: 400, headers: corsHeaders })
    if (visitorId && visitorId.length > MAX_VISITOR_ID_LENGTH) return NextResponse.json({ error: 'visitorId inválido.' }, { status: 400, headers: corsHeaders })

    const forwardedFor = req.headers.get('x-forwarded-for')
    const ip = forwardedFor ? forwardedFor.split(',')[0].trim().slice(0, 128) : 'unknown'
    if (!await checkRateLimit(`widget_ping:${assistantId}:${ip}`, 'widget_ping', 30, 60)) {
      await logSecurityEvent({ eventType: 'widget_ping_rate_limited', severity: 'warning', message: 'Widget ping rate limit exceeded.', req })
      return NextResponse.json({ error: 'Demasiados intentos' }, { status: 429, headers: corsHeaders })
    }

    const domainValidation = await validateWidgetDomain({ assistantId, req, pageUrl })
    const { isValid, normalizedDomain } = domainValidation
    if (!isValid) {
      await logSecurityEvent({ eventType: 'widget_domain_blocked', severity: 'warning', message: 'Unauthorized widget ping domain.', req })
      return NextResponse.json({ error: 'Este dominio no está autorizado para usar este asistente.' }, { status: 403, headers: corsHeaders })
    }

    if (!domainValidation.dbDomainId) {
      if (isDev) return NextResponse.json({ success: true, status: 'allowed_dev_no_db_record' }, { headers: corsHeaders })
      return NextResponse.json({ error: 'No se encontró el registro de dominio.' }, { status: 500, headers: corsHeaders })
    }

    const admin = createSupabaseAdmin()
    const userAgent = req.headers.get('user-agent')?.slice(0, 512) || null
    const { data: updatedRows, error: updateError } = await admin.rpc('record_widget_install_event', {
      p_domain_id: domainValidation.dbDomainId,
      p_assistant_id: assistantId,
      p_domain: normalizedDomain,
      p_page_url: pageUrl || null,
      p_user_agent: userAgent,
      p_ip: ip !== 'unknown' ? ip : null,
    })

    if (updateError) {
      if (updateError.code === '42501' && updateError.message === 'widget_domain_not_found') {
        return NextResponse.json({ error: 'No se pudo validar el dominio.' }, { status: 500, headers: corsHeaders })
      }
      throw updateError
    }

    const updatedDomain = Array.isArray(updatedRows) ? updatedRows[0] : updatedRows
    if (!updatedDomain || typeof updatedDomain !== 'object') throw new Error('Invalid widget install RPC response')

    const userId = typeof updatedDomain.user_id === 'string' ? updatedDomain.user_id : null
    const domainId = typeof updatedDomain.id === 'string' ? updatedDomain.id : null
    const installEventsCount = typeof updatedDomain.install_events_count === 'number' ? updatedDomain.install_events_count : null
    if (!userId || !domainId || installEventsCount === null) throw new Error('Invalid widget install RPC response')

    if (installEventsCount === 1) await logAuditEvent({ userId, action: 'widget_installation_detected', description: `El script del widget fue detectado por primera vez en ${normalizedDomain}`, entityType: 'assistant_domains', entityId: domainId, req })

    return NextResponse.json({ success: true, status: 'verified' }, { headers: corsHeaders })
  } catch (error: unknown) {
    console.error('[POST /api/widget/ping] Error:', error instanceof Error ? error.message : 'Unknown error')
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500, headers: corsHeaders })
  }
}
