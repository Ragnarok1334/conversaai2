'use client'

import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Loader2, AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Check, X, FileText, Bot, Store, Briefcase, Heart, Building2, MapPin, Search, Map, Clock, HelpCircle, Tag, ScrollText, AlertTriangle, ShieldAlert } from 'lucide-react'
import { BuilderFormData, KnowledgeBlock, KnowledgeBlockType } from './types'

interface Props {
  form: BuilderFormData
  setForm: (form: BuilderFormData) => void
  errors?: Record<string, string>
}

function generateId() {
  return Math.random().toString(36).substring(2, 15)
}

const CATEGORIES = [
  {
    id: 'essentials',
    title: 'Esenciales',
    blocks: [
      { type: 'general', title: 'Información general', icon: Store, desc: 'Describe qué es tu negocio, años de experiencia y misión corta.', placeholder: 'Ej: Somos FashionStore, tienda online de ropa fundada en 2020...' },
      { type: 'services', title: 'Servicios y productos', icon: Briefcase, desc: 'Escribe qué vendes, qué servicios ofreces y qué debe saber el asistente para explicarlos.', placeholder: 'Ej: Vendemos cursos de inglés básico, intermedio y avanzado. También ofrecemos clases particulares online.' },
      { type: 'pricing', title: 'Precios', icon: Tag, desc: 'Agrega precios, rangos, promociones o explica si el precio depende del caso.', placeholder: 'Ej: Curso mensual desde $60. Clase particular desde $15 por hora. (Si depende del caso, indica qué datos pedir para cotizar).' },
      { type: 'hours', title: 'Horarios', icon: Clock, desc: 'Indica horarios de atención, disponibilidad o tiempos de respuesta.', placeholder: 'Ej: Lunes a Viernes de 9:00 a 18:00. Soporte online 24/7.' },
      { type: 'location', title: 'Ubicación', icon: MapPin, desc: 'Agrega dirección física, si atiendes online, zonas de cobertura o delivery.', placeholder: 'Ej: 100% online. Envíos a todo el país a través de Starken.' },
    ]
  },
  {
    id: 'attention',
    title: 'Atención y conversión',
    blocks: [
      { type: 'faq', title: 'Preguntas frecuentes', icon: HelpCircle, desc: 'Añade respuestas a las dudas más comunes de tus clientes.', placeholder: 'Ej: ¿Cuánto tarda el envío? 3-5 días hábiles. ¿Cuáles son los medios de pago? Tarjeta de crédito, débito o transferencia.' },
      { type: 'lead_capture', title: 'Datos a solicitar', icon: Search, desc: 'Define qué datos debe pedir el asistente para convertir conversaciones en leads o cotizar.', placeholder: 'Ej: Para cotizar, pedir: Nombre, correo, tipo de servicio y fecha.' },
      { type: 'promotions', title: 'Promociones', icon: Heart, desc: 'Describe descuentos vigentes u ofertas especiales.', placeholder: 'Ej: 20% descuento en primera compra usando el código BIENVENIDO.' },
    ]
  },
  {
    id: 'rules',
    title: 'Reglas',
    blocks: [
      { type: 'policies', title: 'Políticas', icon: ScrollText, desc: 'Términos y condiciones, garantías, cambios y devoluciones.', placeholder: 'Ej: Cambios dentro de los 30 días presentando boleta. El producto debe estar sellado.' },
      { type: 'rules', title: 'Reglas importantes', icon: ShieldAlert, desc: 'Restricciones claras para el asistente.', placeholder: 'Ej: No dar diagnósticos médicos. No confirmar citas hasta que se reciba el pago.' },
    ]
  }
]

const TEMPLATES: Record<string, Partial<Record<KnowledgeBlockType, string>>> = {
  'E-commerce / Tienda online': {
    general: 'Tienda online "[Agrega tu nombre legal/marca]". Vendemos productos a todo el país.',
    services: 'Ofrecemos [Agrega tus principales categorías de productos, ej: ropa, tecnología, etc].',
    pricing: 'Los precios exactos están en nuestra página web. [Agrega rango de precios si lo deseas].',
    hours: 'Atención al cliente de Lunes a Viernes de [Agrega horario]. Compras web 24/7.',
    location: 'Tienda 100% online con envíos a todo el país. [O agrega aquí tu dirección si tienes tienda física].',
    policies: 'Devoluciones dentro de [X] días presentando boleta. [Explica tus condiciones de cambio].',
    faq: '¿Cuánto demora el envío? [Agrega tiempo estimado]. ¿Qué medios de pago aceptan? [Agrega medios].'
  },
  'Restaurante / Comida': {
    general: 'Restaurante "[Agrega nombre]". Especialistas en [Agrega tu tipo de comida, ej: pizzas, sushi].',
    services: 'Ofrecemos platos principales, postres, bebidas y opciones [ej: vegetarianas/veganas].',
    pricing: 'Platos desde [Agrega precio inicial]. [Menciona si hay combos o menú del día].',
    hours: 'Abrimos de Martes a Domingo de [Agrega horario]. Lunes cerrado.',
    location: '[Agrega tu dirección exacta]. Tenemos delivery en las comunas de [Agrega zonas].',
    promotions: 'Promoción actual: [Agrega promoción, ej: 2x1 los jueves].',
    lead_capture: 'Nombre, dirección exacta, teléfono y pedido específico para el delivery.',
    rules: 'No aceptar pedidos fuera de horario o de zonas de cobertura sin consultar antes.'
  },
  'Clínica / Salud': {
    general: 'Centro Médico "[Agrega nombre]". Brindamos atención de salud integral.',
    services: 'Especialidades: [Agrega tus especialidades: Medicina General, Pediatría, etc]. Exámenes de laboratorio.',
    pricing: 'Consulta general desde [Precio]. Atendemos por Fonasa e Isapres [Agrega convenios].',
    hours: 'Lunes a Viernes de [Horario]. Sábados [Horario]. Urgencias [Sí/No].',
    location: '[Dirección de la clínica]. También ofrecemos telemedicina.',
    policies: 'Las horas se cancelan con 24h de anticipación.',
    lead_capture: 'Nombre del paciente, RUT, especialidad que busca y disponibilidad de horario.',
    rules: 'NO dar diagnósticos médicos. Siempre derivar a agendar una consulta.'
  },
  'Belleza / Barbería': {
    general: 'Salón de belleza y barbería "[Agrega nombre]".',
    services: 'Cortes de cabello, tintes, manicure, pedicure y tratamientos capilares.',
    pricing: 'Corte de hombre desde [Precio]. Manicure desde [Precio]. Para tintes se debe agendar evaluación.',
    hours: 'Atendemos de Lunes a Sábado de [Horario].',
    location: '[Agrega dirección]. Solo atendemos con reserva previa.',
    lead_capture: 'Nombre, teléfono, servicio deseado y día de preferencia para agendar.'
  },
  'Servicios profesionales': {
    general: 'Ofrecemos asesoría y servicios profesionales para [empresas/particulares].',
    services: 'Servicios de [Consultoría, Asesoría, Diseño, etc]. Soluciones a medida.',
    pricing: 'El precio depende del proyecto. Para cotizar, necesitamos conocer tus requerimientos.',
    hours: 'Lunes a Viernes en horario de oficina: [Horario].',
    location: 'Atención 100% remota a nivel nacional. [O dirección si aplica].',
    lead_capture: 'Nombre, empresa, correo, teléfono y breve descripción de lo que necesita.'
  },
  'Educación / Cursos': {
    general: 'Academia "[Agrega nombre]". Impartimos cursos y capacitaciones de [Tema].',
    services: 'Cursos presenciales y online, talleres intensivos y clases particulares.',
    pricing: 'Cursos desde [Precio]. Matrícula [Costo o Gratis]. Opciones de pago en cuotas.',
    hours: 'Atención administrativa de [Horario]. Las clases tienen horarios específicos según el curso.',
    location: 'Modalidad [Presencial/Online]. Dirección: [Agrega dirección si es presencial].',
    faq: '¿Dan certificado? [Sí/No]. ¿Qué nivel necesito? [Explica requisitos].',
    lead_capture: 'Nombre, correo, curso de interés y conocimientos previos.'
  },
  'Inmobiliaria': {
    general: 'Corredora de propiedades "[Nombre]". Venta y arriendo de inmuebles.',
    services: 'Venta de casas y departamentos, administración de arriendos y tasaciones.',
    pricing: 'Comisión por venta: [Porcentaje]%. Comisión por arriendo: [Porcentaje]% de un mes.',
    hours: 'Lunes a Sábado de [Horario].',
    location: 'Operamos principalmente en las zonas de [Zonas de cobertura].',
    lead_capture: 'Nombre, correo, presupuesto aproximado y si busca comprar o arrendar.',
    faq: '¿Cuáles son los requisitos para arrendar? [Detalla requisitos: liquidaciones, Dicom, etc].'
  },
  'Automotriz / Taller': {
    general: 'Taller Mecánico "[Nombre]". Especialistas en mantención y reparación automotriz.',
    services: 'Mantención por kilometraje, cambio de aceite, frenos, escáner y mecánica general.',
    pricing: 'Cambio de aceite desde [Precio]. Escáner [Precio]. Para otras fallas se debe evaluar el vehículo.',
    hours: 'Lunes a Viernes de [Horario]. Sábados hasta las [Horario].',
    location: '[Agrega tu dirección exacta].',
    lead_capture: 'Nombre, marca, modelo y año del vehículo, y descripción del problema.'
  },
  'Hotel / Turismo': {
    general: 'Hotel "[Nombre]" ubicado en el corazón de [Ciudad/Zona].',
    services: 'Habitaciones dobles, simples y familiares. Desayuno incluido, piscina y wifi.',
    pricing: 'Habitación doble desde [Precio] la noche. Temporada alta desde [Precio].',
    hours: 'Recepción 24 horas. Check-in a las [Hora]. Check-out a las [Hora].',
    location: '[Dirección completa]. A [Distancia] de los principales atractivos.',
    policies: 'Cancelación gratuita hasta 48h antes del check-in. No se aceptan mascotas [o sí se aceptan].',
    lead_capture: 'Nombre, fechas exactas de viaje y cantidad de pasajeros.'
  },
  'Gimnasio / Fitness': {
    general: 'Centro Fitness "[Nombre]". Equipamiento de primer nivel y clases guiadas.',
    services: 'Sala de musculación, clases de CrossFit, Spinning y Yoga. Entrenamiento personalizado.',
    pricing: 'Plan mensual desde [Precio]. Plan trimestral [Precio]. Matrícula [Costo/Gratis].',
    hours: 'Lunes a Viernes de [Horario]. Sábados y Domingos [Horario].',
    location: '[Dirección exacta]. Tenemos estacionamiento.',
    faq: '¿Se puede probar un día gratis? [Explica si hay clase de prueba].',
    lead_capture: 'Nombre, objetivo (bajar de peso, ganar masa, etc) y teléfono de contacto.'
  },
  'Dental / Odontología': {
    general: 'Clínica Dental "[Nombre]". Odontología para toda la familia.',
    services: 'Limpieza, tapaduras, ortodoncia (frenillos), implantes y blanqueamiento dental.',
    pricing: 'Evaluación inicial [Precio o Gratis]. El resto de tratamientos requiere evaluación presencial.',
    hours: 'Lunes a Viernes de [Horario]. Sábados en la mañana.',
    location: '[Dirección de la clínica].',
    lead_capture: 'Nombre, edad del paciente, dolor o motivo de consulta y día preferido.',
    rules: 'No dar presupuestos exactos por chat sin que el dentista haya evaluado al paciente.'
  },
  'Veterinaria / Mascotas': {
    general: 'Clínica Veterinaria "[Nombre]". Cuidamos la salud de tus mascotas.',
    services: 'Consultas generales, vacunas, desparasitación, cirugías y peluquería canina/felina.',
    pricing: 'Consulta general [Precio]. Vacuna óctuple [Precio]. Peluquería depende del tamaño.',
    hours: 'Atención Lunes a Sábado de [Horario]. Urgencias [Sí/No].',
    location: '[Dirección exacta]. [Agrega si hacen visitas a domicilio].',
    policies: 'Para peluquería se debe agendar con 2 días de anticipación.',
    lead_capture: 'Nombre del dueño, especie/raza de la mascota y motivo de la consulta.',
    rules: 'No dar diagnósticos ni recetar medicamentos por chat a las mascotas.'
  },
  'Abogados / Contadores': {
    general: 'Estudio Jurídico/Contable "[Nombre]". Asesoría legal y financiera.',
    services: 'Divorcios, pensiones, contratos, constitución de sociedades y defensa laboral.',
    pricing: 'Primera consulta [Costo/Gratis]. Los honorarios se fijan tras evaluar la complejidad del caso.',
    hours: 'Lunes a Viernes de [Horario].',
    location: 'Atención presencial en [Dirección] y videollamadas para todo el país.',
    lead_capture: 'Nombre, teléfono y un resumen breve del problema o requerimiento.'
  },
  'Limpieza / Mantenimiento': {
    general: 'Empresa de aseo y mantenimiento "[Nombre]". Para oficinas y hogares.',
    services: 'Limpieza profunda, lavado de alfombras, sanitización y limpieza post-construcción.',
    pricing: 'Limpieza de departamentos desde [Precio]. Lavado de alfombra desde [Precio] el m2.',
    hours: 'Agendamos servicios de Lunes a Domingo de [Horario].',
    location: 'Cubrimos las zonas de [Indicar comunas o ciudades].',
    lead_capture: 'Nombre, metros cuadrados aproximados, ubicación y tipo de servicio necesario.'
  },
  'Construcción / Remodelación': {
    general: 'Empresa constructora "[Nombre]". Especialistas en remodelaciones y obra menor.',
    services: 'Ampliaciones, pintura, instalación de pisos, gasfitería y electricidad.',
    pricing: 'Todo trabajo requiere una visita técnica para cotizar. Visita de evaluación: [Costo o Gratis].',
    hours: 'Atención administrativa de Lunes a Viernes de [Horario].',
    location: 'Prestamos servicios en [Zonas o ciudades].',
    lead_capture: 'Nombre, teléfono, dirección de la obra y qué trabajo necesita realizar.'
  },
  'Eventos / Banquetes': {
    general: 'Productora de eventos y banquetería "[Nombre]".',
    services: 'Matrimonios, eventos corporativos, cumpleaños, coffee breaks y arriendo de mobiliario.',
    pricing: 'Menú por persona desde [Precio]. Se debe cotizar según cantidad de invitados y fecha.',
    hours: 'Atención a clientes de [Horario].',
    location: 'Realizamos eventos en [Zonas de cobertura].',
    lead_capture: 'Nombre, tipo de evento, fecha estimada y cantidad de invitados.',
    faq: '¿Con cuánto tiempo de anticipación debo reservar? [Indicar tiempo].'
  },
  'Logística / Transporte': {
    general: 'Empresa de fletes y mudanzas "[Nombre]". Transporte seguro.',
    services: 'Mudanzas de hogar, fletes de oficina, carga general y embalaje.',
    pricing: 'Fletes locales desde [Precio]. El valor exacto depende de la distancia y volumen.',
    hours: 'Realizamos mudanzas de Lunes a Domingo. Atención por chat de [Horario].',
    location: 'Servicios dentro de [Ciudad] y viajes interregionales hacia [Zonas].',
    lead_capture: 'Nombre, dirección de origen, dirección de destino y lista de los muebles más grandes.'
  },
  'Tecnología / Reparaciones': {
    general: 'Servicio técnico especializado "[Nombre]". Reparamos celulares y computadores.',
    services: 'Cambio de pantallas, baterías, formateo de PC, recuperación de datos.',
    pricing: 'Diagnóstico: [Precio o Gratis si repara]. Cambio de pantalla iPhone desde [Precio].',
    hours: 'Lunes a Viernes de [Horario]. Sábados de [Horario].',
    location: '[Dirección de la tienda]. [Indica si retiras a domicilio].',
    policies: 'Garantía de [X] meses en repuestos originales. No nos hacemos responsables por equipos mojados.',
    lead_capture: 'Nombre, marca, modelo del equipo y qué falla presenta.'
  },
  'Agencia de marketing': {
    general: 'Agencia de marketing digital "[Nombre]". Hacemos crecer tu negocio.',
    services: 'Manejo de redes sociales (Community Manager), publicidad en Google/Meta, diseño web.',
    pricing: 'Planes de redes sociales desde [Precio] mensual. Creación de web desde [Precio].',
    hours: 'Lunes a Viernes de [Horario].',
    location: 'Atención 100% remota a clientes de cualquier país.',
    lead_capture: 'Nombre, web o Instagram actual de la empresa, y objetivo principal (vender más, marca, etc).'
  },
  'SaaS / Software': {
    general: 'Plataforma de software "[Nombre]". La mejor herramienta para [Propósito].',
    services: 'Software de [gestión, facturación, recursos humanos, etc] en la nube.',
    pricing: 'Plan básico [Precio]/mes. Plan Pro [Precio]/mes. [Menciona si hay prueba gratis].',
    hours: 'Soporte técnico de [Horario].',
    location: 'Servicio 100% online.',
    faq: '¿Cómo funciona el pago? [Explica]. ¿Puedo cancelar cuando quiera? [Sí/No].',
    lead_capture: 'Nombre, correo de empresa y tamaño del equipo para agendar demostración.',
    rules: 'Invitar siempre a los usuarios a agendar una demo o tomar la prueba gratuita.'
  }
}

export function TrainingStep({ form, setForm, errors = {} }: Props) {
  const [activeTab, setActiveTab] = useState<KnowledgeBlockType | 'legacy'>('general')
  const [isImproving, setIsImproving] = useState(false)
  const [improvedText, setImprovedText] = useState<string | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)
  const [templateMsg, setTemplateMsg] = useState<string | null>(null)
  const [showAllTemplates, setShowAllTemplates] = useState(false)
  const [activeTemplateName, setActiveTemplateName] = useState<string | null>(null)
  const [showTemplateModal, setShowTemplateModal] = useState<string | null>(null)

  // Initialization
  useEffect(() => {
    if (!form.knowledgeBlocks || form.knowledgeBlocks.length === 0) {
      const initialBlocks: KnowledgeBlock[] = CATEGORIES.flatMap(cat => 
        cat.blocks.map((b, i) => ({
          id: generateId(),
          type: b.type as KnowledgeBlockType,
          title: b.title,
          content: '',
          is_active: true,
          sort_order: i + 1
        }))
      )
      setForm({ ...form, knowledgeBlocks: initialBlocks })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const blocks = form.knowledgeBlocks || []
  
  const getBlockState = (text: string) => {
    const chars = text?.trim().length || 0
    if (chars === 0) return 'empty'
    if (chars >= 80) return 'complete'
    return 'partial'
  }

  const handleTemplateClick = (templateName: string) => {
    const hasContent = blocks.some(b => b.is_active && b.content.trim().length >= 80) || form.instructions.trim().length >= 80
    if (hasContent) {
      setShowTemplateModal(templateName)
    } else {
      applyTemplate(templateName)
    }
  }

  const applyTemplate = (templateName: string) => {
    const template = TEMPLATES[templateName]
    if (!template) return

    let currentBlocks = [...blocks]
    Object.entries(template).forEach(([type, content]) => {
      const t = type as KnowledgeBlockType
      const existingIndex = currentBlocks.findIndex(b => b.type === t)
      
      if (existingIndex >= 0) {
        currentBlocks[existingIndex] = { ...currentBlocks[existingIndex], content, is_active: true }
      } else {
        const catBlock = CATEGORIES.flatMap(c => c.blocks).find(b => b.type === t)
        currentBlocks.push({
          id: generateId(),
          type: t,
          title: catBlock?.title || t,
          content,
          is_active: true,
          sort_order: currentBlocks.length + 1
        })
      }
    })

    setForm({ ...form, knowledgeBlocks: currentBlocks })
    setActiveTemplateName(templateName)
    setTemplateMsg(`Plantilla "${templateName}" aplicada. Revisa y ajusta la información abajo.`)
    setTimeout(() => setTemplateMsg(null), 5000)
    setActiveTab('general') // Volver al inicio
  }

  const activeBlock = blocks.find(b => b.type === activeTab)
  const isLegacyActive = activeTab === 'legacy'
  
  const currentText = isLegacyActive ? form.instructions : (activeBlock?.content || '')
  const charCount = currentText?.trim().length || 0
  const isComplete = charCount >= 80
  const isEmpty = charCount === 0

  const handleUpdateBlock = (val: string) => {
    if (isLegacyActive) {
      setForm({ ...form, instructions: val })
      return
    }

    if (!activeBlock) {
      const catBlock = CATEGORIES.flatMap(c => c.blocks).find(b => b.type === activeTab)
      const newBlock: KnowledgeBlock = {
        id: generateId(),
        type: activeTab as KnowledgeBlockType,
        title: catBlock?.title || activeTab,
        content: val,
        is_active: true,
        sort_order: blocks.length + 1
      }
      setForm({ ...form, knowledgeBlocks: [...blocks, newBlock] })
    } else {
      const updated = blocks.map(b => b.type === activeTab ? { ...b, content: val } : b)
      setForm({ ...form, knowledgeBlocks: updated })
    }
  }

  const handleImproveText = async () => {
    setIsImproving(true)
    setAiError(null)
    
    try {
      const res = await fetch('/api/ai/improve-business-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: currentText,
          blockType: isLegacyActive ? 'legacy' : activeTab,
          blockTitle: isLegacyActive ? 'Texto libre legacy' : activeBlock?.title || activeTab,
          assistantName: form.assistant_name,
          businessType: form.business_type,
          activeTemplate: activeTemplateName,
          existingKnowledgeBlocks: blocks,
          instructionsLegacy: form.instructions
        })
      })
      const data = await res.json()
      if (res.ok && data.improvedText) {
        setImprovedText(data.improvedText)
      } else {
        setAiError(data.error || 'Error al procesar la solicitud con IA')
      }
    } catch (err) {
      setAiError('Error de conexión')
    } finally {
      setIsImproving(false)
    }
  }

  const applyImprovedText = () => {
    if (improvedText) {
      handleUpdateBlock(improvedText)
      setImprovedText(null)
    }
  }

  // Cálculos de Calidad
  const activeAndCompleted = blocks.filter(b => b.is_active && getBlockState(b.content) === 'complete')
  const completedCount = activeAndCompleted.length
  
  const hasServices = activeAndCompleted.some(b => b.type === 'services')
  const hasPricing = activeAndCompleted.some(b => b.type === 'pricing')
  const hasHours = activeAndCompleted.some(b => b.type === 'hours')
  const hasLocation = activeAndCompleted.some(b => b.type === 'location')
  
  const missingEssentials = []
  if (!hasServices) missingEssentials.push('Servicios')
  if (!hasPricing) missingEssentials.push('Precios (o cómo se cotiza)')
  if (!hasHours) missingEssentials.push('Horarios')
  if (!hasLocation) missingEssentials.push('Ubicación o modalidad online')

  let qualityLevel = 'Básico'
  let qualityColor = 'text-amber-500 bg-amber-500/10 border-amber-500/20'
  
  if (completedCount >= 6 && missingEssentials.length === 0) {
    qualityLevel = 'Completo'
    qualityColor = 'text-brand-success bg-brand-success/10 border-brand-success/20'
  } else if (completedCount >= 3) {
    if (completedCount >= 6) {
       qualityLevel = 'Bueno'
       qualityColor = 'text-brand-cyan bg-brand-cyan/10 border-brand-cyan/20'
    } else {
       qualityLevel = 'Bueno'
       qualityColor = 'text-brand-cyan bg-brand-cyan/10 border-brand-cyan/20'
    }
  }

  const activeCategoryBlock = CATEGORIES.flatMap(c => c.blocks).find(b => b.type === activeTab)

  const templateKeys = Object.keys(TEMPLATES)
  const visibleTemplates = showAllTemplates ? templateKeys : templateKeys.slice(0, 8)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* HEADER */}
      <div className="bg-card-bg/60 backdrop-blur border border-white/10 rounded-3xl p-6 lg:p-8 shadow-xl text-center">
        <h2 className="font-semibold text-2xl mb-2 text-white">Entrena a tu asistente con información clara</h2>
        <p className="text-slate-400 max-w-2xl mx-auto">
          Organiza lo que sabe tu asistente por secciones. Mientras más clara esté la información, mejores respuestas dará.
        </p>
      </div>

      {errors.knowledge && (
        <div className="p-4 rounded-xl bg-brand-pink/10 border border-brand-pink/20 text-brand-pink text-sm flex gap-3 shadow-lg">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{errors.knowledge}</p>
        </div>
      )}

      <div className="space-y-6">
        
        {/* BLOQUE 1: PLANTILLAS */}
        <section className="bg-card-bg/60 backdrop-blur border border-white/10 rounded-3xl p-6 shadow-md">
          <h3 className="font-semibold text-lg text-white mb-1">1. Empieza rápido con una plantilla</h3>
          <p className="text-sm text-slate-400 mb-4">Elige una plantilla para llenar automáticamente las secciones principales. Después puedes editar todo.</p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {visibleTemplates.map(key => (
              <button
                key={key}
                onClick={() => handleTemplateClick(key)}
                className="py-2.5 px-3 rounded-xl border border-white/10 bg-white/[0.03] text-sm text-slate-300 hover:border-brand-cyan/50 hover:bg-brand-cyan/10 hover:text-white transition-all font-medium text-center"
              >
                {key}
              </button>
            ))}
          </div>
          
          {!showAllTemplates && templateKeys.length > 8 && (
            <div className="mt-4 text-center">
               <button 
                 onClick={() => setShowAllTemplates(true)}
                 className="text-xs text-brand-cyan hover:text-white transition-colors underline underline-offset-2"
               >
                 Ver más plantillas
               </button>
            </div>
          )}
          
          <AnimatePresence>
            {templateMsg && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="mt-4 p-3 rounded-xl bg-brand-success/10 border border-brand-success/20 text-brand-success text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> {templateMsg}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* BLOQUE 2: EDITOR */}
        <section className="bg-card-bg/60 backdrop-blur border border-white/10 rounded-3xl p-6 shadow-md">
          <h3 className="font-semibold text-lg text-white mb-1">2. Completa la base de conocimiento</h3>
          <p className="text-sm text-slate-400 mb-6">No necesitas llenar todo de una vez. Empieza por servicios, precios, horarios y ubicación.</p>

          <div className="flex flex-col md:flex-row gap-6">
            
            {/* LEFT PANEL: Menu */}
            <div className="w-full md:w-64 flex-shrink-0 space-y-4">
              {CATEGORIES.map(cat => (
                <div key={cat.id} className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-2 mb-2">{cat.title}</p>
                  <div className="flex flex-col space-y-1">
                    {cat.blocks.map(b => {
                      const isActive = activeTab === b.type
                      const blockData = blocks.find(x => x.type === b.type)
                      const state = getBlockState(blockData?.content || '')

                      return (
                        <button
                          key={b.type}
                          onClick={() => { setActiveTab(b.type as KnowledgeBlockType); setImprovedText(null); }}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                            isActive 
                              ? 'bg-white/10 text-white' 
                              : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <b.icon className="w-4 h-4 opacity-70" />
                            {b.title}
                          </div>
                          {state === 'complete' && <div className="w-2 h-2 rounded-full bg-brand-success shadow-[0_0_8px_rgba(34,197,94,0.6)]" title="Completo" />}
                          {state === 'partial' && <div className="w-2 h-2 rounded-full bg-amber-500" title="Parcial (1-79 caracteres)" />}
                          {state === 'empty' && <div className="w-2 h-2 rounded-full bg-slate-700" title="Pendiente" />}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}

              {/* AVANZADO (Collapsible) */}
              <div className="pt-2">
                <button
                  onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                  className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-2 mb-2 hover:text-slate-300 w-full text-left"
                >
                  <ChevronDown className={`w-3 h-3 transition-transform ${isAdvancedOpen ? 'rotate-180' : ''}`} />
                  Avanzado / Compatibilidad
                </button>
                <AnimatePresence>
                  {isAdvancedOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-1">
                      <button
                        onClick={() => { setActiveTab('custom'); setImprovedText(null); }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === 'custom' ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5'}`}
                      >
                        <div className="flex items-center gap-2.5"><HelpCircle className="w-4 h-4 opacity-70" /> Otro</div>
                        <div className={`w-2 h-2 rounded-full ${getBlockState(blocks.find(b => b.type === 'custom')?.content || '') === 'complete' ? 'bg-brand-success' : getBlockState(blocks.find(b => b.type === 'custom')?.content || '') === 'partial' ? 'bg-amber-500' : 'bg-slate-700'}`} />
                      </button>
                      <button
                        onClick={() => { setActiveTab('legacy'); setImprovedText(null); }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === 'legacy' ? 'bg-brand-violet/20 text-brand-violet' : 'text-slate-500 hover:bg-white/5'}`}
                      >
                        <div className="flex items-center gap-2.5"><FileText className="w-4 h-4 opacity-70" /> Texto libre (Legacy)</div>
                        <div className={`w-2 h-2 rounded-full ${getBlockState(form.instructions) === 'complete' ? 'bg-brand-success' : getBlockState(form.instructions) === 'partial' ? 'bg-amber-500' : 'bg-slate-700'}`} />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* RIGHT PANEL: Editor */}
            <div className="flex-1 bg-slate-900/50 border border-white/[0.08] rounded-2xl p-5 flex flex-col relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-violet/20 to-brand-cyan/20" />
              
              <div className="mb-4">
                <h4 className="text-xl font-bold text-white mb-2">
                  {isLegacyActive ? 'Texto libre avanzado (Legacy)' : (activeCategoryBlock?.title || 'Otro')}
                </h4>
                
                {isLegacyActive ? (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-200/90 mb-4">
                    Usa este campo solo si prefieres agregar información sin estructura. Recomendamos usar las secciones de la izquierda para obtener mejores respuestas.
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-slate-300 font-medium mb-1">Qué escribir aquí:</p>
                    <p className="text-xs text-slate-400 mb-3">{activeCategoryBlock?.desc || 'Añade información adicional que no encaje en otras categorías.'}</p>
                    <p className="text-xs text-slate-500 italic bg-white/[0.02] p-2 rounded-lg border border-white/[0.05]">
                      <span className="font-semibold not-italic">Ejemplo:</span> {activeCategoryBlock?.placeholder}
                    </p>
                  </>
                )}
              </div>

              <textarea
                value={currentText}
                onChange={(e) => handleUpdateBlock(e.target.value)}
                placeholder="Evita pegar información desordenada. Usa frases claras y separa datos importantes."
                rows={10}
                className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-violet/50 focus:ring-1 focus:ring-brand-violet/20 transition-all resize-y"
                maxLength={5000}
              />
              
              <div className="flex items-center justify-between mt-3">
                <span className={`text-xs font-medium ${isComplete ? 'text-brand-success' : !isEmpty ? 'text-amber-500' : 'text-slate-500'}`}>
                  {charCount} / 5000 chars {isComplete ? '(Completo)' : !isEmpty ? `(Parcial, recomendado ≥80)` : '(Pendiente)'}
                </span>
                
                <div className="flex flex-col items-end gap-1 relative group">
                  <button 
                    type="button"
                    onClick={handleImproveText}
                    disabled={isImproving}
                    className="text-xs px-3 py-2 rounded-xl bg-brand-violet/10 border border-brand-violet/20 text-brand-violet font-semibold flex items-center gap-1.5 hover:bg-brand-violet/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isImproving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    {isImproving ? 'Generando propuesta...' : isEmpty ? 'Crear con IA' : 'Mejorar con IA'}
                  </button>
                  <span className="absolute -top-8 right-0 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap pointer-events-none">
                    Consume 1 mensaje de tu plan
                  </span>
                  {aiError && (
                    <p className="text-[10px] text-brand-pink flex items-center gap-1 absolute top-full mt-1 right-0">
                      <AlertCircle className="w-3 h-3" /> {aiError}
                    </p>
                  )}
                </div>
              </div>

              {improvedText && (
                <AnimatePresence>
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-4 bg-brand-violet/5 border border-brand-violet/20 rounded-xl p-4 overflow-hidden"
                  >
                    <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-brand-violet" /> Vista previa de mejora
                    </h4>
                    <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed bg-black/20 p-3 rounded-lg border border-white/[0.05] mb-3 max-h-60 overflow-y-auto">
                      {improvedText}
                    </p>
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setImprovedText(null)}
                        className="px-3 py-1.5 rounded-lg border border-white/10 text-xs font-medium text-slate-400 hover:text-white hover:bg-white/[0.05] transition-all"
                      >
                        Mantener mi texto
                      </button>
                      <button
                        type="button"
                        onClick={applyImprovedText}
                        className="px-3 py-1.5 rounded-lg bg-brand-violet text-white text-xs font-semibold hover:bg-brand-violet/90 transition-all"
                      >
                        Aplicar mejora
                      </button>
                    </div>
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          </div>
        </section>

        {/* BLOQUE 3: CALIDAD */}
        <section className="bg-card-bg/60 backdrop-blur border border-white/10 rounded-3xl p-6 shadow-md">
          <h3 className="font-semibold text-lg text-white mb-1">3. Revisa la calidad del entrenamiento</h3>
          
          <div className="flex flex-col sm:flex-row gap-6 mt-4">
            <div className={`flex flex-col items-center justify-center p-6 rounded-2xl border min-w-[200px] ${qualityColor}`}>
              <span className="text-xs font-semibold uppercase tracking-wider mb-1 opacity-80">Calidad general</span>
              <span className="text-3xl font-black uppercase">{qualityLevel}</span>
              <span className="text-xs mt-2 opacity-80">{completedCount} bloques completos</span>
            </div>

            <div className="flex-1 space-y-3">
              {missingEssentials.length > 0 ? (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 h-full flex flex-col justify-center">
                  <div className="flex gap-2 items-center text-amber-500 mb-2 font-semibold text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    Para mejorar respuestas, completa:
                  </div>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-amber-200/80">
                    {missingEssentials.map(m => (
                      <li key={m} className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-amber-500" /> {m}</li>
                    ))}
                  </ul>
                  <p className="text-xs text-amber-500/60 mt-3 italic">
                    {completedCount >= 6 ? "Faltan esenciales para considerarlo completo." : "Sin estos bloques esenciales, tu calidad no pasará de 'Bueno' y el asistente podría dar respuestas incompletas."}
                  </p>
                </div>
              ) : (
                <div className="bg-brand-success/10 border border-brand-success/20 rounded-xl p-4 h-full flex flex-col justify-center">
                  <div className="flex gap-2 items-center text-brand-success mb-1 font-semibold">
                    <CheckCircle2 className="w-5 h-5" />
                    ¡Excelente trabajo!
                  </div>
                  <p className="text-sm text-brand-success/80">
                    Has completado las secciones esenciales. Tu asistente tendrá suficiente contexto para dar buenas respuestas.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

      </div>

      {/* Clear Template Modal */}
      <AnimatePresence>
        {showTemplateModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-slate-900 border border-white/10 p-6 rounded-2xl max-w-sm w-full shadow-2xl"
            >
              <div className="flex gap-3 mb-4 text-amber-500">
                <AlertTriangle className="w-6 h-6 flex-shrink-0" />
                <h3 className="font-bold text-lg text-white">¿Aplicar plantilla?</h3>
              </div>
              <p className="text-sm text-slate-300 mb-6">
                Ya tienes información agregada. Si aplicas esta plantilla, se reemplazarán los bloques correspondientes con el texto de la plantilla.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowTemplateModal(null)}
                  className="px-4 py-2 rounded-xl border border-white/10 text-white font-medium hover:bg-white/5 transition-all text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    applyTemplate(showTemplateModal)
                    setShowTemplateModal(null)
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-500 text-black font-bold hover:bg-amber-400 transition-all text-sm shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                >
                  Aplicar plantilla
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
