'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Globe, MessageCircle, Send, Pencil, Trash2, Calendar, Plug, Play, CheckCircle2, ChevronRight, Lock, AlertCircle, Sparkles, Users } from 'lucide-react'
import Link from 'next/link'
import { AssistantInstallModal } from './AssistantInstallModal'
import { AssistantTestModal } from './AssistantTestModal'
import type { PlanKey } from '@/lib/plans'

interface Assistant {
  id: string
  assistant_name: string
  business_name: string
  channel: string
  tone: string
  status: string
  created_at: string
  webchatStatus?: string
  conversationsCount?: number
  leadsCount?: number
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

  // As mentioned, without the backend for assistant_channels yet, we use fallbacks:
  // We assume WebChat is configured (default), Telegram and WhatsApp are pending/coming soon.
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
  const date = new Date(assistant.created_at).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })

  // Determine "Siguiente paso"
  let nextStep = ''
  if (!assistant.business_name || assistant.business_name === assistant.assistant_name) {
    nextStep = 'Edita la información del negocio para mejorar sus respuestas.'
  } else if (!assistantChannels.some(c => c.channel === 'telegram') && planLimits.channels.telegram) {
    nextStep = 'Conecta Telegram para responder mensajes desde tu bot.'
  } else {
    nextStep = 'Instala este asistente en tu sitio web para empezar a responder visitantes.'
  }

  return (
    <>
      <AssistantTestModal
        open={showTest}
        onClose={() => setShowTest(false)}
        assistantId={assistant.id}
        plan={plan}
        planLimits={planLimits}
        usage={usage}
      />
      
      <AssistantInstallModal
        open={showInstall}
        onClose={() => setShowInstall(false)}
        assistantId={assistant.id}
        plan={plan}
        planLimits={planLimits}
        assistantChannels={assistantChannels}
      />

      {/* Delete Modal */}
      <AnimatePresence>
        {showDelete && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{ background: 'rgba(5,8,22,0.8)', backdropFilter: 'blur(8px)' }}
            onClick={() => setShowDelete(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-[#080f28] border border-white/10 rounded-3xl p-7 max-w-sm w-full shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-brand-pink to-brand-violet" />
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-brand-pink/10 border border-brand-pink/20 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-brand-pink" />
                </div>
                <h3 className="font-bold text-white text-lg">Eliminar asistente</h3>
              </div>
              <p className="text-sm text-text-soft mb-8">Esta acción eliminará el asistente <strong>&quot;{assistant.assistant_name}&quot;</strong> y toda su configuración. No podrás recuperarlo.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowDelete(false)} className="flex-1 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-text-soft font-medium hover:text-white transition-all">Cancelar</button>
                <button onClick={handleDelete} disabled={deleting} className="flex-1 py-2.5 rounded-xl bg-brand-pink/10 border border-brand-pink/30 text-brand-pink font-semibold hover:bg-brand-pink/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {deleting ? 'Eliminando...' : 'Eliminar asistente'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card-bg/80 backdrop-blur-2xl border border-card-border rounded-3xl p-5 flex flex-col group hover:border-brand-violet/30 hover:-translate-y-1 transition-all overflow-hidden relative"
      >
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-brand-violet/0 via-brand-violet/20 to-brand-violet/0 opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Top row */}
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl gradient-btn flex items-center justify-center text-white font-bold text-xl flex-shrink-0 shadow-[0_0_20px_rgba(124,58,237,0.3)]">
              {initial}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-white text-base leading-tight truncate">{assistant.assistant_name}</h3>
              <p className="text-sm text-text-soft truncate max-w-[150px]">{assistant.business_name}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <button
              onClick={handleToggle}
              className={`flex-shrink-0 w-9 h-5 rounded-full transition-all ${
                assistant.status === 'active' ? 'bg-brand-success' : 'bg-white/20'
              } relative`}
              title={assistant.status === 'active' ? 'Desactivar' : 'Activar'}
            >
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${assistant.status === 'active' ? 'left-4.5' : 'left-0.5'}`} />
            </button>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${assistant.status === 'active' ? 'bg-brand-success/10 text-brand-success' : 'bg-white/10 text-text-soft'}`}>
              {assistant.status === 'active' ? 'Activo' : 'Inactivo'}
            </span>
          </div>
        </div>

        {/* Canales y Estadísticas */}
        <div className="mb-4">
          <p className="text-[10px] text-text-soft font-semibold uppercase tracking-wider mb-2">Canales e Interacciones</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {assistant.webchatStatus === 'installed' ? (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-brand-success/10 border border-brand-success/20 text-brand-success text-xs font-medium">
                <Globe className="w-3.5 h-3.5" /> Web Chat (Instalado)
              </div>
            ) : assistant.webchatStatus === 'pending' ? (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan text-xs font-medium">
                <Globe className="w-3.5 h-3.5" /> Web Chat (Pendiente)
              </div>
            ) : assistant.webchatStatus === 'blocked' ? (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-brand-pink/10 border border-brand-pink/20 text-brand-pink text-xs font-medium">
                <Globe className="w-3.5 h-3.5" /> Web Chat (Bloqueado)
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-text-soft text-xs font-medium">
                <Globe className="w-3.5 h-3.5" /> Web Chat (Falta dominio)
              </div>
            )}
            
            {planLimits.channels.telegram ? (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#0088cc]/10 border border-[#0088cc]/20 text-[#0088cc] text-xs font-medium">
                <Send className="w-3.5 h-3.5" /> Telegram
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-text-soft text-xs font-medium">
                <Send className="w-3.5 h-3.5 opacity-50" /> <Lock className="w-2.5 h-2.5" /> Telegram
              </div>
            )}
          </div>
          <div className="flex gap-4 text-xs">
            <Link href={`/dashboard/conversations?assistantId=${assistant.id}`} className="flex items-center gap-1 text-text-soft hover:text-white transition-colors">
              <MessageCircle className="w-4 h-4 text-brand-violet" /> 
              <span className="font-semibold text-white">{assistant.conversationsCount || 0}</span> conv.
            </Link>
            <Link href={`/dashboard/leads?assistantId=${assistant.id}`} className="flex items-center gap-1 text-text-soft hover:text-white transition-colors">
              <Users className="w-4 h-4 text-brand-cyan" /> 
              <span className="font-semibold text-white">{assistant.leadsCount || 0}</span> leads
            </Link>
          </div>
        </div>

        {/* Siguiente paso */}
        <div className="mb-5 p-3 rounded-xl bg-gradient-to-br from-brand-violet/10 to-brand-cyan/5 border border-brand-violet/20">
          <p className="text-[10px] text-brand-cyan font-semibold uppercase tracking-wider mb-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-brand-cyan" /> Siguiente paso recomendado
          </p>
          <p className="text-xs text-text-secondary leading-relaxed">
            {nextStep}
          </p>
        </div>

        {/* Actions */}
        <div className="mt-auto space-y-3">
          <div className="space-y-1">
            <button
              onClick={() => setShowTest(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl gradient-btn text-white text-sm font-semibold hover:opacity-90 transition-all glow-violet shadow-lg"
            >
              <Play className="w-4 h-4 fill-white" /> Probar asistente
            </button>
            <p className="text-[10px] text-text-soft text-center w-full flex justify-center items-center gap-1">
              <AlertCircle className="w-3 h-3" /> Las pruebas consumen mensajes del plan
            </p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setShowInstall(true)}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white text-xs font-semibold hover:bg-white/[0.08] transition-colors"
            >
              <Plug className="w-4 h-4 text-brand-cyan" /> Instalar
            </button>
            <Link
              href={`/dashboard/assistants/${assistant.id}?tab=edit`}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white text-xs font-semibold hover:bg-white/[0.08] transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" /> Editar
            </Link>
            <button
              onClick={() => setShowDelete(true)}
              className="px-3.5 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05] text-text-soft text-xs hover:bg-brand-pink/10 hover:border-brand-pink/20 hover:text-brand-pink transition-colors"
              title="Eliminar"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-4 pt-3 border-t border-white/[0.05] flex items-center justify-between text-[10px] text-text-soft">
          <span className="capitalize px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08]">{assistant.tone}</span>
          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {date}</span>
        </div>
      </motion.div>
    </>
  )
}
