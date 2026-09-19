import 'server-only'
import { decryptFacebookToken } from './crypto'

type Credentials = { page_id: string; encrypted_page_access_token: string }
type GraphError = {
  error?: {
    code?: number
    error_subcode?: number
    type?: string
    message?: string
    fbtrace_id?: string
  }
}

function safeGraphMessage(message?: string) {
  if (!message) return undefined
  return message
    .replace(/access_token=[^\s&]+/gi, 'access_token=[REDACTED]')
    .replace(/\bEAA[A-Za-z0-9_-]{12,}\b/g, '[REDACTED]')
    .slice(0, 240)
}

export class FacebookGraphError extends Error {
  constructor(
    public readonly code?: number,
    message?: string,
    public readonly subcode?: number,
    public readonly graphType?: string,
    public readonly traceId?: string,
  ) {
    super(safeGraphMessage(message) || (code ? `Meta rechazó la solicitud (código ${code}).` : 'Meta rechazó la solicitud.'))
    this.name = 'FacebookGraphError'
  }
}

function version() {
  const value = (process.env.META_GRAPH_API_VERSION || process.env.WHATSAPP_GRAPH_API_VERSION)?.trim()
  if (!value || !/^v\d+\.\d+$/.test(value)) throw new Error('META_GRAPH_API_VERSION no está configurada correctamente.')
  return value
}

async function graph<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`https://graph.facebook.com/${version()}/${path.replace(/^\//, '')}`, {
    ...init,
    cache: 'no-store',
    signal: AbortSignal.timeout(8_000),
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init?.headers || {}) },
  })

  const data = await response.json().catch(() => ({})) as T & GraphError

  if (!response.ok) {
    throw new FacebookGraphError(
      data.error?.code,
      data.error?.message,
      data.error?.error_subcode,
      data.error?.type,
      data.error?.fbtrace_id,
    )
  }

  return data
}

export async function inspectFacebookPage(pageId: string, token: string) {
  return graph<{ id: string; name?: string }>(`${pageId}?fields=id,name`, token)
}

export async function subscribeFacebookPage(pageId: string, token: string) {
  const result = await graph<{ success: boolean }>(`${pageId}/subscribed_apps?subscribed_fields=messages,messaging_postbacks,message_reads,message_deliveries`, token, { method: 'POST', body: '{}' })
  if (result.success !== true) throw new Error('Meta no confirmó la suscripción de la página.')
  return result
}

export async function sendFacebookText(channel: Credentials, recipientId: string, text: string) {
  const token = decryptFacebookToken(channel.encrypted_page_access_token)

  const result = await graph<{ recipient_id?: string; message_id?: string }>(`${channel.page_id}/messages`, token, {
    method: 'POST',
    body: JSON.stringify({ recipient: { id: recipientId }, messaging_type: 'RESPONSE', message: { text: text.slice(0, 2000) } }),
  })

  if (!result.message_id) {
    throw new FacebookGraphError(undefined, 'Meta aceptó la solicitud pero no devolvió message_id.')
  }

  return result
}
