'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
  ChevronDown,
  ChevronUp,
  Lightbulb,
  CheckCircle2,
  Scissors,
  UtensilsCrossed,
  Stethoscope,
  ShoppingBag,
  Home,
  Zap,
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

// ─── Tips data ─────────────────────────────────────────────────
const QUICK_TIPS = [
  { icon: <CheckCircle2 className="w-3.5 h-3.5" />, text: 'Sé específico y detallado', color: 'text-brand-success' },
  { icon: <Clock className="w-3.5 h-3.5" />, text: 'Incluye horarios exactos', color: 'text-brand-cyan' },
  { icon: <DollarSign className="w-3.5 h-3.5" />, text: 'Agrega precios cuando puedas', color: 'text-brand-violet' },
  { icon: <HelpCircle className="w-3.5 h-3.5" />, text: 'Añade preguntas frecuentes', color: 'text-brand-blue' },
  { icon: <Tag className="w-3.5 h-3.5" />, text: 'Explica promociones y ofertas', color: 'text-brand-pink' },
  { icon: <CreditCard className="w-3.5 h-3.5" />, text: 'Menciona formas de pago', color: 'text-brand-cyan' },
  { icon: <MapPin className="w-3.5 h-3.5" />, text: 'Incluye dirección y contacto', color: 'text-brand-success' },
  { icon: <ShieldCheck className="w-3.5 h-3.5" />, text: 'Indica políticas del negocio', color: 'text-brand-violet' },
]

const ADVANCED_TIPS = [
  { title: 'Evita información ambigua', desc: 'Si dices "precios desde $X", aclara qué incluye cada opción para evitar confusiones.' },
  { title: 'Escribe como hablarías', desc: 'Tu asistente aprenderá tu tono. Si escribes formal, responderá formal. Si escribes amigable, responderá amigable.' },
  { title: 'Actualiza cuando cambies', desc: 'Si cambias precios o productos, recuerda editar el asistente para mantener la información al día.' },
  { title: 'Incluye manejo de quejas', desc: 'Indica cómo debe responder ante quejas o situaciones difíciles: "Si el cliente está molesto, disculparte y derivar a..."' },
]

const WHAT_TO_INCLUDE = [
  { icon: <ShoppingBag className="w-4 h-4" />, label: 'Productos / Servicios' },
  { icon: <DollarSign className="w-4 h-4" />, label: 'Precios' },
  { icon: <Clock className="w-4 h-4" />, label: 'Horarios' },
  { icon: <HelpCircle className="w-4 h-4" />, label: 'Preguntas frecuentes' },
  { icon: <CreditCard className="w-4 h-4" />, label: 'Formas de pago' },
  { icon: <MapPin className="w-4 h-4" />, label: 'Ubicación / Contacto' },
  { icon: <Tag className="w-4 h-4" />, label: 'Promociones' },
  { icon: <ShieldCheck className="w-4 h-4" />, label: 'Políticas' },
]

const PLACEHOLDER = `Ejemplo:
Somos una barbería ubicada en Santiago de Chile.
Atendemos de lunes a sábado de 10am a 8pm.

Nuestros servicios principales son:
- Corte clásico: $12
- Fade: $15
- Corte + barba: $18
- Diseño de cejas: $8

Aceptamos efectivo y transferencia bancaria.
La dirección es Av. Providencia 1234.

Preguntas frecuentes:
- ¿Atienden sin cita? Sí, pero recomendamos reservar los fines de semana.
- ¿Atienden niños? Sí, con descuento del 20%.

Política de cancelación: Se puede cancelar hasta 2 horas antes sin costo.`

// ─── Main component ────────────────────────────────────────────
interface KnowledgeSectionProps {
  value: string
  onChange: (v: string) => void
}

export function KnowledgeSection({ value, onChange }: KnowledgeSectionProps) {
  const [showAdvancedTips, setShowAdvancedTips] = useState(false)
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null)
  const [focused, setFocused] = useState(false)
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

  const quality = charCount === 0 ? 0 : charCount < 300 ? 1 : charCount < 800 ? 2 : charCount < 1500 ? 3 : 4
  const qualityLabel = ['Sin información', 'Básico', 'Aceptable', 'Bueno', 'Excelente']
  const qualityColor = ['bg-white/10', 'bg-brand-pink', 'bg-yellow-500', 'bg-brand-cyan', 'bg-brand-success']
  const qualityTextColor = ['text-text-soft', 'text-brand-pink', 'text-yellow-400', 'text-brand-cyan', 'text-brand-success']

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* ── Header ── */}
      <div className="relative overflow-hidden rounded-2xl border border-brand-violet/25 bg-gradient-to-br from-brand-violet/10 via-brand-blue/5 to-brand-cyan/10 p-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(124,58,237,0.12),transparent_60%)]" />
        <div className="relative z-10 flex gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-violet to-brand-blue flex items-center justify-center shadow-[0_0_24px_rgba(124,58,237,0.4)] flex-shrink-0">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-bold">Conocimiento del asistente</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-brand-violet/20 border border-brand-violet/30 text-brand-violet font-medium flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> IA
              </span>
            </div>
            <p className="text-sm text-text-soft leading-relaxed max-w-lg">
              Aquí enseñas a tu asistente todo sobre tu negocio. Cuanta más información proporciones, mejores y más precisas serán sus respuestas.
            </p>
          </div>
        </div>
      </div>

      {/* ── What to include ── */}
      <div className="bg-card-bg/60 backdrop-blur border border-white/[0.08] rounded-2xl p-6 space-y-4">
        <p className="text-sm font-semibold text-text-secondary">¿Qué debes incluir?</p>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3">
          {WHAT_TO_INCLUDE.map((item) => (
            <div key={item.label} className="flex items-center gap-3 text-xs text-text-soft p-3 rounded-xl bg-white/[0.02] border border-white/[0.08] hover:bg-white/[0.05] hover:border-brand-violet/30 transition-all group">
              <div className="w-8 h-8 rounded-lg bg-white/[0.04] group-hover:bg-brand-cyan/10 flex items-center justify-center shrink-0 transition-colors">
                <span className="text-brand-cyan opacity-80 group-hover:opacity-100 transition-opacity">{item.icon}</span>
              </div>
              <span className="font-medium leading-snug">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Template selector ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-brand-cyan" />
          <p className="text-sm font-semibold">Ejemplos rápidos — haz clic para rellenar automáticamente</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(TEMPLATES).map(([key, tpl]) => (
            <motion.button
              key={key}
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => applyTemplate(key)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                activeTemplate === key
                  ? 'bg-brand-violet/25 border-brand-violet/50 text-white shadow-[0_0_16px_rgba(124,58,237,0.3)]'
                  : 'bg-white/[0.04] border-white/[0.1] text-text-soft hover:text-text-main hover:border-brand-violet/30 hover:bg-brand-violet/10'
              }`}
            >
              {tpl.icon}
              {tpl.label}
              {activeTemplate === key && <CheckCircle2 className="w-3.5 h-3.5 text-brand-success ml-1" />}
            </motion.button>
          ))}
        </div>
        {activeTemplate && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs text-brand-success flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Ejemplo de {TEMPLATES[activeTemplate].label} aplicado. Edítalo con la información real de tu negocio.
          </motion.p>
        )}
      </div>

      {/* ── Textarea ── */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-text-secondary block">
          Información de tu negocio
          <span className="ml-2 text-xs text-text-soft font-normal">(escribe con tus propias palabras)</span>
        </label>
        <div className={`relative rounded-2xl transition-all duration-200 ${focused ? 'shadow-[0_0_0_1px_rgba(124,58,237,0.5),0_0_24px_rgba(124,58,237,0.12)]' : ''}`}>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={PLACEHOLDER}
            maxLength={charLimit}
            rows={14}
            className="w-full bg-[#0a0e1f] border border-white/[0.1] rounded-2xl px-5 py-4 text-sm text-text-main placeholder:text-text-soft/30 focus:outline-none focus:border-brand-violet/40 transition-all resize-y leading-relaxed font-mono"
            style={{ minHeight: '280px' }}
          />
          {/* char count overlay */}
          <div className="absolute bottom-3 right-4 text-[10px] text-text-soft/40 pointer-events-none">
            {charCount.toLocaleString()} / {charLimit.toLocaleString()}
          </div>
        </div>

        {/* Quality bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full transition-all ${qualityColor[quality]}`}
              animate={{ width: `${(quality / 4) * 100}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
          <span className={`text-xs font-semibold whitespace-nowrap ${qualityTextColor[quality]}`}>
            {qualityLabel[quality]}
          </span>
        </div>
        <p className="text-xs text-text-soft">
          {charCount === 0
            ? 'Comienza escribiendo o usa uno de los ejemplos rápidos de arriba ↑'
            : charCount < 300
            ? 'Añade más información: servicios, precios, horarios y preguntas frecuentes.'
            : charCount < 800
            ? 'Bien. Agrega más detalles como precios, formas de pago o políticas.'
            : '✓ Excelente base de conocimiento. Más detalle = mejores respuestas.'}
        </p>
      </div>

      {/* ── Quick tips ── */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
        {QUICK_TIPS.map((tip) => (
          <div
            key={tip.text}
            className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs text-text-soft hover:bg-white/[0.05] transition-colors"
          >
            <span className={`shrink-0 ${tip.color}`}>{tip.icon}</span>
            <span className="leading-snug">{tip.text}</span>
          </div>
        ))}
      </div>

      {/* ── Advanced tips collapsible ── */}
      <div className="rounded-2xl border border-white/[0.08] overflow-hidden">
        <button
          type="button"
          onClick={() => setShowAdvancedTips(v => !v)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Lightbulb className="w-4 h-4 text-brand-cyan" />
            <span className="text-sm font-semibold">Consejos para mejores respuestas</span>
          </div>
          <motion.div animate={{ rotate: showAdvancedTips ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="w-4 h-4 text-text-soft" />
          </motion.div>
        </button>

        <AnimatePresence>
          {showAdvancedTips && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-5 pt-1 grid sm:grid-cols-2 gap-3 border-t border-white/[0.06]">
                {ADVANCED_TIPS.map((tip) => (
                  <div key={tip.title} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-1">
                    <p className="text-sm font-semibold text-text-secondary flex items-center gap-2">
                      <Lightbulb className="w-3.5 h-3.5 text-brand-cyan flex-shrink-0" />
                      {tip.title}
                    </p>
                    <p className="text-xs text-text-soft leading-relaxed">{tip.desc}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
