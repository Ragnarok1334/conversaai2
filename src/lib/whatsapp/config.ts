export const WHATSAPP_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
export type WhatsAppDay = typeof WHATSAPP_DAYS[number]

export type WhatsAppChannelConfig = {
  welcomeEnabled: boolean
  welcomeMessage: string
  businessHoursEnabled: boolean
  timezone: string
  schedule: Record<WhatsAppDay, { enabled: boolean; start: string; end: string }>
  awayMessage: string
  handoffEnabled: boolean
  handoffMessage: string
}

const defaultDay = { enabled: true, start: '09:00', end: '18:00' }

export const DEFAULT_WHATSAPP_CONFIG: WhatsAppChannelConfig = {
  welcomeEnabled: true,
  welcomeMessage: '¡Hola! Gracias por escribirnos. Estoy aquí para ayudarte.',
  businessHoursEnabled: false,
  timezone: 'America/Santiago',
  schedule: {
    mon: { ...defaultDay }, tue: { ...defaultDay }, wed: { ...defaultDay },
    thu: { ...defaultDay }, fri: { ...defaultDay },
    sat: { enabled: false, start: '09:00', end: '14:00' },
    sun: { enabled: false, start: '09:00', end: '14:00' },
  },
  awayMessage: 'Gracias por escribirnos. En este momento estamos fuera de nuestro horario de atención. Te responderemos apenas regresemos.',
  handoffEnabled: true,
  handoffMessage: 'Perfecto, te comunicaré con una persona del equipo. Puedes seguir escribiendo mientras esperas.',
}

const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/
const text = (value: unknown, fallback: string, max: number) =>
  typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : fallback

export function normalizeWhatsAppConfig(value: unknown): WhatsAppChannelConfig {
  const input = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const rawSchedule = input.schedule && typeof input.schedule === 'object'
    ? input.schedule as Record<string, unknown> : {}
  const schedule = Object.fromEntries(WHATSAPP_DAYS.map(day => {
    const fallback = DEFAULT_WHATSAPP_CONFIG.schedule[day]
    const raw = rawSchedule[day] && typeof rawSchedule[day] === 'object'
      ? rawSchedule[day] as Record<string, unknown> : {}
    const start = typeof raw.start === 'string' && timePattern.test(raw.start) ? raw.start : fallback.start
    const end = typeof raw.end === 'string' && timePattern.test(raw.end) ? raw.end : fallback.end
    return [day, { enabled: typeof raw.enabled === 'boolean' ? raw.enabled : fallback.enabled, start, end }]
  })) as WhatsAppChannelConfig['schedule']

  const timezone = typeof input.timezone === 'string' && input.timezone.length <= 80
    ? input.timezone : DEFAULT_WHATSAPP_CONFIG.timezone
  try { new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format() }
  catch { throw new Error('La zona horaria no es válida.') }

  return {
    welcomeEnabled: typeof input.welcomeEnabled === 'boolean' ? input.welcomeEnabled : DEFAULT_WHATSAPP_CONFIG.welcomeEnabled,
    welcomeMessage: text(input.welcomeMessage, DEFAULT_WHATSAPP_CONFIG.welcomeMessage, 500),
    businessHoursEnabled: typeof input.businessHoursEnabled === 'boolean' ? input.businessHoursEnabled : DEFAULT_WHATSAPP_CONFIG.businessHoursEnabled,
    timezone,
    schedule,
    awayMessage: text(input.awayMessage, DEFAULT_WHATSAPP_CONFIG.awayMessage, 700),
    handoffEnabled: typeof input.handoffEnabled === 'boolean' ? input.handoffEnabled : DEFAULT_WHATSAPP_CONFIG.handoffEnabled,
    handoffMessage: text(input.handoffMessage, DEFAULT_WHATSAPP_CONFIG.handoffMessage, 700),
  }
}

export function isInsideBusinessHours(config: WhatsAppChannelConfig, date = new Date()): boolean {
  if (!config.businessHoursEnabled) return true
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: config.timezone, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date)
  const weekday = parts.find(part => part.type === 'weekday')?.value.toLowerCase().slice(0, 3) as WhatsAppDay
  const hour = parts.find(part => part.type === 'hour')?.value || '00'
  const minute = parts.find(part => part.type === 'minute')?.value || '00'
  const day = config.schedule[weekday]
  if (!day?.enabled) return false
  const current = `${hour}:${minute}`
  return current >= day.start && current < day.end
}
