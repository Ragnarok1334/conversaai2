'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Globe, MessageCircle, MoreHorizontal, Palette, Pencil, Play, Plug, Target, Trash2, Users } from 'lucide-react'
import Link from 'next/link'
import { AssistantTestModal } from './AssistantTestModal'
import type { PlanKey } from '@/lib/plans'

interface Assistant {
  id: string
  name?: string
  status: string
  created_at: string
  purpose?: string
  widget_config?: Record<string, unknown>
  health?: any
  conversationsCount?: number
  leadsCount?: number
  assistant_name?: string
  business_name?: string
  assistant_domains?: Array<{ last_seen_at?: string | null }>
}

interface AssistantCardProps {
  assistant: Assistant
  plan: PlanKey
  planLimits: any
  usage: any
  onDelete?: (id: string) => void
  onToggleStatus?: (id: string, status: string) => void
}

export function AssistantCard({ assistant, plan, planLimits, usage, onDelete, onToggleStatus }: AssistantCardProps) {
  const [showDelete, setShowDelete] = useState(false)
  const [showTest, setShowTest] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const health = assistant.health || {
    baseState: 'Falta instalación', score: 0, scoreLevel: 'Bajo', trainingQuality: 'Básico',
    nextStep: 'Completa la configuración del asistente.',
    badges: { isReceivingConversations: false, isGeneratingLeads: false, hasVerifiedDomain: false, hasPendingDomain: false },
  }
  const name = assistant.assistant_name || assistant.name || 'Asistente'
  const initial = name.charAt(0).toUpperCase()
  const domains = assistant.assistant_domains || []
  const hasTraining = health.score > 20 || health.baseState !== 'Necesita entrenamiento'
  const isCustomized = Boolean(assistant.widget_config && Object.keys(assistant.widget_config).length > 0)
  const hasDomain = domains.length > 0
  const isDetected = domains.some(domain => domain.last_seen_at)

  const primaryAction = !hasTraining
    ? { href: `/dashboard/assistants/${assistant.id}?tab=edit`, label: 'Completar información', icon: Pencil, tone: 'amber' }
    : !isCustomized
      ? { href: `/dashboard/assistants/${assistant.id}?tab=webchat`, label: 'Personalizar Web Chat', icon: Palette, tone: 'cyan' }
      : !hasDomain
        ? { href: `/dashboard/assistants/${assistant.id}?tab=install`, label: 'Autorizar dominio', icon: Globe, tone: 'cyan' }
        : !isDetected
          ? { href: `/dashboard/assistants/${assistant.id}?tab=install`, label: 'Terminar instalación', icon: Plug, tone: 'amber' }
          : { href: `/dashboard/conversations?assistantId=${assistant.id}`, label: 'Ver conversaciones', icon: MessageCircle, tone: 'violet' }
  const PrimaryIcon = primaryAction.icon

  const stateClass = health.baseState === 'Activo'
    ? 'bg-brand-success/10 text-brand-success border-brand-success/20'
    : health.baseState === 'Requiere atención' || health.baseState === 'Necesita entrenamiento'
      ? 'bg-brand-pink/10 text-brand-pink border-brand-pink/20'
      : health.baseState === 'Falta instalación'
        ? 'bg-brand-violet/10 text-brand-violet border-brand-violet/20'
        : 'bg-brand-cyan/10 text-brand-cyan border-brand-cyan/20'
  const scoreClass = health.score >= 80 ? 'text-brand-success' : health.score >= 50 ? 'text-amber-500' : 'text-brand-pink'
  const primaryClass = primaryAction.tone === 'cyan'
    ? 'bg-brand-cyan text-slate-950 border-brand-cyan'
    : primaryAction.tone === 'amber'
      ? 'bg-amber-500/10 text-amber-600 border-amber-500/25'
      : 'bg-brand-violet/10 text-brand-violet border-brand-violet/25'

  const handleToggle = async () => {
    const newStatus = assistant.status === 'active' ? 'inactive' : 'active'
    const response = await fetch(`/api/assistants/${assistant.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }),
    })
    if (response.ok) onToggleStatus?.(assistant.id, newStatus)
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const response = await fetch(`/api/assistants/${assistant.id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('No se pudo eliminar')
      onDelete?.(assistant.id)
      setShowDelete(false)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <AssistantTestModal open={showTest} onClose={() => setShowTest(false)} assistantId={assistant.id} plan={plan} planLimits={planLimits} usage={usage} />

      <AnimatePresence>
        {showDelete && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowDelete(false)}>
            <motion.div initial={{ scale: 0.96, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 12 }} onClick={event => event.stopPropagation()} className="w-full max-w-sm rounded-3xl border border-card-border bg-card-bg p-6 shadow-2xl">
              <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-pink/10"><Trash2 className="h-5 w-5 text-brand-pink" /></div><h3 className="text-lg font-bold">Eliminar asistente</h3></div>
              <p className="mt-4 text-sm text-text-soft">Eliminarás <strong className="text-text-main">{name}</strong> y su configuración. Esta acción no se puede deshacer.</p>
              <div className="mt-6 flex gap-3"><button onClick={() => setShowDelete(false)} className="flex-1 rounded-xl border border-card-border px-4 py-2.5 text-sm font-semibold">Cancelar</button><button onClick={handleDelete} disabled={deleting} className="flex-1 rounded-xl border border-brand-pink/30 bg-brand-pink/10 px-4 py-2.5 text-sm font-semibold text-brand-pink disabled:opacity-50">{deleting ? 'Eliminando…' : 'Eliminar'}</button></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.article layout initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} className="relative flex flex-col rounded-2xl border border-card-border bg-card-bg/80 p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-violet/30 hover:shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="gradient-btn grid h-11 w-11 shrink-0 place-items-center rounded-xl text-lg font-bold text-white">{initial}</div>
            <div className="min-w-0"><h3 className="truncate font-bold text-text-main">{name}</h3><p className="truncate text-sm text-text-soft">{assistant.business_name || assistant.purpose || 'Sin negocio definido'}</p></div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <button onClick={handleToggle} role="switch" aria-checked={assistant.status === 'active'} aria-label={assistant.status === 'active' ? 'Desactivar asistente' : 'Activar asistente'} className={`relative h-5 w-9 rounded-full ${assistant.status === 'active' ? 'bg-brand-success' : 'bg-slate-400/30'}`}><span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${assistant.status === 'active' ? 'left-[18px]' : 'left-0.5'}`} /></button>
            <span className={`max-w-28 truncate rounded-full border px-2 py-0.5 text-[10px] font-semibold ${stateClass}`}>{health.baseState}</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 divide-x divide-card-border rounded-xl border border-card-border bg-white/[0.025] py-2.5 text-center">
          <div><p className="text-[10px] font-semibold uppercase text-text-soft">Salud</p><p className={`mt-0.5 text-base font-black ${scoreClass}`}>{health.score}/100</p></div>
          <Link href={`/dashboard/conversations?assistantId=${assistant.id}`} className="block"><p className="text-[10px] font-semibold uppercase text-text-soft">Chats</p><p className="mt-0.5 text-base font-bold text-text-main">{assistant.conversationsCount || 0}</p></Link>
          <Link href={`/dashboard/leads?assistantId=${assistant.id}`} className="block"><p className="text-[10px] font-semibold uppercase text-text-soft">Leads</p><p className="mt-0.5 text-base font-bold text-text-main">{assistant.leadsCount || 0}</p></Link>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {health.badges.isReceivingConversations && <span className="inline-flex items-center gap-1 rounded-full border border-brand-violet/20 bg-brand-violet/10 px-2 py-1 text-[10px] font-semibold text-brand-violet"><MessageCircle className="h-3 w-3" /> Conversando</span>}
          {health.badges.isGeneratingLeads && <span className="inline-flex items-center gap-1 rounded-full border border-brand-success/20 bg-brand-success/10 px-2 py-1 text-[10px] font-semibold text-brand-success"><Users className="h-3 w-3" /> Captando leads</span>}
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold ${health.badges.hasVerifiedDomain ? 'border-brand-cyan/20 bg-brand-cyan/10 text-brand-cyan' : 'border-card-border bg-white/[0.025] text-text-soft'}`}><Globe className="h-3 w-3" /> {health.badges.hasVerifiedDomain ? 'Web instalado' : 'Web pendiente'}</span>
        </div>

        <div className="mt-3 flex items-start gap-2 rounded-xl border border-brand-violet/15 bg-brand-violet/[0.05] p-2.5"><Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-violet" /><p className="line-clamp-2 text-xs leading-relaxed text-text-soft">{health.nextStep}</p></div>

        <Link href={primaryAction.href} className={`mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition-opacity hover:opacity-90 ${primaryClass}`}><PrimaryIcon className="h-4 w-4" />{primaryAction.label}</Link>

        <div className="relative mt-2 grid grid-cols-[1fr_1fr_auto] gap-2">
          <Link href={`/dashboard/assistants/${assistant.id}?tab=edit`} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-card-border px-3 py-2 text-xs font-semibold text-text-main hover:bg-white/[0.04]"><Pencil className="h-3.5 w-3.5" /> Editar</Link>
          <button onClick={() => setShowTest(true)} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-card-border px-3 py-2 text-xs font-semibold text-text-main hover:bg-white/[0.04]"><Play className="h-3.5 w-3.5" /> Probar</button>
          <button onClick={() => setShowMenu(value => !value)} aria-expanded={showMenu} aria-label="Más acciones" className="grid w-10 place-items-center rounded-xl border border-card-border text-text-soft hover:text-text-main"><MoreHorizontal className="h-4 w-4" /></button>
          {showMenu && <div className="absolute bottom-11 right-0 z-30 w-44 overflow-hidden rounded-xl border border-card-border bg-card-bg p-1.5 shadow-2xl">
            <Link onClick={() => setShowMenu(false)} href={`/dashboard/assistants/${assistant.id}?tab=webchat`} className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium hover:bg-white/[0.05]"><Palette className="h-3.5 w-3.5" /> Web Chat</Link>
            <Link onClick={() => setShowMenu(false)} href={`/dashboard/assistants/${assistant.id}?tab=install`} className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium hover:bg-white/[0.05]"><Globe className="h-3.5 w-3.5" /> Instalación</Link>
            <Link onClick={() => setShowMenu(false)} href={`/dashboard/leads?assistantId=${assistant.id}`} className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium hover:bg-white/[0.05]"><Users className="h-3.5 w-3.5" /> Ver leads</Link>
            <button onClick={() => { setShowMenu(false); setShowDelete(true) }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-brand-pink hover:bg-brand-pink/10"><Trash2 className="h-3.5 w-3.5" /> Eliminar</button>
          </div>}
        </div>
      </motion.article>
    </>
  )
}
