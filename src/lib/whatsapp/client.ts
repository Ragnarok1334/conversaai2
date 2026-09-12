import 'server-only'
import { decryptWhatsAppToken } from './crypto'

export interface WhatsAppChannelCredentials {
  phone_number_id: string
  business_account_id: string
  encrypted_access_token?: string | null
}

interface GraphErrorBody {
  error?: { message?: string; code?: number; error_subcode?: number }
}

export class WhatsAppGraphError extends Error {
  constructor(message: string, public readonly code?: number) { super(message) }
}

function graphVersion(): string {
  const value = process.env.WHATSAPP_GRAPH_API_VERSION?.trim()
  if (!value || !/^v\d+\.\d+$/.test(value)) throw new Error('WHATSAPP_GRAPH_API_VERSION no está configurada correctamente.')
  return value
}

function resolveAccessToken(channel: WhatsAppChannelCredentials): string {
  if (channel.encrypted_access_token) return decryptWhatsAppToken(channel.encrypted_access_token)
  const shared = process.env.WHATSAPP_ACCESS_TOKEN?.trim()
  if (!shared) throw new Error('No hay un token de acceso configurado para este canal de WhatsApp.')
  return shared
}

async function graphRequest<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`https://graph.facebook.com/${graphVersion()}/${path.replace(/^\//, '')}`, {
    ...init,
    signal: AbortSignal.timeout(8_000),
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init?.headers || {}) },
    cache: 'no-store',
  })
  const data = await response.json().catch(() => ({})) as T & GraphErrorBody
  if (!response.ok) {
    const safeMessage = data.error?.code ? `Meta rechazó la solicitud (código ${data.error.code}).` : 'Meta rechazó la solicitud.'
    throw new WhatsAppGraphError(safeMessage, data.error?.code)
  }
  return data
}

export async function inspectWhatsAppNumber(phoneNumberId: string, token: string) {
  return graphRequest<{ id: string; display_phone_number?: string; verified_name?: string; quality_rating?: string }>(
    `${phoneNumberId}?fields=id,display_phone_number,verified_name,quality_rating`, token
  )
}

export async function subscribeWhatsAppApp(businessAccountId: string, token: string) {
  return graphRequest<{ success: boolean }>(`${businessAccountId}/subscribed_apps`, token, { method: 'POST', body: '{}' })
}

export async function sendWhatsAppText(
  channel: WhatsAppChannelCredentials,
  recipient: string,
  text: string,
  replyToMessageId?: string
) {
  const token = resolveAccessToken(channel)
  const body: Record<string, unknown> = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: recipient.replace(/\D/g, ''),
    type: 'text',
    text: { preview_url: false, body: text.slice(0, 4096) },
  }
  if (replyToMessageId) body.context = { message_id: replyToMessageId }
  return graphRequest<{ messaging_product: string; contacts?: Array<{ wa_id: string }>; messages: Array<{ id: string }> }>(
    `${channel.phone_number_id}/messages`, token, { method: 'POST', body: JSON.stringify(body) }
  )
}

export function getChannelAccessToken(channel: WhatsAppChannelCredentials): string {
  return resolveAccessToken(channel)
}
