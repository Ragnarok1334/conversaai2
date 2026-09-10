export const BEHAVIOR_TONES = ['amigable', 'profesional', 'vendedor', 'cercano', 'directo'] as const
export const BEHAVIOR_GOALS = ['captar leads', 'responder faq', 'vender productos', 'agendar citas', 'dar soporte'] as const
export const BEHAVIOR_SALES_LEVELS = ['Bajo', 'Medio', 'Alto'] as const
export const BEHAVIOR_RESPONSE_STYLES = ['Breves', 'Equilibradas', 'Detalladas'] as const
export const BEHAVIOR_CHANNELS = ['webchat', 'telegram', 'whatsapp', 'instagram', 'facebook'] as const
export const ASSISTANT_LANGUAGES = ['es', 'en', 'pt', 'auto'] as const

export type BehaviorTone = typeof BEHAVIOR_TONES[number]
export type BehaviorGoal = typeof BEHAVIOR_GOALS[number]
export type BehaviorSalesLevel = typeof BEHAVIOR_SALES_LEVELS[number]
export type BehaviorResponseStyle = typeof BEHAVIOR_RESPONSE_STYLES[number]
export type BehaviorChannel = typeof BEHAVIOR_CHANNELS[number]
export type AssistantLanguage = typeof ASSISTANT_LANGUAGES[number]

export interface AssistantBehaviorRules {
  askName: boolean
  askContact: boolean
  offerPricesWhenAsked: boolean
  suggestAppointment: boolean
  escalateIfUnknown: boolean
  doNotInvent: boolean
  alwaysSpanish: boolean
}

export interface AssistantBehavior {
  initialChannel: BehaviorChannel
  tone: BehaviorTone
  goal: BehaviorGoal
  salesLevel: BehaviorSalesLevel
  responseStyle: BehaviorResponseStyle
  rules: AssistantBehaviorRules
}

export const DEFAULT_BEHAVIOR: AssistantBehavior = {
  initialChannel: 'webchat',
  tone: 'profesional',
  goal: 'dar soporte',
  salesLevel: 'Medio',
  responseStyle: 'Equilibradas',
  rules: {
    askName: true,
    askContact: false,
    offerPricesWhenAsked: true,
    suggestAppointment: false,
    escalateIfUnknown: true,
    doNotInvent: true,
    alwaysSpanish: true,
  },
}

const TOP_LEVEL_KEYS = ['initialChannel', 'tone', 'goal', 'salesLevel', 'responseStyle', 'rules'] as const
const RULE_KEYS = Object.keys(DEFAULT_BEHAVIOR.rules) as Array<keyof AssistantBehaviorRules>

function isRecord(input: unknown): input is Record<string, unknown> {
  return Boolean(input) && typeof input === 'object' && !Array.isArray(input)
}

export function normalizeBehavior(input: unknown): AssistantBehavior {
  const source = isRecord(input) ? input : {}
  const rulesSource = isRecord(source.rules) ? source.rules : {}

  return {
    initialChannel: BEHAVIOR_CHANNELS.includes(source.initialChannel as BehaviorChannel)
      ? source.initialChannel as BehaviorChannel
      : DEFAULT_BEHAVIOR.initialChannel,
    tone: BEHAVIOR_TONES.includes(source.tone as BehaviorTone)
      ? source.tone as BehaviorTone
      : DEFAULT_BEHAVIOR.tone,
    goal: BEHAVIOR_GOALS.includes(source.goal as BehaviorGoal)
      ? source.goal as BehaviorGoal
      : DEFAULT_BEHAVIOR.goal,
    salesLevel: BEHAVIOR_SALES_LEVELS.includes(source.salesLevel as BehaviorSalesLevel)
      ? source.salesLevel as BehaviorSalesLevel
      : DEFAULT_BEHAVIOR.salesLevel,
    responseStyle: BEHAVIOR_RESPONSE_STYLES.includes(source.responseStyle as BehaviorResponseStyle)
      ? source.responseStyle as BehaviorResponseStyle
      : DEFAULT_BEHAVIOR.responseStyle,
    rules: Object.fromEntries(RULE_KEYS.map((key) => [
      key,
      typeof rulesSource[key] === 'boolean' ? rulesSource[key] : DEFAULT_BEHAVIOR.rules[key],
    ])) as unknown as AssistantBehaviorRules,
  }
}

export type BehaviorValidationResult =
  | { success: true; data: AssistantBehavior }
  | { success: false; error: string }

export function validateBehavior(input: unknown): BehaviorValidationResult {
  if (!isRecord(input)) return { success: false, error: 'El campo behavior debe ser un objeto válido.' }

  const unknownKey = Object.keys(input).find(key => !TOP_LEVEL_KEYS.includes(key as typeof TOP_LEVEL_KEYS[number]))
  if (unknownKey) return { success: false, error: `La propiedad de behavior '${unknownKey}' no es válida.` }

  if (input.initialChannel !== undefined && !BEHAVIOR_CHANNELS.includes(input.initialChannel as BehaviorChannel)) return { success: false, error: 'El canal inicial de behavior no es válido.' }
  if (input.tone !== undefined && !BEHAVIOR_TONES.includes(input.tone as BehaviorTone)) return { success: false, error: 'El tono de behavior no es válido.' }
  if (input.goal !== undefined && !BEHAVIOR_GOALS.includes(input.goal as BehaviorGoal)) return { success: false, error: 'El objetivo de behavior no es válido.' }
  if (input.salesLevel !== undefined && !BEHAVIOR_SALES_LEVELS.includes(input.salesLevel as BehaviorSalesLevel)) return { success: false, error: 'El nivel comercial de behavior no es válido.' }
  if (input.responseStyle !== undefined && !BEHAVIOR_RESPONSE_STYLES.includes(input.responseStyle as BehaviorResponseStyle)) return { success: false, error: 'El estilo de respuesta de behavior no es válido.' }
  if (input.rules !== undefined) {
    if (!isRecord(input.rules)) return { success: false, error: 'Las reglas de behavior deben ser un objeto válido.' }
    for (const [key, value] of Object.entries(input.rules)) {
      if (!RULE_KEYS.includes(key as keyof AssistantBehaviorRules) || typeof value !== 'boolean') {
        return { success: false, error: `La regla de behavior '${key}' no es válida o no es booleana.` }
      }
    }
  }

  return { success: true, data: normalizeBehavior(input) }
}
