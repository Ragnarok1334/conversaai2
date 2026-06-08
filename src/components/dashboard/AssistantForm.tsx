'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Loader2, CheckCircle2, ChevronDown, MessageCircle, Clock, Globe, Code2, Copy, Send, Bot, CalendarRange, MapPin, Tag, Headphones, Zap, Lock } from 'lucide-react'
import { AssistantPlayground } from '@/components/dashboard/AssistantPlayground'
import { KnowledgeSection } from '@/components/dashboard/KnowledgeSection'
import { UpgradeModal } from '@/components/dashboard/UpgradeModal'
import { type AssistantConfig } from '@/lib/openai'

const TONES = ['amigable', 'profesional', 'vendedor', 'cercano', 'directo']
const GOALS = ['captar leads', 'responder faq', 'vender productos', 'agendar citas', 'dar soporte']
const SALES_LEVELS = ['Bajo', 'Medio', 'Alto']
const RESPONSE_STYLES = ['Cortas', 'Detalladas', 'Preguntar antes de recomendar', 'Recomendar rápido']
const INITIAL_CHANNELS = ['webchat', 'telegram', 'whatsapp']

const BUSINESS_TYPES = ['Tienda / E-commerce', 'Servicios profesionales', 'Restaurante / Comida', 'Salud / Bienestar', 'Educación', 'Inmobiliaria', 'Tecnología', 'Otro']

interface FormData {
  assistant_name: string
  business_name: string
  business_type: string
  language: "es"
  instructions: string
  faqs: string
  services: string
  schedule: string
  fallback_message: string
  behavior: {
    initialChannel: string
    tone: string
    goal: string
    salesLevel: string
    responseStyle: string
    rules: {
      askName: boolean
      askPhoneOrEmail: boolean
      offerPrices: boolean
      suggestAppointment: boolean
      handoffToHuman: boolean
      doNotInvent: boolean
      alwaysSpanish: boolean
    }
  }
  channels: {
    webchat: { enabled: boolean }
    telegram: { enabled: boolean; token: string }
    whatsapp: { enabled: boolean }
  }
}

const initialForm: FormData = {
  assistant_name: '',
  business_name: '',
  business_type: '',
  language: 'es',
  instructions: '',
  faqs: '',
  services: '',
  schedule: '',
  fallback_message: 'Lo siento, no tengo esa información ahora mismo. ¿Quieres que te contacte un asesor?',
  behavior: {
    initialChannel: 'webchat',
    tone: 'profesional',
    goal: 'dar soporte',
    salesLevel: 'Medio',
    responseStyle: 'Detalladas',
    rules: {
      askName: true,
      askPhoneOrEmail: false,
      offerPrices: true,
      suggestAppointment: false,
      handoffToHuman: true,
      doNotInvent: true,
      alwaysSpanish: true
    }
  },
  channels: {
    webchat: { enabled: true },
    telegram: { enabled: false, token: '' },
    whatsapp: { enabled: false }
  }
}

function FormField({ label, children, hint, required }: { label: string; children: React.ReactNode; hint?: string, required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-300 block">
        {label} {required && <span className="text-brand-pink">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
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
      className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/20 transition-all"
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
      className={`w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/20 transition-all resize-y scrollbar-thin scrollbar-track-slate-900 scrollbar-thumb-slate-700 ${className}`}
    />
  )
}

function SelectInput({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/20 transition-all appearance-none cursor-pointer"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-[#0a0e1f] text-white">
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
    </div>
  )
}

function ChipGroup({ options, value, onChange, disabledOptions = [], onDisabledClick }: { options: string[]; value: string; onChange: (v: string) => void; disabledOptions?: string[]; onDisabledClick?: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const isDisabled = disabledOptions.includes(o)
        return (
          <button
            key={o}
            type="button"
            onClick={() => isDisabled ? onDisabledClick?.(o) : onChange(o)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all capitalize ${
              isDisabled 
                ? 'opacity-50 cursor-not-allowed border-white/5 bg-white/5 text-slate-500'
                : value === o
                ? 'border-brand-cyan/50 bg-brand-cyan/10 text-brand-cyan shadow-[0_0_10px_rgba(34,211,238,0.2)]'
                : 'border-white/10 bg-white/[0.03] text-slate-400 hover:border-brand-cyan/30 hover:text-white'
            }`}
          >
            {o}
          </button>
        )
      })}
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

interface AssistantFormProps {
  hasReachedLimit?: boolean
  currentUsage?: number
  planLimit?: number | null
  currentPlan?: string
}

export function AssistantForm({ hasReachedLimit = false, currentUsage = 0, planLimit = 1, currentPlan = 'free' }: AssistantFormProps) {
  const router = useRouter()
  const [form, setForm] = useState<FormData>(initialForm)
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  
  const [activeTab, setActiveTab] = useState<'webchat' | 'telegram' | 'whatsapp'>('webchat')

  const setField = (key: keyof FormData) => (val: string) => setForm(prev => ({ ...prev, [key]: val }))
  
  const updateBehavior = (key: keyof FormData['behavior']) => (val: string) => {
    setForm(prev => ({ ...prev, behavior: { ...prev.behavior, [key]: val } }))
  }

  const updateRule = (ruleKey: keyof FormData['behavior']['rules']) => (val: boolean) => {
    setForm(prev => ({ ...prev, behavior: { ...prev.behavior, rules: { ...prev.behavior.rules, [ruleKey]: val } } }))
  }
  
  const updateChannel = (channelKey: keyof FormData['channels'], key: string, val: boolean | string) => {
    setForm(prev => ({ ...prev, channels: { ...prev.channels, [channelKey]: { ...prev.channels[channelKey], [key]: val } } }))
  }

  const previewConfig: Partial<AssistantConfig> = {
    assistantName: form.assistant_name || 'Mi Asistente',
    businessName: form.business_name || 'Mi Negocio',
    businessType: form.business_type,
    channel: form.behavior.initialChannel,
    tone: form.behavior.tone,
    mainGoal: form.behavior.goal,
    instructions: form.instructions,
    faqs: form.faqs,
    services: form.services,
    schedule: form.schedule,
    fallbackMessage: form.fallback_message,
    language: form.language,
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.assistant_name.trim() || !form.business_name.trim() || !form.instructions.trim()) {
      setErrorMsg('El nombre del asistente, el nombre del negocio y la información del negocio son obligatorios.')
      setStatus('error')
      return
    }
    setStatus('saving')
    setErrorMsg('')
    
    // Prepare Payload
    const payload = {
      ...form,
      // Map legacy fields if the backend still expects them at root level for now
      // (Supabase will ignore extra fields if they don't exist in the table)
      channel: form.behavior.initialChannel,
      tone: form.behavior.tone,
      main_goal: form.behavior.goal,
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('Assistant payload', payload)
    }

    try {
      const res = await fetch('/api/assistants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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

  // Dynamic Behavior Preview Logic
  const getBehaviorPreview = () => {
    const { tone, goal, rules } = form.behavior
    let preview = ''
    
    if (tone === 'amigable') {
      preview = '¡Hola! 😊 Qué gusto saludarte.'
    } else if (tone === 'profesional') {
      preview = 'Bienvenido a nuestro canal de atención.'
    } else if (tone === 'vendedor') {
      preview = '¡Hola! Estás en el lugar indicado para encontrar lo que necesitas.'
    } else if (tone === 'directo') {
      preview = 'Hola. ¿En qué te ayudo?'
    } else {
      preview = '¡Hola! Soy el asistente virtual.'
    }

    if (goal === 'captar leads') {
      preview += ' Para brindarte una mejor atención, ¿me compartirías tu nombre y qué servicio buscas?'
    } else if (goal === 'dar soporte') {
      preview += ' Por favor, indícame el detalle de tu solicitud o inconveniente y lo revisaré de inmediato.'
    } else if (goal === 'vender productos') {
      preview += ' Cuéntame qué estás buscando y te enviaré las mejores opciones de nuestro catálogo.'
    } else if (goal === 'agendar citas') {
      preview += ' Indícame qué día, horario y servicio necesitas para revisar nuestra disponibilidad en la agenda.'
    } else {
      preview += ' Dime cómo puedo ayudarte hoy.'
    }
    
    if (rules.askPhoneOrEmail && goal !== 'captar leads') {
      preview += ' (Si la consulta es compleja, te pediré un correo o teléfono para contactarte).'
    }

    return preview
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6 items-start">
      {/* Form */}
      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-6"
      >
        {/* PARTE 1 & 3: Info Multiple Assistants & Limits */}
        <div className="space-y-4">
          <div className="bg-card-bg/60 backdrop-blur border border-white/10 rounded-3xl p-6 lg:p-8 space-y-6 shadow-xl">
            <div>
              <h2 className="font-semibold text-2xl mb-2 text-white">Crea un asistente para cada área de tu negocio</h2>
              <p className="text-sm text-slate-300">
                No todos tus clientes necesitan la misma respuesta. Puedes crear asistentes separados para ventas, soporte, reservas, sucursales o servicios específicos. Cada asistente tendrá su propia información, comportamiento, reglas y canales.
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 hover:border-cyan-400/40 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-brand-cyan/10 flex items-center justify-center mb-3">
                  <Tag className="w-4 h-4 text-brand-cyan" />
                </div>
                <h3 className="text-white font-semibold text-sm mb-1">Ventas</h3>
                <p className="text-xs text-slate-400">Responde precios, promociones, beneficios y ayuda a cerrar clientes.</p>
              </div>
              <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 hover:border-brand-violet/40 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-brand-violet/10 flex items-center justify-center mb-3">
                  <Headphones className="w-4 h-4 text-brand-violet" />
                </div>
                <h3 className="text-white font-semibold text-sm mb-1">Soporte</h3>
                <p className="text-xs text-slate-400">Resuelve dudas frecuentes, seguimiento de pedidos y atención al cliente.</p>
              </div>
              <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 hover:border-emerald-400/40 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-emerald-400/10 flex items-center justify-center mb-3">
                  <CalendarRange className="w-4 h-4 text-emerald-400" />
                </div>
                <h3 className="text-white font-semibold text-sm mb-1">Reservas</h3>
                <p className="text-xs text-slate-400">Solicita datos, revisa horarios y ayuda a agendar citas.</p>
              </div>
              <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 hover:border-fuchsia-400/40 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-fuchsia-400/10 flex items-center justify-center mb-3">
                  <MapPin className="w-4 h-4 text-fuchsia-400" />
                </div>
                <h3 className="text-white font-semibold text-sm mb-1">Sucursales o servicios</h3>
                <p className="text-xs text-slate-400">Usa asistentes distintos para ubicaciones, áreas o servicios diferentes.</p>
              </div>
            </div>
          </div>

          <div className="bg-card-bg/60 backdrop-blur border border-white/10 rounded-3xl p-6 lg:p-8 space-y-4 shadow-xl">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="font-semibold text-xl mb-1 text-white">Uso de asistentes</h2>
                <p className="text-sm text-slate-300 max-w-xl">
                  Cada plan incluye una cantidad máxima de asistentes. Usa asistentes diferentes para automatizar áreas distintas de tu negocio.
                </p>
              </div>
              <div className="px-4 py-2 bg-white/[0.04] border border-white/10 rounded-xl text-sm font-medium">
                {planLimit === null 
                  ? <span className="text-white">Uso ilimitado de asistentes en tu plan {currentPlan}.</span>
                  : hasReachedLimit 
                    ? <span className="text-brand-pink flex items-center gap-2"><Lock className="w-4 h-4"/> Alcanzaste el límite de {planLimit} asistentes.</span>
                    : <span className="text-white">Has usado {currentUsage} de {planLimit} asistentes disponibles en tu plan {currentPlan}. {planLimit - currentUsage > 0 ? `Puedes crear ${planLimit - currentUsage} asistente(s) más.` : ''}</span>
                }
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className={`p-3 rounded-xl border ${currentPlan === 'trial' ? 'border-brand-cyan/50 bg-brand-cyan/10' : 'border-white/10 bg-white/[0.02]'}`}>
                <p className={`text-xs font-semibold mb-1 ${currentPlan === 'trial' ? 'text-brand-cyan' : 'text-slate-400'}`}>Trial</p>
                <p className="text-sm font-medium text-white">1 asistente</p>
              </div>
              <div className={`p-3 rounded-xl border ${currentPlan === 'pro' ? 'border-brand-cyan/50 bg-brand-cyan/10' : 'border-white/10 bg-white/[0.02]'}`}>
                <p className={`text-xs font-semibold mb-1 ${currentPlan === 'pro' ? 'text-brand-cyan' : 'text-slate-400'}`}>Pro</p>
                <p className="text-sm font-medium text-white">5 asistentes</p>
              </div>
              <div className={`p-3 rounded-xl border ${currentPlan === 'business' ? 'border-brand-violet/50 bg-brand-violet/10' : 'border-white/10 bg-white/[0.02]'}`}>
                <p className={`text-xs font-semibold mb-1 ${currentPlan === 'business' ? 'text-brand-violet' : 'text-slate-400'}`}>Business</p>
                <p className="text-sm font-medium text-white">20 asistentes</p>
              </div>
              <div className={`p-3 rounded-xl border ${currentPlan === 'enterprise' ? 'border-fuchsia-400/50 bg-fuchsia-400/10' : 'border-white/10 bg-white/[0.02]'}`}>
                <p className={`text-xs font-semibold mb-1 ${currentPlan === 'enterprise' ? 'text-fuchsia-400' : 'text-slate-400'}`}>Enterprise</p>
                <p className="text-sm font-medium text-white">Asistentes ilimitados</p>
              </div>
            </div>
            <p className="text-xs text-slate-400">Más asistentes te permiten automatizar más áreas: ventas, soporte, reservas, sucursales y servicios.</p>
          </div>
        </div>

        {/* Section 1 - Info Basica */}
        <div className="bg-card-bg/60 backdrop-blur border border-white/10 rounded-3xl p-6 lg:p-8 space-y-6 shadow-xl">
          <h2 className="font-semibold text-xl border-b border-white/[0.06] pb-4">Información básica</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            <FormField label="Nombre del asistente" required hint="Ponle un nombre según su función, por ejemplo: Ventas, Soporte, Reservas o Sucursal Centro.">
              <TextInput value={form.assistant_name} onChange={setField('assistant_name')} placeholder="Ej: Asistente de Ventas" required />
            </FormField>
            <FormField label="Nombre del negocio" required>
              <TextInput value={form.business_name} onChange={setField('business_name')} placeholder="Ej: Clínica San Rafael" required />
            </FormField>
          </div>
          <FormField label="Tipo de negocio">
            <SelectInput
              value={form.business_type}
              onChange={setField('business_type')}
              options={[{ value: '', label: 'Selecciona...' }, ...BUSINESS_TYPES.map(b => ({ value: b, label: b }))]}
            />
          </FormField>
        </div>

        {/* Section 2 - Idioma */}
        <div className="bg-card-bg/60 backdrop-blur border border-white/10 rounded-3xl p-6 lg:p-8 flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center">
              <Globe className="w-6 h-6 text-brand-cyan" />
            </div>
            <div>
              <h2 className="font-semibold text-lg flex items-center gap-2">
                Idioma del asistente
                <span className="px-2 py-0.5 rounded-full bg-brand-success/20 text-brand-success text-xs border border-brand-success/20">Activo</span>
              </h2>
              <p className="text-sm text-slate-400">Por ahora el asistente responderá únicamente en español. Más idiomas estarán disponibles próximamente.</p>
            </div>
          </div>
          <div className="font-medium text-white px-4 py-2 rounded-xl bg-white/[0.04] border border-white/10">
            Español
          </div>
        </div>

        {/* Section 3 — Premium Knowledge */}
        <div className="rounded-3xl shadow-xl">
          <KnowledgeSection
            value={form.instructions}
            onChange={setField('instructions')}
          />
        </div>

        {/* Section 4 - Comportamiento Funcional */}
        <div className="bg-card-bg/60 backdrop-blur border border-white/10 rounded-3xl p-6 lg:p-8 space-y-6 shadow-xl">
          <div className="border-b border-white/[0.06] pb-4">
            <h2 className="font-semibold text-xl mb-1">Comportamiento del asistente</h2>
            <p className="text-sm text-slate-400">Configura este asistente según el área que atenderá. Un asistente de ventas debe responder diferente a uno de soporte.</p>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <FormField label="Canal inicial">
                <ChipGroup options={INITIAL_CHANNELS} value={form.behavior.initialChannel} onChange={updateBehavior('initialChannel')} />
              </FormField>
              <FormField label="Tono del asistente">
                <ChipGroup options={TONES} value={form.behavior.tone} onChange={updateBehavior('tone')} />
              </FormField>
              <FormField label="Objetivo principal">
                <ChipGroup options={GOALS} value={form.behavior.goal} onChange={updateBehavior('goal')} />
              </FormField>
              <FormField label="Nivel comercial">
                <ChipGroup options={SALES_LEVELS} value={form.behavior.salesLevel} onChange={updateBehavior('salesLevel')} />
              </FormField>
              <FormField label="Estilo de respuesta">
                <ChipGroup options={RESPONSE_STYLES} value={form.behavior.responseStyle} onChange={updateBehavior('responseStyle')} />
              </FormField>
            </div>
            
            <div className="space-y-6">
              <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-white mb-4">Reglas del asistente</h3>
                <div className="space-y-3">
                  <RuleCheckbox label="Pedir nombre del cliente" checked={form.behavior.rules.askName} onChange={updateRule('askName')} />
                  <RuleCheckbox label="Pedir teléfono o correo" checked={form.behavior.rules.askPhoneOrEmail} onChange={updateRule('askPhoneOrEmail')} />
                  <RuleCheckbox label="Ofrecer precios cuando pregunte" checked={form.behavior.rules.offerPrices} onChange={updateRule('offerPrices')} />
                  <RuleCheckbox label="Sugerir agendar una cita" checked={form.behavior.rules.suggestAppointment} onChange={updateRule('suggestAppointment')} />
                  <RuleCheckbox label="Enviar al humano si no sabe" checked={form.behavior.rules.handoffToHuman} onChange={updateRule('handoffToHuman')} />
                  <RuleCheckbox label="No inventar información" checked={form.behavior.rules.doNotInvent} onChange={updateRule('doNotInvent')} />
                  <RuleCheckbox label="Responder siempre en español" checked={form.behavior.rules.alwaysSpanish} onChange={updateRule('alwaysSpanish')} />
                </div>
              </div>
              
              <div className="bg-brand-violet/10 border border-brand-violet/20 rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-brand-violet mb-3 flex items-center gap-2">
                  <Bot className="w-4 h-4" />
                  Así respondería tu asistente
                </h3>
                <p className="text-sm text-slate-200 leading-relaxed italic">
                  &quot;{getBehaviorPreview()}&quot;
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 5 — Additional config */}
        <div className="bg-card-bg/60 backdrop-blur border border-white/10 rounded-3xl p-6 lg:p-8 space-y-6 shadow-xl">
          <div className="flex items-center gap-3 border-b border-white/[0.06] pb-4">
            <div className="p-2 bg-brand-cyan/10 rounded-lg">
              <Clock className="w-5 h-5 text-brand-cyan" />
            </div>
            <div>
              <h2 className="font-semibold text-xl">Configuración adicional</h2>
            </div>
          </div>
          
          <FormField label="Horario de atención" hint="Define cuándo está disponible tu negocio. El asistente puede usar este horario para orientar mejor al cliente.">
            <TextInput value={form.schedule} onChange={setField('schedule')} placeholder="Lunes a viernes 9:00 a 18:00. Sábados 10:00 a 14:00. Domingos cerrado." />
          </FormField>
          
          <FormField label="Mensaje de respaldo" hint="Qué debe responder el asistente cuando no tenga suficiente información.">
            <div className="relative">
              <MessageCircle className="absolute left-4 top-3.5 w-4 h-4 text-slate-500 pointer-events-none" />
              <TextAreaInput className="pl-11" value={form.fallback_message} onChange={setField('fallback_message')} rows={2} placeholder="Lo siento, no tengo esa información ahora mismo. ¿Quieres que te contacte un asesor?" />
            </div>
            
            <div className="flex flex-wrap gap-2 mt-3">
              {[
                { label: 'Contactar asesor', text: 'Lo siento, no tengo esa información. ¿Quieres que te contacte un asesor humano?' },
                { label: 'Pedir más detalles', text: 'No estoy seguro de entender. ¿Podrías darme más detalles para ayudarte mejor?' },
                { label: 'Tomar datos', text: 'Para consultas específicas necesito que me dejes tu correo o teléfono y nos pondremos en contacto.' },
                { label: 'Respuesta formal', text: 'Nuestras disculpas, esa consulta requiere atención de soporte técnico. Por favor escriba a contacto@empresa.com.' },
              ].map(btn => (
                <button
                  key={btn.label}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, fallback_message: btn.text }))}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-white/10 bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08] transition-all"
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </FormField>
        </div>

        {/* Section 6 - Install */}
        <div className="bg-card-bg/60 backdrop-blur border border-white/10 rounded-3xl p-6 lg:p-8 space-y-6 shadow-xl">
          <div className="border-b border-white/[0.06] pb-4">
            <h2 className="font-semibold text-xl mb-1">Cómo usar varios asistentes en tus canales</h2>
            <p className="text-sm text-slate-400">Puedes instalarlos por separado o dejar que ConversaAI dirija cada conversación al asistente correcto.</p>
          </div>
          
          <div className="flex gap-2 border-b border-white/10">
            {['webchat', 'telegram', 'whatsapp'].map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab as 'webchat' | 'telegram' | 'whatsapp')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-all capitalize flex items-center gap-2 ${
                  activeTab === tab 
                    ? 'border-brand-cyan text-brand-cyan' 
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                {tab === 'webchat' ? 'Web Chat' : tab}
                {tab !== 'whatsapp' && form.channels[tab as 'webchat' | 'telegram'].enabled && (
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-success shadow-[0_0_5px_#22c55e]" />
                )}
              </button>
            ))}
          </div>
          
          <div className="pt-2">
            {activeTab === 'webchat' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    <Code2 className="w-5 h-5 text-brand-cyan" />
                    Web Chat
                  </h3>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-sm text-slate-400 font-medium">Habilitar canal</span>
                    <input type="checkbox" className="hidden" checked={form.channels.webchat.enabled} onChange={(e) => updateChannel('webchat', 'enabled', e.target.checked)} />
                    <div className={`w-10 h-5 rounded-full transition-colors flex items-center px-0.5 ${form.channels.webchat.enabled ? 'bg-brand-cyan' : 'bg-slate-700'}`}>
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${form.channels.webchat.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                    </div>
                  </label>
                </div>
                <ol className={`list-decimal list-inside text-sm text-slate-400 space-y-2 transition-opacity ${!form.channels.webchat.enabled && 'opacity-50'}`}>
                  <li>Crea tu asistente en ConversaAI (clic en Guardar).</li>
                  <li>Copia el script generado en la vista del asistente.</li>
                  <li>Pégalo antes de la etiqueta <code>&lt;/body&gt;</code> de tu sitio web.</li>
                  <li>Personaliza color, posición y mensaje inicial.</li>
                  <li>Publica tu sitio y prueba el chat.</li>
                </ol>
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 mt-4 space-y-3">
                  <p className="text-sm text-white">Puedes instalar un asistente diferente en cada página de tu sitio o usar un solo widget con selector de área.</p>
                  <div className="grid sm:grid-cols-3 gap-2">
                    <div className="px-3 py-2 bg-[#0a0e1f] rounded-lg text-xs font-mono text-slate-300 border border-white/5">/precios → Asistente de Ventas</div>
                    <div className="px-3 py-2 bg-[#0a0e1f] rounded-lg text-xs font-mono text-slate-300 border border-white/5">/soporte → Asistente de Soporte</div>
                    <div className="px-3 py-2 bg-[#0a0e1f] rounded-lg text-xs font-mono text-slate-300 border border-white/5">/reservas → Asistente de Reservas</div>
                  </div>
                  <p className="text-xs text-brand-cyan/80">Para la mayoría de negocios, lo ideal es mostrar un solo chat visible y dirigir al cliente según lo que necesita.</p>
                </div>
                <div className="p-4 bg-slate-900 rounded-xl border border-white/5 mt-4 flex items-center justify-between">
                  <p className="text-sm text-slate-500 font-mono">El script final se generará después de crear el asistente.</p>
                  <button type="button" disabled className="p-2 rounded-lg bg-white/5 text-slate-500 opacity-50 cursor-not-allowed">
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
            {activeTab === 'telegram' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    <Send className="w-5 h-5 text-brand-violet" />
                    Telegram
                  </h3>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-sm text-slate-400 font-medium">Habilitar canal</span>
                    <input type="checkbox" className="hidden" checked={form.channels.telegram.enabled} onChange={(e) => updateChannel('telegram', 'enabled', e.target.checked)} />
                    <div className={`w-10 h-5 rounded-full transition-colors flex items-center px-0.5 ${form.channels.telegram.enabled ? 'bg-brand-violet' : 'bg-slate-700'}`}>
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${form.channels.telegram.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                    </div>
                  </label>
                </div>
                <ol className="list-decimal list-inside text-sm text-slate-400 space-y-2">
                  <li>Abre Telegram y busca a BotFather.</li>
                  <li>Crea un bot con <code>/newbot</code>.</li>
                  <li>Copia el token que te entrega BotFather.</li>
                  <li>Pega el token aquí abajo en ConversaAI.</li>
                  <li>Guarda y envía un mensaje de prueba a tu bot.</li>
                </ol>
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 mt-4 space-y-3">
                  <p className="text-sm text-white">Puedes conectar un bot diferente por asistente o usar un solo bot que pregunte si el cliente necesita ventas, soporte o reservas.</p>
                  <div className="px-4 py-3 bg-[#0a0e1f] rounded-xl text-xs font-mono text-slate-300 border border-white/5">
                    <div className="text-slate-400">Cliente: &quot;Hola&quot;</div>
                    <div className="text-brand-violet">Bot: &quot;¿En qué área necesitas ayuda?&quot;</div>
                    <div className="pl-4 mt-1 space-y-1 text-slate-500">
                      <div>- Ventas</div>
                      <div>- Soporte</div>
                      <div>- Reservas</div>
                    </div>
                  </div>
                  <p className="text-xs text-brand-violet/80">Un solo bot con selección de área se ve más profesional y evita confundir al cliente.</p>
                </div>
                <div className="mt-4">
                  <FormField
                    label="Token de Telegram"
                    hint={form.channels.telegram.token.trim()
                      ? '✅ Canal se activará al guardar el asistente.'
                      : 'Sin token: el canal quedará desactivado.'}
                  >
                    <TextInput
                      value={form.channels.telegram.token}
                      onChange={(v) => updateChannel('telegram', 'token', v)}
                      placeholder="123456789:ABCDEF..."
                    />
                  </FormField>
                  <p className="text-xs text-brand-pink mt-2">Nunca compartas este token públicamente.</p>
                </div>
              </div>
            )}
            {activeTab === 'whatsapp' && (
              <div className="flex flex-col items-center justify-center p-8 border border-white/5 bg-white/[0.02] rounded-2xl text-center">
                <div className="px-3 py-1 bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan rounded-full text-xs font-bold mb-4">
                  PRÓXIMAMENTE
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">WhatsApp</h3>
                <p className="text-sm text-slate-400 max-w-sm">La integración con WhatsApp estará disponible pronto. Mientras tanto puedes usar Web Chat y Telegram.</p>
                <div className="mt-4 bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-3 text-left w-full max-w-md">
                  <p className="text-sm text-white">En WhatsApp lo más recomendable es usar un solo número y enrutar la conversación según la intención del cliente.</p>
                  <div className="space-y-2">
                    <div className="px-3 py-2 bg-[#0a0e1f] rounded-lg text-xs font-mono text-slate-300 border border-white/5">&quot;Quiero precios&quot; → Asistente de Ventas</div>
                    <div className="px-3 py-2 bg-[#0a0e1f] rounded-lg text-xs font-mono text-slate-300 border border-white/5">&quot;Tengo un problema&quot; → Asistente de Soporte</div>
                    <div className="px-3 py-2 bg-[#0a0e1f] rounded-lg text-xs font-mono text-slate-300 border border-white/5">&quot;Quiero agendar&quot; → Asistente de Reservas</div>
                  </div>
                  <div className="inline-block px-2 py-1 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded text-xs">Recomendado para Business</div>
                </div>
              </div>
            )}
          </div>
          <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-brand-violet/10 to-brand-cyan/10 border border-brand-violet/20 flex items-start gap-3">
            <Zap className="w-5 h-5 text-brand-cyan flex-shrink-0 mt-0.5" />
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              <strong className="text-white">Próximamente</strong> podrás activar enrutamiento automático para que un solo Web Chat, bot de Telegram o número de WhatsApp detecte si el cliente necesita ventas, soporte o reservas.
            </p>
          </div>
        </div>

        {/* Errors */}
        {status === 'error' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-xl bg-brand-pink/10 border border-brand-pink/20 text-brand-pink text-sm">
            {errorMsg}
          </motion.div>
        )}

        {/* Submit */}
        {hasReachedLimit ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
              <Lock className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-200">
                Alcanzaste el límite de asistentes de tu plan actual. Mejora tu plan para crear asistentes para más áreas de tu negocio.
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push('/dashboard/billing')}
              className="w-full bg-gradient-to-r from-violet-500 to-cyan-500 py-4 px-6 rounded-xl text-white font-bold text-lg shadow-[0_0_20px_rgba(34,211,238,0.2)] hover:shadow-[0_0_30px_rgba(34,211,238,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              Mejorar plan
            </button>
          </div>
        ) : (
          <button
            type="submit"
            disabled={status === 'saving' || status === 'success'}
            className="w-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500 py-4 px-6 rounded-xl text-white shadow-[0_0_20px_rgba(34,211,238,0.2)] hover:shadow-[0_0_30px_rgba(34,211,238,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70 disabled:hover:scale-100 flex flex-col items-center justify-center gap-1 group"
          >
            <div className="flex items-center gap-2 font-bold text-lg">
              {status === 'saving' && <Loader2 className="w-5 h-5 animate-spin" />}
              {status === 'success' && <CheckCircle2 className="w-5 h-5 text-white" />}
              {status === 'saving' ? 'Guardando...' : status === 'success' ? '¡Guardado! Redirigiendo...' : 'Crear asistente IA'}
            </div>
            {status === 'idle' && (
              <span className="text-xs text-white/70 font-medium group-hover:text-white/90 transition-colors">
                Podrás probarlo en el Playground antes de publicarlo.
              </span>
            )}
          </button>
        )}
      </motion.form>

      {/* Playground Preview */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="lg:sticky lg:top-8 space-y-4"
      >
        <div>
          <h2 className="font-semibold text-lg mb-1">Vista previa en tiempo real</h2>
          <p className="text-sm text-slate-400">Prueba cómo responderá tu asistente sin guardarlo aún.</p>
        </div>
        <AssistantPlayground
          assistantConfig={previewConfig}
          title={form.assistant_name || 'Vista previa'}
        />
      </motion.div>

      <UpgradeModal 
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        title=""
        description=""
      />
    </div>
  )
}
