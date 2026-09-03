import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'

const SAFE_DEFAULT = '/dashboard'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://conversaai.store'

function getSafeNext(value: string | null): string {
  if (!value) return SAFE_DEFAULT
  // Only allow same-origin relative paths. Never trust an absolute URL or protocol-relative URL.
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return SAFE_DEFAULT
  try {
    const parsed = new URL(value, APP_URL)
    if (parsed.origin !== new URL(APP_URL).origin) return SAFE_DEFAULT
    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return SAFE_DEFAULT
  }
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = getSafeNext(requestUrl.searchParams.get('next'))

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
      return NextResponse.redirect(new URL(next, APP_URL))
    }
  }

  return NextResponse.redirect(new URL('/auth/auth-code-error', APP_URL))
}
