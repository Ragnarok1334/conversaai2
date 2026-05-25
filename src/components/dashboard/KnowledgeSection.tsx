'use client'

import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  Brain,
  Sparkles,
  Clock,
  DollarSign,
  HelpCircle,
  MapPin,
  CreditCard,
  ShieldCheck,
  Tag,
  CheckCircle2,
  Scissors,
  UtensilsCrossed,
  Stethoscope,
  ShoppingBag,
  Home,
  Zap,
  Trash2,
  Wand2,
  MessageCircle,
  Bot,
  Lightbulb
} from 'lucide-react'

// ─── Templates ────────────────────────────────────────────────
const TEMPLATES: Record<string, { icon: React.ReactNode; label: string; text: string }> = {
  barberia: {
    icon: <Scissors className="w-4 h-4" />,
    label: 'Barbería',
    text: `Somos Barbería Premium, ubicada en Av. Providencia 1234, Santiago de Chile.

Atendemos de lunes a sábado de 10am a 8pm y los domingos de 11am a 5pm.

Nuestros servicios y precios:
- Corte clásico: $12
- Corte + degradado (fade): $15
- Corte + barba: $18
- Diseño de cejas: $8
- Tratamiento capilar: $20

Formas de pago: efectivo, transferencia bancaria y tarjeta (débito/crédito).

Preguntas frecuentes:
P: ¿Atienden sin cita previa?
R: Sí, pero los fines de semana recomendamos reservar con anticipación.

P: ¿Atienden niños?
R: Sí, con descuento del 20% para menores de 12 años.

P: ¿Tienen estacionamiento?
R: Sí, contamos con estacionamiento gratuito en el sótano.

Política de cancelación: Se puede cancelar hasta 2 horas antes sin costo.`,
  },
  restaurante: {
    icon: <UtensilsCrossed className="w-4 h-4" />,
    label: 'Restaurante',
    text: `Somos Restaurante La Terraza, especialistas en comida mediterránea fresca.

Ubicación: Calle Gran Vía 45, Madrid. Tel: +34 91 123 4567

Horario:
- Lunes a jueves: 1pm - 11pm
- Viernes y sábado: 1pm - 12am
- Domingo: 1pm - 10pm (solo almuerzo)

Nuestra carta principal:
- Paella valenciana (para 2 personas): €28
- Risotto de mariscos: €18
- Carpaccio de ternera: €14
- Menú del día (L-V): €13,50 — incluye primero, segundo, postre y bebida

Alérgenos: contamos con opciones sin gluten, veganas y vegetarianas.

Reservas: Aceptamos reservas para grupos de 2 a 30 personas.

Preguntas frecuentes:
P: ¿Aceptan mascotas?
R: Sí, en nuestra terraza exterior.

P: ¿Tienen parking?
R: No propio, pero hay parking público a 200m.`,
  },
  clinica: {
    icon: <Stethoscope className="w-4 h-4" />,
    label: 'Clínica',
    text: `Somos Clínica Salud Total, centros médicos especializados en medicina general, pediatría y odontología.

Ubicación principal: Calle Reforma 890, Ciudad de México. Tel: +52 55 1234 5678

Horario de atención:
- Lunes a viernes: 8am - 8pm
- Sábados: 9am - 3pm
- Urgencias: 24/7

Especialidades disponibles:
- Medicina general (consulta: $400 MXN)
- Pediatría (consulta: $450 MXN)
- Odontología general ($500 MXN)
- Limpieza dental ($800 MXN)
- Laboratorio clínico (resultados en 24h)

Aceptamos seguros: IMSS, ISSSTE, Seguros Monterrey, GNP, AXA Keralty.

Preguntas frecuentes:
P: ¿Necesito cita para urgencias?
R: No, urgencias se atiende sin cita las 24 horas.

P: ¿Cuánto tarda una consulta?
R: Aproximadamente 30-45 minutos incluyendo exploración.

P: ¿Dan recetas?
R: Sí, todas las consultas incluyen receta médica digital.`,
  },
  tienda: {
    icon: <ShoppingBag className="w-4 h-4" />,
    label: 'Tienda online',
    text: `Somos ModaExpress, tienda online de ropa y accesorios para mujer.

Web: www.modaexpress.com | WhatsApp: +57 300 123 4567

Horario de atención al cliente: lunes a sábado de 9am a 6pm (hora Colombia).

Enviamos a toda Colombia y también a EE.UU., México y España.

Tiempos de entrega:
- Colombia (ciudades principales): 2-3 días hábiles
- Colombia (otras ciudades): 4-6 días hábiles
- Internacional: 10-15 días hábiles

Política de cambios y devoluciones:
- Tienes 15 días calendario desde la recepción para solicitar cambio.
- El producto debe estar sin usar, con etiquetas originales.
- No hacemos devolución en dinero, solo cambio de talla/color o nota crédito.

Formas de pago: Nequi, Daviplata, transferencia bancaria, tarjeta crédito/débito.

Preguntas frecuentes:
P: ¿Cómo sé mi talla?
R: En cada producto hay una tabla de tallas detallada con medidas en cm.

P: ¿Hacen envíos gratis?
R: Sí, compras superiores a $150.000 COP tienen envío gratis.`,
  },
  inmobiliaria: {
    icon: <Home className="w-4 h-4" />,
    label: 'Inmobiliaria',
    text: `Somos PropiedadesPlus, agencia inmobiliaria especializada en compra, venta y arriendo.

Ubicación: Av. Las Condes 11234, Santiago. Tel: +56 2 2345 6789

Servicios que ofrecemos:
- Compra y venta de propiedades residenciales y comerciales
- Arriendo de departamentos, casas y oficinas
- Tasación de propiedades
- Asesoría en créditos hipotecarios (trabajamos con todos los bancos)
- Administración de propiedades en arriendo

Comisión de venta: 2% del precio de venta (más IVA).
Comisión de arriendo: 1 mes de arriendo (una sola vez).

Preguntas frecuentes:
P: ¿Cuánto tarda en promedio vender una propiedad?
R: En condiciones normales de mercado, entre 2 y 4 meses.

P: ¿Trabajan con crédito hipotecario?
R: Sí, te asesoramos gratuitamente con todos los bancos para encontrar la mejor tasa.

P: ¿Qué documentos necesito para arrendar?
R: Cédula de identidad, últimas 3 liquidaciones de sueldo o declaración de renta si eres independiente.`,
  },
}

// ─── What to include ─────────────────────────────────────────────────
const WHAT_TO_INCLUDE = [
  { icon: <ShoppingBag className="w-4 h-4" />, label: 'Servicios y productos', desc: 'Ayuda a explicar qué ofreces.', color: 'text-brand-cyan' },
  { icon: <DollarSign className="w-4 h-4" />, label: 'Precios', desc: 'Permite responder consultas comerciales.', color: 'text-brand-violet' },
  { icon: <Clock className="w-4 h-4" />, label: 'Horarios', desc: 'Evita confusiones sobre disponibilidad.', color: 'text-emerald-400' },
  { icon: <MapPin className="w-4 h-4" />, label: 'Ubicación', desc: 'Ideal para negocios físicos.', color: 'text-fuchsia-400' },
  { icon: <CreditCard className="w-4 h-4" />, label: 'Métodos de pago', desc: 'Reduce preguntas repetidas.', color: 'text-brand-cyan' },
  { icon: <HelpCircle className="w-4 h-4" />, label: 'Preguntas frecuentes', desc: 'Mejora la precisión de respuestas.', color: 'text-brand-blue' },
  { icon: <Tag className="w-4 h-4" />, label: 'Promociones', desc: 'Ayuda a vender ofertas activas.', color: 'text-brand-pink' },
  { icon: <ShieldCheck className="w-4 h-4" />, label: 'Políticas del negocio', desc: 'Evita malentendidos con clientes.', color: 'text-brand-violet' },
  { icon: <MessageCircle className="w-4 h-4" />, label: 'Datos de contacto', desc: 'Permite derivar a un asesor.', color: 'text-emerald-400' },
  { icon: <Clock className="w-4 h-4" />, label: 'Cómo agendar', desc: 'Útil para citas y reservas.', color: 'text-fuchsia-400' },
]

const PLACEHOLDER = `Comienza escribiendo o usa una plantilla rápida de arriba...`

interface KnowledgeSectionProps {
  value: string
  onChange: (v: string) => void
}

export function KnowledgeSection({ value, onChange }: KnowledgeSectionProps) {
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null)
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [improveError, setImproveError] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const charCount = value.length
  const charLimit = 5000

  const applyTemplate = (key: string) => {
    const tpl = TEMPLATES[key]
    if (!tpl) return
    onChange(tpl.text)
    setActiveTemplate(key)
    setTimeout(() => textareaRef.current?.focus(), 100)
  }

  const handleClear = () => {
    onChange('')
    setActiveTemplate(null)
    textareaRef.current?.focus()
  }

  const handleEnhance = async () => {
    if (charCount < 10) {
      setImproveError('Escribe más información antes de mejorar la redacción.')
      return
    }
    setIsEnhancing(true)
    setImproveError('')
    
    try {
      const res = await fetch('/api/ai/improve-business-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: value })
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo mejorar la redacción. Intenta de nuevo.')
      }
      
      if (data.improvedText) {
        onChange(data.improvedText)
      }
    } catch (error: unknown) {
      const err = error as Error
      setImproveError(err.message || 'No se pudo mejorar la redacción. Intenta de nuevo.')
    } finally {
      setIsEnhancing(false)
    }
  }

  // Generar preview dinámico basado en el contenido
  let previewMsg = 'Cuando agregues información, aquí verás una muestra de cómo respondería tu asistente.'
  if (value.length > 30) {
    // Un mock simple para extraer algunas palabras clave
    const hasPrices = value.toLowerCase().includes('$') || value.toLowerCase().includes('precio')
    const hasHours = value.toLowerCase().includes('horario') || value.toLowerCase().includes('lunes')
    
    let msg = 'Gracias por escribirnos. Puedo ayudarte con '
    const topics = []
    if (hasPrices) topics.push('nuestros precios')
    if (hasHours) topics.push('horarios')
    if (topics.length === 0) topics.push('información sobre nuestros servicios')
    
    msg += topics.join(' y ') + '. ¿Qué te gustaría consultar?'
    previewMsg = msg
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8"
    >
      {/* ── Header ── */}
      <div className="relative overflow-hidden rounded-3xl border border-brand-violet/20 bg-gradient-to-br from-[#0a0e1f] to-[#0f142e] p-6 lg:p-8 shadow-xl">
        <div className="absolute top-0 right-0 p-8 opacity-20 pointer-events-none">
          <Brain className="w-32 h-32 text-brand-violet" />
        </div>
        
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-violet/10 border border-brand-violet/20 text-brand-violet text-xs font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            Entrenamiento de IA
          </div>
          
          <h2 className="text-2xl font-bold mb-2">Entrena a tu asistente con la información de tu negocio</h2>
          <p className="text-slate-400 leading-relaxed max-w-2xl text-sm">
            Escribe aquí servicios, precios, horarios, ubicación, promociones y preguntas frecuentes. Mientras más claro seas, mejores respuestas dará tu asistente.
          </p>
        </div>
      </div>

      {/* ── Templates ── */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-slate-300 flex items-center gap-2">
          <Zap className="w-4 h-4 text-brand-cyan" />
          Plantillas rápidas para empezar
        </p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(TEMPLATES).map(([key, tpl]) => (
            <motion.button
              key={key}
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => applyTemplate(key)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                activeTemplate === key
                  ? 'bg-brand-violet/25 border-brand-violet/50 text-white shadow-[0_0_15px_rgba(124,58,237,0.3)]'
                  : 'bg-white/[0.04] border-white/10 text-slate-200 hover:bg-white/[0.08] hover:border-cyan-400/40 hover:text-white'
              }`}
            >
              <span className={activeTemplate === key ? 'text-brand-cyan' : 'text-brand-violet'}>{tpl.icon}</span>
              {tpl.label}
              {activeTemplate === key && <CheckCircle2 className="w-3.5 h-3.5 text-brand-success ml-1" />}
            </motion.button>
          ))}
        </div>
      </div>

      {/* ── Textarea Main ── */}
      <div className="space-y-4">
        <div className="relative group">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={PLACEHOLDER}
            maxLength={charLimit}
            rows={12}
            className="w-full bg-slate-950/70 border border-white/10 rounded-2xl p-5 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20 transition-all resize-y leading-7 min-h-[260px] scrollbar-thin scrollbar-track-slate-900 scrollbar-thumb-slate-700 hover:scrollbar-thumb-cyan-500/50"
          />
          
          <div className="absolute bottom-4 right-5 text-xs font-mono text-slate-500">
            {charCount.toLocaleString()} / {charLimit.toLocaleString()}
          </div>
        </div>

        {/* Action Buttons under textarea */}
        {improveError && (
          <p className="text-sm text-brand-pink bg-brand-pink/10 border border-brand-pink/20 rounded-lg p-3">
            {improveError}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-slate-400">
            {charCount === 0 ? 'Comienza escribiendo o usa una plantilla rápida de arriba.' : 'Puedes editar la información en cualquier momento.'}
          </p>
          
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClear}
              disabled={charCount === 0}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
              Limpiar
            </button>
            <button
              type="button"
              onClick={() => {
                const keys = Object.keys(TEMPLATES)
                const rand = keys[Math.floor(Math.random() * keys.length)]
                applyTemplate(rand)
              }}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-200 border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] transition-all"
            >
              Usar ejemplo
            </button>
            <button
              type="button"
              onClick={handleEnhance}
              disabled={charCount < 10 || isEnhancing}
              className="px-4 py-2 rounded-xl text-sm font-medium text-white border border-brand-violet/40 bg-brand-violet/20 hover:bg-brand-violet/30 hover:border-brand-violet/60 transition-all flex items-center gap-2 shadow-[0_0_10px_rgba(124,58,237,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Wand2 className={`w-4 h-4 ${isEnhancing ? 'animate-spin' : ''}`} />
              {isEnhancing ? 'Mejorando...' : 'Mejorar redacción ✨'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Dynamic Preview ── */}
      <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
          <Bot className="w-4 h-4 text-brand-cyan" />
          Vista previa del asistente
        </h3>
        <div className="flex gap-4">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-violet to-brand-cyan flex items-center justify-center shrink-0">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div className="bg-white/[0.06] border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-slate-200 max-w-[85%] leading-relaxed">
            {previewMsg}
          </div>
        </div>
      </div>

      {/* ── What to include Checklist ── */}
      <div className="space-y-4 pt-4 border-t border-white/5">
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">Qué información debes incluir</h3>
          <p className="text-sm text-slate-400">Estos datos ayudan a que tu asistente responda mejor y no invente información.</p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {WHAT_TO_INCLUDE.map((item) => (
            <div key={item.label} className="group p-4 rounded-2xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.07] hover:border-cyan-400/40 transition-all cursor-default">
              <div className="flex items-center gap-3 mb-1">
                <div className={`p-2 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors ${item.color}`}>
                  {item.icon}
                </div>
                <h4 className="text-sm font-medium text-white">{item.label}</h4>
              </div>
              <p className="text-xs text-slate-400 pl-11">{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 rounded-2xl border border-brand-cyan/20 bg-brand-cyan/5 flex gap-4 items-start">
          <Lightbulb className="w-5 h-5 text-brand-cyan shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-brand-cyan mb-1">Consejo destacado</p>
            <p className="text-sm text-slate-300 leading-relaxed">
              No escribas solo &quot;vendemos productos&quot;. Agrega nombres, precios, horarios y respuestas reales que usarías con tus clientes.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
