'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search, Bot, Crown, Sparkles, Briefcase, Building, MessagesSquare, CheckCircle2, RefreshCw, Globe, Users } from 'lucide-react'
import Link from 'next/link'
import { AssistantCard } from '@/components/dashboard/AssistantCard'
import { getPlanLimits, normalizePlan } from '@/lib/plans'

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
  planConfig: { label: string; limits: { assistants: number | null; messagesPerMonth: number | null }; channels: { [key: string]: boolean } }
  usage: { assistantsUsed: number; messagesUsed: number }
}

// Ocultamos WhatsApp por ahora ya que es "Próximamente"
const FILTER_STATUSES = ['todos', 'activos', 'configuracion', 'atencion']
const STATUS_LABEL: Record<string, string> = {
  todos: 'Todos',
  activos: 'Activos',
  configuracion: 'En configuración',
  atencion: 'Requieren atención',
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
  const [filterStatus, setFilterStatus] = useState('todos')
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
      (a.business_name || '').toLowerCase().includes(search.toLowerCase())
    
    let matchStatus = true
    const baseState = (a as any).health?.baseState
    if (filterStatus === 'activos') matchStatus = a.status === 'active' && baseState !== 'Falta instalación'
    if (filterStatus === 'configuracion') matchStatus = baseState === 'En configuración' || baseState === 'Falta instalación' || !baseState
    if (filterStatus === 'atencion') matchStatus = baseState === 'Requiere atención' || baseState === 'Necesita entrenamiento'
    
    return matchSearch && matchStatus
  })

  const handleDelete = (id: string) => {
    setAssistants(prev => prev.filter(a => a.id !== id))
  }

  const handleToggleStatus = (id: string, status: string) => {
    setAssistants(prev => prev.map(a => a.id === id ? { ...a, status } : a))
  }

  const plan = normalizePlan(subData?.subscription?.plan ?? 'free')
  const planLimits = getPlanLimits(plan)
  const isUnlimitedAssistants = planLimits.assistants === null
  const isUnlimitedMessages = planLimits.messagesPerMonth === null

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* HEADER PROFESIONAL */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Asistentes IA</h1>
            <p className="text-text-soft mt-1">Gestiona tus asistentes, revisa su estado, instala canales y mejora su entrenamiento.</p>
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
            <span className="text-[10px] uppercase font-bold text-text-soft tracking-wider mb-1 flex items-center gap-1.5"><Bot className="w-3.5 h-3.5"/> Total Asistentes</span>
            <span className="text-xl font-bold text-white">
              {!subLoading ? `${assistants.length} ${!isUnlimitedAssistants ? `/ ${planLimits.assistants}` : ''}` : '...'}
            </span>
          </div>
          <div className="bg-card-bg/80 backdrop-blur border border-card-border rounded-2xl p-4 flex flex-col justify-center">
            <span className="text-[10px] uppercase font-bold text-text-soft tracking-wider mb-1 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-brand-success"/> Activos</span>
            <span className="text-xl font-bold text-white">
              {!subLoading ? assistants.filter(a => a.status === 'active').length : '...'}
            </span>
          </div>
          <div className="bg-card-bg/80 backdrop-blur border border-card-border rounded-2xl p-4 flex flex-col justify-center">
            <span className="text-[10px] uppercase font-bold text-text-soft tracking-wider mb-1 flex items-center gap-1.5"><Crown className="w-3.5 h-3.5 text-amber-500"/> Atención requerida</span>
            <span className="text-xl font-bold text-white">
              {!subLoading ? assistants.filter(a => (a as any).health?.baseState === 'Requiere atención' || (a as any).health?.baseState === 'Falta instalación').length : '...'}
            </span>
          </div>
          <div className="bg-card-bg/80 backdrop-blur border border-card-border rounded-2xl p-4 flex flex-col justify-center">
            <span className="text-[10px] uppercase font-bold text-text-soft tracking-wider mb-1 flex items-center gap-1.5"><Globe className="w-3.5 h-3.5 text-brand-cyan"/> Canales instalados</span>
            <span className="text-xl font-bold text-white">
              {!subLoading ? assistants.filter(a => (a as any).health?.badges?.hasVerifiedDomain).length : '...'}
            </span>
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
          {FILTER_STATUSES.map(st => {
            const count = st === 'todos' ? assistants.length : assistants.filter(a => {
              const baseState = (a as any).health?.baseState
              if (st === 'activos') return a.status === 'active' && baseState !== 'Falta instalación'
              if (st === 'configuracion') return baseState === 'En configuración' || baseState === 'Falta instalación' || !baseState
              if (st === 'atencion') return baseState === 'Requiere atención' || baseState === 'Necesita entrenamiento'
              return false
            }).length

            return (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`whitespace-nowrap flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border transition-all ${
                  filterStatus === st
                    ? 'gradient-btn text-white border-transparent shadow-[0_0_15px_rgba(124,58,237,0.3)]'
                    : 'bg-card-bg border-card-border text-text-soft hover:text-text-main hover:border-brand-violet/30'
                }`}
              >
                {STATUS_LABEL[st]}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${filterStatus === st ? 'bg-black/20' : 'bg-white/5'}`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* CONTENIDO */}
      {loading || subLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-80 bg-card-bg/50 border border-card-border rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        search || filterStatus !== 'todos' ? (
          <div className="text-center py-20 bg-card-bg/40 border border-card-border rounded-3xl">
            <Bot className="w-12 h-12 text-text-soft/50 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No encontramos coincidencias</h3>
            <p className="text-text-soft">Prueba con otra búsqueda o limpia los filtros.</p>
          </div>
        ) : (
          <div className="text-center py-20 px-4 bg-card-bg/40 border border-card-border rounded-3xl relative overflow-hidden flex flex-col items-center justify-center">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-violet to-brand-cyan opacity-20" />
            <div className="w-16 h-16 bg-white/[0.02] border border-white/10 rounded-2xl flex items-center justify-center mb-6 shadow-2xl">
              <Bot className="w-8 h-8 text-brand-violet" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-white mb-3">Crea tu primer asistente IA</h2>
            <p className="text-slate-400 max-w-lg mx-auto mb-8 text-sm">
              Configura la información de tu negocio, instala el Web Chat y empieza a atender visitantes desde tu sitio web.
            </p>
            
            <div className="flex flex-col md:flex-row gap-3 mb-8 max-w-3xl mx-auto w-full justify-center">
              <div className="flex items-center gap-3 bg-white/[0.02] border border-white/[0.05] p-3 rounded-xl flex-1 text-left">
                <div className="w-8 h-8 rounded-lg bg-brand-violet/10 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-brand-violet" />
                </div>
                <p className="text-[11px] font-semibold text-slate-300">1. Entrena con tu negocio</p>
              </div>
              <div className="flex items-center gap-3 bg-white/[0.02] border border-white/[0.05] p-3 rounded-xl flex-1 text-left">
                <div className="w-8 h-8 rounded-lg bg-brand-cyan/10 flex items-center justify-center shrink-0">
                  <Globe className="w-4 h-4 text-brand-cyan" />
                </div>
                <p className="text-[11px] font-semibold text-slate-300">2. Instala Web Chat</p>
              </div>
              <div className="flex items-center gap-3 bg-white/[0.02] border border-white/[0.05] p-3 rounded-xl flex-1 text-left">
                <div className="w-8 h-8 rounded-lg bg-brand-success/10 flex items-center justify-center shrink-0">
                  <MessagesSquare className="w-4 h-4 text-brand-success" />
                </div>
                <p className="text-[11px] font-semibold text-slate-300">3. Captura conversaciones</p>
              </div>
              <div className="flex items-center gap-3 bg-white/[0.02] border border-white/[0.05] p-3 rounded-xl flex-1 text-left">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4 text-amber-500" />
                </div>
                <p className="text-[11px] font-semibold text-slate-300">4. Da seguimiento a leads</p>
              </div>
            </div>

            <Link
              href="/dashboard/create-assistant"
              className="gradient-btn px-8 py-3 rounded-xl text-white font-semibold hover:opacity-90 transition-all glow-violet text-sm flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Crear asistente
            </Link>
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence mode="popLayout">
            {filtered.map(assistant => (
              <AssistantCard
                key={assistant.id}
                assistant={assistant}
                plan={plan}
                planLimits={planLimits}
                usage={subData?.usage}
                onDelete={handleDelete}
                onToggleStatus={handleToggleStatus}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
