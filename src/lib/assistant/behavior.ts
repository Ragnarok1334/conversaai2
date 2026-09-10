export const BEHAVIOR_TONES = ['amigable', 'profesional', 'vendedor', 'cercano', 'directo'] as const
export const BEHAVIOR_GOALS = ['captar leads', 'responder faq', 'vender productos', 'agendar citas', 'dar soporte'] as const
export const BEHAVIOR_SALES_LEVELS = ['Bajo', 'Medio', 'Alto'] as const
export const BEHAVIOR_RESPONSE_STYLES = ['Breves', 'Equilibradas', 'Detalladas'] as const
export const BEHAVIOR_CHANNELS = ['webchat', 'telegram', 'whatsapp', 'instagram', 'facebook'] as const

export type BehaviorTone = typeof BEHAVIOR_TONES[number]
export type BehaviorGoal = typeof BEHAVIOR_GOALS[number]
export type BehaviorSalesLevel = typeof BEHAVIOR_SALES_LEVELS[number]
export type BehaviorResponseStyle = typeof BEHAVIOR_RESPONSE_STYLES[number]
export type BehaviorChannel = typeof BEHAVIOR_CHANNELS[number]

export const DEFAULT_BEHAVIOR = {
  initialChannel: 'webchat' as BehaviorChannel,
  tone: 'profesional' as BehaviorTone,
  goal: 'dar soporte' as BehaviorGoal,
  salesLevel: 'Medio' as BehaviorSalesLevel,
  responseStyle: 'Equilibradas' as BehaviorResponseStyle,
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

export function normalizeBehavior(input: unknown) {
  const source = input && typeof input === 'object' && !Array.isArray(input)
    ? input as Record<string, unknown>
    : {}

  const rulesSource = source.rules && typeof source.rules === 'object' && !Array.isArray(source.rules)
    ? source.rules as Record<string, unknown>
    : {}

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
    rules: {
      ...DEFAULT_BEHAVIOR.rules,
      ...Object.fromEntries(Object.keys(DEFAULT_BEHAVIOR.rules).map((key) => [
        key,
        typeof rulesSource[key] === 'boolean' ? rulesSource[key] : DEFAULT_BEHAVIOR.rules[key as keyof typeof DEFAULT_BEHAVIOR.rules],
      ])),
    },
  }
}
