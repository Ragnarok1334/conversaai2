import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getClientIp } from '@/lib/http-security'
import { checkRateLimit } from '@/lib/security'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const ip = getClientIp(req)
    const allowed = await checkRateLimit(`authenticated-reset-${user.id}-${ip}`, 'authenticated-reset-password', 3, 900)
    if (!allowed) {
      return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta nuevamente en 15 minutos.' }, { status: 429 })
    }

    const siteUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      'http://localhost:3000'

    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
    })

    if (error) return NextResponse.json({ error: 'No pudimos enviar el enlace. Intenta nuevamente.' }, { status: 400 })

    return NextResponse.json({
      success: true,
      message: 'Te enviamos un enlace para cambiar tu contraseña. Revisa tu correo.',
    })
  } catch (err) {
    console.error('[POST /api/auth/reset-password]', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
