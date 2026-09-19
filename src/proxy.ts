import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { isTrustedBrowserMutation } from '@/lib/http-security'

const PRIVATE_MUTATION_PREFIXES = [
  '/api/ai/',
  '/api/assistant/',
  '/api/assistants',
  '/api/auth/',
  '/api/billing/',
  '/api/conversations',
  '/api/leads',
  '/api/notifications',
  '/api/profile',
  '/api/settings',
  '/api/support/',
]

const CROSS_SITE_CALLBACKS = new Set([
  '/api/billing/flow/return',
])

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const isPrivateMutation = PRIVATE_MUTATION_PREFIXES.some(prefix => pathname.startsWith(prefix))
    && !CROSS_SITE_CALLBACKS.has(pathname)

  if (isPrivateMutation && !isTrustedBrowserMutation(request)) {
    return NextResponse.json({ error: 'Origen de solicitud no autorizado.' }, {
      status: 403,
      headers: { 'Cache-Control': 'no-store' },
    })
  }

  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
