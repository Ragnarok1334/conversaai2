import { NextResponse } from 'next/server'
import { escapeHtml, checkRateLimit } from '@/lib/security'
import { logSecurityEvent } from '@/lib/audit'

const MAX_BODY_BYTES = 16 * 1024
const MAX_NAME_LENGTH = 120
const MAX_EMAIL_LENGTH = 180
const MAX_COMPANY_LENGTH = 120
const MAX_PHONE_LENGTH = 40
const MAX_SUBJECT_LENGTH = 160
const MAX_MESSAGE_LENGTH = 3000

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown'

    const contentLength = req.headers.get('content-length')
    if (contentLength && Number.isFinite(Number(contentLength)) && Number(contentLength) > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Solicitud demasiado grande' }, { status: 413 })
    }

    const rlKey = `contact-${ip}`
    const isAllowed = await checkRateLimit(rlKey, 'contact', 5, 600)
    if (!isAllowed) {
      await logSecurityEvent({ eventType: 'contact_rate_limited', severity: 'warning', message: 'Rate limit excedido para contacto', ip_address: ip, req })
      return NextResponse.json({ error: 'Demasiados intentos. Intenta nuevamente en unos minutos.' }, { status: 429 })
    }

    const rawBody = await req.text()
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Solicitud demasiado grande' }, { status: 413 })
    }

    let body: unknown
    try {
      body = JSON.parse(rawBody)
    } catch {
      return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 })
    }

    const payload = body as Record<string, unknown>
    const { name, email, company, phone, subject, message, website } = payload

    if (website) {
      await logSecurityEvent({ eventType: 'suspicious_input', severity: 'critical', message: 'Honeypot llenado en contact', ip_address: ip, req })
      return NextResponse.json({ success: true, message: 'Mensaje enviado correctamente.' })
    }

    if (!isString(name) || !isString(email) || !isString(subject) || !isString(message)) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
    }

    const normalizedName = name.trim()
    const normalizedEmail = email.trim().toLowerCase()
    const normalizedSubject = subject.trim()
    const normalizedMessage = message.trim()

    if (!normalizedName || !normalizedEmail || !normalizedSubject || !normalizedMessage) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
    }

    if (normalizedMessage.length < 10 || normalizedMessage.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ error: 'El mensaje debe tener entre 10 y 3000 caracteres' }, { status: 400 })
    }

    if (normalizedName.length > MAX_NAME_LENGTH || normalizedSubject.length > MAX_SUBJECT_LENGTH) {
      return NextResponse.json({ error: 'Nombre o asunto demasiado largo' }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(normalizedEmail) || normalizedEmail.length > MAX_EMAIL_LENGTH) {
      return NextResponse.json({ error: 'El correo electrónico no es válido' }, { status: 400 })
    }

    if (company !== undefined && !isString(company)) {
      return NextResponse.json({ error: 'Empresa inválida' }, { status: 400 })
    }
    if (phone !== undefined && !isString(phone)) {
      return NextResponse.json({ error: 'Teléfono inválido' }, { status: 400 })
    }

    const normalizedCompany = isString(company) ? company.trim().slice(0, MAX_COMPANY_LENGTH) : ''
    const normalizedPhone = isString(phone) ? phone.trim().slice(0, MAX_PHONE_LENGTH) : ''

    const safeName = escapeHtml(normalizedName)
    const safeEmail = escapeHtml(normalizedEmail)
    const safeCompany = escapeHtml(normalizedCompany)
    const safePhone = escapeHtml(normalizedPhone)
    const safeSubject = escapeHtml(normalizedSubject)
    const safeMessage = escapeHtml(normalizedMessage)

    const RESEND_API_KEY = process.env.RESEND_API_KEY
    const CONTACT_TO_EMAIL = process.env.CONTACT_TO_EMAIL || 'soporte@conversaai.store'
    const CONTACT_FROM_EMAIL = process.env.CONTACT_FROM_EMAIL || 'ConversaAI <noreply@conversaai.store>'

    if (!RESEND_API_KEY) {
      console.warn('RESEND_API_KEY no está configurado. Simulando envío de correo.')
      return NextResponse.json({ success: true, message: 'Mensaje enviado (Simulado).' })
    }

    const htmlContent = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #7C3AED;">Nuevo mensaje desde ConversaAI</h2>
        <p><strong>Nombre:</strong> ${safeName}</p>
        <p><strong>Email:</strong> ${safeEmail}</p>
        <p><strong>Empresa:</strong> ${safeCompany || 'No especificada'}</p>
        <p><strong>Teléfono:</strong> ${safePhone || 'No especificado'}</p>
        <p><strong>Asunto:</strong> ${safeSubject}</p>
        <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #06B6D4; margin: 20px 0;">
          <p style="margin: 0;"><strong>Mensaje:</strong></p>
          <p style="margin-top: 10px;">${safeMessage.replace(/\n/g, '<br>')}</p>
        </div>
        <p style="font-size: 12px; color: #888;">
          <em>Fecha: ${new Date().toLocaleString()}</em><br>
          <em>Origen: Página de contacto</em>
        </p>
      </div>
    `

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: CONTACT_FROM_EMAIL,
        to: CONTACT_TO_EMAIL,
        subject: `Nuevo mensaje desde ConversaAI: ${safeSubject}`,
        html: htmlContent,
        reply_to: normalizedEmail,
      }),
    })

    const resendData = await resendRes.json()

    if (!resendRes.ok) {
      console.error('Resend error:', resendData)
      return NextResponse.json({ error: 'No se pudo enviar el mensaje.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Mensaje enviado correctamente.' })
  } catch (err) {
    console.error('API Contact Error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
