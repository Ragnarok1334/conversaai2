'use client'

import { motion } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'
import { BuilderFormData } from './types'

interface Props {
  form: BuilderFormData
  setForm: (form: BuilderFormData) => void
}

const TONES = ['amigable', 'profesional', 'vendedor', 'cercano', 'directo']
const GOALS = ['captar leads', 'responder faq', 'vender productos', 'agendar citas', 'dar soporte']
const SALES_LEVELS = ['Bajo', 'Medio', 'Alto']

function ChipGroup({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all capitalize ${
            value === o
            ? 'border-brand-cyan/50 bg-brand-cyan/10 text-brand-cyan shadow-[0_0_10px_rgba(34,211,238,0.2)]'
            : 'border-white/10 bg-white/[0.03] text-slate-400 hover:border-brand-cyan/30 hover:text-white'
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  )
}

function RuleCheckbox({ checked, onChange, label }: { checked: boolean, onChange: (v: boolean) => void, label: string }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group">
      <input type="checkbox" className="hidden" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${checked ? 'bg-brand-cyan border-brand-cyan' : 'bg-slate-900 border-white/20 group-hover:border-white/40'}`}>
        {checked && <CheckCircle2 className="w-3.5 h-3.5 text-slate-950" />}
      </div>
      <span className={`text-sm ${checked ? 'text-white' : 'text-slate-400 group-hover:text-slate-300'} transition-colors`}>{label}</span>
    </label>
  )
}

export function BehaviorStep({ form, setForm }: Props) {
  const updateBehavior = (key: keyof BuilderFormData['behavior']) => (val: string) => {
    setForm({ ...form, behavior: { ...form.behavior, [key]: val } })
  }

  const updateRule = (ruleKey: keyof BuilderFormData['behavior']['rules']) => (val: boolean) => {
    setForm({ ...form, behavior: { ...form.behavior, rules: { ...form.behavior.rules, [ruleKey]: val } } })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="bg-card-bg/60 backdrop-blur border border-white/10 rounded-3xl p-6 lg:p-8 space-y-6 shadow-xl">
        <div className="border-b border-white/[0.06] pb-4">
          <h2 className="font-semibold text-xl mb-1 text-white">Comportamiento del asistente</h2>
          <p className="text-sm text-slate-400">Define cómo se dirigirá a tus clientes y cuáles serán sus límites.</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 block">Tono del asistente</label>
              <ChipGroup options={TONES} value={form.behavior.tone} onChange={updateBehavior('tone')} />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 block">Objetivo principal</label>
              <ChipGroup options={GOALS} value={form.behavior.goal} onChange={updateBehavior('goal')} />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 block">Nivel comercial</label>
              <ChipGroup options={SALES_LEVELS} value={form.behavior.salesLevel} onChange={updateBehavior('salesLevel')} />
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Reglas estrictas</h3>
              <div className="space-y-4">
                <RuleCheckbox label="Pedir nombre del cliente" checked={form.behavior.rules.askName} onChange={updateRule('askName')} />
                <RuleCheckbox label="Pedir teléfono o correo" checked={form.behavior.rules.askContact} onChange={updateRule('askContact')} />
                <RuleCheckbox label="Ofrecer precios cuando pregunte" checked={form.behavior.rules.offerPricesWhenAsked} onChange={updateRule('offerPricesWhenAsked')} />
                <RuleCheckbox label="Sugerir agendar una cita" checked={form.behavior.rules.suggestAppointment} onChange={updateRule('suggestAppointment')} />
                <RuleCheckbox label="Enviar al humano si no sabe" checked={form.behavior.rules.escalateIfUnknown} onChange={updateRule('escalateIfUnknown')} />
                <RuleCheckbox label="No inventar información" checked={form.behavior.rules.doNotInvent} onChange={updateRule('doNotInvent')} />
                <RuleCheckbox label="Responder siempre en español" checked={form.behavior.rules.alwaysSpanish} onChange={updateRule('alwaysSpanish')} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
