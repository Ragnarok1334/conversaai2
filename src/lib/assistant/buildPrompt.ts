export interface Assistant {
  id: string
  user_id: string
  assistant_name: string
  business_name: string
  business_type: string | null
  channel: string
  tone: string
  main_goal: string | null
  instructions: string | null
  faqs: string | null
  services: string | null
  business_hours: string | null
  schedule: string | null
  fallback_message: string | null
  language: string
  status: string
  behavior: any
  created_at: string
  knowledge_blocks?: Array<{
    type: string
    title: string
    content: string
    is_active: boolean
    sort_order: number
  }> | null
}

export function buildAssistantSystemPrompt(assistant: Partial<Assistant>): string {
  // 1. Extraer configuración de comportamiento (con fallbacks seguros)
  const behavior = assistant.behavior as Record<string, any> || {}
  
  const tone = behavior.tone || 'professional'
  const objective = behavior.goal || 'support'
  const salesLevel = behavior.salesLevel || 'Medium'
  const rules = behavior.rules || {
    askName: true,
    askContact: true,
    offerPricesWhenAsked: true,
    suggestAppointment: false,
    escalateIfUnknown: true,
    doNotInvent: true,
    alwaysSpanish: true
  }

  // 2. Información base
  const businessName = assistant.business_name || assistant.assistant_name || 'este negocio'
  const businessType = assistant.business_type || 'un negocio'
  const instructions = assistant.instructions || ''
  const faqs = assistant.faqs || ''
  const schedule = assistant.business_hours || assistant.schedule || ''
  const services = assistant.services || ''
  const fallbackMessage = assistant.fallback_message || 'Lo siento, no tengo esa información. ¿Quieres que un asesor te contacte?'

  // 3. Mapeo de Tono
  let toneInstruction = 'Usa un tono profesional, claro y confiable.'
  switch (tone) {
    case 'friendly':
    case 'amigable':
      toneInstruction = 'Usa un tono amable, cálido y fácil de entender. Usa emojis moderadamente.'
      break
    case 'sales':
    case 'vendedor':
      toneInstruction = 'Usa un tono orientado a ventas, destacando beneficios y guiando al cliente hacia una acción.'
      break
    case 'close':
    case 'cercano':
      toneInstruction = 'Usa un tono cercano, natural y conversacional, como si hablaras con un amigo.'
      break
    case 'direct':
    case 'directo':
      toneInstruction = 'Usa un tono breve, directo y sin rodeos. Ve al grano.'
      break
    case 'professional':
    case 'profesional':
    default:
      toneInstruction = 'Usa un tono profesional, claro, educado y confiable.'
      break
  }

  // 4. Mapeo de Objetivo
  let goalInstruction = 'Prioriza resolver dudas, orientar y dar soporte.'
  switch (objective) {
    case 'capture_leads':
    case 'captar leads':
      goalInstruction = 'Prioriza capturar los datos de contacto del cliente (nombre, correo o teléfono) cuando sea apropiado para dar seguimiento.'
      break
    case 'answer_faq':
    case 'responder faq':
      goalInstruction = 'Prioriza responder las preguntas frecuentes con claridad y precisión basándote en la información provista.'
      break
    case 'sell_products':
    case 'vender productos':
      goalInstruction = 'Prioriza explicar los productos, destacar sus beneficios y ayudar activamente al cliente a tomar una decisión de compra.'
      break
    case 'book_appointments':
    case 'agendar citas':
      goalInstruction = 'Prioriza guiar al cliente hacia la reserva o agendamiento de una cita, solicitando el día y la hora que prefiere.'
      break
    case 'support':
    case 'dar soporte':
    default:
      goalInstruction = 'Prioriza resolver dudas, orientar y dar soporte excelente al cliente.'
      break
  }

  // 5. Mapeo de Nivel Comercial
  let salesInstruction = 'Guía al cliente hacia una acción de forma natural, sin presionar.'
  switch (salesLevel) {
    case 'low':
    case 'Bajo':
      salesInstruction = 'No presiones la venta. Limítate a orientar y responder sus preguntas de forma neutral.'
      break
    case 'high':
    case 'Alto':
      salesInstruction = 'Sé muy proactivo en cerrar la venta o pedir los datos. Si notas interés, propón el siguiente paso sin dudar.'
      break
  }

  // 6. Construir las Reglas Estrictas
  const rulesList: string[] = []

  if (rules.askName) {
    rulesList.push('- Inicia o continúa la conversación pidiendo amablemente el nombre del cliente cuando sea útil para personalizar el trato.')
  } else {
    rulesList.push('- NO pidas el nombre del cliente a menos que sea estrictamente necesario o él lo comparta voluntariamente.')
  }

  if (rules.askContact) {
    rulesList.push('- Solicita su teléfono o correo electrónico de manera natural cuando sea útil para enviarle información o dar seguimiento.')
  } else {
    rulesList.push('- NO solicites el teléfono ni el correo electrónico del cliente bajo ninguna circunstancia.')
  }

  if (rules.offerPricesWhenAsked) {
    rulesList.push('- Si el cliente pregunta por precios, responde detalladamente usando la información disponible.')
  } else {
    rulesList.push('- Si el cliente pregunta por precios, NO ofrezcas precios exactos. Indica que los precios se evalúan caso a caso o que debe contactar directamente.')
  }

  if (rules.suggestAppointment) {
    rulesList.push('- Sugiere proactivamente agendar una cita, turno o visita cuando sea relevante para su consulta.')
  } else {
    rulesList.push('- NO sugieras agendar citas ni reservas.')
  }

  if (rules.escalateIfUnknown) {
    rulesList.push(`- Si te hacen una pregunta de la cual NO tienes información en el contexto provisto, debes responder textualmente (o una variación similar): "${fallbackMessage}" y ofrecer derivar con un humano.`)
  } else {
    rulesList.push(`- Si no tienes información suficiente, responde de forma general y empática pidiendo más contexto, pero evita derivar bruscamente a un asesor humano.`)
  }

  if (rules.doNotInvent) {
    rulesList.push('- CRÍTICO: NO inventes información que no esté en tu entrenamiento. No inventes precios, horarios, direcciones, disponibilidad de stock, ni nombres de personas.')
  } else {
    rulesList.push('- Puedes usar un nivel moderado de creatividad para rellenar vacíos menores en la información, siempre y cuando no comprometas precios o políticas importantes.')
  }

  if (rules.alwaysSpanish) {
    rulesList.push('- CRÍTICO: Debes responder SIEMPRE en Español, sin importar en qué idioma te hable el usuario.')
  }

  // 7. Generar Conocimiento Estructurado
  let structuredKnowledge = ''
  
  if (assistant.knowledge_blocks && Array.isArray(assistant.knowledge_blocks)) {
    const activeBlocks = assistant.knowledge_blocks.filter(b => b.is_active && b.content.trim())
    if (activeBlocks.length > 0) {
      // Ordenar por bloque para mantener la jerarquía semántica solicitada
      const typeOrder = [
        'general', 'services', 'pricing', 'hours', 
        'location', 'faq', 'policies', 'promotions', 
        'lead_capture', 'rules', 'custom'
      ]
      
      const sortedBlocks = activeBlocks.sort((a, b) => {
        const orderA = typeOrder.indexOf(a.type) === -1 ? 99 : typeOrder.indexOf(a.type)
        const orderB = typeOrder.indexOf(b.type) === -1 ? 99 : typeOrder.indexOf(b.type)
        if (orderA !== orderB) return orderA - orderB
        return (a.sort_order || 0) - (b.sort_order || 0)
      })

      structuredKnowledge = sortedBlocks.map(b => `[${b.title.toUpperCase()}]\n${b.content}`).join('\n\n')
    }
  }

  // Fallback a legacy si no hay bloques estructurados
  if (!structuredKnowledge) {
    structuredKnowledge = `Instrucciones generales:\n${instructions}\n`
    if (services) structuredKnowledge += `\nServicios/Productos ofrecidos:\n${services}\n`
    if (schedule) structuredKnowledge += `\nHorarios de atención:\n${schedule}\n`
    if (faqs) structuredKnowledge += `\nPreguntas Frecuentes (FAQ):\n${faqs}\n`
  }

  // 8. Ensamblar Prompt Final
  return `
Eres el asistente virtual oficial de "${businessName}", que es un(a) ${businessType}.

COMPORTAMIENTO PRINCIPAL:
- ${toneInstruction}
- ${goalInstruction}
- ${salesInstruction}

INFORMACIÓN DE ENTRENAMIENTO (CONOCIMIENTO DEL NEGOCIO):
${structuredKnowledge.trim()}

REGLAS ESTRICTAS QUE DEBES CUMPLIR OBLIGATORIAMENTE:
${rulesList.join('\n')}

INSTRUCCIÓN FINAL: Basa tus respuestas únicamente en la Información de Entrenamiento provista arriba. Si te saludan, sé cortés y preséntate brevemente de acuerdo a tus reglas y tono.
`.trim()
}
