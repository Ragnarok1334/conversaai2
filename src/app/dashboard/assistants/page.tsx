'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search, Bot } from 'lucide-react'
import Link from 'next/link'
import { AssistantCard } from '@/components/dashboard/AssistantCard'

interface Assistant {
  id: string
  assistant_name: string
  business_name: string
  channel: string
  tone: string
  status: string
  created_at: string
}

const FILTER_CHANNELS = ['todos', 'webchat', 'telegram', 'whatsapp']
const CHANNEL_LABEL: Record<string, string> = {
  todos: 'Todos',
  webchat: 'Web Chat',
  telegram: 'Telegram',
  whatsapp: 'WhatsApp',
}

export default function AssistantsPage() {
  const [assistants, setAssistants] = useState<Assistant[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterChannel, setFilterChannel] = useState('todos')

  useEffect(() => {
    fetch('/api/assistants')
      .then(r => r.json())
      .then(data => {
        setAssistants(data.assistants || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const filtered = assistants.filter(a => {
    const matchSearch = a.assistant_name.toLowerCase().includes(search.toLowerCase()) ||
      a.business_name.toLowerCase().includes(search.toLowerCase())
    const matchChannel = filterChannel === 'todos' || a.channel === filterChannel
    return matchSearch && matchChannel
  })

  const handleDelete = (id: string) => {
    setAssistants(prev => prev.filter(a => a.id !== id))
  }

  const handleToggleStatus = (id: string, status: string) => {
    setAssistants(prev => prev.map(a => a.id === id ? { ...a, status } : a))
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mis asistentes</h1>
          <p className="text-text-soft mt-1">{assistants.length} asistente{assistants.length !== 1 ? 's' : ''} creado{assistants.length !== 1 ? 's' : ''}</p>
        </div>
        <Link
          href="/dashboard/create-assistant"
          className="gradient-btn inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold hover:opacity-90 transition-opacity glow-violet w-fit"
        >
          <Plus className="w-5 h-5" />
          Crear asistente
        </Link>
      </div>

      {/* Search & filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-soft" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar asistente o negocio..."
            className="w-full bg-card-bg/80 backdrop-blur border border-card-border rounded-xl pl-11 pr-4 py-3 text-sm text-text-main placeholder:text-text-soft/40 focus:outline-none focus:border-brand-violet/40 transition-all"
          />
        </div>
        <div className="flex gap-2">
          {FILTER_CHANNELS.map(ch => (
            <button
              key={ch}
              onClick={() => setFilterChannel(ch)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                filterChannel === ch
                  ? 'gradient-btn text-white border-transparent'
                  : 'bg-card-bg border-card-border text-text-soft hover:text-text-main hover:border-brand-violet/30'
              }`}
            >
              {CHANNEL_LABEL[ch]}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-52 bg-card-bg/60 rounded-2xl animate-pulse border border-card-border" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-24"
        >
          <div className="w-20 h-20 rounded-2xl gradient-btn/10 border border-brand-violet/20 flex items-center justify-center mx-auto mb-6">
            <Bot className="w-10 h-10 text-brand-violet/50" />
          </div>
          <h3 className="text-xl font-bold mb-2">
            {search || filterChannel !== 'todos' ? 'Sin resultados' : 'No tienes asistentes aún'}
          </h3>
          <p className="text-text-soft mb-6 max-w-sm mx-auto">
            {search || filterChannel !== 'todos'
              ? 'Intenta con otros filtros o términos de búsqueda.'
              : 'Crea tu primer asistente de IA y empieza a automatizar conversaciones con clientes.'}
          </p>
          {!search && filterChannel === 'todos' && (
            <Link
              href="/dashboard/create-assistant"
              className="gradient-btn inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold hover:opacity-90 transition-opacity"
            >
              <Plus className="w-5 h-5" />
              Crear mi primer asistente
            </Link>
          )}
        </motion.div>
      ) : (
        <AnimatePresence>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(a => (
              <AssistantCard
                key={a.id}
                assistant={a}
                onDelete={handleDelete}
                onToggleStatus={handleToggleStatus}
              />
            ))}
          </div>
        </AnimatePresence>
      )}
    </div>
  )
}
