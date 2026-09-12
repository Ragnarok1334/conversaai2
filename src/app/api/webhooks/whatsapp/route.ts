import { after, NextRequest, NextResponse } from 'next/server'
import { secretsMatch } from '@/lib/http-security'
import { verifyWhatsAppSignature } from '@/lib/whatsapp/signature'
import { processWhatsAppWebhook, type WhatsAppWebhookPayload } from '@/lib/whatsapp/runtime'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get('hub.mode')
  const token = request.nextUrl.searchParams.get('hub.verify_token')
  const challenge = request.nextUrl.searchParams.get('hub.challenge')
  if (mode === 'subscribe' && challenge && secretsMatch(token, process.env.WHATSAPP_VERIFY_TOKEN)) {
    return new NextResponse(challenge, { status: 200, headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' } })
  }
  return new NextResponse('Forbidden', { status: 403 })
}

export async function POST(request: NextRequest) {
  const length = Number(request.headers.get('content-length') || 0)
  if (Number.isFinite(length) && length > 1_000_000) return new NextResponse('Payload too large', { status: 413 })
  const rawBody = await request.text()
  if (Buffer.byteLength(rawBody, 'utf8') > 1_000_000) return new NextResponse('Payload too large', { status: 413 })
  if (!verifyWhatsAppSignature(rawBody, request.headers.get('x-hub-signature-256'))) {
    return new NextResponse('Invalid signature', { status: 401 })
  }
  let payload: WhatsAppWebhookPayload
  try { payload = JSON.parse(rawBody) as WhatsAppWebhookPayload }
  catch { return new NextResponse('Invalid JSON', { status: 400 }) }
  after(async () => {
    try {
      await processWhatsAppWebhook(payload, rawBody)
    } catch (error) {
      console.error('[WhatsApp webhook]', error instanceof Error ? error.message : 'unknown')
    }
  })
  return new NextResponse('EVENT_RECEIVED', { status: 200 })
}
