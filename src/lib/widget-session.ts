import 'server-only'

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

const SESSION_VERSION = 1
const SESSION_TTL_SECONDS = 24 * 60 * 60

interface WidgetSessionPayload {
  v: number
  assistantId: string
  visitorId: string
  domain: string
  exp: number
}

function getSessionSecret(): string {
  const secret = process.env.WIDGET_SESSION_SECRET?.trim()
  if (!secret || secret.length < 32) {
    throw new Error('WIDGET_SESSION_SECRET must contain at least 32 characters')
  }
  return secret
}

function sign(encodedPayload: string): string {
  return createHmac('sha256', getSessionSecret()).update(encodedPayload).digest('base64url')
}

function isPayload(value: unknown): value is WidgetSessionPayload {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const payload = value as Partial<WidgetSessionPayload>
  return payload.v === SESSION_VERSION
    && typeof payload.assistantId === 'string'
    && typeof payload.visitorId === 'string'
    && typeof payload.domain === 'string'
    && typeof payload.exp === 'number'
}

export function createWidgetSession(assistantId: string, domain: string) {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS
  const payload: WidgetSessionPayload = {
    v: SESSION_VERSION,
    assistantId,
    visitorId: `vis_${randomBytes(24).toString('base64url')}`,
    domain,
    exp: expiresAt,
  }
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return {
    token: `${encodedPayload}.${sign(encodedPayload)}`,
    visitorId: payload.visitorId,
    expiresAt,
  }
}

export function verifyWidgetSession(
  token: string | null,
  assistantId: string,
  domain: string,
): WidgetSessionPayload | null {
  if (!token || token.length > 2048) return null
  const parts = token.split('.')
  if (parts.length !== 2) return null

  const [encodedPayload, receivedSignature] = parts
  const expectedSignature = sign(encodedPayload)
  const expectedBuffer = Buffer.from(expectedSignature)
  const receivedBuffer = Buffer.from(receivedSignature)
  if (expectedBuffer.length !== receivedBuffer.length || !timingSafeEqual(expectedBuffer, receivedBuffer)) {
    return null
  }

  try {
    const payload: unknown = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'))
    if (!isPayload(payload)) return null
    if (payload.assistantId !== assistantId || payload.domain !== domain) return null
    if (payload.exp <= Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}
