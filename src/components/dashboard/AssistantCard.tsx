'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Bot, Globe, MessageCircle, Send, Eye, Pencil, Trash2, Calendar } from 'lucide-react'
import Link from 'next/link'

interface Assistant {
  id: string
  assistant_name: string
  business_name: string
  channel: string
  tone: string
  status: string
  created_at: string
}

interface AssistantCardProps {
  assistant: Assistant
  onDelete?: (id: string) => void
  onToggleStatus?: (id: string, status: string) => void
}

const channelIcons: Record<string, React.ReactNode> = {
  webchat: <Globe className="w-4 h-4" />,
  telegram: <Send className="w-4 h-4" />,
  whatsapp: <MessageCircle className="w-4 h-4" />,
}

const channelLabel: Record<string, string> = {
  webchat: 'Web Chat',
  telegram: 'Telegram',
  whatsapp: 'WhatsApp',
}

const channelColor: Record<string, string> = {
  webchat: 'text-brand-cyan border-brand-cyan/30 bg-brand-cyan/10',
  telegram: 'text-brand-blue border-brand-blue/30 bg-brand-blue/10',
  whatsapp: 'text-brand-success border-brand-success/30 bg-brand-success/10',
}

export function AssistantCard({ assistant, onDelete, onToggleStatus }: AssistantCardProps) {
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm(`¿Eliminar "${assistant.assistant_name}"? Esta acción no se puede deshacer.`)) return
    setDeleting(true)
    try {
      await fetch(`/api/assistants/${assistant.id}`, { method: 'DELETE' })
      onDelete?.(assistant.id)
    } catch {
      setDeleting(false)
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
  const color = channelColor[assistant.channel] || channelColor.webchat
  const icon = channelIcons[assistant.channel] || channelIcons.webchat
  const label = channelLabel[assistant.channel] || assistant.channel
  const date = new Date(assistant.created_at).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-card-bg/80 backdrop-blur-2xl border border-card-border rounded-2xl p-5 flex flex-col gap-4 group hover:border-brand-violet/30 hover:-translate-y-1 transition-all"
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl gradient-btn flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-[0_0_20px_rgba(124,58,237,0.3)]">
            {initial}
          </div>
          <div>
            <h3 className="font-semibold text-sm leading-tight">{assistant.assistant_name}</h3>
            <p className="text-xs text-text-soft truncate max-w-[150px]">{assistant.business_name}</p>
          </div>
        </div>
        <button
          onClick={handleToggle}
          className={`flex-shrink-0 w-8 h-4 rounded-full transition-all ${
            assistant.status === 'active' ? 'bg-brand-success' : 'bg-white/20'
          } relative`}
          title={assistant.status === 'active' ? 'Desactivar' : 'Activar'}
        >
          <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all ${assistant.status === 'active' ? 'left-4' : 'left-0.5'}`} />
        </button>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-2">
        <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium ${color}`}>
          {icon}
          {label}
        </span>
        <span className="text-xs px-2.5 py-1 rounded-full border border-white/[0.1] bg-white/[0.04] text-text-soft capitalize">
          {assistant.tone}
        </span>
      </div>

      {/* Date */}
      <div className="flex items-center gap-1.5 text-xs text-text-soft">
        <Calendar className="w-3.5 h-3.5" />
        {date}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1 border-t border-white/[0.06]">
        <Link
          href={`/dashboard/assistants/${assistant.id}`}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-brand-violet/10 border border-brand-violet/20 text-brand-violet text-xs font-semibold hover:bg-brand-violet/20 transition-colors"
        >
          <Eye className="w-3.5 h-3.5" />
          Probar
        </Link>
        <Link
          href={`/dashboard/assistants/${assistant.id}?tab=edit`}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-text-soft text-xs font-semibold hover:bg-white/[0.08] transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" />
          Editar
        </Link>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-text-soft text-xs hover:bg-brand-pink/10 hover:border-brand-pink/20 hover:text-brand-pink transition-colors disabled:opacity-40"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  )
}
