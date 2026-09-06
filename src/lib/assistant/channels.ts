export type AssistantChannelName = 'webchat' | 'telegram' | 'whatsapp'

export type AssistantChannelUpdates = Partial<
  Record<AssistantChannelName, { enabled: boolean }>
>

const CHANNEL_NAMES: AssistantChannelName[] = ['webchat', 'telegram', 'whatsapp']

export function sanitizeAssistantChannels(input: unknown): AssistantChannelUpdates {
  if (input === undefined || input === null) return {}
  if (typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Formato inválido en channels.')
  }

  const source = input as Record<string, unknown>
  const sanitized: AssistantChannelUpdates = {}

  for (const channel of CHANNEL_NAMES) {
    if (!(channel in source)) continue

    const value = source[channel]
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new Error(`Formato inválido para el canal ${channel}.`)
    }

    const enabled = (value as Record<string, unknown>).enabled
    if (typeof enabled !== 'boolean') {
      throw new Error(`El canal ${channel} requiere enabled booleano.`)
    }

    // Do not forward UI-only secrets such as telegram.token to this RPC.
    sanitized[channel] = { enabled }
  }

  return sanitized
}
