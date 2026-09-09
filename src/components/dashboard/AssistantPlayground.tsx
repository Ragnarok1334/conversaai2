'use client'

import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Bot, CheckCircle2, Clock3, Eraser, Loader2, MessageSquare, Send, Sparkles } from 'lucide-react'
import { type AssistantConfig } from '@/lib/openai'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  latency?: number
}

interface Props {
  assistantId?: string
  assistantConfig?: Partial<AssistantConfig>
  title?: string
}

const SCENARIOS = [
  { label: 'Información', prompt: 'Hola, ¿qué servicios ofrecen y cuáles son sus precios?' },
  { label: 'Disponibilidad', prompt: '¿Qué horarios tienen disponibles esta semana?' },
  { label: 'Objeción', prompt: 'Me parece caro. ¿Por qué debería elegirlos?' },
  { label: 'Fuera de alcance', prompt: 'Tengo una consulta que no aparece en su información. ¿Puedes ayudarme?' },
]

export function AssistantPlayground({ assistantId, assistantConfig, title }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [warningOpen, setWarningOpen] = useState(false)
  const [acknowledged, setAcknowledged] = useState(false)
  const [error, setError] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const assistantName = title || assistantConfig?.assistantName || 'Asistente IA'
  const turns = messages.filter(item => item.role === 'assistant').length
  const lastLatency = [...messages].reverse().find(item => item.role === 'assistant')?.latency

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  const runTest = async () => {
    const text = input.trim()
    if (!text || loading) return
    const history = messages.map(({ role, content }) => ({ role, content }))
    const startedAt = Date.now()
    setMessages(previous => [...previous, { id: crypto.randomUUID(), role: 'user', content: text, timestamp: new Date() }])
    setInput(''); setLoading(true); setError('')
    try {
      const response = await fetch('/api/assistant/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assistantId, assistantConfig, userMessage: text, history }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'No se pudo completar la prueba.')
      setMessages(previous => [...previous, {
        id: crypto.randomUUID(), role: 'assistant', content: data.reply,
        timestamp: new Date(), latency: Date.now() - startedAt
      }])
    } catch (requestError) {
      const reason = requestError instanceof Error ? requestError.message : 'Error de conexión.'
      setError(reason)
      setMessages(previous => [...previous, { id: crypto.randomUUID(), role: 'assistant', content: reason, timestamp: new Date(), latency: Date.now() - startedAt }])
    } finally {
      setLoading(false)
      window.setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  const requestSend = () => {
    if (!input.trim() || loading) return
    if (!acknowledged && messages.length === 0) setWarningOpen(true)
    else void runTest()
  }

  const clear = () => {
    setMessages([]); setInput(''); setError('')
    window.setTimeout(() => inputRef.current?.focus(), 50)
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="space-y-4">
        <section className="rounded-2xl border border-card-border bg-card-bg p-4 shadow-sm">
          <h3 className="dashboard-strong mb-1 text-sm font-bold">Escenarios de prueba</h3>
          <p className="dashboard-muted mb-4 text-xs leading-relaxed">Simula consultas reales para detectar información faltante.</p>
          <div className="space-y-2">
            {SCENARIOS.map(scenario => (
              <button key={scenario.label} type="button" onClick={() => { setInput(scenario.prompt); inputRef.current?.focus() }} className="group flex w-full cursor-pointer items-center gap-2 rounded-xl border border-card-border px-3 py-2.5 text-left text-xs dashboard-strong transition hover:border-brand-cyan hover:bg-brand-cyan/5">
                <MessageSquare className="h-3.5 w-3.5 text-brand-cyan" />{scenario.label}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-card-border bg-card-bg p-4 shadow-sm">
          <h3 className="dashboard-strong mb-3 text-sm font-bold">Estado de la sesión</h3>
          <div className="space-y-3 text-xs">
            <Stat icon={CheckCircle2} label="Contexto" value={messages.length ? 'Recordando' : 'Preparado'} />
            <Stat icon={MessageSquare} label="Respuestas" value={String(turns)} />
            <Stat icon={Clock3} label="Última respuesta" value={lastLatency ? `${(lastLatency / 1000).toFixed(1)} s` : '—'} />
          </div>
          <p className="dashboard-muted mt-4 border-t border-card-border pt-3 text-[11px] leading-relaxed">Al limpiar, también se reinicia el contexto de esta prueba.</p>
        </section>
      </aside>

      <section className="flex min-h-[590px] flex-col overflow-hidden rounded-3xl border border-card-border bg-card-bg shadow-sm">
        <header className="flex items-center justify-between border-b border-card-border px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl gradient-btn text-white"><Bot className="h-5 w-5" /><i className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" /></span>
            <div className="min-w-0"><strong className="dashboard-strong block truncate text-sm">{assistantName}</strong><span className="flex items-center gap-1 text-xs text-brand-success"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Listo para probar</span></div>
          </div>
          <button type="button" onClick={clear} disabled={!messages.length && !input} className="dashboard-icon-button flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed"><Eraser className="h-3.5 w-3.5" /><span className="hidden sm:inline">Nueva prueba</span></button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto bg-black/[0.015] p-4 sm:p-6">
          {!messages.length && !loading && (
            <div className="flex h-full min-h-[340px] flex-col items-center justify-center px-4 text-center">
              <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-brand-violet/20 bg-brand-violet/5 text-brand-violet"><Sparkles className="h-7 w-7" /></span>
              <h3 className="dashboard-strong font-bold">Comienza una prueba controlada</h3>
              <p className="dashboard-muted mt-2 max-w-md text-sm leading-relaxed">Elige un escenario o escribe como lo haría un cliente. El asistente recordará esta conversación hasta que pulses “Nueva prueba”.</p>
            </div>
          )}
          {messages.map(message => (
            <div key={message.id} className={`flex gap-2.5 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {message.role === 'assistant' && <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg gradient-btn text-white"><Bot className="h-4 w-4" /></span>}
              <div className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${message.role === 'user' ? 'rounded-tr-sm bg-brand-violet text-white' : 'rounded-tl-sm border border-card-border bg-card-bg dashboard-strong shadow-sm'}`}>
                <p className="whitespace-pre-wrap">{message.content}</p>
                <div className={`mt-1.5 flex justify-end gap-2 text-[10px] ${message.role === 'user' ? 'text-white/60' : 'dashboard-muted'}`}><span>{message.timestamp.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}</span>{message.latency && <span>· {(message.latency / 1000).toFixed(1)} s</span>}</div>
              </div>
            </div>
          ))}
          {loading && <div className="flex items-center gap-2.5"><span className="flex h-8 w-8 items-center justify-center rounded-lg gradient-btn text-white"><Bot className="h-4 w-4" /></span><span className="flex items-center gap-2 rounded-2xl rounded-tl-sm border border-card-border bg-card-bg px-4 py-3 text-xs dashboard-muted"><Loader2 className="h-3.5 w-3.5 animate-spin" />Analizando y respondiendo…</span></div>}
          <div ref={endRef} />
        </div>

        <footer className="border-t border-card-border p-4">
          {error && <div className="mb-3 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-500"><AlertTriangle className="h-3.5 w-3.5" />{error}</div>}
          <div className="flex items-end gap-2 rounded-2xl border border-card-border bg-black/[0.02] p-2 focus-within:border-brand-violet/40">
            <textarea ref={inputRef} value={input} maxLength={2000} rows={1} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); requestSend() } }} placeholder="Escribe una consulta para probar…" className="max-h-28 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm dashboard-strong outline-none placeholder:text-slate-500" />
            <button type="button" onClick={requestSend} disabled={!input.trim() || loading} className="gradient-btn flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl text-white shadow-md disabled:cursor-not-allowed disabled:opacity-40"><Send className="h-4 w-4" /></button>
          </div>
          <div className="mt-2 flex justify-between text-[10px] dashboard-muted"><span>Enter para enviar · Shift + Enter para nueva línea</span><span>{input.length}/2000</span></div>
        </footer>
      </section>

      {warningOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050816]/70 p-4 backdrop-blur-sm">
        <div role="dialog" aria-modal="true" aria-labelledby="test-warning-title" className="w-full max-w-sm rounded-3xl border border-card-border bg-card-bg p-6 shadow-2xl">
          <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500"><AlertTriangle className="h-5 w-5" /></span>
          <h3 id="test-warning-title" className="dashboard-strong text-lg font-bold">Esta prueba consume un mensaje</h3>
          <p className="dashboard-muted mt-2 text-sm leading-relaxed">Cada respuesta generada se descuenta del límite mensual. El contexto de la sesión no genera cobros adicionales por sí solo.</p>
          <div className="mt-6 grid grid-cols-2 gap-3"><button type="button" onClick={() => setWarningOpen(false)} className="cursor-pointer rounded-xl border border-card-border px-4 py-2.5 text-sm font-semibold dashboard-strong">Cancelar</button><button type="button" onClick={() => { setAcknowledged(true); setWarningOpen(false); void runTest() }} className="gradient-btn cursor-pointer rounded-xl px-4 py-2.5 text-sm font-bold text-white">Probar ahora</button></div>
        </div>
      </div>}
    </div>
  )
}

function Stat({ icon: Icon, label, value }: { icon: typeof CheckCircle2; label: string; value: string }) {
  return <div className="flex items-center gap-2.5"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-violet/5 text-brand-violet"><Icon className="h-3.5 w-3.5" /></span><div><span className="dashboard-muted block text-[10px] uppercase tracking-wide">{label}</span><strong className="dashboard-strong">{value}</strong></div></div>
}
