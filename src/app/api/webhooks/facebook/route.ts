import { after, NextRequest, NextResponse } from 'next/server'
import { secretsMatch } from '@/lib/http-security'
import { verifyFacebookSignature } from '@/lib/facebook/signature'
import { processFacebookWebhook, type FacebookWebhookPayload } from '@/lib/facebook/runtime'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams
  if (query.get('hub.mode') === 'subscribe' && query.get('hub.challenge') && secretsMatch(query.get('hub.verify_token'), process.env.FACEBOOK_VERIFY_TOKEN)) {
    return new NextResponse(query.get('hub.challenge'), { headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' } })
  }
  return new NextResponse('Forbidden', { status: 403 })
}

export async function POST(request: NextRequest) {
  const length = Number(request.headers.get('content-length') || 0)
  if (Number.isFinite(length) && length > 1_000_000) return new NextResponse('Payload too large', { status: 413 })
  const rawBody = await request.text()
  if (Buffer.byteLength(rawBody) > 1_000_000) return new NextResponse('Payload too large', { status: 413 })
  if (!verifyFacebookSignature(rawBody, request.headers.get('x-hub-signature-256'))) return new NextResponse('Invalid signature', { status: 401 })
  let payload: FacebookWebhookPayload
  try { payload = JSON.parse(rawBody) as FacebookWebhookPayload }
  catch { return new NextResponse('Invalid JSON', { status: 400 }) }
  after(async () => { try { await processFacebookWebhook(payload, rawBody) } catch (error) { console.error('[Facebook webhook]', error instanceof Error ? error.message : 'unknown') } })
  return new NextResponse('EVENT_RECEIVED')
}
