'use client'

import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, FileText, CheckCircle2, Loader2, AlertCircle, Plus, Trash2, CheckSquare } from 'lucide-react'
import { BuilderFormData, KnowledgeBlock, KnowledgeBlockType } from './types'

interface Props {
  form: BuilderFormData
  setForm: (form: BuilderFormData) => void
}

// Generates a random UUID-like string for block IDs
function generateId() {
  return Math.random().toString(36).substring(2, 15)
}

const DEFAULT_BLOCKS: Record<KnowledgeBlockType, { title: string, placeholder: string }> = {
  general: { title: 'Información general', placeholder: 'Ej: Somos FashionStore, tienda de ropa...' },
  services: { title: 'Servicios y productos', placeholder: 'Ej: Vendemos playeras, chamarras y accesorios...' },
  pricing: { title: 'Precios', placeholder: 'Ej: Poleras desde $15, Pantalones desde $30...' },
  hours: { title: 'Horarios', placeholder: 'Ej: Atención online 24/7. Soporte L-V 9-18...' },
  location: { title: 'Ubicación', placeholder: 'Ej: 100% online. Envíos a todo el país...' },
  faq: { title: 'Preguntas frecuentes', placeholder: 'Ej: ¿Cuánto tarda el envío? 3-5 días...' },
  policies: { title: 'Políticas', placeholder: 'Ej: Cambios dentro de 30 días...' },
  promotions: { title: 'Promociones', placeholder: 'Ej: 20% descuento en primera compra...' },
  lead_capture: { title: 'Datos a solicitar', placeholder: 'Ej: Número de pedido para reclamos...' },
  rules: { title: 'Reglas importantes', placeholder: 'Ej: No dar diagnósticos médicos...' },
  custom: { title: 'Otro', placeholder: 'Información adicional...' }
}

const TEMPLATES: Record<string, Partial<Record<KnowledgeBlockType, string>>> = {
  'E-commerce / Tienda online': {
    general: 'Negocio: "FashionStore", tienda online de ropa.',
    services: 'Vendemos ropa y accesorios de moda. Envíos a todo el país (3-5 días hábiles, costo $5).',
    hours: 'Atención online 24/7. Soporte de L-V de 9:00 a 18:00.',
    location: '100% online.',
    pricing: 'Tallas disponibles desde XS hasta XL. Poleras desde $15, Pantalones desde $30.',
    lead_capture: 'Número de pedido para reclamos o seguimiento.',
    rules: 'Política de cambios de 30 días con el producto en perfecto estado. Para compras, dirigir al catálogo web.'
  },
  'Restaurante / Comida': {
    general: 'Negocio: "Pizzería La Mamma".',
    services: 'Pizzas artesanales, lasañas y bebidas.',
    hours: 'Martes a Domingo de 13:00 a 23:00 hrs.',
    location: 'Av. Principal 123.',
    pricing: 'Pizza Margarita ($12), Pizza Pepperoni ($14), Lasaña ($15). Formas de pago: Efectivo o Tarjeta.',
    lead_capture: 'Plato, cantidad, dirección de envío y método de pago.',
    rules: 'Delivery tiene costo extra de $2. Tiempo de espera aprox 45 min.'
  },
  'Clínica / Salud': {
    general: 'Negocio: "Centro Médico SaludVital".',
    services: 'Consultas médicas generales y especialidades.',
    hours: 'Lunes a Viernes de 8:00 a 18:00 hrs.',
    location: 'Calle Salud 456, Piso 2.',
    pricing: 'Medicina General ($40), Pediatría ($50), Odontología ($45). Formas de pago: Efectivo, Tarjeta y bonos de salud.',
    lead_capture: 'Nombre completo, RUT/DNI, especialidad y disponibilidad.',
    rules: 'No dar diagnósticos médicos por chat. Derivar a emergencias si es necesario.'
  },
  'Inmobiliaria': {
    general: 'Negocio: "Inversiones Propiedades".',
    services: 'Arriendos y ventas de departamentos y casas.',
    hours: 'L-V de 9:00 a 18:30.',
    location: 'Centro Financiero, Of 101.',
    pricing: 'Departamentos desde $300,000 en arriendo. Formas de pago: Transferencia para reservas.',
    lead_capture: 'Presupuesto aproximado, preferencia (comprar o arrendar).',
    rules: 'Requisitos para arrendar: 3 últimas liquidaciones, certificado de cotizaciones y aval.'
  },
  'Belleza / Barbería': {
    general: 'Negocio: "Barbería Classic".',
    services: 'Cortes de cabello, arreglo de barba, tratamientos capilares.',
    hours: 'Lunes a Sábado de 10:00 a 20:00 hrs.',
    location: 'Av. Estilo 789.',
    pricing: 'Corte Clásico ($15), Arreglo de Barba ($10), Combo Corte+Barba ($22).',
    lead_capture: 'Nombre, día, hora y servicio.',
    rules: 'Citas con 15 minutos de tolerancia.'
  },
  'Servicios profesionales': {
    general: 'Negocio: "Asesorías Legales Expertos".',
    services: 'Consultoría laboral, redacción de contratos y defensa legal.',
    hours: 'Lunes a Viernes de 9:00 a 17:00.',
    location: 'Edificio Centro, Of 402.',
    pricing: 'Consulta inicial $50 (se descuenta del servicio final).',
    lead_capture: 'Nombre, motivo de la consulta, teléfono.',
    rules: 'Las consultas requieren pago previo para agendar.'
  },
  'Educación / Cursos': {
    general: 'Negocio: "Academia de Inglés FastTrack".',
    services: 'Cursos de inglés online y presenciales (Básico, Intermedio, Avanzado).',
    hours: 'Clases L-V (tarde) y Sábados (mañana).',
    location: 'Sede Central o Vía Zoom.',
    pricing: 'Matrícula $30, Mensualidad $60.',
    lead_capture: 'Nivel de inglés actual, edad, modalidad preferida.',
    rules: 'Las inscripciones cierran el día 5 de cada mes.'
  },
  'Automotriz / Taller': {
    general: 'Negocio: "Taller Mecánico MotorPro".',
    services: 'Mantención por kilometraje, frenos, cambio de aceite y escáner.',
    hours: 'L-V de 8:30 a 18:30, Sábados 9:00 a 14:00.',
    location: 'Ruta 5 Norte, Km 12.',
    pricing: 'Cambio de aceite desde $40, Escáner $20.',
    lead_capture: 'Marca, modelo, año del vehículo y problema presentado.',
    rules: 'Se requiere agendar para revisiones completas.'
  },
  'Logística / Transporte': {
    general: 'Negocio: "Envíos Express Courier".',
    services: 'Transporte de paquetes y documentos a nivel nacional.',
    hours: 'Recepción L-V de 9:00 a 19:00.',
    location: 'Red de sucursales a nivel nacional.',
    pricing: 'Envíos urbanos desde $4, Regiones desde $8.',
    lead_capture: 'Ciudad de origen, destino, peso y medidas aproximadas.',
    rules: 'No transportamos líquidos inflamables.'
  },
  'Hotel / Turismo': {
    general: 'Negocio: "Hotel Vista Mar".',
    services: 'Habitaciones con vista al mar, restaurante, piscina y spa.',
    hours: 'Check-in 15:00, Check-out 12:00. Recepción 24hrs.',
    location: 'Av. Costanera 1000.',
    pricing: 'Hab. Standard $80/noche, Suite $150/noche.',
    lead_capture: 'Fechas de viaje, cantidad de personas, tipo de habitación.',
    rules: 'Cancelación gratuita hasta 48 horas antes.'
  }
}

export function TrainingStep({ form, setForm }: Props) {
  const [activeTab, setActiveTab] = useState<KnowledgeBlockType | 'legacy'>('general')
  const [isImproving, setIsImproving] = useState(false)
  const [improvedText, setImprovedText] = useState<string | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)

  // Initialization: ensure at least some basic blocks exist if list is empty
  useEffect(() => {
    if (!form.knowledgeBlocks || form.knowledgeBlocks.length === 0) {
      const initialBlocks: KnowledgeBlock[] = [
        { id: generateId(), type: 'general', title: DEFAULT_BLOCKS['general'].title, content: '', is_active: true, sort_order: 1 },
        { id: generateId(), type: 'services', title: DEFAULT_BLOCKS['services'].title, content: '', is_active: true, sort_order: 2 },
        { id: generateId(), type: 'pricing', title: DEFAULT_BLOCKS['pricing'].title, content: '', is_active: true, sort_order: 3 },
        { id: generateId(), type: 'hours', title: DEFAULT_BLOCKS['hours'].title, content: '', is_active: true, sort_order: 4 },
        { id: generateId(), type: 'location', title: DEFAULT_BLOCKS['location'].title, content: '', is_active: true, sort_order: 5 },
      ]
      setForm({ ...form, knowledgeBlocks: initialBlocks })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const blocks = form.knowledgeBlocks || []
  
  // Quality Indicator
  const filledBlocksCount = blocks.filter(b => b.is_active && b.content.trim().length > 10).length
  // Also count legacy instructions if no blocks
  const hasLegacy = form.instructions.trim().length > 10 && filledBlocksCount === 0
  const totalQualityCount = filledBlocksCount + (hasLegacy ? 1 : 0)

  let qualityLevel = 'Básico'
  let qualityColor = 'text-amber-500 bg-amber-500/10 border-amber-500/20'
  if (totalQualityCount >= 6) {
    qualityLevel = 'Completo'
    qualityColor = 'text-brand-success bg-brand-success/10 border-brand-success/20'
  } else if (totalQualityCount >= 3) {
    qualityLevel = 'Bueno'
    qualityColor = 'text-brand-cyan bg-brand-cyan/10 border-brand-cyan/20'
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
        currentBlocks.push({
          id: generateId(),
          type: t,
          title: DEFAULT_BLOCKS[t].title,
          content,
          is_active: true,
          sort_order: currentBlocks.length + 1
        })
      }
    })

    // Update legacy instructions as well for backwards compatibility/fallback
    const combined = Object.values(template).join('\n\n')
    
    setForm({ ...form, knowledgeBlocks: currentBlocks, instructions: combined })
  }

  // Find current active block content
  const activeBlock = blocks.find(b => b.type === activeTab)
  const isLegacyActive = activeTab === 'legacy'
  
  const currentText = isLegacyActive ? form.instructions : (activeBlock?.content || '')
  const charCount = currentText.length
  const minChars = 80
  const isSufficient = charCount >= minChars

  const handleUpdateBlock = (val: string) => {
    if (isLegacyActive) {
      setForm({ ...form, instructions: val })
      return
    }

    if (!activeBlock) {
      // Create it if it doesn't exist
      const newBlock: KnowledgeBlock = {
        id: generateId(),
        type: activeTab as KnowledgeBlockType,
        title: DEFAULT_BLOCKS[activeTab as KnowledgeBlockType].title,
        content: val,
        is_active: true,
        sort_order: blocks.length + 1
      }
      setForm({ ...form, knowledgeBlocks: [...blocks, newBlock] })
    } else {
      // Update existing
      const updated = blocks.map(b => b.type === activeTab ? { ...b, content: val } : b)
      setForm({ ...form, knowledgeBlocks: updated })
    }
  }

  const handleToggleBlockStatus = () => {
    if (isLegacyActive || !activeBlock) return
    const updated = blocks.map(b => b.type === activeTab ? { ...b, is_active: !b.is_active } : b)
    setForm({ ...form, knowledgeBlocks: updated })
  }

  const handleImproveText = async () => {
    if (!isSufficient || isImproving) return
    setIsImproving(true)
    setAiError(null)
    try {
      const res = await fetch('/api/ai/improve-business-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: currentText })
      })
      const data = await res.json()
      if (res.ok && data.improvedText) {
        setImprovedText(data.improvedText)
      } else {
        setAiError(data.error || 'Error al mejorar el texto')
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

  const discardImprovedText = () => {
    setImprovedText(null)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="bg-card-bg/60 backdrop-blur border border-white/10 rounded-3xl p-6 lg:p-8 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
          <div>
            <h2 className="font-semibold text-xl mb-1 text-white">Entrena a tu asistente</h2>
            <p className="text-sm text-slate-400">Organiza la información por secciones para obtener mejores respuestas.</p>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${qualityColor}`}>
            <span className="text-xs font-semibold">Calidad del entrenamiento:</span>
            <span className="text-xs font-bold uppercase tracking-wider">{qualityLevel}</span>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-sm font-medium text-slate-300 block">Autocompletar con plantillas:</p>
          <div className="flex flex-wrap gap-2">
            {Object.keys(TEMPLATES).map(key => (
              <button
                key={key}
                onClick={() => applyTemplate(key)}
                className="px-3 py-1.5 rounded-full text-xs font-medium border border-white/10 bg-white/[0.03] text-slate-400 hover:border-brand-cyan/30 hover:text-white transition-all"
              >
                {key}
              </button>
            ))}
          </div>
        </div>

        {/* TABS FOR BLOCKS */}
        <div className="space-y-4 pt-4 border-t border-white/[0.06]">
          <div className="flex flex-wrap gap-2">
            {Object.entries(DEFAULT_BLOCKS).map(([type, data]) => {
              const b = blocks.find(x => x.type === type)
              const hasContent = b && b.content.trim().length > 0
              const isActive = activeTab === type

              return (
                <button
                  key={type}
                  onClick={() => { setActiveTab(type as KnowledgeBlockType); setImprovedText(null); setAiError(null); }}
                  className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-all ${
                    isActive 
                      ? 'bg-brand-violet/20 border border-brand-violet/50 text-white' 
                      : 'bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  {hasContent && b.is_active && <CheckSquare className="w-3.5 h-3.5 text-brand-cyan" />}
                  {data.title}
                </button>
              )
            })}
            <button
              onClick={() => { setActiveTab('legacy'); setImprovedText(null); setAiError(null); }}
              className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-all ${
                activeTab === 'legacy'
                  ? 'bg-brand-violet/20 border border-brand-violet/50 text-white' 
                  : 'bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Texto libre (Legacy)
            </button>
          </div>

          {/* ACTIVE BLOCK EDITOR */}
          <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-white">
                {isLegacyActive ? 'Texto de información general' : DEFAULT_BLOCKS[activeTab as KnowledgeBlockType].title}
              </h3>
              
              {!isLegacyActive && activeBlock && activeBlock.content.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Estado del bloque:</span>
                  <button
                    onClick={handleToggleBlockStatus}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${activeBlock.is_active ? 'bg-brand-success' : 'bg-slate-600'}`}
                  >
                    <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${activeBlock.is_active ? 'translate-x-5' : 'translate-x-1'}`} />
                  </button>
                </div>
              )}
            </div>

            <textarea
              value={currentText}
              onChange={(e) => handleUpdateBlock(e.target.value)}
              placeholder={isLegacyActive ? 'Texto general sin estructura...' : DEFAULT_BLOCKS[activeTab as KnowledgeBlockType].placeholder}
              rows={8}
              className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-violet/50 focus:ring-1 focus:ring-brand-violet/20 transition-all resize-y"
              maxLength={5000}
            />
            
            <div className="flex items-center justify-between">
              <span className={`text-xs ${isSufficient ? 'text-brand-success' : 'text-amber-500'}`}>
                {charCount} / 5000 chars {isSufficient ? '(Suficiente)' : `(Mínimo ${minChars})`}
              </span>
              
              <div className="flex flex-col items-end gap-1">
                <button 
                  type="button"
                  onClick={handleImproveText}
                  disabled={!isSufficient || isImproving}
                  className="text-xs px-3 py-1.5 rounded-lg bg-brand-violet/10 border border-brand-violet/20 text-brand-violet font-medium flex items-center gap-1.5 hover:bg-brand-violet/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed group relative"
                >
                  {isImproving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  Mejorar bloque con IA
                  <span className="absolute -top-7 right-0 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-slate-800 text-white text-[10px] px-2 py-1 rounded">
                    Consume 1 mensaje
                  </span>
                </button>
                {aiError && (
                  <p className="text-[10px] text-brand-pink flex items-center gap-1">
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
                  <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed bg-black/20 p-3 rounded-lg border border-white/[0.05] mb-3 max-h-60 overflow-y-auto conversa-scrollbar">
                    {improvedText}
                  </p>
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={discardImprovedText}
                      className="px-3 py-1.5 rounded-lg border border-white/10 text-xs font-medium text-slate-400 hover:text-white hover:bg-white/[0.05] transition-all"
                    >
                      Descartar
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
      </div>
    </motion.div>
  )
}
