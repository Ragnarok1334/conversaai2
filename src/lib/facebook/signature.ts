import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'

export function verifyFacebookSignature(rawBody: string, header: string | null): boolean {
  const secret = (process.env.META_APP_SECRET || process.env.WHATSAPP_APP_SECRET)?.trim()
  if (!secret || !header?.startsWith('sha256=')) return false
  const expected = Buffer.from(`sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`)
  const actual = Buffer.from(header)
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}
