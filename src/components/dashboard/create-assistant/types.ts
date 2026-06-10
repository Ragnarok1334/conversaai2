export type KnowledgeBlockType = 'general' | 'services' | 'pricing' | 'hours' | 'location' | 'faq' | 'policies' | 'promotions' | 'lead_capture' | 'rules' | 'custom'

export interface KnowledgeBlock {
  id: string
  type: KnowledgeBlockType
  title: string
  content: string
  is_active: boolean
  sort_order: number
}

export interface BuilderFormData {
  assistant_name: string
  business_name: string
  business_type: string
  language: "es"
  instructions: string
  faqs: string
  services: string
  schedule: string
  fallback_message: string
  behavior: {
    initialChannel: string
    tone: string
    goal: string
    salesLevel: string
    responseStyle: string
    rules: {
      askName: boolean
      askContact: boolean
      offerPricesWhenAsked: boolean
      suggestAppointment: boolean
      escalateIfUnknown: boolean
      doNotInvent: boolean
      alwaysSpanish: boolean
    }
  }
  channels: {
    webchat: { enabled: boolean }
    telegram: { enabled: boolean; token: string }
    whatsapp: { enabled: boolean }
  }
  knowledgeBlocks: KnowledgeBlock[]
}

export const initialBuilderForm: BuilderFormData = {
  assistant_name: '',
  business_name: '',
  business_type: '',
  language: 'es',
  instructions: '',
  faqs: '',
  services: '',
  schedule: '',
  fallback_message: 'Lo siento, no tengo esa información ahora mismo. ¿Quieres que te contacte un asesor?',
  behavior: {
    initialChannel: 'webchat',
    tone: 'profesional',
    goal: 'dar soporte',
    salesLevel: 'Medio',
    responseStyle: 'Detalladas',
    rules: {
      askName: true,
      askContact: false,
      offerPricesWhenAsked: true,
      suggestAppointment: false,
      escalateIfUnknown: true,
      doNotInvent: true,
      alwaysSpanish: true
    }
  },
  channels: {
    webchat: { enabled: true },
    telegram: { enabled: false, token: '' },
    whatsapp: { enabled: false }
  },
  knowledgeBlocks: []
}
