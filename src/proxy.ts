import { NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

// These endpoints are intentionally callable cross-origin by browsers or external
// providers. They have their own authentication/CORS/rate-limit controls.
const CROSS_ORIGIN_ENDPOINTS = [
  '/api/widget/message',
  '/api/widget/ping',
  '/api/contact',
  '/api/telegram/webhook',
  '/api/webhooks/flow',
]

function createNonce() {
  return Buffer.from(crypto.randomUUID()).toString('base64')
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

function isExplicitlyCrossOriginEndpoint(pathname: string) {
  return CROSS_ORIGIN_ENDPOINTS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  )
}

function getConfiguredOrigin() {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!configuredUrl) return null

  try {
    return new URL(configuredUrl).origin
  } catch {
    return null
  }
}

function isSameOriginRequest(request: NextRequest) {
  const configuredOrigin = getConfiguredOrigin()
  if (!configuredOrigin) return false

  const origin = request.headers.get('origin')
  if (origin) return origin === configuredOrigin

  const referer = request.headers.get('referer')
  if (referer) {
    try {
      return new URL(referer).origin === configuredOrigin
    } catch {
      return false
    }
  }

  return null
}

function isCsrfProtectedRequest(request: NextRequest) {
  if (SAFE_METHODS.has(request.method)) return false
  if (isExplicitlyCrossOriginEndpoint(request.nextUrl.pathname)) return false

  const fetchSite = request.headers.get('sec-fetch-site')
  if (fetchSite === 'cross-site' || fetchSite === 'same-site') return true

  const sameOrigin = isSameOriginRequest(request)
  return sameOrigin === false
}

export async function proxy(request: NextRequest) {
  if (isCsrfProtectedRequest(request)) {
    return NextResponse.json(
      { error: 'Cross-origin request blocked' },
      { status: 403 },
    )
  }

  const nonce = createNonce()
  const contentSecurityPolicy = buildContentSecurityPolicy(nonce)
  const requestHeaders = new Headers(request.headers)

  // Next.js reads these request headers during rendering so it can attach the
  // nonce to framework-generated scripts, styles, and inline payloads.
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', contentSecurityPolicy)

  const response = await updateSession(
    new NextRequest(request, {
      headers: requestHeaders,
    }),
  )

  response.headers.set('Content-Security-Policy', contentSecurityPolicy)

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
