import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/security'
import { logSecurityEvent } from '@/lib/audit'

const SAFE_DEFAULT = '/dashboard'

function getConfiguredAppUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL
  if (!raw) return null
  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:' || !url.hostname) return null
    return url.origin
  } catch {
    return null
  }
}

function getSafeNext(value: string | null, appUrl: string): string {
  if (!value) return SAFE_DEFAULT
  // Only allow same-origin relative paths. Never trust an absolute URL or protocol-relative URL.
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return SAFE_DEFAULT
  try {
    const parsed = new URL(value, appUrl)
    if (parsed.origin !== new URL(appUrl).origin) return SAFE_DEFAULT
    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return SAFE_DEFAULT
  }
}

function getClientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip')?.trim() ||
    'unknown-ip'
}

export async function GET(request: Request) {
  const appUrl = getConfiguredAppUrl()
  if (!appUrl) {
    console.error('[GET /auth/callback] authentication app URL is not configured correctly')
    return NextResponse.json({ error: 'Authentication is temporarily unavailable.' }, { status: 503 })
  }

  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = getSafeNext(requestUrl.searchParams.get('next'), appUrl)
  const ip = getClientIp(request)

  const isAllowed = await checkRateLimit(`auth-callback-${ip}`, 'auth-callback', 20, 60)
  if (!isAllowed) {
    await logSecurityEvent({
      eventType: 'auth_callback_rate_limited',
      severity: 'warning',
      message: 'Rate limit de callback de autenticación excedido',
      ip_address: ip,
    })
    return NextResponse.json({ error: 'Too many authentication attempts.' }, { status: 429 })
  }

  if (code) {
    const supabase = await createClient()
    const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && sessionData?.user) {
      const user = sessionData.user
      const admin = createSupabaseAdmin()

      const { data: existingProfile, error: profileLookupError } = await admin
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle()

      if (profileLookupError) {
        console.error('[GET /auth/callback] profile lookup failed:', profileLookupError.message)
      }

      if (!existingProfile) {
        const metadata = user.user_metadata || {}
        const fullName = String(metadata.full_name || metadata.name || user.email || 'Usuario').slice(0, 120)

        const { error: profileInsertError } = await admin.from('profiles').insert({
          id: user.id,
          full_name: fullName,
          updated_at: new Date().toISOString()
        })

        if (profileInsertError) {
          console.error('[GET /auth/callback] profile creation failed:', profileInsertError.message)
        }
      }

      const { data: existingSub, error: subLookupError } = await admin
        .from('subscriptions')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (subLookupError) {
        console.error('[GET /auth/callback] subscription lookup failed:', subLookupError.message)
      }

      if (!existingSub) {
        const { error: subInsertError } = await admin.from('subscriptions').insert({
          user_id: user.id,
          plan: 'free',
          status: 'active',
          current_messages_used: 0
        })

        if (subInsertError) {
          console.error('[GET /auth/callback] subscription creation failed:', subInsertError.message)
        }
      }

      // Redirect only to the configured application origin. Do not trust forwarded host headers.
      return NextResponse.redirect(new URL(next, appUrl))
    }
  }

  return NextResponse.redirect(new URL('/auth/auth-code-error', appUrl))
}
