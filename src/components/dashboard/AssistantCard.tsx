'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Globe, MessageCircle, Send, Pencil, Trash2, Calendar, Plug, Play, CheckCircle2, Lock, AlertCircle, Sparkles, Users, Activity, Target, ShieldAlert, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { AssistantInstallModal } from './AssistantInstallModal'
import { AssistantTestModal } from './AssistantTestModal'
import type { PlanKey } from '@/lib/plans'
import type { AssistantHealthData } from '@/lib/assistant/assistant-health'

interface Assistant {
  id: string
  assistant_name: string
  business_name: string
  channel: string
  tone: string
  status: string
  created_at: string
  lastActivityAt?: string
  conversationsCount?: number
  leadsCount?: number
  health?: AssistantHealthData
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
  const [showInstall, setShowInstall] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const health = assistant.health || {
    baseState: 'Falta instalación',
    score: 0,
    scoreLevel: 'Bajo',
    badges: { isReceivingConversations: false, isGeneratingLeads: false, hasVerifiedDomain: false, hasPendingDomain: false },
    nextStep: 'Cargando información del asistente...',
    trainingQuality: 'Básico'
  }

  const assistantChannels = [{ channel: 'webchat' }]

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await fetch(`/api/assistants/${assistant.id}`, { method: 'DELETE' })
      onDelete?.(assistant.id)
    } catch {
      setDeleting(false)
      setShowDelete(false)
    }
  }

  const handleToggle = async () => {
    const newStatus = assistant.status === 'active' ? 'inactive' : 'active'
    try {
      await fetch(`/api/assistants/${assistant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      onToggleStatus?.(assistant.id, newStatus)
    } catch {
      // silent
    }
  }

  const initial = assistant.assistant_name.charAt(0).toUpperCase()
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Desconocida'
    return new Date(dateString).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const getBaseStateColor = (state: string) => {
    switch (state) {
      case 'Activo': return 'bg-brand-success/10 text-brand-success border-brand-success/20'
      case 'En configuración': return 'bg-brand-cyan/10 text-brand-cyan border-brand-cyan/20'
      case 'Falta instalación': return 'bg-brand-violet/10 text-brand-violet border-brand-violet/20'
      case 'Necesita entrenamiento': return 'bg-amber-500/10 text-amber-500 border-amber-500/20'
      case 'Requiere atención': return 'bg-brand-pink/10 text-brand-pink border-brand-pink/20'
      default: return 'bg-white/10 text-slate-300 border-white/20'
    }
  }

  const getScoreColor = (level: string) => {
    switch (level) {
      case 'Excelente': return 'text-brand-success'
      case 'Bueno': return 'text-brand-cyan'
      case 'Medio': return 'text-amber-500'
      case 'Bajo': return 'text-brand-pink'
      default: return 'text-slate-400'
    }
  }

  return (
    <>
      <AssistantTestModal open={showTest} onClose={() => setShowTest(false)} assistantId={assistant.id} plan={plan} planLimits={planLimits} usage={usage} />
      <AssistantInstallModal open={showInstall} onClose={() => setShowInstall(false)} assistantId={assistant.id} plan={plan} planLimits={planLimits} assistantChannels={assistantChannels} />

      <AnimatePresence>
        {showDelete && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: 'rgba(5,8,22,0.8)', backdropFilter: 'blur(8px)' }} onClick={() => setShowDelete(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} onClick={e => e.stopPropagation()} className="bg-[#080f28] border border-white/10 rounded-3xl p-7 max-w-sm w-full shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-brand-pink to-brand-violet" />
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-brand-pink/10 border border-brand-pink/20 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-brand-pink" />
                </div>
                <h3 className="font-bold text-white text-lg">Eliminar asistente</h3>
              </div>
              <p className="text-sm text-slate-400 mb-8">Esta acción eliminará el asistente <strong>&quot;{assistant.assistant_name}&quot;</strong> y toda su configuración. No podrás recuperarlo.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowDelete(false)} className="flex-1 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-slate-400 font-medium hover:text-white transition-all">Cancelar</button>
                <button onClick={handleDelete} disabled={deleting} className="flex-1 py-2.5 rounded-xl bg-brand-pink/10 border border-brand-pink/30 text-brand-pink font-semibold hover:bg-brand-pink/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {deleting ? 'Eliminando...' : 'Eliminar asistente'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-card-bg/80 backdrop-blur-2xl border border-card-border rounded-3xl p-5 flex flex-col group hover:border-brand-violet/30 hover:-translate-y-1 transition-all overflow-hidden relative">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-brand-violet/0 via-brand-violet/20 to-brand-violet/0 opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Top row */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl gradient-btn flex items-center justify-center text-white font-bold text-xl flex-shrink-0 shadow-[0_0_20px_rgba(124,58,237,0.3)]">
              {initial}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-white text-base leading-tight truncate">{assistant.assistant_name}</h3>
              <p className="text-sm text-slate-400 truncate max-w-[150px]">{assistant.business_name || 'Sin negocio definido'}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <button
              onClick={handleToggle}
              className={`flex-shrink-0 w-9 h-5 rounded-full transition-all ${assistant.status === 'active' ? 'bg-brand-success' : 'bg-white/20'} relative`}
              title={assistant.status === 'active' ? 'Desactivar' : 'Activar'}
            >
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${assistant.status === 'active' ? 'left-4.5' : 'left-0.5'}`} />
            </button>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${getBaseStateColor(health.baseState)}`}>
              {health.baseState}
            </span>
          </div>
        </div>

        {/* Health & Training Quality */}
        <div className="mb-4 flex items-center justify-between bg-black/20 rounded-xl p-3 border border-white/[0.05]">
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-0.5">Health Score</p>
            <div className="flex items-center gap-1.5">
              <span className={`text-lg font-black ${getScoreColor(health.scoreLevel)}`}>{health.score}/100</span>
            </div>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="text-right">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-0.5">Calidad info</p>
            <span className="text-sm font-semibold text-slate-300">{health.trainingQuality}</span>
          </div>
        </div>

        {/* Activity Badges */}
        <div className="mb-4 space-y-2">
          <div className="flex flex-wrap gap-2">
            {health.badges.isReceivingConversations && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-gradient-to-r from-brand-violet/20 to-brand-cyan/20 border border-brand-violet/30 text-white text-[10px] font-semibold">
                <MessageCircle className="w-3 h-3 text-brand-cyan" /> Recibiendo conversaciones
              </div>
            )}
            {health.badges.isGeneratingLeads && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-gradient-to-r from-brand-cyan/20 to-brand-success/20 border border-brand-success/30 text-white text-[10px] font-semibold">
                <Users className="w-3 h-3 text-brand-success" /> Generando leads
              </div>
            )}
            {health.badges.hasVerifiedDomain && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-[10px] font-medium">
                <Globe className="w-3 h-3 text-brand-cyan" /> Dominio verificado
              </div>
            )}
            {health.badges.hasPendingDomain && !health.badges.hasVerifiedDomain && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-medium">
                <Globe className="w-3 h-3" /> Dominio pendiente
              </div>
            )}
            {!health.badges.hasVerifiedDomain && !health.badges.hasPendingDomain && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/[0.03] border border-white/[0.05] text-slate-500 text-[10px] font-medium">
                <Globe className="w-3 h-3 opacity-50" /> Sin instalación web
              </div>
            )}
          </div>
          
          {/* Stats counts */}
          <div className="flex gap-4 text-xs">
            <Link href={`/dashboard/conversations?assistantId=${assistant.id}`} className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors">
              <span className="font-semibold text-white">{assistant.conversationsCount || 0}</span> conv.
            </Link>
            <Link href={`/dashboard/leads?assistantId=${assistant.id}`} className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors">
              <span className="font-semibold text-white">{assistant.leadsCount || 0}</span> leads
            </Link>
          </div>
        </div>

        {/* Siguiente paso */}
        <div className="mb-5 p-3 rounded-xl bg-gradient-to-br from-brand-violet/10 to-brand-cyan/5 border border-brand-violet/20 flex gap-2 items-start">
          <Target className="w-4 h-4 text-brand-cyan shrink-0 mt-0.5" />
          <div>
            <p className="text-[10px] text-brand-cyan font-semibold uppercase tracking-wider mb-0.5">Siguiente paso sugerido</p>
            <p className="text-xs text-slate-300 leading-relaxed">
              {health.nextStep}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-auto space-y-2">
          {health.baseState === 'Falta instalación' ? (
            <button onClick={() => setShowInstall(true)} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-violet/10 border border-brand-violet/20 text-brand-violet text-sm font-semibold hover:bg-brand-violet/20 transition-all">
              <Plug className="w-4 h-4" /> Instalar Web Chat
            </button>
          ) : health.baseState === 'Necesita entrenamiento' ? (
            <Link href={`/dashboard/assistants/${assistant.id}?tab=edit`} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-sm font-semibold hover:bg-amber-500/20 transition-all">
              <Pencil className="w-4 h-4" /> Mejorar entrenamiento
            </Link>
          ) : health.baseState === 'En configuración' ? (
            <button onClick={() => setShowTest(true)} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan text-sm font-semibold hover:bg-brand-cyan/20 transition-all">
              <Play className="w-4 h-4" /> Probar asistente
            </button>
          ) : health.baseState === 'Activo' ? (
            <Link href={`/dashboard/conversations?assistantId=${assistant.id}`} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-cyan/10 border border-brand-cyan/30 text-brand-cyan text-sm font-semibold hover:bg-brand-cyan/20 transition-all">
              <MessageCircle className="w-4 h-4" /> Ver conversaciones
            </Link>
          ) : (
            <button onClick={() => setShowTest(true)} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white text-sm font-semibold hover:bg-white/10 transition-all">
              <Play className="w-4 h-4" /> Probar asistente
            </button>
          )}
          
          <div className="flex gap-2 pt-1">
            <Link href={`/dashboard/assistants/${assistant.id}?tab=edit`} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.05] text-slate-300 text-xs font-medium hover:bg-white/[0.08] hover:text-white transition-colors">
              <Pencil className="w-3.5 h-3.5" /> Editar
            </Link>
            <Link href={`/dashboard/leads?assistantId=${assistant.id}`} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.05] text-slate-300 text-xs font-medium hover:bg-white/[0.08] hover:text-white transition-colors">
              <Users className="w-3.5 h-3.5" /> Leads
            </Link>
            <button onClick={() => setShowInstall(true)} className="px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/[0.05] text-slate-400 hover:text-brand-cyan hover:bg-brand-cyan/10 hover:border-brand-cyan/20 transition-colors" title="Canales">
              <Globe className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setShowDelete(true)} className="px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/[0.05] text-slate-400 hover:text-brand-pink hover:bg-brand-pink/10 hover:border-brand-pink/20 transition-colors" title="Eliminar">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-4 pt-4 border-t border-white/[0.05] flex items-center justify-between text-[10px] text-slate-500 font-medium">
          <span className="flex items-center gap-1"><Activity className="w-3 h-3" /> Últ. act: {formatDate(assistant.lastActivityAt)}</span>
        </div>
      </motion.div>
    </>
  )
}
