'use client'

import { useMemo, useState } from 'react'
import { ArrowRight, Check, CheckCircle2, Lock, MessageCircle, Monitor, Palette, Plus, RotateCcw, Save, Send, Smartphone, Trash2, Type } from 'lucide-react'
import Link from 'next/link'

export interface WidgetConfig {
  displayName?: string
  subtitle?: string
  welcomeMessage?: string
  primaryColor?: string
  secondaryColor?: string
  theme?: 'modern' | 'minimal' | 'premium'
  position?: 'bottom-right' | 'bottom-left'
  launcherText?: string
  launcherMode?: 'icon' | 'icon-text'
  quickQuestions?: string[]
}

interface Props {
  assistantId: string
  assistantName: string
  businessName: string
  initialConfig: WidgetConfig
  currentPlan: string
  onContinue: () => void
}

const DEFAULTS: Required<WidgetConfig> = {
  displayName: '', subtitle: '', welcomeMessage: '', primaryColor: '#7C3AED',
  secondaryColor: '#06B6D4', theme: 'modern', position: 'bottom-right',
  launcherText: '', launcherMode: 'icon-text', quickQuestions: []
}

const PRESETS = [
  { name: 'ConversaAI', primary: '#7C3AED', secondary: '#06B6D4' },
  { name: 'Profesional', primary: '#2563EB', secondary: '#38BDF8' },
  { name: 'Elegante', primary: '#111827', secondary: '#6B7280' },
  { name: 'Comercial', primary: '#F97316', secondary: '#FACC15' },
  { name: 'Bienestar', primary: '#10B981', secondary: '#22D3EE' },
]
const EXAMPLES = ['¿Qué servicios ofrecen?', '¿Cuáles son sus horarios?', 'Quiero hablar con una persona']
const HEX = /^#[0-9a-f]{6}$/i

export function AssistantCustomization({ assistantId, assistantName, businessName, initialConfig, currentPlan, onContinue }: Props) {
  const [config, setConfig] = useState<Required<WidgetConfig>>({ ...DEFAULTS, ...initialConfig, quickQuestions: initialConfig.quickQuestions || [] })
  const [tab, setTab] = useState<'identity' | 'style' | 'start'>('identity')
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop')
  const [dirty, setDirty] = useState(false)
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const paid = ['pro', 'growth', 'business', 'enterprise'].includes(currentPlan)
  const growth = ['growth', 'business', 'enterprise'].includes(currentPlan)
  const valid = HEX.test(config.primaryColor) && (!growth || HEX.test(config.secondaryColor))
  const name = config.displayName.trim() || assistantName || 'Asistente virtual'
  const subtitle = config.subtitle.trim() || businessName || 'Normalmente responde en segundos'
  const welcome = config.welcomeMessage.trim() || `¡Hola! Soy ${name}. ¿En qué puedo ayudarte?`
  const launcher = config.launcherText.trim() || '¿Necesitas ayuda?'
  const completed = useMemo(() => [config.displayName, config.welcomeMessage, config.primaryColor].filter(Boolean).length, [config])

  const change = <K extends keyof WidgetConfig>(key: K, value: Required<WidgetConfig>[K]) => {
    setConfig(previous => ({ ...previous, [key]: value }))
    setDirty(true); setStatus('idle'); setMessage('')
  }

  const save = async () => {
    if (!dirty || !valid || status === 'saving') return
    setStatus('saving'); setMessage('')
    try {
      const response = await fetch(`/api/assistants/${assistantId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ widget_config: config })
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'No se pudo guardar la configuración.')
      setDirty(false); setStatus('success'); setMessage('Cambios guardados y publicados.')
    } catch (error) {
      setStatus('error'); setMessage(error instanceof Error ? error.message : 'No se pudo guardar.')
    }
  }

  const reset = () => {
    if (!window.confirm('¿Restaurar el diseño predeterminado? Podrás revisarlo antes de guardar.')) return
    setConfig(DEFAULTS); setDirty(true); setStatus('idle'); setMessage('')
  }

  const addQuestion = (text = '') => {
    if (config.quickQuestions.length >= 4) return
    change('quickQuestions', [...config.quickQuestions, text])
  }

  const updateQuestion = (index: number, text: string) => change('quickQuestions', config.quickQuestions.map((item, itemIndex) => itemIndex === index ? text : item))
  const removeQuestion = (index: number) => change('quickQuestions', config.quickQuestions.filter((_, itemIndex) => itemIndex !== index))

  const fieldClass = 'w-full rounded-xl border border-card-border bg-black/5 px-4 py-3 text-sm dashboard-strong outline-none transition focus:border-brand-cyan'
  const tabs = [
    { id: 'identity' as const, label: 'Identidad', icon: Type },
    { id: 'style' as const, label: 'Estilo', icon: Palette },
    { id: 'start' as const, label: 'Inicio del chat', icon: MessageCircle },
  ]

  return (
    <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
      <div className="overflow-hidden rounded-3xl border border-card-border bg-card-bg shadow-sm">
        <div className="flex flex-col gap-4 border-b border-card-border p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="dashboard-strong text-lg font-bold">Personaliza tu Web Chat</h3>
            <p className="dashboard-muted mt-1 text-sm">{completed}/3 elementos esenciales configurados.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={reset} className="dashboard-icon-button flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold"><RotateCcw className="h-3.5 w-3.5" />Restaurar</button>
            <button type="button" onClick={save} disabled={!dirty || !valid || status === 'saving'} className="gradient-btn flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
              <Save className="h-3.5 w-3.5" />{status === 'saving' ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 border-b border-card-border p-2">
          {tabs.map(item => <button key={item.id} type="button" onClick={() => setTab(item.id)} className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold transition ${tab === item.id ? 'bg-brand-violet/10 text-brand-violet' : 'dashboard-muted hover:bg-black/5'}`}><item.icon className="h-4 w-4" />{item.label}</button>)}
        </div>

        <div className="min-h-[430px] p-5 sm:p-6">
          {tab === 'identity' && <div className="space-y-5">
            <SectionTitle title="Identidad de marca" description="Lo primero que verá una persona al abrir el chat." />
            <Field label="Nombre visible" count={config.displayName.length} max={60}><input className={fieldClass} maxLength={60} value={config.displayName} onChange={e => change('displayName', e.target.value)} placeholder={assistantName || 'Ej. Asistente de ventas'} /></Field>
            <Field label="Subtítulo" count={config.subtitle.length} max={90} locked={!paid}><input disabled={!paid} className={fieldClass} maxLength={90} value={config.subtitle} onChange={e => change('subtitle', e.target.value)} placeholder={businessName || 'Ej. Respondemos en pocos segundos'} /></Field>
            <Field label="Mensaje de bienvenida" count={config.welcomeMessage.length} max={240}><textarea className={fieldClass + ' min-h-28 resize-none'} maxLength={240} value={config.welcomeMessage} onChange={e => change('welcomeMessage', e.target.value)} placeholder="Saluda y explica brevemente cómo puedes ayudar." /></Field>
          </div>}

          {tab === 'style' && <div className="space-y-5">
            <SectionTitle title="Estilo visual" description="Elige una base y ajústala a la marca del negocio." />
            <div className="grid gap-3 sm:grid-cols-2">
              {PRESETS.map(preset => {
                const selected = config.primaryColor === preset.primary && config.secondaryColor === preset.secondary
                return <button key={preset.name} type="button" disabled={!growth} onClick={() => { change('primaryColor', preset.primary); change('secondaryColor', preset.secondary) }} className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${selected ? 'border-brand-cyan bg-brand-cyan/5' : 'border-card-border hover:border-brand-cyan/40'}`}><span className="flex -space-x-2"><i className="h-7 w-7 rounded-full border-2 border-white" style={{ background: preset.primary }} /><i className="h-7 w-7 rounded-full border-2 border-white" style={{ background: preset.secondary }} /></span><span className="dashboard-strong text-sm font-semibold">{preset.name}</span>{selected && <Check className="ml-auto h-4 w-4 text-brand-success" />}</button>
              })}
            </div>
            {!growth && <PlanNotice plan="Growth" text="Los presets, gradientes y temas visuales avanzados" />}
            <div className="grid gap-4 sm:grid-cols-2">
              <ColorField label="Color principal" value={config.primaryColor} onChange={value => change('primaryColor', value)} valid={HEX.test(config.primaryColor)} />
              <ColorField label="Color secundario" value={config.secondaryColor} onChange={value => change('secondaryColor', value)} valid={HEX.test(config.secondaryColor)} disabled={!growth} />
            </div>
            <Field label="Posición del botón"><select className={fieldClass} value={config.position} onChange={e => change('position', e.target.value as Required<WidgetConfig>['position'])}><option value="bottom-right">Abajo a la derecha</option><option value="bottom-left">Abajo a la izquierda</option></select></Field>
          </div>}

          {tab === 'start' && <div className="space-y-5">
            <SectionTitle title="Inicio de la conversación" description="Facilita el primer contacto con un botón claro y preguntas útiles." />
            <div>
              <label className="dashboard-strong mb-2 block text-xs font-semibold">Botón flotante</label>
              <div className="grid grid-cols-2 gap-2 rounded-xl border border-card-border p-1.5">
                {([['icon-text', 'Ícono + texto'], ['icon', 'Solo ícono']] as const).map(([value, label]) => <button key={value} type="button" onClick={() => change('launcherMode', value)} className={`cursor-pointer rounded-lg px-3 py-2 text-sm transition ${config.launcherMode === value ? 'bg-brand-violet/10 font-semibold text-brand-violet' : 'dashboard-muted'}`}>{label}</button>)}
              </div>
            </div>
            <Field label="Texto del botón" count={config.launcherText.length} max={40} locked={!paid}><input disabled={!paid || config.launcherMode === 'icon'} className={fieldClass} maxLength={40} value={config.launcherText} onChange={e => change('launcherText', e.target.value)} placeholder="Ej. ¿Necesitas ayuda?" /></Field>
            <div>
              <div className="mb-3 flex items-center justify-between"><label className="dashboard-strong text-xs font-semibold">Preguntas rápidas</label><span className="dashboard-muted text-xs">{config.quickQuestions.length}/4</span></div>
              {!paid ? <PlanNotice plan="Pro" text="Las preguntas rápidas" /> : <div className="space-y-2">
                {config.quickQuestions.map((question, index) => <div key={index} className="flex gap-2"><input className={fieldClass} maxLength={80} value={question} onChange={e => updateQuestion(index, e.target.value)} placeholder="Escribe una pregunta frecuente" /><button type="button" onClick={() => removeQuestion(index)} aria-label="Eliminar pregunta" className="dashboard-icon-button cursor-pointer rounded-xl px-3 text-brand-pink"><Trash2 className="h-4 w-4" /></button></div>)}
                {config.quickQuestions.length < 4 && <button type="button" onClick={() => addQuestion()} className="dashboard-muted flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-card-border py-3 text-sm hover:border-brand-cyan"><Plus className="h-4 w-4" />Agregar pregunta</button>}
                <div className="flex flex-wrap gap-2 pt-2">{EXAMPLES.filter(item => !config.quickQuestions.includes(item)).map(item => <button key={item} type="button" onClick={() => addQuestion(item)} className="dashboard-muted cursor-pointer rounded-full border border-card-border px-3 py-1.5 text-xs hover:border-brand-cyan">+ {item}</button>)}</div>
              </div>}
            </div>
          </div>}
        </div>

        <div className="flex flex-col gap-3 border-t border-card-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div aria-live="polite" className={`text-xs ${status === 'error' ? 'text-red-500' : status === 'success' ? 'text-brand-success' : 'dashboard-muted'}`}>{message || (dirty ? 'Tienes cambios sin guardar.' : 'Todos los cambios están guardados.')}</div>
          <button type="button" onClick={onContinue} className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-card-border px-4 py-2 text-xs font-semibold dashboard-strong hover:border-brand-cyan">Continuar a instalación <ArrowRight className="h-3.5 w-3.5" /></button>
        </div>
      </div>

      <aside className="sticky top-24 rounded-3xl border border-card-border bg-card-bg p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div><h3 className="dashboard-strong font-bold">Vista previa</h3><p className="dashboard-muted text-xs">Se actualiza mientras escribes.</p></div>
          <div className="flex rounded-xl border border-card-border p-1">
            <button type="button" aria-label="Vista de escritorio" onClick={() => setPreviewMode('desktop')} className={`cursor-pointer rounded-lg p-2 ${previewMode === 'desktop' ? 'bg-brand-violet/10 text-brand-violet' : 'dashboard-muted'}`}><Monitor className="h-4 w-4" /></button>
            <button type="button" aria-label="Vista móvil" onClick={() => setPreviewMode('mobile')} className={`cursor-pointer rounded-lg p-2 ${previewMode === 'mobile' ? 'bg-brand-violet/10 text-brand-violet' : 'dashboard-muted'}`}><Smartphone className="h-4 w-4" /></button>
          </div>
        </div>
        <div className={`relative mx-auto overflow-hidden rounded-2xl bg-[#eef1f7] transition-all ${previewMode === 'mobile' ? 'h-[510px] max-w-[280px]' : 'h-[480px] w-full'}`}>
          <div className={`absolute bottom-5 ${config.position === 'bottom-left' ? 'left-4' : 'right-4'} w-[calc(100%-2rem)] max-w-[330px] overflow-hidden rounded-2xl bg-white shadow-2xl`}>
            <div className="p-4 text-white" style={{ background: `linear-gradient(135deg, ${config.primaryColor}, ${growth ? config.secondaryColor : config.primaryColor})` }}>
              <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 font-bold">{name.charAt(0).toUpperCase()}</span><div className="min-w-0"><strong className="block truncate text-sm">{name}</strong><span className="block truncate text-[11px] text-white/80">{subtitle}</span></div><span className="ml-auto h-2 w-2 rounded-full bg-emerald-300" /></div>
            </div>
            <div className="min-h-[210px] bg-slate-50 p-4">
              <div className="max-w-[90%] rounded-2xl rounded-tl-sm border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-700 shadow-sm">{welcome}</div>
              {config.quickQuestions.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{config.quickQuestions.filter(Boolean).slice(0, 3).map(item => <span key={item} className="rounded-full border px-2.5 py-1 text-[10px]" style={{ borderColor: config.primaryColor, color: config.primaryColor }}>{item}</span>)}</div>}
            </div>
            <div className="flex gap-2 border-t border-slate-200 bg-white p-3"><span className="flex-1 rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-400">Escribe tu mensaje…</span><span className="flex h-8 w-8 items-center justify-center rounded-xl text-white" style={{ background: config.primaryColor }}><Send className="h-3.5 w-3.5" /></span></div>
          </div>
          <div className={`absolute bottom-5 ${config.position === 'bottom-left' ? 'left-4' : 'right-4'} translate-y-16`}><span className="flex items-center gap-2 rounded-full px-4 py-3 text-xs font-semibold text-white shadow-lg" style={{ background: config.primaryColor }}><MessageCircle className="h-4 w-4" />{config.launcherMode === 'icon-text' && launcher}</span></div>
        </div>
        <p className="dashboard-muted mt-3 text-center text-[11px]">Esta vista no consume mensajes del plan.</p>
      </aside>
    </section>
  )
}

function SectionTitle({ title, description }: { title: string; description: string }) {
  return <div className="border-b border-card-border pb-4"><h4 className="dashboard-strong font-bold">{title}</h4><p className="dashboard-muted mt-1 text-sm">{description}</p></div>
}

function Field({ label, count, max, locked, children }: { label: string; count?: number; max?: number; locked?: boolean; children: React.ReactNode }) {
  return <div><div className="mb-2 flex items-center justify-between"><label className="dashboard-strong flex items-center gap-2 text-xs font-semibold">{label}{locked && <Lock className="h-3 w-3 text-amber-500" />}</label>{max !== undefined && <span className="dashboard-muted text-[11px]">{count || 0}/{max}</span>}</div>{children}{locked && <p className="mt-1.5 text-[11px] text-amber-600">Disponible desde el plan Pro.</p>}</div>
}

function ColorField({ label, value, onChange, valid, disabled }: { label: string; value: string; onChange: (value: string) => void; valid: boolean; disabled?: boolean }) {
  return <div><label className="dashboard-strong mb-2 block text-xs font-semibold">{label}</label><div className={`flex items-center gap-2 rounded-xl border p-2 ${valid ? 'border-card-border' : 'border-red-500'}`}><input type="color" disabled={disabled} value={valid ? value : '#000000'} onChange={e => onChange(e.target.value)} className="h-9 w-10 cursor-pointer rounded border-0 bg-transparent disabled:cursor-not-allowed" /><input disabled={disabled} value={value} maxLength={7} onChange={e => onChange(e.target.value)} className="min-w-0 flex-1 bg-transparent text-sm uppercase outline-none dashboard-strong disabled:opacity-50" /></div>{!valid && <p className="mt-1 text-[11px] text-red-500">Usa un color HEX válido, por ejemplo #7C3AED.</p>}</div>
}

function PlanNotice({ plan, text }: { plan: string; text: string }) {
  return <div className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3"><Lock className="h-4 w-4 shrink-0 text-amber-500" /><p className="dashboard-muted text-xs">{text} están disponibles en el plan <strong>{plan}</strong>. <Link href="/dashboard/billing" className="font-semibold text-brand-violet hover:underline">Ver planes</Link></p></div>
}
