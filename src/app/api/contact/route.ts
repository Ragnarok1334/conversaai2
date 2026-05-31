import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, email, company, phone, subject, message } = body

    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios' },
        { status: 400 }
      )
    }

    if (message.length < 10) {
      return NextResponse.json(
        { error: 'El mensaje debe tener al menos 10 caracteres' },
        { status: 400 }
      )
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const CONTACT_TO_EMAIL = process.env.CONTACT_TO_EMAIL || 'contacto@conversaai.store';
    const CONTACT_FROM_EMAIL = process.env.CONTACT_FROM_EMAIL || 'ConversaAI <noreply@conversaai.store>';

    if (!RESEND_API_KEY) {
      console.warn("RESEND_API_KEY no está configurado. Simulando envío de correo.");
      return NextResponse.json({ success: true, message: "Mensaje enviado (Simulado)." })
    }

    const htmlContent = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #7C3AED;">Nuevo mensaje desde ConversaAI</h2>
        <p><strong>Nombre:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Empresa:</strong> ${company || 'No especificada'}</p>
        <p><strong>Teléfono:</strong> ${phone || 'No especificado'}</p>
        <p><strong>Asunto:</strong> ${subject}</p>
        <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #06B6D4; margin: 20px 0;">
          <p style="margin: 0;"><strong>Mensaje:</strong></p>
          <p style="margin-top: 10px;">${message.replace(/\n/g, '<br>')}</p>
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
        subject: `Nuevo mensaje desde ConversaAI: ${subject}`,
        html: htmlContent,
        reply_to: email,
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    console.error('API Contact Error:', err)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
