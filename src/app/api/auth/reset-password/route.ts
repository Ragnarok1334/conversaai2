import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const MAX_BODY_BYTES = 4 * 1024

export async function POST(req: NextRequest) {
  try {
    const contentLength = Number(req.headers.get('content-length') || '0')
    if (contentLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Solicitud demasiado grande' }, { status: 413 })
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const siteUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL
    if (!siteUrl) {
      console.error('[POST /api/auth/reset-password] application URL is not configured')
      return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 })
    }

    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
    })

    if (error) {
      console.error('[POST /api/auth/reset-password] reset request failed:', error.message)
      return NextResponse.json({ error: 'No se pudo solicitar el cambio de contraseña. Intenta nuevamente.' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: 'Te enviamos un enlace para cambiar tu contraseña. Revisa tu correo.',
    })
  } catch (err) {
    console.error('[POST /api/auth/reset-password] unexpected error:', err instanceof Error ? err.message : 'unknown error')
    return NextResponse.json({ error: 'No se pudo procesar la solicitud' }, { status: 500 })
  }
}
