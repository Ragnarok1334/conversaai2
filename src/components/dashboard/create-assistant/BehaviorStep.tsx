'use client'

import { motion } from 'framer-motion'
import {
  Smile, Briefcase, TrendingUp, MessageCircle, Zap,
  Users, HelpCircle, ShoppingBag, Calendar, HeadphonesIcon,
  Gauge, UserCheck, Phone, Clock, GitMerge,
  DollarSign, Ban, Globe, CheckCircle2, Activity, MessageSquareText
} from 'lucide-react'
import { BuilderFormData } from './types'
import { useState } from 'react'

interface Props {
  form: BuilderFormData
  setForm: (form: BuilderFormData) => void
}

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

export function calculateIndicators(behavior: BuilderFormData['behavior']) {
  const { goal, rules, salesLevel, tone } = behavior
  let leadsScore = 0
  if (goal === 'captar leads') leadsScore += 2
  if (rules.askName) leadsScore += 1
  if (rules.askContact) leadsScore += 2
  if (rules.suggestAppointment) leadsScore += 1
  if (salesLevel === 'Alto') leadsScore += 1

  let leadsIndicator = 'Baja'
  if (leadsScore >= 4) leadsIndicator = 'Alta'
  else if (leadsScore >= 2) leadsIndicator = 'Media'

  let controlScore = 0
  if (rules.doNotInvent) controlScore += 2
  if (rules.escalateIfUnknown) controlScore += 1
  if (rules.alwaysSpanish) controlScore += 1
  if (!rules.offerPricesWhenAsked) controlScore += 1
  let controlIndicator = 'Flexible'
  if (controlScore >= 4) controlIndicator = 'Estricto'
  else if (controlScore >= 2) controlIndicator = 'Controlado'

  let frictionScore = 0
  if (rules.askName) frictionScore += 1
  if (rules.askContact) frictionScore += 2
  if (rules.suggestAppointment) frictionScore += 1
  if (salesLevel === 'Alto') frictionScore += 1
  let frictionIndicator = 'Baja'
  if (frictionScore >= 4) frictionIndicator = 'Alta'
  else if (frictionScore >= 2) frictionIndicator = 'Media'

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
  if (inds.leadsIndicator === 'Alta' && inds.frictionIndicator === 'Alta') return 'Esta configuración es agresiva para captar leads. Úsala si tu prioridad es conseguir datos rápidamente.'
  if (inds.controlIndicator === 'Estricto') return 'Configuración segura: el asistente evitará inventar información y derivará cuando no tenga contexto.'
  if (inds.frictionIndicator === 'Baja') return 'Configuración suave: ideal para atención informativa, pero puede capturar menos datos.'
  if (inds.styleIndicator === 'Proactivo') return 'El asistente guiará al visitante hacia la siguiente acción con más frecuencia.'
  return 'Configuración equilibrada, adecuada para la mayoría de los casos de uso.'
}

function OptionCard({ selected, onClick, icon, title, description, color }: OptionCardProps) {
  return (
    <button type="button" onClick={onClick} className={`w-full text-left p-3.5 rounded-xl border transition-all group ${selected ? 'border-brand-cyan/50 bg-brand-cyan/5 shadow-[0_0_12px_rgba(34,211,238,0.1)]' : 'border-white/[0.08] bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'}`}>
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 shrink-0 ${selected ? color : 'text-slate-500 group-hover:text-slate-400'} transition-colors`}>{icon}</div>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-semibold leading-tight mb-0.5 ${selected ? 'text-white' : 'text-slate-400 group-hover:text-slate-300'}`}>{title}</p>
          <p className="text-[11px] text-slate-500 leading-snug">{description}</p>
        </div>
        <div className={`shrink-0 w-4 h-4 rounded-full border mt-0.5 ${selected ? 'border-brand-cyan bg-brand-cyan' : 'border-white/20'}`}>{selected && <CheckCircle2 className="w-4 h-4 text-slate-950" />}</div>
      </div>
    </button>
  )
}

function RuleToggle({ checked, onChange, label, description, impact, icon }: RuleToggleProps) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${checked ? 'border-brand-cyan/25 bg-brand-cyan/[0.04]' : 'border-white/[0.06] bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.03]'}`}>
      <div className={`mt-0.5 shrink-0 ${checked ? 'text-brand-cyan' : 'text-slate-500'}`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium leading-tight mb-0.5 ${checked ? 'text-white' : 'text-slate-400'}`}>{label}</p>
        <p className="text-[11px] text-slate-500 leading-snug">{description}</p>
        <p className="text-[10px] text-slate-400 font-medium leading-snug mt-1.5">{impact}</p>
      </div>
      <span className={`mt-0.5 shrink-0 w-9 h-5 rounded-full border relative ${checked ? 'bg-brand-cyan border-brand-cyan' : 'bg-white/5 border-white/20'}`}>
        <span className={`absolute top-0.5 w-3.5 h-3.5 rounded-full ${checked ? 'left-[18px] bg-slate-950' : 'left-0.5 bg-white/40'}`} />
      </span>
    </button>
  )
}

const TONE_OPTIONS = [
  { value: 'amigable', title: 'Amigable', description: 'Cercano, cálido y fácil de entender.', icon: <Smile className="w-4 h-4" />, color: 'text-yellow-400' },
  { value: 'profesional', title: 'Profesional', description: 'Claro, confiable y orientado a confianza.', icon: <Briefcase className="w-4 h-4" />, color: 'text-blue-400' },
  { value: 'vendedor', title: 'Vendedor', description: 'Persuasivo y enfocado en conversión.', icon: <TrendingUp className="w-4 h-4" />, color: 'text-green-400' },
  { value: 'cercano', title: 'Cercano', description: 'Natural, humano y conversacional.', icon: <MessageCircle className="w-4 h-4" />, color: 'text-violet-400' },
  { value: 'directo', title: 'Directo', description: 'Breve, preciso y sin rodeos.', icon: <Zap className="w-4 h-4" />, color: 'text-orange-400' },
]

const GOAL_OPTIONS = [
  { value: 'captar leads', title: 'Captar Leads', description: 'Solicita datos cuando detecta interés.', icon: <Users className="w-4 h-4" />, color: 'text-cyan-400' },
  { value: 'responder faq', title: 'Responder FAQ', description: 'Responde preguntas con la información del negocio.', icon: <HelpCircle className="w-4 h-4" />, color: 'text-blue-400' },
  { value: 'vender productos', title: 'Vender Productos', description: 'Orienta hacia productos, precios y compra.', icon: <ShoppingBag className="w-4 h-4" />, color: 'text-green-400' },
  { value: 'agendar citas', title: 'Agendar Citas', description: 'Guía al cliente hacia una reserva.', icon: <Calendar className="w-4 h-4" />, color: 'text-purple-400' },
  { value: 'dar soporte', title: 'Dar Soporte', description: 'Resuelve dudas y deriva si no sabe.', icon: <HeadphonesIcon className="w-4 h-4" />, color: 'text-slate-400' },
]

const SALES_OPTIONS = [
  { value: 'Bajo', title: 'Bajo', description: 'Prioriza ayudar, sin insistir en venta.', icon: <Gauge className="w-4 h-4" />, color: 'text-slate-400' },
  { value: 'Medio', title: 'Medio', description: 'Equilibra ayuda y conversión.', icon: <Gauge className="w-4 h-4" />, color: 'text-yellow-400' },
  { value: 'Alto', title: 'Alto', description: 'Busca captar datos y cerrar la siguiente acción.', icon: <Gauge className="w-4 h-4" />, color: 'text-green-400' },
]

const RESPONSE_OPTIONS = [
  { value: 'Breves', title: 'Breves', description: 'Respuestas cortas y directas, normalmente 1–3 frases.', icon: <Zap className="w-4 h-4" />, color: 'text-orange-400' },
  { value: 'Equilibradas', title: 'Conversacional', description: 'Se adapta a la conversación: breve si es simple y más extensa si hace falta.', icon: <MessageSquareText className="w-4 h-4" />, color: 'text-cyan-400' },
  { value: 'Detalladas', title: 'Detalladas', description: 'Explica más cuando aporta valor, sin rellenar ni repetir.', icon: <Activity className="w-4 h-4" />, color: 'text-violet-400' },
]

const PRESETS = [
  { id: 'segura', title: 'Atención segura', behavior: { tone: 'profesional', goal: 'responder faq', salesLevel: 'Bajo', responseStyle: 'Equilibradas', rules: { askName: false, askContact: false, suggestAppointment: false, escalateIfUnknown: true, doNotInvent: true, alwaysSpanish: true, offerPricesWhenAsked: true } } },
  { id: 'equilibrada', title: 'Captación equilibrada', behavior: { tone: 'cercano', goal: 'captar leads', salesLevel: 'Medio', responseStyle: 'Equilibradas', rules: { askName: true, askContact: true, suggestAppointment: false, escalateIfUnknown: true, doNotInvent: true, alwaysSpanish: true, offerPricesWhenAsked: true } } },
  { id: 'proactiva', title: 'Ventas proactivas', behavior: { tone: 'vendedor', goal: 'vender productos', salesLevel: 'Alto', responseStyle: 'Equilibradas', rules: { askName: true, askContact: true, suggestAppointment: true, escalateIfUnknown: true, doNotInvent: true, alwaysSpanish: true, offerPricesWhenAsked: true } } },
  { id: 'conservador', title: 'Soporte conservador', behavior: { tone: 'profesional', goal: 'dar soporte', salesLevel: 'Bajo', responseStyle: 'Breves', rules: { askName: false, askContact: false, suggestAppointment: false, escalateIfUnknown: true, doNotInvent: true, alwaysSpanish: true, offerPricesWhenAsked: false } } },
]

function buildSummary(form: BuilderFormData) {
  const { tone, goal, salesLevel, responseStyle, rules } = form.behavior
  const responseLabel = responseStyle === 'Equilibradas' ? 'conversacional y adaptativo' : responseStyle === 'Breves' ? 'breve' : 'detallado'
  const extras: string[] = []
  if (rules.askName) extras.push('pedirá el nombre cuando sea útil')
  if (rules.askContact) extras.push('pedirá contacto para seguimiento')
  if (rules.suggestAppointment) extras.push('sugerirá citas cuando corresponda')
  if (rules.escalateIfUnknown) extras.push('derivará cuando no tenga información')
  if (rules.doNotInvent) extras.push('evitará inventar información')
  return `Responderá con tono ${tone}, enfocado en ${goal}, con intensidad comercial ${salesLevel.toLowerCase()} y estilo ${responseLabel}.${extras.length ? ` Además, ${extras.join(', ')}.` : ''}`
}

export function BehaviorStep({ form, setForm }: Props) {
  const [appliedPreset, setAppliedPreset] = useState<string | null>(null)
  const rules = form.behavior?.rules ?? {}
  const inds = calculateIndicators(form.behavior)

  const updateBehavior = (key: keyof BuilderFormData['behavior'], val: string) => {
    setAppliedPreset(null)
    setForm({ ...form, behavior: { ...form.behavior, [key]: val } })
  }

  const updateRule = (key: keyof BuilderFormData['behavior']['rules'], value: boolean) => {
    setAppliedPreset(null)
    setForm({ ...form, behavior: { ...form.behavior, rules: { ...form.behavior.rules, [key]: value } } })
  }

  const applyPreset = (preset: typeof PRESETS[number]) => {
    setAppliedPreset(preset.id)
    setForm({ ...form, behavior: { ...form.behavior, ...preset.behavior } })
  }

  const previewText = () => {
    if (rules.askName && rules.askContact) return 'Hola. Para orientarte mejor, ¿me compartes tu nombre? Luego puedo pedirte un dato de contacto si hace falta.'
    if (rules.askName) return 'Hola. Para orientarte mejor, ¿me compartes tu nombre?'
    if (rules.askContact) return 'Claro, puedo ayudarte. Si necesitamos seguimiento, te pediré un teléfono o correo.'
    return 'Claro, puedo ayudarte. Cuéntame qué necesitas y avanzamos desde ahí.'
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="bg-card-bg/60 backdrop-blur border border-white/10 rounded-3xl p-6 lg:p-8 shadow-xl">
        <div className="border-b border-white/[0.06] pb-5 mb-6">
          <h2 className="font-semibold text-xl mb-1 text-white">Diseña cómo responderá tu asistente</h2>
          <p className="text-sm text-slate-400">La configuración de aquí sí modifica el comportamiento real de la IA.</p>
        </div>

        <div className="space-y-8">
          <section>
            <div className="mb-3"><label className="text-sm font-semibold text-slate-200 block mb-0.5">Configuraciones rápidas</label><p className="text-xs text-slate-500">Elige un perfil recomendado o ajusta cada detalle manualmente.</p></div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {PRESETS.map(p => <button type="button" key={p.id} onClick={() => applyPreset(p)} className={`p-3 rounded-xl border text-left transition-all ${appliedPreset === p.id ? 'bg-brand-violet/10 border-brand-violet/50' : 'bg-white/[0.02] border-white/[0.08] hover:bg-white/[0.05]'}`}><p className={`text-sm font-semibold ${appliedPreset === p.id ? 'text-brand-purple' : 'text-slate-300'}`}>{p.title}</p>{appliedPreset === p.id && <span className="text-[9px] uppercase tracking-wider font-bold text-white mt-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Aplicado</span>}</button>)}
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-3"><label className="text-sm font-semibold text-slate-200">Tono del asistente</label><span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-cyan/10 text-brand-cyan capitalize">{form.behavior.tone}</span></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">{TONE_OPTIONS.map(o => <OptionCard key={o.value} selected={form.behavior.tone === o.value} onClick={() => updateBehavior('tone', o.value)} {...o} />)}</div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-3"><label className="text-sm font-semibold text-slate-200">Objetivo de atención</label><span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-violet/10 text-brand-purple">{form.behavior.goal}</span></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">{GOAL_OPTIONS.map(o => <OptionCard key={o.value} selected={form.behavior.goal === o.value} onClick={() => updateBehavior('goal', o.value)} {...o} />)}</div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-3"><label className="text-sm font-semibold text-slate-200">Intensidad comercial</label><span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-400">{form.behavior.salesLevel}</span></div>
            <div className="grid grid-cols-3 gap-2.5">{SALES_OPTIONS.map(o => <OptionCard key={o.value} selected={form.behavior.salesLevel === o.value} onClick={() => updateBehavior('salesLevel', o.value)} {...o} />)}</div>
          </section>

          <section>
            <div className="mb-3"><label className="text-sm font-semibold text-slate-200 block mb-0.5">Estilo de respuesta</label><p className="text-xs text-slate-500">Controla cuánto responde el asistente en cada turno. El modo Conversacional es el recomendado.</p></div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">{RESPONSE_OPTIONS.map(o => <OptionCard key={o.value} selected={form.behavior.responseStyle === o.value} onClick={() => updateBehavior('responseStyle', o.value)} {...o} />)}</div>
          </section>

          <section>
            <div className="mb-3"><label className="text-sm font-semibold text-slate-200 block mb-0.5">Reglas de atención</label><p className="text-xs text-slate-500">Estas reglas forman parte del prompt real del asistente.</p></div>
            <div className="grid lg:grid-cols-2 gap-4">
              <div><p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-2 px-1">Captura y seguimiento</p><div className="space-y-2">
                <RuleToggle checked={Boolean(rules.askName)} onChange={v => updateRule('askName', v)} label="Pedir nombre del cliente" description="Personaliza la conversación cuando sea útil." impact="Impacto: Mejor seguimiento · Más fricción" icon={<UserCheck className="w-4 h-4" />} />
                <RuleToggle checked={Boolean(rules.askContact)} onChange={v => updateRule('askContact', v)} label="Pedir teléfono o correo" description="Permite convertir conversaciones en leads." impact="Impacto: Más leads · Mayor fricción" icon={<Phone className="w-4 h-4" />} />
                <RuleToggle checked={Boolean(rules.suggestAppointment)} onChange={v => updateRule('suggestAppointment', v)} label="Sugerir agendar una cita" description="Propone una siguiente acción cuando corresponde." impact="Impacto: Más conversión · Mayor fricción" icon={<Clock className="w-4 h-4" />} />
                <RuleToggle checked={Boolean(rules.escalateIfUnknown)} onChange={v => updateRule('escalateIfUnknown', v)} label="Derivar a humano si no sabe" description="Evita inventar respuestas cuando falta contexto." impact="Impacto: Más control · Mejor soporte" icon={<GitMerge className="w-4 h-4" />} />
              </div></div>
              <div><p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-2 px-1">Control de respuesta</p><div className="space-y-2">
                <RuleToggle checked={Boolean(rules.offerPricesWhenAsked)} onChange={v => updateRule('offerPricesWhenAsked', v)} label="Ofrecer precios cuando pregunten" description="Usa solo precios presentes en el conocimiento." impact="Impacto: Mejor respuesta comercial" icon={<DollarSign className="w-4 h-4" />} />
                <RuleToggle checked={Boolean(rules.doNotInvent)} onChange={v => updateRule('doNotInvent', v)} label="No inventar información" description="Evita respuestas falsas o suposiciones." impact="Impacto: Más seguridad · Menos riesgo" icon={<Ban className="w-4 h-4" />} />
                <RuleToggle checked={Boolean(rules.alwaysSpanish)} onChange={v => updateRule('alwaysSpanish', v)} label="Responder siempre en español" description="Mantiene el idioma de atención consistente." impact="Impacto: Control de idioma" icon={<Globe className="w-4 h-4" />} />
              </div></div>
            </div>
          </section>

          <section className="bg-black/30 border border-white/5 rounded-2xl p-5">
            <div className="flex items-center justify-between gap-3 mb-3"><h3 className="text-sm font-semibold text-white">Vista previa del comportamiento</h3><span className="text-[10px] font-medium text-amber-500/80 bg-amber-500/10 px-2 py-0.5 rounded">Simulación local</span></div>
            <p className="text-xs text-slate-500 mb-3">Esta vista explica las reglas seleccionadas. La prueba con IA es la que confirma el resultado real.</p>
            <div className="bg-brand-violet/10 border border-brand-violet/20 rounded-2xl px-4 py-3 rounded-tl-sm max-w-[85%] text-sm text-slate-300">{previewText()}</div>
            <p className="text-xs text-slate-400 mt-4">{buildSummary(form)}</p>
          </section>

          <section className="bg-card-bg/80 border border-white/10 rounded-2xl p-5">
            <div className="mb-4"><h3 className="text-base font-semibold text-white mb-1 flex items-center gap-2"><Activity className="w-4 h-4 text-brand-cyan" /> Impacto del comportamiento</h3><p className="text-xs text-slate-400">Indicadores orientativos de la configuración actual.</p></div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-3 bg-white/5 rounded-xl"><p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Captación de leads</p><span className="text-sm font-semibold">{inds.leadsIndicator}</span></div>
              <div className="p-3 bg-white/5 rounded-xl"><p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Control</p><span className="text-sm font-semibold">{inds.controlIndicator}</span></div>
              <div className="p-3 bg-white/5 rounded-xl"><p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Fricción</p><span className="text-sm font-semibold">{inds.frictionIndicator}</span></div>
              <div className="p-3 bg-white/5 rounded-xl"><p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Estilo comercial</p><span className="text-sm font-semibold">{inds.styleIndicator}</span></div>
            </div>
            <div className="p-3 rounded-lg bg-brand-cyan/5 border border-brand-cyan/20"><p className="text-xs text-brand-cyan">{getRecommendation(inds)}</p></div>
          </section>
        </div>
      </div>
    </motion.div>
  )
}
