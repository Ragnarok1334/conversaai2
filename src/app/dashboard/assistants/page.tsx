'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search, Bot, Crown, Sparkles, Briefcase, Building, MessagesSquare, CheckCircle2, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { AssistantCard } from '@/components/dashboard/AssistantCard'
import type { PlanKey } from '@/lib/plans'
import { PLAN_LIMITS } from '@/lib/plans'

interface Assistant {
  id: string
  assistant_name: string
  business_name: string
  channel: string
  tone: string
  status: string
  created_at: string
  conversationsCount?: number
  leadsCount?: number
  webchatStatus?: string
}

interface SubscriptionData {
  subscription: { plan: string; status: string }
  planConfig: { label: string; assistantsLimit: number | null; messagesLimit: number | null; channels: string[] }
  usage: { assistantsUsed: number; messagesUsed: number }
}

// Ocultamos WhatsApp por ahora ya que es "Próximamente"
const FILTER_CHANNELS = ['todos', 'webchat', 'telegram']
const CHANNEL_LABEL: Record<string, string> = {
  todos: 'Todos',
  webchat: 'Web Chat',
  telegram: 'Telegram',
}

function PlanIcon({ plan }: { plan: string }) {
  switch (plan) {
    case 'pro': return <Crown className="w-4 h-4 text-white" />
    case 'business': return <Briefcase className="w-4 h-4 text-white" />
    case 'enterprise': return <Building className="w-4 h-4 text-white" />
    default: return <Sparkles className="w-4 h-4 text-white" />
  }
}

export default function AssistantsPage() {
  const [assistants, setAssistants] = useState<Assistant[]>([])
  const [subData, setSubData] = useState<SubscriptionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [subLoading, setSubLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterChannel, setFilterChannel] = useState('todos')
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = async () => {
    setRefreshing(true)
    try {
      const [assRes, subRes] = await Promise.all([
        fetch('/api/assistants'),
        fetch('/api/subscription')
      ])
      const assData = await assRes.json()
      const sData = await subRes.json()
      
      if (assData.assistants) setAssistants(assData.assistants)
      if (!sData.error) setSubData(sData)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
      setSubLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
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

  const plan = (subData?.subscription?.plan ?? 'free') as PlanKey
  const planLimits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free
  const isUnlimitedAssistants = planLimits.assistants === Infinity
  const isUnlimitedMessages = planLimits.messagesPerMonth === Infinity

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* HEADER PROFESIONAL */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Mis asistentes</h1>
            <p className="text-text-soft mt-1">Administra, prueba e instala tus asistentes en los canales donde tus clientes ya te escriben.</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={fetchData}
              disabled={refreshing}
              className="p-3 rounded-xl bg-card-bg/80 border border-card-border hover:bg-white/[0.05] transition-colors"
              title="Actualizar datos"
            >
              <RefreshCw className={`w-5 h-5 text-text-soft ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <Link
              href="/dashboard/create-assistant"
              className="gradient-btn inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold hover:opacity-90 transition-opacity glow-violet"
            >
              <Plus className="w-5 h-5" />
              Crear asistente
            </Link>
          </div>
        </div>

        {/* STATS BAR */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card-bg/80 backdrop-blur border border-card-border rounded-2xl p-4 flex flex-col justify-center">
            <span className="text-xs text-text-soft mb-1 flex items-center gap-1.5"><Bot className="w-3.5 h-3.5"/> Asistentes creados</span>
            <span className="text-lg font-bold text-white">
              {!subLoading ? `${assistants.length} / ${isUnlimitedAssistants ? '∞' : planLimits.assistants}` : '...'}
            </span>
          </div>
          <div className="bg-card-bg/80 backdrop-blur border border-card-border rounded-2xl p-4 flex flex-col justify-center">
            <span className="text-xs text-text-soft mb-1 flex items-center gap-1.5"><MessagesSquare className="w-3.5 h-3.5"/> Mensajes este mes</span>
            <span className="text-lg font-bold text-white">
              {!subLoading ? `${subData?.usage?.messagesUsed ?? 0} / ${isUnlimitedMessages ? '∞' : planLimits.messagesPerMonth}` : '...'}
            </span>
          </div>
          <div className="bg-card-bg/80 backdrop-blur border border-card-border rounded-2xl p-4 flex flex-col justify-center">
            <span className="text-xs text-text-soft mb-1 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5"/> Canales activos</span>
            <span className="text-lg font-bold text-white">{assistants.length > 0 ? '1' : '0'}</span>
          </div>
          <div className="bg-card-bg/80 backdrop-blur border border-card-border rounded-2xl p-4 flex items-center justify-between">
            <div className="flex flex-col justify-center">
              <span className="text-xs text-text-soft mb-1 flex items-center gap-1.5">Plan actual</span>
              <span className="text-lg font-bold text-white capitalize flex items-center gap-2">
                {!subLoading ? (
                  <>
                    <div className="w-6 h-6 rounded-full bg-gradient-to-r from-brand-violet to-brand-blue flex items-center justify-center shadow-lg">
                      <PlanIcon plan={plan} />
                    </div>
                    {plan} {plan === 'business' && <span className="text-[10px] bg-brand-cyan/20 text-brand-cyan px-2 py-0.5 rounded-full">Activo</span>}
                  </>
                ) : '...'}
              </span>
            </div>
            {!subLoading && (plan === 'free' || plan === 'pro') && (
              <Link href="/dashboard/billing" className="text-[10px] px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.1] hover:bg-white/[0.08] transition-colors font-medium">
                Mejorar
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-white/[0.05]">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-8">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white mb-1">Organiza tu atención por áreas</h2>
            <p className="text-sm text-text-soft">
              Crea asistentes separados para ventas, soporte, reservas, sucursales o servicios específicos.
              Cada asistente puede tener su propio objetivo, tono, reglas e información — sin mezclar datos ni perder precisión.
            </p>
          </div>
          <div className="shrink-0 hidden sm:flex gap-3 text-[11px] text-slate-500 flex-col items-end pt-1">
            <span className="flex items-center gap-1.5">🛒 <span className="text-slate-400">Ventas</span> → precios y cierre</span>
            <span className="flex items-center gap-1.5">🎧 <span className="text-slate-400">Soporte</span> → dudas y seguimiento</span>
            <span className="flex items-center gap-1.5">📅 <span className="text-slate-400">Reservas</span> → horarios y citas</span>
          </div>
        </div>
      </div>

      {/* BUSCADOR Y FILTROS */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-soft" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre o negocio..."
            className="w-full bg-card-bg/80 backdrop-blur border border-card-border rounded-xl pl-11 pr-4 py-3.5 text-sm text-text-main placeholder:text-text-soft/40 focus:outline-none focus:border-brand-violet/40 transition-all"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
          {FILTER_CHANNELS.map(ch => {
            const count = ch === 'todos' ? assistants.length : assistants.filter(a => a.channel === ch).length
            return (
              <button
                key={ch}
                onClick={() => setFilterChannel(ch)}
                className={`whitespace-nowrap flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border transition-all ${
                  filterChannel === ch
                    ? 'gradient-btn text-white border-transparent shadow-[0_0_15px_rgba(124,58,237,0.3)]'
                    : 'bg-card-bg border-card-border text-text-soft hover:text-text-main hover:border-brand-violet/30'
                }`}
              >
                {CHANNEL_LABEL[ch]}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${filterChannel === ch ? 'bg-black/20' : 'bg-white/5'}`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* CONTENIDO */}
      {loading || subLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-64 bg-card-bg/60 rounded-3xl animate-pulse border border-card-border" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card-bg/80 backdrop-blur-xl border border-card-border rounded-3xl p-12 text-center relative overflow-hidden"
        >
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-brand-violet to-brand-cyan opacity-50" />
          <div className="w-20 h-20 rounded-2xl bg-brand-violet/10 border border-brand-violet/20 flex items-center justify-center mx-auto mb-6 relative">
            <Bot className="w-10 h-10 text-brand-violet" />
            <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-brand-cyan/20 border border-brand-cyan/30 flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-brand-cyan" />
            </div>
          </div>
          <h3 className="text-xl font-bold mb-3 text-white">Aún no tienes asistentes en esta vista</h3>
          <p className="text-text-soft mb-8 max-w-md mx-auto">
            Los asistentes son el motor de ConversaAI. Creando uno podrás responder automáticamente, captar prospectos y atender 24/7.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 mb-8 text-sm text-text-soft">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-brand-success" /> Responde FAQs automáticamente</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-brand-success" /> Captura leads de valor</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-brand-success" /> Atiende fuera de horario</span>
          </div>
          {!search && filterChannel === 'todos' && (
            <Link
              href="/dashboard/create-assistant"
              className="gradient-btn inline-flex items-center gap-2 px-8 py-4 rounded-xl text-white font-bold hover:opacity-90 transition-opacity glow-violet text-lg"
            >
              <Plus className="w-6 h-6" />
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
                plan={plan}
                planLimits={planLimits}
                usage={subData?.usage}
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
