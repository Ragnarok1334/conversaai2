import { NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

function createNonce() {
  return btoa(crypto.randomUUID())
}

function buildContentSecurityPolicy(nonce: string) {
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'nonce-${nonce}'`,
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self' https://btekstwmmxsoemsobjlg.supabase.co wss://btekstwmmxsoemsobjlg.supabase.co",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    "manifest-src 'self'",
    "worker-src 'self' blob:",
    "media-src 'none'",
    "child-src 'none'",
  ]

  if (process.env.NODE_ENV === 'production') {
    directives.push('upgrade-insecure-requests')
  }

  return directives.join('; ')
}

export async function proxy(request: NextRequest) {
  const nonce = createNonce()
  const requestHeaders = new Headers(request.headers)

  // Next.js uses this request header to attach the nonce to its generated
  // scripts/styles, allowing us to avoid unsafe-inline in the CSP.
  requestHeaders.set('x-nonce', nonce)

  const response = await updateSession(
    new NextRequest(request, {
      headers: requestHeaders,
    }),
  )

  response.headers.set('Content-Security-Policy', buildContentSecurityPolicy(nonce))

  return response
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
