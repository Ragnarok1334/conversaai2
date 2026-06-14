import { NextResponse } from 'next/server'
// The client you created from the Server-Side Auth instructions
import { createClient } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && sessionData?.user) {
      const user = sessionData.user

      // Onboarding para usuarios de OAuth que no tienen profile/subscription
      const admin = createSupabaseAdmin()

      // 1. Check Profile
      const { data: existingProfile } = await admin
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single()

      if (!existingProfile) {
        const metadata = user.user_metadata || {}
        const fullName = metadata.full_name || metadata.name || user.email || 'Usuario'

        await admin.from('profiles').insert({
          id: user.id,
          email: user.email,
          full_name: fullName,
          updated_at: new Date().toISOString()
        })
      }

      // 2. Check Subscription
      const { data: existingSub } = await admin
        .from('subscriptions')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!existingSub) {
        await admin.from('subscriptions').insert({
          user_id: user.id,
          plan: 'free',
          status: 'active',
          current_messages_used: 0
        })
      }

      const forwardedHost = request.headers.get('x-forwarded-host') // original origin before load balancer
      const isLocalhost = process.env.NODE_ENV === 'development'
      if (isLocalhost) {
        // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
