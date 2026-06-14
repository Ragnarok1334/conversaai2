'use client'

import { motion } from 'framer-motion'
import {
  Smile, Briefcase, TrendingUp, MessageCircle, Zap,
  Users, HelpCircle, ShoppingBag, Calendar, HeadphonesIcon,
  Gauge, ChevronDown, ChevronUp, Info,
  UserCheck, Phone, Clock, GitMerge,
  DollarSign, Ban, Globe, CheckCircle2, Activity
} from 'lucide-react'
import { BuilderFormData } from './types'
import { useState } from 'react'

export function calculateIndicators(behavior: BuilderFormData['behavior']) {
  const { goal, rules, salesLevel, tone } = behavior

  // Captura de leads
  let leadsScore = 0
  if (goal === 'captar leads') leadsScore += 2
  if (rules.askName) leadsScore += 1
  if (rules.askContact) leadsScore += 2
  if (rules.suggestAppointment) leadsScore += 1
  if (salesLevel === 'Alto') leadsScore += 1

  let leadsIndicator = 'Baja'
  if (leadsScore >= 4) leadsIndicator = 'Alta'
  else if (leadsScore >= 2) leadsIndicator = 'Media'

  // Control de respuesta
  let controlScore = 0
  if (rules.doNotInvent) controlScore += 2
  if (rules.escalateIfUnknown) controlScore += 1
  if (rules.alwaysSpanish) controlScore += 1
  if (!rules.offerPricesWhenAsked) controlScore += 1

  let controlIndicator = 'Flexible'
  if (controlScore >= 4) controlIndicator = 'Estricto'
  else if (controlScore >= 2) controlIndicator = 'Controlado'

  // Fricción
  let frictionScore = 0
  if (rules.askName) frictionScore += 1
  if (rules.askContact) frictionScore += 2
  if (rules.suggestAppointment) frictionScore += 1
  if (salesLevel === 'Alto') frictionScore += 1

  let frictionIndicator = 'Baja'
  if (frictionScore >= 4) frictionIndicator = 'Alta'
  else if (frictionScore >= 2) frictionIndicator = 'Media'

  // Estilo Comercial
  let styleScore = 0
  if (salesLevel === 'Alto') styleScore += 2
  else if (salesLevel === 'Medio') styleScore += 1
  if (tone === 'vendedor') styleScore += 1
  if (goal === 'vender productos' || goal === 'captar leads') styleScore += 1

  let styleIndicator = 'Informativo'
  if (styleScore >= 3) styleIndicator = 'Proactivo'
  else if (styleScore >= 1) styleIndicator = 'Equilibrado'

  return { leadsIndicator, controlIndicator, frictionIndicator, styleIndicator }
}

export function getRecommendation(inds: ReturnType<typeof calculateIndicators>) {
  if (inds.leadsIndicator === 'Alta' && inds.frictionIndicator === 'Alta') {
    return 'Esta configuración es agresiva para captar leads. Úsala si tu prioridad es conseguir datos de contacto rápidamente.'
  }
  if (inds.controlIndicator === 'Estricto') {
    return 'Configuración segura: el asistente evitará inventar información y derivará cuando no tenga contexto.'
  }
  if (inds.frictionIndicator === 'Baja') {
    return 'Configuración suave: ideal para atención informativa, pero puede capturar menos datos.'
  }
  if (inds.styleIndicator === 'Proactivo') {
    return 'El asistente guiará al visitante hacia la siguiente acción con más frecuencia.'
  }
  return 'Configuración equilibrada, adecuada para la mayoría de los casos de uso.'
}

interface Props {
  form: BuilderFormData
  setForm: (form: BuilderFormData) => void
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface OptionCardProps {
  selected: boolean
  onClick: () => void
  icon: React.ReactNode
  title: string
  description: string
  color: string
}

interface RuleToggleProps {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  description: string
  impact: string
  icon: React.ReactNode
}

// ─── Option Card ─────────────────────────────────────────────────────────────

function OptionCard({ selected, onClick, icon, title, description, color }: OptionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left p-3.5 rounded-xl border transition-all group ${
        selected
          ? `border-brand-cyan/50 bg-brand-cyan/5 shadow-[0_0_12px_rgba(34,211,238,0.1)]`
          : 'border-white/[0.08] bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 shrink-0 ${selected ? color : 'text-slate-500 group-hover:text-slate-400'} transition-colors`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className={`text-sm font-semibold capitalize leading-tight mb-0.5 transition-colors ${selected ? 'text-white' : 'text-slate-400 group-hover:text-slate-300'}`}>
            {title}
          </p>
          <p className="text-[11px] text-slate-500 leading-snug">{description}</p>
        </div>
        <div className={`ml-auto shrink-0 w-4 h-4 rounded-full border mt-0.5 transition-all ${
          selected ? 'border-brand-cyan bg-brand-cyan' : 'border-white/20'
        }`}>
          {selected && <CheckCircle2 className="w-4 h-4 text-slate-950" />}
        </div>
      </div>
    </button>
  )
}

// ─── Rule Toggle ─────────────────────────────────────────────────────────────

function RuleToggle({ checked, onChange, label, description, impact, icon }: RuleToggleProps) {
  const isChecked = Boolean(checked)
  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
        isChecked
          ? 'border-brand-cyan/25 bg-brand-cyan/[0.04]'
          : 'border-white/[0.06] bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.03]'
      }`}
      onClick={() => onChange(!isChecked)}
    >
      <div className={`mt-0.5 shrink-0 ${isChecked ? 'text-brand-cyan' : 'text-slate-500'} transition-colors`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium leading-tight mb-0.5 ${isChecked ? 'text-white' : 'text-slate-400'} transition-colors`}>
          {label}
        </p>
        <p className="text-[11px] text-slate-500 leading-snug">{description}</p>
        <p className="text-[10px] text-slate-400 font-medium leading-snug mt-1.5">{impact}</p>
      </div>
      <div
        className={`mt-0.5 shrink-0 w-9 h-5 rounded-full border transition-all relative ${
          isChecked ? 'bg-brand-cyan border-brand-cyan' : 'bg-white/5 border-white/20'
        }`}
      >
        <span className={`absolute top-0.5 w-3.5 h-3.5 rounded-full transition-all ${
          isChecked ? 'left-[18px] bg-slate-950' : 'left-0.5 bg-white/40'
        }`} />
      </div>
    </div>
  )
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const TONE_OPTIONS = [
  { value: 'amigable', title: 'Amigable', description: 'Cercano, cálido y fácil de entender.', icon: <Smile className="w-4 h-4" />, color: 'text-yellow-400' },
  { value: 'profesional', title: 'Profesional', description: 'Formal, claro y orientado a confianza.', icon: <Briefcase className="w-4 h-4" />, color: 'text-blue-400' },
  { value: 'vendedor', title: 'Vendedor', description: 'Persuasivo, enfocado en conversión.', icon: <TrendingUp className="w-4 h-4" />, color: 'text-green-400' },
  { value: 'cercano', title: 'Cercano', description: 'Natural, humano y conversacional.', icon: <MessageCircle className="w-4 h-4" />, color: 'text-violet-400' },
  { value: 'directo', title: 'Directo', description: 'Breve, preciso y sin rodeos.', icon: <Zap className="w-4 h-4" />, color: 'text-orange-400' },
]

const GOAL_OPTIONS = [
  { value: 'captar leads', title: 'Captar Leads', description: 'Solicita datos de contacto cuando detecta interés.', icon: <Users className="w-4 h-4" />, color: 'text-cyan-400' },
  { value: 'responder faq', title: 'Responder FAQ', description: 'Responde preguntas frecuentes con la info del negocio.', icon: <HelpCircle className="w-4 h-4" />, color: 'text-blue-400' },
  { value: 'vender productos', title: 'Vender Productos', description: 'Orienta al cliente hacia productos, precios y compra.', icon: <ShoppingBag className="w-4 h-4" />, color: 'text-green-400' },
  { value: 'agendar citas', title: 'Agendar Citas', description: 'Propone horarios y recopila datos para reservar.', icon: <Calendar className="w-4 h-4" />, color: 'text-purple-400' },
  { value: 'dar soporte', title: 'Dar Soporte', description: 'Ayuda a resolver dudas y deriva si no sabe.', icon: <HeadphonesIcon className="w-4 h-4" />, color: 'text-slate-400' },
]

const SALES_OPTIONS = [
  { value: 'Bajo', title: 'Bajo', description: 'Prioriza ayudar, sin insistir en venta.', icon: <Gauge className="w-4 h-4" />, color: 'text-slate-400' },
  { value: 'Medio', title: 'Medio', description: 'Equilibra ayuda y conversión.', icon: <Gauge className="w-4 h-4" />, color: 'text-yellow-400' },
  { value: 'Alto', title: 'Alto', description: 'Busca captar datos y cerrar la siguiente acción.', icon: <Gauge className="w-4 h-4" />, color: 'text-green-400' },
]

const PRESETS = [
  {
    id: 'segura',
    title: 'Atención segura',
    behavior: { tone: 'profesional', goal: 'responder faq', salesLevel: 'Bajo', rules: { askName: false, askContact: false, suggestAppointment: false, escalateIfUnknown: true, doNotInvent: true, alwaysSpanish: true, offerPricesWhenAsked: true } }
  },
  {
    id: 'equilibrada',
    title: 'Captación equilibrada',
    behavior: { tone: 'cercano', goal: 'captar leads', salesLevel: 'Medio', rules: { askName: true, askContact: true, suggestAppointment: false, escalateIfUnknown: true, doNotInvent: true, alwaysSpanish: true, offerPricesWhenAsked: true } }
  },
  {
    id: 'proactiva',
    title: 'Ventas proactivas',
    behavior: { tone: 'vendedor', goal: 'vender productos', salesLevel: 'Alto', rules: { askName: true, askContact: true, suggestAppointment: true, escalateIfUnknown: true, doNotInvent: true, alwaysSpanish: true, offerPricesWhenAsked: true } }
  },
  {
    id: 'conservador',
    title: 'Soporte conservador',
    behavior: { tone: 'profesional', goal: 'dar soporte', salesLevel: 'Bajo', rules: { askName: false, askContact: false, suggestAppointment: false, escalateIfUnknown: true, doNotInvent: true, alwaysSpanish: true, offerPricesWhenAsked: false } }
  }
]

// ─── Behavior Summary ─────────────────────────────────────────────────────────

function buildBehaviorSummary(form: BuilderFormData): string {
  const { tone, goal, salesLevel, rules } = form.behavior

  const toneLabels: Record<string, string> = {
    amigable: 'amigable', profesional: 'profesional', vendedor: 'vendedor', cercano: 'cercano', directo: 'directo'
  }
  const goalLabels: Record<string, string> = {
    'captar leads': 'captar leads', 'responder faq': 'responder preguntas frecuentes',
    'vender productos': 'vender productos', 'agendar citas': 'agendar citas', 'dar soporte': 'dar soporte'
  }
  const salesLabels: Record<string, string> = {
    Bajo: 'baja', Medio: 'media', Alto: 'alta'
  }

  const activeRuleParts: string[] = []
  if (rules.askName) activeRuleParts.push('pedirá el nombre al cliente')
  if (rules.askContact) activeRuleParts.push('solicitará teléfono o correo')
  if (rules.suggestAppointment) activeRuleParts.push('sugerirá agendar una cita')
  if (rules.escalateIfUnknown) activeRuleParts.push('derivará si no sabe')
  if (rules.doNotInvent) activeRuleParts.push('evitará inventar información')
  if (rules.alwaysSpanish) activeRuleParts.push('responderá siempre en español')

  let summary = `Tu asistente responderá con tono ${toneLabels[tone] || tone}, enfocado en ${goalLabels[goal] || goal}, con intensidad comercial ${salesLabels[salesLevel] || salesLevel}.`

  if (activeRuleParts.length > 0) {
    summary += ` Además, ${activeRuleParts.join(', ')}.`
  }

  return summary
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function BehaviorStep({ form, setForm }: Props) {
  const [appliedPreset, setAppliedPreset] = useState<string | null>(null)

  const updateBehavior = (key: keyof BuilderFormData['behavior'], val: string) => {
    setAppliedPreset(null)
    setForm({ ...form, behavior: { ...form.behavior, [key]: val } })
  }

  const updateRule = (ruleKey: keyof BuilderFormData['behavior']['rules'], val: boolean) => {
    setAppliedPreset(null)
    setForm({
      ...form,
      behavior: {
        ...form.behavior,
        rules: { ...form.behavior.rules, [ruleKey]: val }
      }
    })
  }

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setAppliedPreset(preset.id)
    setForm({
      ...form,
      behavior: {
        ...form.behavior,
        ...preset.behavior
      }
    })
  }

  const rules = form.behavior?.rules ?? {}
  const summary = buildBehaviorSummary(form)
  const inds = calculateIndicators(form.behavior)
  const recommendation = getRecommendation(inds)

  const previewText = () => {
    let text = 'Hola, puedo ayudarte con lo que necesites.'
    if (rules.askName && rules.askContact) {
      text += ' Para orientarte mejor y darte seguimiento, ¿me compartes tu nombre y contacto?'
    } else if (rules.askName) {
      text += ' Para orientarte mejor, ¿me compartes tu nombre?'
    } else if (rules.askContact) {
      text += ' También puedo tomar tu teléfono o correo para que el equipo te dé seguimiento.'
    }
    
    if (rules.suggestAppointment) {
      text += ' Si prefieres, podemos agendar una cita.'
    }

    if (rules.doNotInvent && rules.escalateIfUnknown) {
      text += ' Si no tengo esa información, te lo diré y te ofreceré contacto con un asesor humano.'
    }
    return text
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      <div className="bg-card-bg/60 backdrop-blur border border-white/10 rounded-3xl p-6 lg:p-8 shadow-xl">
        {/* Header */}
        <div className="border-b border-white/[0.06] pb-5 mb-6">
          <h2 className="font-semibold text-xl mb-1 text-white">Diseña cómo responderá tu asistente</h2>
          <p className="text-sm text-slate-400">Configura la personalidad, objetivo y reglas que usará tu asistente en cada conversación.</p>
        </div>

        <div className="space-y-8">
          {/* ── Configuraciones Rápidas (Presets) ────────────────────── */}
          <section>
            <div className="mb-3">
              <label className="text-sm font-semibold text-slate-200 block mb-0.5">Configuraciones rápidas</label>
              <p className="text-xs text-slate-500">Elige un perfil recomendado o ajusta las reglas manualmente abajo.</p>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {PRESETS.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => applyPreset(preset)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    appliedPreset === preset.id 
                      ? 'bg-brand-violet/10 border-brand-violet/50 shadow-[0_0_15px_rgba(139,92,246,0.15)]' 
                      : 'bg-white/[0.02] border-white/[0.08] hover:bg-white/[0.05] hover:border-white/20'
                  }`}
                >
                  <p className={`text-sm font-semibold mb-1 ${appliedPreset === preset.id ? 'text-brand-purple' : 'text-slate-300'}`}>{preset.title}</p>
                  {appliedPreset === preset.id && (
                    <span className="text-[9px] uppercase tracking-wider font-bold bg-brand-violet text-white px-1.5 py-0.5 rounded flex items-center gap-1 w-max">
                      <CheckCircle2 className="w-3 h-3" /> Preset aplicado
                    </span>
                  )}
                </button>
              ))}
            </div>
          </section>

          {/* ── Tono ─────────────────────────────────────────────────────── */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <label className="text-sm font-semibold text-slate-200 block">Tono del asistente</label>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan font-medium capitalize">{form.behavior.tone}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {TONE_OPTIONS.map((opt) => (
                <OptionCard
                  key={opt.value}
                  selected={form.behavior.tone === opt.value}
                  onClick={() => updateBehavior('tone', opt.value)}
                  icon={opt.icon}
                  title={opt.title}
                  description={opt.description}
                  color={opt.color}
                />
              ))}
            </div>
          </section>

          {/* ── Objetivo ─────────────────────────────────────────────────── */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <label className="text-sm font-semibold text-slate-200 block">Objetivo de atención</label>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-violet/10 border border-brand-violet/20 text-brand-purple font-medium capitalize">{form.behavior.goal}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {GOAL_OPTIONS.map((opt) => (
                <OptionCard
                  key={opt.value}
                  selected={form.behavior.goal === opt.value}
                  onClick={() => updateBehavior('goal', opt.value)}
                  icon={opt.icon}
                  title={opt.title}
                  description={opt.description}
                  color={opt.color}
                />
              ))}
            </div>
          </section>

          {/* ── Intensidad Comercial ──────────────────────────────────────── */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <label className="text-sm font-semibold text-slate-200 block">Intensidad comercial</label>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-slate-400 font-medium">{form.behavior.salesLevel}</span>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {SALES_OPTIONS.map((opt) => (
                <OptionCard
                  key={opt.value}
                  selected={form.behavior.salesLevel === opt.value}
                  onClick={() => updateBehavior('salesLevel', opt.value)}
                  icon={opt.icon}
                  title={opt.title}
                  description={opt.description}
                  color={opt.color}
                />
              ))}
            </div>
          </section>

          {/* ── Reglas de Atención ────────────────────────────────────────── */}
          <section>
            <div className="mb-3">
              <label className="text-sm font-semibold text-slate-200 block mb-0.5">Reglas de atención</label>
              <p className="text-xs text-slate-500">Estas reglas modifican cómo responderá el asistente en el Web Chat y en las pruebas.</p>
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
              {/* Grupo A: Captura y seguimiento */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-2 px-1">Captura y seguimiento</p>
                <div className="space-y-2">
                  <RuleToggle
                    checked={Boolean(rules.askName)}
                    onChange={(v) => updateRule('askName', v)}
                    label="Pedir nombre del cliente"
                    description="Personaliza la conversación y ayuda a identificar al visitante."
                    impact="Impacto: Mejora seguimiento · Aumenta fricción"
                    icon={<UserCheck className="w-4 h-4" />}
                  />
                  <RuleToggle
                    checked={Boolean(rules.askContact)}
                    onChange={(v) => updateRule('askContact', v)}
                    label="Pedir teléfono o correo"
                    description="Convierte conversaciones en leads para seguimiento comercial."
                    impact="Impacto: Más leads · Mayor fricción"
                    icon={<Phone className="w-4 h-4" />}
                  />
                  <RuleToggle
                    checked={Boolean(rules.suggestAppointment)}
                    onChange={(v) => updateRule('suggestAppointment', v)}
                    label="Sugerir agendar una cita"
                    description="Propone una siguiente acción cuando detecta interés."
                    impact="Impacto: Más conversión · Mayor fricción"
                    icon={<Clock className="w-4 h-4" />}
                  />
                  <RuleToggle
                    checked={Boolean(rules.escalateIfUnknown)}
                    onChange={(v) => updateRule('escalateIfUnknown', v)}
                    label="Derivar a humano si no sabe"
                    description="Evita respuestas vacías y ofrece contacto humano cuando falte información."
                    impact="Impacto: Más control · Mejor soporte"
                    icon={<GitMerge className="w-4 h-4" />}
                  />
                </div>
              </div>

              {/* Grupo B: Control de respuesta */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-2 px-1">Control de respuesta</p>
                <div className="space-y-2">
                  <RuleToggle
                    checked={Boolean(rules.offerPricesWhenAsked)}
                    onChange={(v) => updateRule('offerPricesWhenAsked', v)}
                    label="Ofrecer precios cuando pregunten"
                    description="Responde con precios solo si existen en el entrenamiento."
                    impact="Impacto: Mejor respuesta comercial"
                    icon={<DollarSign className="w-4 h-4" />}
                  />
                  <RuleToggle
                    checked={Boolean(rules.doNotInvent)}
                    onChange={(v) => updateRule('doNotInvent', v)}
                    label="No inventar información"
                    description="Evita respuestas falsas cuando no hay datos suficientes."
                    impact="Impacto: Más seguridad · Menos riesgo"
                    icon={<Ban className="w-4 h-4" />}
                  />
                  <RuleToggle
                    checked={Boolean(rules.alwaysSpanish)}
                    onChange={(v) => updateRule('alwaysSpanish', v)}
                    label="Responder siempre en español"
                    description="Mantiene el idioma de atención consistente."
                    impact="Impacto: Control de idioma"
                    icon={<Globe className="w-4 h-4" />}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* ── Vista Previa Dinámica ─────────────────────────────────────── */}
          <section className="bg-black/30 border border-white/5 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white flex items-center justify-between mb-3">
              Así cambiará la respuesta
              <span className="text-[10px] font-medium text-amber-500/80 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                Simulación local · No consume mensajes
              </span>
            </h3>
            <div className="bg-brand-violet/10 border border-brand-violet/20 rounded-2xl px-4 py-3 rounded-tl-sm self-start max-w-[85%] text-sm text-slate-300 relative">
              <span className="text-[10px] absolute -top-4 text-slate-500 font-bold tracking-wider">EJEMPLO</span>
              {previewText()}
            </div>
          </section>

          {/* ── Panel de Impacto del Comportamiento ───────────────────────── */}
          <section className="bg-card-bg/80 backdrop-blur-md border border-white/10 rounded-2xl p-5">
            <div className="mb-4">
              <h3 className="text-base font-semibold text-white mb-1 flex items-center gap-2"><Activity className="w-4 h-4 text-brand-cyan" /> Impacto del comportamiento</h3>
              <p className="text-xs text-slate-400">Estos indicadores cambian según el tono, objetivo, nivel comercial y reglas activas.</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-3 bg-white/5 rounded-xl border border-white/[0.05]">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Captación de leads</p>
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-semibold ${inds.leadsIndicator === 'Alta' ? 'text-brand-success' : inds.leadsIndicator === 'Media' ? 'text-amber-400' : 'text-slate-400'}`}>{inds.leadsIndicator}</span>
                </div>
              </div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/[0.05]">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Control de respuesta</p>
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-semibold ${inds.controlIndicator === 'Estricto' ? 'text-brand-violet' : inds.controlIndicator === 'Controlado' ? 'text-brand-cyan' : 'text-slate-400'}`}>{inds.controlIndicator}</span>
                </div>
              </div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/[0.05]">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Fricción para visitante</p>
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-semibold ${inds.frictionIndicator === 'Alta' ? 'text-brand-pink' : inds.frictionIndicator === 'Media' ? 'text-amber-400' : 'text-slate-400'}`}>{inds.frictionIndicator}</span>
                </div>
              </div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/[0.05]">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Estilo comercial</p>
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-semibold ${inds.styleIndicator === 'Proactivo' ? 'text-brand-success' : inds.styleIndicator === 'Equilibrado' ? 'text-brand-cyan' : 'text-slate-400'}`}>{inds.styleIndicator}</span>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-brand-cyan/5 border border-brand-cyan/20">
              <p className="text-xs text-brand-cyan font-medium flex items-center gap-2">
                <Info className="w-4 h-4 shrink-0" />
                {recommendation}
              </p>
            </div>
            <p className="text-[10px] text-slate-500 text-center mt-3">Las reglas no consumen mensajes adicionales. Solo se debita 1 mensaje por cada respuesta real.</p>
          </section>
        </div>
      </div>
    </motion.div>
  )
}
