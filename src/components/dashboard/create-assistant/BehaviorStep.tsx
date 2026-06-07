'use client'

import { motion } from 'framer-motion'
import {
  Smile, Briefcase, TrendingUp, MessageCircle, Zap,
  Users, HelpCircle, ShoppingBag, Calendar, HeadphonesIcon,
  Gauge, ChevronDown, ChevronUp, Info,
  UserCheck, Phone, Clock, GitMerge,
  DollarSign, Ban, Globe, CheckCircle2
} from 'lucide-react'
import { BuilderFormData } from './types'

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

function RuleToggle({ checked, onChange, label, description, icon }: RuleToggleProps) {
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
  const updateBehavior = (key: keyof BuilderFormData['behavior'], val: string) => {
    setForm({ ...form, behavior: { ...form.behavior, [key]: val } })
  }

  const updateRule = (ruleKey: keyof BuilderFormData['behavior']['rules'], val: boolean) => {
    setForm({
      ...form,
      behavior: {
        ...form.behavior,
        rules: { ...form.behavior.rules, [ruleKey]: val }
      }
    })
  }

  const rules = form.behavior?.rules ?? {}
  const summary = buildBehaviorSummary(form)

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
                    description="Personaliza el trato y facilita el seguimiento."
                    icon={<UserCheck className="w-4 h-4" />}
                  />
                  <RuleToggle
                    checked={Boolean(rules.askContact)}
                    onChange={(v) => updateRule('askContact', v)}
                    label="Pedir teléfono o correo"
                    description="Útil para convertir conversaciones en leads."
                    icon={<Phone className="w-4 h-4" />}
                  />
                  <RuleToggle
                    checked={Boolean(rules.suggestAppointment)}
                    onChange={(v) => updateRule('suggestAppointment', v)}
                    label="Sugerir agendar una cita"
                    description="Propone el siguiente paso cuando detecta interés."
                    icon={<Clock className="w-4 h-4" />}
                  />
                  <RuleToggle
                    checked={Boolean(rules.escalateIfUnknown)}
                    onChange={(v) => updateRule('escalateIfUnknown', v)}
                    label="Derivar a humano si no sabe"
                    description="Evita respuestas vacías derivando al equipo."
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
                    description="Responde con precios si están en el entrenamiento."
                    icon={<DollarSign className="w-4 h-4" />}
                  />
                  <RuleToggle
                    checked={Boolean(rules.doNotInvent)}
                    onChange={(v) => updateRule('doNotInvent', v)}
                    label="No inventar información"
                    description="Si no encuentra datos, lo reconoce y pide más contexto."
                    icon={<Ban className="w-4 h-4" />}
                  />
                  <RuleToggle
                    checked={Boolean(rules.alwaysSpanish)}
                    onChange={(v) => updateRule('alwaysSpanish', v)}
                    label="Responder siempre en español"
                    description="Mantiene todas las respuestas en español."
                    icon={<Globe className="w-4 h-4" />}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* ── Resumen del Comportamiento ───────────────────────────────── */}
          <section className="bg-gradient-to-br from-brand-violet/5 to-brand-cyan/5 border border-brand-violet/20 rounded-2xl p-4">
            <div className="flex items-start gap-2.5">
              <Info className="w-4 h-4 text-brand-violet mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-slate-300 mb-1">Resumen del comportamiento</p>
                <p className="text-sm text-slate-300 leading-relaxed">{summary}</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </motion.div>
  )
}
