'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Loader2, CheckCircle2, ChevronDown, MessageCircle, Clock } from 'lucide-react'
import { AssistantPlayground } from '@/components/dashboard/AssistantPlayground'
import { KnowledgeSection } from '@/components/dashboard/KnowledgeSection'
import { type AssistantConfig } from '@/lib/openai'

const TONES = ['profesional', 'amable', 'vendedor', 'breve', 'elegante']
const CHANNELS = [
  { value: 'webchat', label: 'Web Chat' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'whatsapp', label: 'WhatsApp' },
]
const GOALS = ['soporte', 'ventas', 'agendamiento', 'captación de leads']
const LANGUAGES = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'English' },
  { value: 'pt', label: 'Português' },
]
const BUSINESS_TYPES = ['Tienda / E-commerce', 'Servicios profesionales', 'Restaurante / Comida', 'Salud / Bienestar', 'Educación', 'Inmobiliaria', 'Tecnología', 'Otro']

interface FormData {
  assistant_name: string
  business_name: string
  business_type: string
  channel: string
  tone: string
  main_goal: string
  instructions: string
  faqs: string
  services: string
  schedule: string
  fallback_message: string
  language: string
}

const initialForm: FormData = {
  assistant_name: '',
  business_name: '',
  business_type: '',
  channel: 'webchat',
  tone: 'profesional',
  main_goal: 'soporte',
  instructions: '',
  faqs: '',
  services: '',
  schedule: '',
  fallback_message: 'Lo siento, no tengo esa información ahora mismo. ¿Puedo contactarte con un asesor?',
  language: 'es',
}

function FormField({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-text-secondary block">{label}</label>
      {children}
      {hint && <p className="text-xs text-text-soft">{hint}</p>}
    </div>
  )
}

function TextInput({ value, onChange, placeholder, type, required, id }: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  required?: boolean
  id?: string
}) {
  return (
    <input
      id={id}
      type={type || 'text'}
      required={required}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl px-4 py-3 text-sm text-text-main placeholder:text-text-soft/40 focus:outline-none focus:border-brand-violet/40 focus:ring-1 focus:ring-brand-violet/20 transition-all"
    />
  )
}

function TextAreaInput({ value, onChange, placeholder, rows = 3, className = '' }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; className?: string }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className={`w-full bg-white/[0.04] border border-white/[0.1] rounded-xl px-4 py-3 text-sm text-text-main placeholder:text-text-soft/40 focus:outline-none focus:border-brand-violet/40 focus:ring-1 focus:ring-brand-violet/20 transition-all resize-y ${className}`}
    />
  )
}

function SelectInput({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl px-4 py-3 text-sm text-text-main focus:outline-none focus:border-brand-violet/40 focus:ring-1 focus:ring-brand-violet/20 transition-all appearance-none cursor-pointer"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-[#0B1026] text-text-main">
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-soft pointer-events-none" />
    </div>
  )
}

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
              ? 'border-brand-violet/60 bg-brand-violet/20 text-white'
              : 'border-white/[0.1] bg-white/[0.03] text-text-soft hover:border-brand-violet/30 hover:text-text-main'
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  )
}

export function AssistantForm() {
  const router = useRouter()
  const [form, setForm] = useState<FormData>(initialForm)
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const set = (key: keyof FormData) => (val: string) => setForm(prev => ({ ...prev, [key]: val }))

  const previewConfig: Partial<AssistantConfig> = {
    assistantName: form.assistant_name || 'Mi Asistente',
    businessName: form.business_name || 'Mi Negocio',
    businessType: form.business_type,
    channel: form.channel,
    tone: form.tone,
    mainGoal: form.main_goal,
    instructions: form.instructions,
    faqs: form.faqs,
    services: form.services,
    schedule: form.schedule,
    fallbackMessage: form.fallback_message,
    language: form.language,
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.assistant_name.trim() || !form.business_name.trim()) {
      setErrorMsg('El nombre del asistente y del negocio son obligatorios.')
      setStatus('error')
      return
    }
    setStatus('saving')
    setErrorMsg('')
    try {
      const res = await fetch('/api/assistants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al guardar')
      }
      setStatus('success')
      setTimeout(() => router.push('/dashboard/assistants'), 1200)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al guardar el asistente')
      setStatus('error')
    }
  }

  return (
    <div className="grid lg:grid-cols-2 gap-8 items-start">
      {/* Form */}
      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-6"
      >
        {/* Section 1 */}
        <div className="bg-card-bg/80 backdrop-blur-2xl border border-card-border rounded-2xl p-6 space-y-5">
          <h2 className="font-semibold text-lg border-b border-white/[0.06] pb-3">Información básica</h2>
          <FormField label="Nombre del asistente *">
            <TextInput value={form.assistant_name} onChange={set('assistant_name')} placeholder="Ej: Sara de Ventas" required />
          </FormField>
          <FormField label="Nombre del negocio *">
            <TextInput value={form.business_name} onChange={set('business_name')} placeholder="Ej: Clínica San Rafael" required />
          </FormField>
          <FormField label="Tipo de negocio">
            <SelectInput
              value={form.business_type}
              onChange={set('business_type')}
              options={[{ value: '', label: 'Selecciona...' }, ...BUSINESS_TYPES.map(b => ({ value: b, label: b }))]}
            />
          </FormField>
          <FormField label="Idioma">
            <SelectInput value={form.language} onChange={set('language')} options={LANGUAGES} />
          </FormField>
        </div>

        {/* Section 2 */}
        <div className="bg-card-bg/80 backdrop-blur-2xl border border-card-border rounded-2xl p-6 space-y-5">
          <h2 className="font-semibold text-lg border-b border-white/[0.06] pb-3">Comportamiento</h2>
          <FormField label="Canal inicial">
            <ChipGroup options={CHANNELS.map(c => c.value)} value={form.channel} onChange={set('channel')} />
          </FormField>
          <FormField label="Tono de comunicación">
            <ChipGroup options={TONES} value={form.tone} onChange={set('tone')} />
          </FormField>
          <FormField label="Objetivo principal">
            <ChipGroup options={GOALS} value={form.main_goal} onChange={set('main_goal')} />
          </FormField>
        </div>

        {/* Section 3 — Premium Knowledge */}
        <div className="bg-card-bg/80 backdrop-blur-2xl border border-card-border rounded-2xl p-6">
          <KnowledgeSection
            value={form.instructions}
            onChange={set('instructions')}
          />
        </div>

        {/* Section 4 — Additional config */}
        <div className="bg-card-bg/80 backdrop-blur-2xl border border-card-border rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3">
            <Clock className="w-4 h-4 text-brand-cyan" />
            <h2 className="font-semibold text-lg">Configuración adicional</h2>
          </div>
          <FormField label="Horario de atención" hint="Ej: Lunes a viernes 9am - 6pm (GMT-5). Domingos cerrado.">
            <TextInput value={form.schedule} onChange={set('schedule')} placeholder="Lunes a Viernes 9am - 6pm (GMT-5)" />
          </FormField>
          <FormField label="Mensaje de respaldo" hint="Qué responde cuando no tiene la información.">
            <div className="relative">
              <MessageCircle className="absolute left-4 top-3.5 w-4 h-4 text-text-soft pointer-events-none" />
              <TextAreaInput className="pl-11" value={form.fallback_message} onChange={set('fallback_message')} rows={2} placeholder="Lo siento, no tengo esa información. ¿Puedo contactarte con un asesor?" />
            </div>
          </FormField>
        </div>

        {/* Errors */}
        {status === 'error' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-xl bg-brand-pink/10 border border-brand-pink/20 text-brand-pink text-sm">
            {errorMsg}
          </motion.div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={status === 'saving' || status === 'success'}
          className="w-full gradient-btn py-4 rounded-xl text-white font-semibold text-base hover:opacity-90 transition-opacity glow-violet flex items-center justify-center gap-2 disabled:opacity-70"
        >
          {status === 'saving' && <Loader2 className="w-5 h-5 animate-spin" />}
          {status === 'success' && <CheckCircle2 className="w-5 h-5 text-brand-success" />}
          {status === 'saving' ? 'Guardando...' : status === 'success' ? '¡Guardado! Redirigiendo...' : 'Guardar asistente'}
        </button>
      </motion.form>

      {/* Playground Preview */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="lg:sticky lg:top-8 space-y-4"
      >
        <div>
          <h2 className="font-semibold text-lg mb-1">Vista previa en tiempo real</h2>
          <p className="text-sm text-text-soft">Prueba cómo responderá tu asistente sin guardarlo aún.</p>
        </div>
        <AssistantPlayground
          assistantConfig={previewConfig}
          title={form.assistant_name || 'Vista previa'}
        />
      </motion.div>
    </div>
  )
}
