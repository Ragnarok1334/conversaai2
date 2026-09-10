'use client'

import { useMemo, useState } from 'react'
import { BookOpen, CheckCircle2, Clock, HelpCircle, Save, ShoppingBag, Sparkles, TestTube2 } from 'lucide-react'
import Link from 'next/link'

interface Props {
  assistantId: string
  assistantName: string
  canEdit: boolean
  initialData: { instructions: string; services: string; faqs: string; schedule: string }
}

const fields = [
  { key: 'instructions', label: 'Información principal', help: 'Qué hace el negocio, ubicación, condiciones y datos que nunca debe inventar.', icon: BookOpen, max: 2000, rows: 6 },
  { key: 'services', label: 'Servicios, productos y precios', help: 'Describe claramente qué ofreces, valores, variantes y requisitos.', icon: ShoppingBag, max: 3000, rows: 6 },
  { key: 'faqs', label: 'Preguntas frecuentes', help: 'Escribe preguntas reales y sus respuestas, una debajo de otra.', icon: HelpCircle, max: 3000, rows: 6 },
  { key: 'schedule', label: 'Horarios y disponibilidad', help: 'Incluye días, horas, feriados y reglas para reservas o atención.', icon: Clock, max: 2500, rows: 4 },
] as const

export function AssistantKnowledgeTab({ assistantId, assistantName, canEdit, initialData }: Props) {
  const [form, setForm] = useState(initialData)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const completed = useMemo(() => fields.filter(field => form[field.key].trim().length >= 40).length, [form])
  const quality = Math.round((completed / fields.length) * 100)

  const save = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const response = await fetch(`/api/assistants/${assistantId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error || 'No se pudo guardar el conocimiento.')
      setMessage({ type: 'success', text: 'Conocimiento guardado correctamente.' })
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'No se pudo guardar el conocimiento.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-col gap-4 rounded-2xl border border-card-border bg-card-bg/80 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div><div className="flex items-center gap-2 text-sm font-semibold text-brand-violet"><Sparkles className="h-4 w-4" /> Fuente de conocimiento</div><h2 className="mt-1 text-xl font-bold">Lo que sabe {assistantName}</h2><p className="mt-1 text-sm text-text-soft">Mantén aquí la información que utilizará para responder a tus clientes.</p></div>
        <div className="min-w-44 rounded-xl border border-card-border bg-white/[0.025] p-3"><div className="flex items-center justify-between text-xs"><span className="font-semibold text-text-soft">Calidad</span><strong className={quality >= 75 ? 'text-brand-success' : quality >= 50 ? 'text-amber-500' : 'text-brand-pink'}>{quality}%</strong></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-400/15"><div className="h-full rounded-full bg-gradient-to-r from-brand-violet to-brand-cyan transition-all" style={{ width: `${quality}%` }} /></div><p className="mt-2 text-[11px] text-text-soft">{completed} de {fields.length} secciones completas</p></div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {fields.map(field => { const Icon = field.icon; const value = form[field.key]; const complete = value.trim().length >= 40; return <section key={field.key} className="rounded-2xl border border-card-border bg-card-bg/70 p-4">
          <div className="mb-3 flex items-start justify-between gap-3"><div className="flex gap-2.5"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-violet/10 text-brand-violet"><Icon className="h-4 w-4" /></div><div><h3 className="text-sm font-bold text-text-main">{field.label}</h3><p className="mt-0.5 text-xs leading-relaxed text-text-soft">{field.help}</p></div></div>{complete && <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-success" />}</div>
          <textarea disabled={!canEdit} value={value} onChange={event => setForm(current => ({ ...current, [field.key]: event.target.value }))} maxLength={field.max} rows={field.rows} className="w-full resize-y rounded-xl border border-card-border bg-white/[0.025] p-3 text-sm leading-relaxed text-text-main outline-none transition-colors placeholder:text-text-soft/60 focus:border-brand-violet/40 disabled:opacity-60" placeholder={`Agrega ${field.label.toLowerCase()}…`} />
          <p className="mt-1 text-right text-[10px] text-text-soft">{value.length.toLocaleString()} / {field.max.toLocaleString()}</p>
        </section> })}
      </div>

      {message && <div className={`rounded-xl border px-4 py-3 text-sm ${message.type === 'success' ? 'border-brand-success/25 bg-brand-success/10 text-brand-success' : 'border-brand-pink/25 bg-brand-pink/10 text-brand-pink'}`}>{message.text}</div>}
      <div className="sticky bottom-3 z-20 flex flex-col gap-3 rounded-2xl border border-card-border bg-card-bg/95 p-3 shadow-xl backdrop-blur sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-text-soft">Guarda los cambios y comprueba las respuestas antes de publicarlos.</p><div className="flex gap-2"><Link href={`/dashboard/assistants/${assistantId}?tab=test`} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-card-border px-4 py-2.5 text-sm font-semibold sm:flex-none"><TestTube2 className="h-4 w-4" /> Probar</Link><button onClick={save} disabled={!canEdit || saving} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-violet px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50 sm:flex-none"><Save className="h-4 w-4" /> {saving ? 'Guardando…' : 'Guardar cambios'}</button></div></div>
    </div>
  )
}
