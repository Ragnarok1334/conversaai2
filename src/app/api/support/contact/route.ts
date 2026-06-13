import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { escapeHtml, checkRateLimit } from '@/lib/security'
import { logSecurityEvent } from '@/lib/audit'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || 'unknown'
    
    // Rate limit: 5 envíos por 10 minutos
    const rlKey = `support-${user.id}-${ip}`
    const isAllowed = await checkRateLimit(rlKey, 'support_contact', 5, 600)
    if (!isAllowed) {
      await logSecurityEvent({ eventType: 'contact_rate_limited', severity: 'warning', message: 'Rate limit excedido en soporte', userId: user.id, ip_address: ip, req })
      return NextResponse.json({ error: 'Demasiados intentos. Intenta nuevamente en unos minutos.' }, { status: 429 })
    }

    const body = await req.json()
    const { motivo, prioridad, mensaje, contexto_tecnico, website } = body

    // Honeypot check
    if (website) {
      await logSecurityEvent({ eventType: 'suspicious_input', severity: 'critical', message: 'Honeypot llenado en support', userId: user.id, ip_address: ip, req })
      return NextResponse.json({ success: true, message: "Mensaje enviado correctamente." })
    }

    if (!motivo || !prioridad || !mensaje) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
    }

    if (mensaje.length < 10 || mensaje.length > 5000) {
      return NextResponse.json({ error: 'El mensaje debe tener entre 10 y 5000 caracteres' }, { status: 400 })
    }

    // Escape inputs
    const safeMotivo = escapeHtml(motivo)
    const safePrioridad = escapeHtml(prioridad)
    const safeMensaje = escapeHtml(mensaje)
    const safeContexto = escapeHtml(contexto_tecnico || 'Sin contexto técnico')

    const RESEND_API_KEY = process.env.RESEND_API_KEY
    const CONTACT_TO_EMAIL = process.env.CONTACT_TO_EMAIL || 'soporte@conversaai.store'
    const CONTACT_FROM_EMAIL = process.env.CONTACT_FROM_EMAIL || 'ConversaAI Support <noreply@conversaai.store>'

    if (!RESEND_API_KEY) {
      console.warn("RESEND_API_KEY no está configurado. Simulando envío de correo de soporte.");
      return NextResponse.json({ success: true, message: "Mensaje enviado (Simulado)." })
    }

    const htmlContent = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #06B6D4;">Ticket de Soporte - ${safePrioridad}</h2>
        <p><strong>Usuario:</strong> ${user.email}</p>
        <p><strong>Motivo:</strong> ${safeMotivo}</p>
        <p><strong>Prioridad:</strong> <span style="color: ${prioridad === 'Alta' ? 'red' : 'inherit'}">${safePrioridad}</span></p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #06B6D4; margin: 20px 0;">
          <p style="margin: 0;"><strong>Mensaje del cliente:</strong></p>
          <p style="margin-top: 10px;">${safeMensaje.replace(/\n/g, '<br>')}</p>
        </div>

        <div style="background-color: #2b2b2b; color: #10B981; padding: 15px; border-radius: 5px; font-family: monospace; font-size: 12px; margin: 20px 0; overflow-x: auto;">
          <p style="margin: 0; color: #fff;"><strong>Contexto Técnico:</strong></p>
          <pre style="margin-top: 10px; white-space: pre-wrap;">${safeContexto}</pre>
        </div>
        
        <p style="font-size: 12px; color: #888;">
          <em>Fecha: ${new Date().toLocaleString()}</em><br>
          <em>Origen: /dashboard/support</em>
        </p>
      </div>
    `

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: CONTACT_FROM_EMAIL,
        to: CONTACT_TO_EMAIL,
        subject: `[${safePrioridad}] ${safeMotivo} - ${user.email}`,
        html: htmlContent,
        reply_to: user.email,
      })
    })

    if (!resendRes.ok) {
      const resendData = await resendRes.json()
      console.error('Resend error in support API:', resendData)
      return NextResponse.json({ error: 'No se pudo enviar la solicitud. Intenta más tarde.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Mensaje de soporte enviado correctamente." })

  } catch (err) {
    console.error('[POST /api/support/contact] Error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
