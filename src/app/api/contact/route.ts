import { NextResponse } from 'next/server'
import { escapeHtml, checkRateLimit } from '@/lib/security'
import { logSecurityEvent } from '@/lib/audit'

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || 'unknown'
    
    // Rate limit: 5 envíos por 10 minutos
    const rlKey = `contact-${ip}`
    const isAllowed = await checkRateLimit(rlKey, 'contact', 5, 600)
    if (!isAllowed) {
      await logSecurityEvent({ eventType: 'contact_rate_limited', severity: 'warning', message: 'Rate limit excedido para contacto', ip_address: ip, req })
      return NextResponse.json({ error: 'Demasiados intentos. Intenta nuevamente en unos minutos.' }, { status: 429 })
    }

    const body = await req.json()
    const { name, email, company, phone, subject, message, website } = body

    // Honeypot check (hidden field in frontend)
    if (website) {
      await logSecurityEvent({ eventType: 'suspicious_input', severity: 'critical', message: 'Honeypot llenado en contact', ip_address: ip, req })
      // If a bot fills this, reject silently to confuse it
      return NextResponse.json({ success: true, message: "Mensaje enviado correctamente." })
    }

    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios' },
        { status: 400 }
      )
    }

    if (message.length < 10 || message.length > 3000) {
      return NextResponse.json(
        { error: 'El mensaje debe tener entre 10 y 3000 caracteres' },
        { status: 400 }
      )
    }

    if (name.length > 120 || subject.length > 160) {
      return NextResponse.json(
        { error: 'Nombre o asunto demasiado largo' },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email) || email.length > 180) {
      return NextResponse.json(
        { error: 'El correo electrónico no es válido' },
        { status: 400 }
      )
    }

    // Escape inputs
    const safeName = escapeHtml(name)
    const safeEmail = escapeHtml(email)
    const safeCompany = escapeHtml(company?.substring(0, 120) || '')
    const safePhone = escapeHtml(phone?.substring(0, 40) || '')
    const safeSubject = escapeHtml(subject)
    const safeMessage = escapeHtml(message)

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const CONTACT_TO_EMAIL = process.env.CONTACT_TO_EMAIL || 'soporte@conversaai.store';
    const CONTACT_FROM_EMAIL = process.env.CONTACT_FROM_EMAIL || 'ConversaAI <noreply@conversaai.store>';

    if (!RESEND_API_KEY) {
      console.warn("RESEND_API_KEY no está configurado. Simulando envío de correo.");
      return NextResponse.json({ success: true, message: "Mensaje enviado (Simulado)." })
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
    `;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: CONTACT_FROM_EMAIL,
        to: CONTACT_TO_EMAIL,
        subject: `Nuevo mensaje desde ConversaAI: ${safeSubject}`,
        html: htmlContent,
        reply_to: safeEmail,
      })
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      console.error('Resend error:', resendData);
      return NextResponse.json(
        { error: 'No se pudo enviar el mensaje.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, message: "Mensaje enviado correctamente." })

  } catch (err) {
    console.error('API Contact Error:', err)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
