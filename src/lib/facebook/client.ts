import 'server-only'
import { decryptFacebookToken } from './crypto'

type Credentials = { page_id: string; encrypted_page_access_token: string }
type GraphError = { error?: { code?: number } }

function version() {
  const value = (process.env.META_GRAPH_API_VERSION || process.env.WHATSAPP_GRAPH_API_VERSION)?.trim()
  if (!value || !/^v\d+\.\d+$/.test(value)) throw new Error('META_GRAPH_API_VERSION no está configurada correctamente.')
  return value
}

async function graph<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`https://graph.facebook.com/${version()}/${path.replace(/^\//, '')}`, {
    ...init, cache: 'no-store', signal: AbortSignal.timeout(8_000),
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init?.headers || {}) },
  })
  const data = await response.json().catch(() => ({})) as T & GraphError
  if (!response.ok) throw new Error(data.error?.code ? `Meta rechazó la solicitud (código ${data.error.code}).` : 'Meta rechazó la solicitud.')
  return data
}

export async function inspectFacebookPage(pageId: string, token: string) {
  return graph<{ id: string; name?: string }>(`${pageId}?fields=id,name`, token)
}

export async function subscribeFacebookPage(pageId: string, token: string) {
  return graph<{ success: boolean }>(`${pageId}/subscribed_apps?subscribed_fields=messages,messaging_postbacks,messaging_reads,message_deliveries`, token, { method: 'POST', body: '{}' })
}

export async function sendFacebookText(channel: Credentials, recipientId: string, text: string) {
  const token = decryptFacebookToken(channel.encrypted_page_access_token)
  return graph<{ recipient_id?: string; message_id?: string }>(`${channel.page_id}/messages`, token, {
    method: 'POST',
    body: JSON.stringify({ recipient: { id: recipientId }, messaging_type: 'RESPONSE', message: { text: text.slice(0, 2000) } }),
  })
}
