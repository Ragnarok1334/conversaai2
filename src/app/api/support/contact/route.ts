import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { escapeHtml, checkRateLimit } from '@/lib/security'
import { logSecurityEvent } from '@/lib/audit'

const MAX_BODY_BYTES = 16 * 1024
const MAX_MOTIVO = 160
const MAX_PRIORIDAD = 32
const MAX_MENSAJE = 5000
const MAX_CONTEXT = 8000

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asBoundedString(value: unknown, max: number): string | null {
  if (typeof value !== 'string' || value.length > max) return null
  return value.trim()
}

export async function POST(req: NextRequest) {
  try {
    const contentLength = req.headers.get('content-length')
    if (contentLength && Number(contentLength) > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Solicitud demasiado grande' }, { status: 413 })
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const ip = (req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown').slice(0, 128)
    const rlKey = `support-${user.id}-${ip}`
    const isAllowed = await checkRateLimit(rlKey, 'support_contact', 5, 600)
    if (!isAllowed) {
      await logSecurityEvent({ eventType: 'contact_rate_limited', severity: 'warning', message: 'Rate limit excedido en soporte', userId: user.id, ip_address: ip, req })
      return NextResponse.json({ error: 'Demasiados intentos. Intenta nuevamente en unos minutos.' }, { status: 429 })
    }

    const contentType = req.headers.get('content-type') || ''
    if (!contentType.toLowerCase().includes('application/json')) {
      return NextResponse.json({ error: 'Content-Type no permitido' }, { status: 415 })
    }

    const rawBody = await req.arrayBuffer()
    if (rawBody.byteLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Solicitud demasiado grande' }, { status: 413 })
    }

    let body: unknown
    try {
      body = JSON.parse(new TextDecoder().decode(rawBody))
    } catch {
      return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
    }

    if (!isPlainObject(body)) {
      return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 })
    }

    const motivo = asBoundedString(body.motivo, MAX_MOTIVO)
    const prioridad = asBoundedString(body.prioridad, MAX_PRIORIDAD)
    const mensaje = asBoundedString(body.mensaje, MAX_MENSAJE)
    const contextoTecnico = asBoundedString(body.contexto_tecnico, MAX_CONTEXT) || 'Sin contexto técnico'
    const website = asBoundedString(body.website, 128)

    if (website) {
      await logSecurityEvent({ eventType: 'suspicious_input', severity: 'critical', message: 'Honeypot llenado en support', userId: user.id, ip_address: ip, req })
      return NextResponse.json({ success: true, message: 'Mensaje enviado correctamente.' })
    }

    if (!motivo || !prioridad || !mensaje) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
    }

    if (mensaje.length < 10) {
      return NextResponse.json({ error: 'El mensaje debe tener al menos 10 caracteres' }, { status: 400 })
    }

    const allowedPriorities = new Set(['Baja', 'Media', 'Alta', 'Urgente'])
    if (!allowedPriorities.has(prioridad)) {
      return NextResponse.json({ error: 'Prioridad inválida' }, { status: 400 })
    }

    const safeMotivo = escapeHtml(motivo)
    const safePrioridad = escapeHtml(prioridad)
    const safeMensaje = escapeHtml(mensaje)
    const safeFrontendContexto = escapeHtml(contextoTecnico)

    const { data: subData } = await supabase
      .from('subscriptions')
      .select('plan, status')
      .eq('user_id', user.id)
      .maybeSingle()

    const { count: assistCount } = await supabase
      .from('assistants')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)

    const secureContext = `=== SERVER CONTEXT ===
ID: ${user.id}
Email: ${user.email || 'No disponible'}
Plan: ${subData?.plan || 'Ninguno'} (Estado: ${subData?.status || 'N/A'})
Asistentes: ${assistCount || 0}
======================

=== FRONTEND CONTEXT ===
${safeFrontendContexto}
======================`

    const RESEND_API_KEY = process.env.RESEND_API_KEY
    const CONTACT_TO_EMAIL = process.env.CONTACT_TO_EMAIL || 'soporte@conversaai.store'
    const CONTACT_FROM_EMAIL = process.env.CONTACT_FROM_EMAIL || 'ConversaAI Support <noreply@conversaai.store>'

    if (!RESEND_API_KEY) {
      console.error('[POST /api/support/contact] Email service is not configured')
      return NextResponse.json({ error: 'El servicio de soporte no está disponible temporalmente.' }, { status: 503 })
    }

    const htmlContent = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #06B6D4;">Ticket de Soporte - ${safePrioridad}</h2>
        <p><strong>Usuario:</strong> ${escapeHtml(user.email || 'No disponible')}</p>
        <p><strong>Motivo:</strong> ${safeMotivo}</p>
        <p><strong>Prioridad:</strong> <span style="color: ${prioridad === 'Alta' || prioridad === 'Urgente' ? 'red' : 'inherit'}">${safePrioridad}</span></p>
        <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #06B6D4; margin: 20px 0;">
          <p style="margin: 0;"><strong>Mensaje del cliente:</strong></p>
          <p style="margin-top: 10px;">${safeMensaje.replace(/\n/g, '<br>')}</p>
        </div>
        <div style="background-color: #2b2b2b; color: #10B981; padding: 15px; border-radius: 5px; font-family: monospace; font-size: 12px; margin: 20px 0; overflow-x: auto;">
          <p style="margin: 0; color: #fff;"><strong>Contexto de Sistema y Técnico:</strong></p>
          <pre style="margin-top: 10px; white-space: pre-wrap;">${secureContext}</pre>
        </div>
        <p style="font-size: 12px; color: #888;"><em>Fecha: ${new Date().toISOString()}</em><br><em>Origen: /dashboard/support</em></p>
      </div>
    `

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: CONTACT_FROM_EMAIL,
        to: CONTACT_TO_EMAIL,
        subject: `[${safePrioridad}] ${safeMotivo} - ${user.email || 'Usuario'}`,
        html: htmlContent,
        reply_to: user.email,
      }),
      signal: AbortSignal.timeout(10_000),
    })

    if (!resendRes.ok) {
      console.error('[POST /api/support/contact] Email provider rejected request', { status: resendRes.status })
      return NextResponse.json({ error: 'No se pudo enviar la solicitud. Intenta más tarde.' }, { status: 502 })
    }

    return NextResponse.json({ success: true, message: 'Mensaje de soporte enviado correctamente.' })
  } catch (err) {
    console.error('[POST /api/support/contact] Request failed', err instanceof Error ? err.message : 'unknown error')
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
