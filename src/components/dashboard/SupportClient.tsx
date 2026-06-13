'use client'

import { useState, useEffect, useRef } from 'react'
import { Mail, MessageCircle, ShieldAlert, FileText, CheckCircle2, AlertCircle, Bot, Zap, Globe2, Activity, Wallet, ArrowRight, Check, Send, Sparkles, Copy, TriangleAlert, Plus, RefreshCw, ChevronDown } from 'lucide-react'
import Link from 'next/link'

interface SupportClientProps {
  user: any
}

// Custom Dropdown Component
function CustomDropdown({ options, value, onChange, label }: { options: string[], value: string, onChange: (v: string) => void, label: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  return (
    <div className="relative" ref={ref}>
      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{label}</label>
      <button 
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-violet/50 hover:border-white/20 transition-colors"
      >
        <span>{value}</span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      
      {open && (
        <div className="absolute z-[9999] w-full mt-2 bg-[#070B16] border border-brand-cyan/20 rounded-2xl shadow-[0_20px_60px_rgb(0,0,0,0.8)] ring-1 ring-white/10 py-1 overflow-hidden">
          {options.map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => {
                onChange(opt)
                setOpen(false)
              }}
              className={`w-full text-left px-4 py-3 text-sm transition-colors hover:bg-gradient-to-r hover:from-brand-violet/20 hover:to-brand-cyan/10 hover:text-white ${value === opt ? 'text-white bg-white/[0.03] font-semibold' : 'text-slate-300'}`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function SupportClient({ user }: SupportClientProps) {
  const [diagnosis, setDiagnosis] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [secondsAgo, setSecondsAgo] = useState(0)
  
  // Form state
  const [motivo, setMotivo] = useState('Problema con asistente')
  const [prioridad, setPrioridad] = useState('Media')
  const [mensaje, setMensaje] = useState('')
  const [sending, setSending] = useState(false)
  const [sendSuccess, setSendSuccess] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showTechnical, setShowTechnical] = useState(false)

  const fetchDiagnosis = async (isBackground = false) => {
    if (!isBackground) setLoading(true)
    else setIsSyncing(true)
    
    setError(null)
    try {
      const res = await fetch('/api/support/diagnosis', { cache: 'no-store' })
      const data = await res.json()
      if (res.ok) {
        setDiagnosis(data)
        setLastSync(new Date())
        setSecondsAgo(0)
      } else {
        setError(data.error || 'No se pudo cargar el diagnóstico.')
      }
    } catch (err) {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      if (!isBackground) setLoading(false)
      setIsSyncing(false)
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchDiagnosis()
  }, [])

  // Auto-refresh & tab visibility
  useEffect(() => {
    let interval: NodeJS.Timeout
    
    const tick = () => {
      if (document.visibilityState === 'visible' && !isSyncing) {
        fetchDiagnosis(true)
      }
    }

    interval = setInterval(tick, 45000)
    
    return () => clearInterval(interval)
  }, [isSyncing])

  // Seconds ago timer
  useEffect(() => {
    const timer = setInterval(() => {
      if (lastSync) {
        setSecondsAgo(Math.floor((new Date().getTime() - lastSync.getTime()) / 1000))
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [lastSync])

  const technicalContextText = diagnosis ? `ConversaAI - Diagnóstico de cuenta\nUsuario: ${diagnosis.supportContext.email}\nPlan: ${diagnosis.supportContext.plan}\nAsistentes: ${diagnosis.supportContext.assistantsTotal}\nWeb Chat: ${diagnosis.webchat.verifiedDomains} dominios verificados\nPagos pendientes: ${diagnosis.payments.pendingPayments}\nConversaciones: ${diagnosis.activity.conversationsCount}\nLeads: ${diagnosis.activity.leadsCount}\nEstado Global: ${diagnosis.globalStatus}\nFecha: ${new Date().toLocaleString()}` : ''

  const handleCopyDiagnosis = () => {
    if (!diagnosis) return
    navigator.clipboard.writeText(technicalContextText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (mensaje.length < 10) return
    
    setSending(true)
    setSendError(null)
    
    try {
      const res = await fetch('/api/support/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          motivo,
          prioridad,
          mensaje,
          contexto_tecnico: technicalContextText
        })
      })
      const data = await res.json()
      if (res.ok) {
        setSendSuccess(true)
        setMensaje('')
      } else {
        setSendError(data.error || 'No se pudo enviar el mensaje.')
      }
    } catch (err) {
      setSendError('Error de red. Intenta nuevamente.')
    } finally {
      setSending(false)
    }
  }

  if (loading && !diagnosis) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <ShieldAlert className="w-12 h-12 text-brand-violet animate-pulse mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Analizando tu cuenta...</h2>
        <p className="text-slate-400">Revisando plan, asistentes y configuraciones.</p>
      </div>
    )
  }

  if (error && !diagnosis) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <AlertCircle className="w-12 h-12 text-brand-pink mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Error de diagnóstico</h2>
        <p className="text-slate-400 mb-6">{error}</p>
        <button onClick={() => fetchDiagnosis(false)} className="px-6 py-2 rounded-xl bg-white/10 hover:bg-white/20 font-medium transition-all">
          Reintentar
        </button>
      </div>
    )
  }

  const isNewUser = diagnosis?.assistants.total === 0

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === 'ok') return <CheckCircle2 className="w-5 h-5 text-brand-success shrink-0" />
    if (status === 'warning') return <TriangleAlert className="w-5 h-5 text-amber-500 shrink-0" />
    return <AlertCircle className="w-5 h-5 text-brand-pink shrink-0" />
  }

  const StatusColor = (status: string) => {
    if (status === 'ok') return 'border-brand-success/30 bg-brand-success/5'
    if (status === 'warning') return 'border-amber-500/30 bg-amber-500/5'
    return 'border-brand-pink/30 bg-brand-pink/5'
  }

  const GlobalStatusBadge = () => {
    const status = diagnosis?.globalStatus
    if (status === 'ok') return <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-success/10 border border-brand-success/30 text-brand-success text-sm font-semibold"><CheckCircle2 className="w-4 h-4" /> Correcto</div>
    if (status === 'warning') return <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500 text-sm font-semibold"><TriangleAlert className="w-4 h-4" /> Atención</div>
    return <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-pink/10 border border-brand-pink/30 text-brand-pink text-sm font-semibold"><AlertCircle className="w-4 h-4" /> Requiere acción</div>
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10 p-4 sm:p-8 pb-20">
      
      {/* HEADER PREMIUM */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <ShieldAlert className="w-8 h-8 text-brand-violet" />
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Soporte y diagnóstico
            </h1>
          </div>
          <p className="text-slate-400 max-w-xl">
            Analiza el estado de tu cuenta, detecta pendientes y solicita ayuda con contexto técnico.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 bg-card-bg/60 backdrop-blur-md border border-white/10 rounded-2xl p-3">
          <div className="flex items-center gap-2 px-3 border-r border-white/10">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-success opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-brand-success"></span>
            </span>
            <span className="text-sm font-medium text-white">En vivo</span>
          </div>
          <div className="text-sm text-slate-400 flex items-center gap-2">
            {isSyncing ? (
              <span className="flex items-center gap-2 text-brand-cyan"><RefreshCw className="w-4 h-4 animate-spin" /> Sincronizando...</span>
            ) : (
              `Actualizado hace ${secondsAgo}s`
            )}
          </div>
          <div className="flex items-center gap-2 pl-2">
            <button 
              onClick={() => fetchDiagnosis(true)}
              disabled={isSyncing}
              className="p-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] transition-colors text-white disabled:opacity-50"
              title="Actualizar diagnóstico"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            </button>
            <button 
              onClick={handleCopyDiagnosis}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] transition-colors text-sm font-semibold text-white"
            >
              {copied ? <Check className="w-4 h-4 text-brand-success" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copiado!' : 'Copiar diagnóstico'}
            </button>
          </div>
        </div>
      </div>

      {/* ESTADO GLOBAL */}
      {!isNewUser && (
        <div className="bg-gradient-to-r from-card-bg to-black/60 border border-white/10 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
          <div>
            <h2 className="text-lg font-medium text-slate-400 mb-2">Estado general de tu cuenta</h2>
            <div className="flex items-center gap-4">
              <GlobalStatusBadge />
              <p className="text-white text-sm">
                {diagnosis.globalStatus === 'ok' ? 'Todos los sistemas operando correctamente.' :
                 diagnosis.globalStatus === 'warning' ? 'Hay configuraciones pendientes que podrías mejorar.' :
                 'Detectamos problemas que requieren tu atención inmediata.'}
              </p>
            </div>
          </div>
          {diagnosis.recommendations.length > 0 && (
            <div className="shrink-0">
              <Link href={diagnosis.recommendations[0].href} className="gradient-btn px-6 py-3 rounded-xl font-bold text-white shadow-lg glow-violet hover:opacity-90 transition-opacity">
                {diagnosis.recommendations[0].actionLabel}
              </Link>
            </div>
          )}
        </div>
      )}

      {isNewUser ? (
        /* EMPTY STATE / NEW USER */
        <div className="bg-card-bg/60 backdrop-blur-xl border border-brand-violet/20 rounded-3xl p-8 sm:p-12 text-center relative overflow-hidden shadow-[0_0_40px_rgba(124,58,237,0.1)]">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-brand-violet to-brand-cyan" />
          <h2 className="text-2xl font-bold text-white mb-4">Tu cuenta está lista para empezar</h2>
          <p className="text-slate-400 max-w-2xl mx-auto mb-10">
            Aún no tienes asistentes configurados. Sigue esta pequeña guía paso a paso para poner tu IA en piloto automático.
          </p>

          <div className="max-w-lg mx-auto text-left space-y-4 mb-10">
            <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.05]">
              <div className="w-8 h-8 rounded-full bg-brand-violet/20 flex items-center justify-center shrink-0 border border-brand-violet/30 text-brand-violet font-bold text-sm">1</div>
              <div>
                <h3 className="text-white font-semibold mb-1">Crea tu primer asistente</h3>
                <p className="text-slate-400 text-sm">Define su objetivo y dale un nombre.</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.05]">
              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0 border border-white/10 text-slate-500 font-bold text-sm">2</div>
              <div>
                <h3 className="text-white font-semibold mb-1">Completa su conocimiento</h3>
                <p className="text-slate-400 text-sm">Agrega tus servicios, precios y horarios.</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.05]">
              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0 border border-white/10 text-slate-500 font-bold text-sm">3</div>
              <div>
                <h3 className="text-white font-semibold mb-1">Instálalo en tu sitio web</h3>
                <p className="text-slate-400 text-sm">Pega el código del Web Chat en tu página.</p>
              </div>
            </div>
          </div>

          <Link href="/dashboard/create-assistant" className="gradient-btn inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-white font-bold hover:opacity-90 transition-opacity glow-violet shadow-lg">
            <Plus className="w-5 h-5" /> Crear mi primer asistente
          </Link>
        </div>
      ) : (
        /* DIAGNOSTIC GRID */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Cuenta */}
          <div className={`p-6 rounded-3xl border backdrop-blur-md bg-card-bg/60 shadow-lg ${StatusColor(diagnosis.account.status)} transition-colors`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2 font-semibold text-white">
                <ShieldAlert className="w-5 h-5 opacity-70" /> Cuenta
              </div>
              <StatusIcon status={diagnosis.account.status} />
            </div>
            <p className="text-slate-300 text-sm mb-4">{diagnosis.account.message}</p>
            <div className="text-xs text-slate-500 bg-black/20 p-2.5 rounded-lg border border-white/[0.05] truncate" title={diagnosis.supportContext.email}>
              Usuario: {diagnosis.supportContext.email}
            </div>
          </div>

          {/* Plan */}
          <div className={`p-6 rounded-3xl border backdrop-blur-md bg-card-bg/60 shadow-lg ${StatusColor(diagnosis.plan.status)} transition-colors`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2 font-semibold text-white">
                <Zap className="w-5 h-5 opacity-70" /> Plan
              </div>
              <StatusIcon status={diagnosis.plan.status} />
            </div>
            <p className="text-slate-300 text-sm mb-4">{diagnosis.plan.message}</p>
            <div className="text-xs text-slate-500 bg-black/20 p-2.5 rounded-lg border border-white/[0.05] capitalize flex justify-between">
              <span>Plan actual:</span> <span className="font-semibold text-white">{diagnosis.plan.plan}</span>
            </div>
          </div>

          {/* Asistentes */}
          <div className={`p-6 rounded-3xl border backdrop-blur-md bg-card-bg/60 shadow-lg ${StatusColor(diagnosis.assistants.status)} transition-colors`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2 font-semibold text-white">
                <Bot className="w-5 h-5 opacity-70" /> Asistentes
              </div>
              <StatusIcon status={diagnosis.assistants.status} />
            </div>
            <p className="text-slate-300 text-sm mb-4">{diagnosis.assistants.message}</p>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
              <div className="bg-black/20 p-2 rounded-lg border border-white/[0.05]">Totales: <span className="text-white font-semibold">{diagnosis.assistants.total}</span></div>
              <div className="bg-black/20 p-2 rounded-lg border border-white/[0.05]">Activos: <span className="text-white font-semibold">{diagnosis.assistants.active}</span></div>
              <div className="bg-black/20 p-2 rounded-lg border border-white/[0.05]">Sin info: <span className="text-amber-400 font-semibold">{diagnosis.assistants.needsTraining}</span></div>
              <div className="bg-black/20 p-2 rounded-lg border border-white/[0.05]">Sin instalar: <span className="text-amber-400 font-semibold">{diagnosis.assistants.needsInstallation}</span></div>
            </div>
          </div>

          {/* Web Chat */}
          <div className={`p-6 rounded-3xl border backdrop-blur-md bg-card-bg/60 shadow-lg ${StatusColor(diagnosis.webchat.status)} transition-colors`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2 font-semibold text-white">
                <Globe2 className="w-5 h-5 opacity-70" /> Web Chat
              </div>
              <StatusIcon status={diagnosis.webchat.status} />
            </div>
            <p className="text-slate-300 text-sm mb-4">{diagnosis.webchat.message}</p>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
              <div className="bg-black/20 p-2 rounded-lg border border-white/[0.05]">Verificados: <span className="text-white font-semibold">{diagnosis.webchat.verifiedDomains}</span></div>
              <div className="bg-black/20 p-2 rounded-lg border border-white/[0.05]">Pendientes: <span className="text-amber-400 font-semibold">{diagnosis.webchat.pendingDomains}</span></div>
            </div>
          </div>

          {/* Pagos */}
          <div className={`p-6 rounded-3xl border backdrop-blur-md bg-card-bg/60 shadow-lg ${StatusColor(diagnosis.payments.status)} transition-colors`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2 font-semibold text-white">
                <Wallet className="w-5 h-5 opacity-70" /> Pagos
              </div>
              <StatusIcon status={diagnosis.payments.status} />
            </div>
            <p className="text-slate-300 text-sm mb-4">{diagnosis.payments.message}</p>
            <div className="grid grid-cols-1 gap-2 text-xs text-slate-400">
              <div className="bg-black/20 p-2 rounded-lg border border-white/[0.05] flex justify-between">
                <span>Pendientes:</span> <span className="text-white font-semibold">{diagnosis.payments.pendingPayments}</span>
              </div>
            </div>
          </div>

          {/* Actividad */}
          <div className={`p-6 rounded-3xl border backdrop-blur-md bg-card-bg/60 shadow-lg border-white/10 bg-white/[0.02] transition-colors`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2 font-semibold text-white">
                <Activity className="w-5 h-5 opacity-70 text-brand-cyan" /> Actividad
              </div>
            </div>
            <p className="text-slate-300 text-sm mb-4">Métricas de interacción.</p>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
              <div className="bg-black/20 p-2 rounded-lg border border-white/[0.05]">Conversaciones: <span className="text-white font-semibold">{diagnosis.activity.conversationsCount}</span></div>
              <div className="bg-black/20 p-2 rounded-lg border border-white/[0.05]">Leads: <span className="text-white font-semibold">{diagnosis.activity.leadsCount}</span></div>
            </div>
          </div>

        </div>
      )}

      {/* Siguientes pasos recomendados */}
      {!isNewUser && diagnosis.recommendations.length > 0 && (
        <div className="mt-12 mb-8">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-brand-violet" /> Siguientes pasos recomendados
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {diagnosis.recommendations.map((rec: any, idx: number) => (
              <div key={idx} className="bg-gradient-to-br from-card-bg to-black/40 border border-white/10 rounded-2xl p-6 relative overflow-hidden group">
                {rec.priority === 'high' && <div className="absolute top-0 inset-x-0 h-1 bg-brand-pink" />}
                {rec.priority === 'medium' && <div className="absolute top-0 inset-x-0 h-1 bg-amber-500" />}
                <h3 className="text-white font-semibold mb-2">{rec.title}</h3>
                <p className="text-slate-400 text-sm mb-6">{rec.description}</p>
                <Link href={rec.href} className="inline-flex items-center gap-2 text-sm font-semibold text-brand-cyan hover:text-white transition-colors">
                  {rec.actionLabel} <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FOOTER: Contacto Directo */}
      <div className="grid lg:grid-cols-2 gap-8 mt-12 pt-12 border-t border-white/[0.05]">
        <div>
          <h2 className="text-xl font-bold text-white mb-4">¿Necesitas ayuda humana?</h2>
          <p className="text-slate-400 mb-8 max-w-md">
            Si el diagnóstico no resuelve tu problema, nuestro equipo de soporte técnico está listo para ayudarte. Envíanos un mensaje y te responderemos lo antes posible.
          </p>

          <div className="space-y-4 mb-8">
            <a 
              href="https://t.me/conversaaix" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 rounded-xl bg-[#0088cc]/10 border border-[#0088cc]/20 hover:bg-[#0088cc]/20 transition-all group max-w-md"
            >
              <div className="flex items-center gap-3">
                <MessageCircle className="w-5 h-5 text-[#0088cc]" />
                <div>
                  <p className="font-medium text-[#0088cc]">Chat por Telegram</p>
                  <p className="text-xs text-[#0088cc]/70">Respuesta rápida de soporte</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-[#0088cc] group-hover:translate-x-1 transition-transform" />
            </a>
            
            <a 
              href="mailto:contacto@conversaai.store"
              className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] transition-all group max-w-md"
            >
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-text-soft" />
                <div>
                  <p className="font-medium text-white">Correo Electrónico</p>
                  <p className="text-xs text-slate-500">contacto@conversaai.store</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:translate-x-1 transition-transform" />
            </a>
          </div>

          {/* Contexto Técnico Toggle */}
          <div className="max-w-md bg-black/20 rounded-xl border border-white/5 overflow-hidden">
            <button 
              type="button"
              onClick={() => setShowTechnical(!showTechnical)}
              className="w-full p-4 flex items-center justify-between text-sm text-slate-400 hover:text-white transition-colors"
            >
              <span className="flex items-center gap-2"><FileText className="w-4 h-4" /> Ver diagnóstico técnico</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showTechnical ? 'rotate-180' : ''}`} />
            </button>
            {showTechnical && (
              <div className="p-4 pt-0 border-t border-white/5 text-xs text-slate-500 font-mono whitespace-pre-wrap text-left break-all">
                {technicalContextText}
              </div>
            )}
          </div>
        </div>

        {/* Contact Form */}
        <div className="bg-card-bg/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 relative">
          {sendSuccess ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-brand-success/20 border border-brand-success/30 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-8 h-8 text-brand-success" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Mensaje enviado</h3>
              <p className="text-slate-400">Hemos recibido tu reporte junto con el diagnóstico técnico de tu cuenta. Te contactaremos pronto.</p>
              <button onClick={() => setSendSuccess(false)} className="mt-6 text-brand-cyan hover:text-white transition-colors text-sm font-semibold">
                Enviar otro mensaje
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <h3 className="text-lg font-semibold text-white mb-2">Enviar ticket de soporte</h3>
              
              {sendError && (
                <div className="p-3 bg-brand-pink/10 border border-brand-pink/30 rounded-xl text-sm text-brand-pink flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> {sendError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <CustomDropdown
                  label="Motivo"
                  value={motivo}
                  onChange={setMotivo}
                  options={[
                    'Problema con asistente',
                    'Problema con Web Chat',
                    'Problema con respuestas IA',
                    'Problema con pago',
                    'Cuenta o acceso',
                    'Otro'
                  ]}
                />
                <CustomDropdown
                  label="Prioridad"
                  value={prioridad}
                  onChange={setPrioridad}
                  options={['Baja', 'Media', 'Alta']}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Mensaje detallado</label>
                <textarea 
                  value={mensaje}
                  onChange={e => setMensaje(e.target.value)}
                  placeholder="Describe qué ocurre, qué intentaste hacer y en qué pantalla pasó."
                  required
                  rows={4}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-violet/50 resize-none custom-scrollbar transition-colors hover:border-white/20"
                />
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500">
                <CheckCircle2 className="w-3.5 h-3.5 text-brand-success shrink-0" /> 
                Se adjuntará automáticamente el diagnóstico técnico seguro de tu cuenta.
              </div>

              <button 
                type="submit" 
                disabled={sending || mensaje.length < 10 || loading || !diagnosis}
                className="w-full gradient-btn py-3.5 rounded-xl text-white font-semibold hover:opacity-90 transition-all glow-violet flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {sending ? 'Enviando solicitud...' : <><Send className="w-4 h-4" /> Enviar solicitud</>}
              </button>
            </form>
          )}
        </div>
      </div>
      
    </div>
  )
}
