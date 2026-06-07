'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Users, Mail, Phone, Globe, TrendingUp, Clock, CheckCircle2, 
  Search, MessageSquare, Edit3, Save, ExternalLink, Calendar, 
  User, Check, XCircle, Info
} from 'lucide-react'
import Link from 'next/link'
import ChannelConnectActions from '@/components/dashboard/ChannelConnectActions'

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  new:       { label: 'Nuevo', color: 'text-brand-cyan bg-brand-cyan/10 border-brand-cyan/20' },
  contacted: { label: 'Contactado', color: 'text-brand-blue bg-brand-blue/10 border-brand-blue/20' },
  qualified: { label: 'Calificado', color: 'text-brand-violet bg-brand-violet/10 border-brand-violet/20' },
  converted: { label: 'Convertido', color: 'text-brand-success bg-brand-success/10 border-brand-success/20' },
  discarded: { label: 'Descartado', color: 'text-brand-pink bg-brand-pink/10 border-brand-pink/20' },
}

export default function LeadsClient({ user, assistants, currentPlan }: { user: any, assistants: any[], currentPlan: string }) {
  const supabase = createClient()
  
  const [leads, setLeads] = useState<any[]>([])
  const [stats, setStats] = useState<any>({})
  const [loading, setLoading] = useState(true)

  const [selectedLead, setSelectedLead] = useState<any>(null)
  
  // Filtros
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [assistantFilter, setAssistantFilter] = useState('all')

  const [notesEditing, setNotesEditing] = useState(false)
  const [notesValue, setNotesValue] = useState('')
  const [toastMsg, setToastMsg] = useState('')

  const showToast = (msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 3000)
  }

  const fetchLeads = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/leads?limit=200`, { cache: 'no-store' })
      const data = await res.json()
      if (data.leads) {
        setLeads(data.leads)
        setStats(data.stats || {})
      }
    } catch (error) {
      console.error('Error fetching leads:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLeads()

    const channel = supabase.channel(`realtime-leads-${user.id}`)

    channel
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'leads', filter: `user_id=eq.${user.id}` },
        (payload) => {
          setLeads((prev) => [payload.new, ...prev])
          setStats((prev: any) => ({ ...prev, total: (prev.total || 0) + 1, new: (prev.new || 0) + 1 }))
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'leads', filter: `user_id=eq.${user.id}` },
        (payload) => {
          setLeads((prev) =>
            prev.map((l) => (l.id === payload.new.id ? { ...l, ...payload.new } : l))
          )
          setSelectedLead((curr: any) => (curr && curr.id === payload.new.id ? { ...curr, ...payload.new } : curr))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user.id])

  const handleUpdateLead = async (leadId: string, updates: any) => {
    const previousLeads = [...leads]
    const previousSelected = selectedLead
    const previousStats = { ...stats }

    try {
      // Optimistic update
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, ...updates } : l))
      if (selectedLead && selectedLead.id === leadId) {
        setSelectedLead({ ...selectedLead, ...updates })
      }
      
      // Optimistic stats update
      if (updates.status) {
        setStats((prev: any) => {
          const oldLead = previousLeads.find(l => l.id === leadId)
          const oldStatus = oldLead?.status
          const newStatus = updates.status
          if (!oldStatus || oldStatus === newStatus) return prev
          return {
            ...prev,
            [oldStatus]: Math.max((prev[oldStatus] || 0) - 1, 0),
            [newStatus]: (prev[newStatus] || 0) + 1
          }
        })
      }

      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      
      const data = await res.json().catch(() => null)
      
      if (!res.ok) {
        // Rollback
        setLeads(previousLeads)
        setSelectedLead(previousSelected)
        setStats(previousStats)
        showToast(data?.error || 'No se pudo actualizar el lead. Intenta nuevamente.')
        return
      }
      
      if (updates.status) showToast('Estado actualizado')
      if (updates.notes !== undefined) showToast('Notas guardadas')

    } catch (error) {
      console.error('Error updating lead', error)
      // Rollback
      setLeads(previousLeads)
      setSelectedLead(previousSelected)
      setStats(previousStats)
      showToast('Ocurrió un error de red al guardar')
    }
  }

  const handleSaveNotes = () => {
    if (selectedLead) {
      handleUpdateLead(selectedLead.id, { notes: notesValue })
      setNotesEditing(false)
    }
  }

  // Filtrado
  const filteredLeads = leads.filter(l => {
    const matchesSearch = (l.name?.toLowerCase().includes(search.toLowerCase()) || 
                           l.email?.toLowerCase().includes(search.toLowerCase()) ||
                           l.phone?.toLowerCase().includes(search.toLowerCase()))
    const matchesStatus = statusFilter === 'all' || l.status === statusFilter
    const matchesAssistant = assistantFilter === 'all' || l.assistant_id === assistantFilter

    let matchesDate = true
    if (dateFilter !== 'all') {
      const leadDate = new Date(l.created_at)
      const now = new Date()
      if (dateFilter === 'today') {
        matchesDate = leadDate.toDateString() === now.toDateString()
      } else if (dateFilter === '7days') {
        matchesDate = (now.getTime() - leadDate.getTime()) <= 7 * 24 * 60 * 60 * 1000
      } else if (dateFilter === '30days') {
        matchesDate = (now.getTime() - leadDate.getTime()) <= 30 * 24 * 60 * 60 * 1000
      }
    }

    return (!search || matchesSearch) && matchesStatus && matchesAssistant && matchesDate
  })

  // Auto-selección
  useEffect(() => {
    if (filteredLeads.length > 0) {
      if (!selectedLead || !filteredLeads.find(l => l.id === selectedLead.id)) {
        setSelectedLead(filteredLeads[0])
        setNotesValue(filteredLeads[0].notes || '')
        setNotesEditing(false)
      }
    } else {
      if (selectedLead && leads.length > 0) {
        setSelectedLead(null)
      }
    }
  }, [filteredLeads, selectedLead])

  // Al seleccionar manualmente
  const onSelectLead = (lead: any) => {
    setSelectedLead(lead)
    setNotesValue(lead.notes || '')
    setNotesEditing(false)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    showToast('Copiado al portapapeles')
  }

  if (loading) {
    return <div className="p-8 text-center text-text-soft">Cargando prospectos...</div>
  }

  const hasAnyAssistantsInLeads = leads.some(l => l.assistant_id)
  const uniqueAssistantsInLeads = Array.from(new Set(leads.filter(l => l.assistant_id).map(l => l.assistant_id)))

  return (
    <div className="max-w-7xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
      
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-24 right-8 bg-brand-cyan/20 border border-brand-cyan text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2 animate-in fade-in slide-in-from-top-5">
          <CheckCircle2 className="w-4 h-4 text-brand-cyan" />
          <span className="text-sm font-medium">{toastMsg}</span>
        </div>
      )}

      {/* Header & Stats */}
      <div className="mb-6 shrink-0">
        <h1 className="text-3xl font-bold tracking-tight">Leads</h1>
        <p className="text-text-soft mt-1">
          Gestiona prospectos captados por tus asistentes y da seguimiento desde un solo lugar.
        </p>

        {(leads.length > 0 || search) && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-card-bg/50 border border-card-border p-4 rounded-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-white"><Users className="w-5 h-5"/></div>
              <div><p className="text-sm text-text-soft">Total Leads</p><p className="font-bold text-xl">{stats.total || 0}</p></div>
            </div>
            <div className="bg-card-bg/50 border border-card-border p-4 rounded-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-brand-cyan/10 flex items-center justify-center text-brand-cyan"><TrendingUp className="w-5 h-5"/></div>
              <div><p className="text-sm text-text-soft">Nuevos</p><p className="font-bold text-xl">{stats.new || 0}</p></div>
            </div>
            <div className="bg-card-bg/50 border border-card-border p-4 rounded-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-brand-blue/10 flex items-center justify-center text-brand-blue"><Clock className="w-5 h-5"/></div>
              <div><p className="text-sm text-text-soft">En seguimiento</p><p className="font-bold text-xl">{(stats.contacted || 0) + (stats.qualified || 0)}</p></div>
            </div>
            <div className="bg-card-bg/50 border border-card-border p-4 rounded-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-brand-success/10 flex items-center justify-center text-brand-success"><CheckCircle2 className="w-5 h-5"/></div>
              <div><p className="text-sm text-text-soft">Convertidos</p><p className="font-bold text-xl">{stats.converted || 0}</p></div>
            </div>
          </div>
        )}
      </div>

      {leads.length === 0 && !search ? (
        <div className="flex-1 bg-card-bg/80 backdrop-blur-2xl border border-card-border rounded-3xl p-8 lg:p-12 shadow-[0_0_50px_rgba(6,182,212,0.05)] flex items-center justify-center flex-col overflow-y-auto custom-scrollbar">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-brand-cyan/20 to-brand-blue/20 border border-brand-cyan/30 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(6,182,212,0.2)] shrink-0">
            <Users className="w-10 h-10 text-brand-cyan" />
          </div>
          <h2 className="text-2xl font-bold mb-3">Aún no tienes leads captados</h2>
          <p className="text-text-secondary mb-2 max-w-md text-center">
            Los leads aparecerán cuando tus asistentes detecten nombre, correo, teléfono o intención de compra durante una conversación.
          </p>
          <div className="mt-6">
            <ChannelConnectActions assistants={assistants} currentPlan={currentPlan} />
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
          
          {/* Columna Izquierda: Lista de Leads y Filtros */}
          <div className="w-full lg:w-1/2 xl:w-5/12 flex flex-col bg-card-bg/80 backdrop-blur-2xl border border-card-border rounded-2xl overflow-hidden">
            {/* Filtros */}
            <div className="p-4 border-b border-white/[0.05] space-y-3 shrink-0 bg-white/[0.01]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-soft" />
                <input 
                  type="text" 
                  placeholder="Buscar nombre, email o teléfono..." 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/[0.1] rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-text-soft focus:outline-none focus:border-brand-violet/50 transition-colors"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <select 
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="bg-white/[0.03] border border-white/[0.1] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none flex-1 min-w-[120px]"
                >
                  <option value="all">Todos los estados</option>
                  <option value="new">Nuevos</option>
                  <option value="contacted">Contactados</option>
                  <option value="qualified">Calificados</option>
                  <option value="converted">Convertidos</option>
                  <option value="discarded">Descartados</option>
                </select>

                <select 
                  value={dateFilter}
                  onChange={e => setDateFilter(e.target.value)}
                  className="bg-white/[0.03] border border-white/[0.1] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none flex-1 min-w-[120px]"
                >
                  <option value="all">Cualquier fecha</option>
                  <option value="today">Hoy</option>
                  <option value="7days">Últimos 7 días</option>
                  <option value="30days">Últimos 30 días</option>
                </select>

                {hasAnyAssistantsInLeads && (
                  <select 
                    value={assistantFilter}
                    onChange={e => setAssistantFilter(e.target.value)}
                    className="bg-white/[0.03] border border-white/[0.1] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none flex-1 min-w-[120px]"
                  >
                    <option value="all">Todos los asistentes</option>
                    {uniqueAssistantsInLeads.map(astId => {
                      const ast = leads.find(l => l.assistant_id === astId)?.assistant
                      return ast ? <option key={astId as string} value={astId as string}>{ast.assistant_name}</option> : null
                    })}
                  </select>
                )}
              </div>
            </div>

            {/* Lista */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
              {filteredLeads.length > 0 ? (
                filteredLeads.map((lead) => {
                  const status = STATUS_CONFIG[lead.status] || STATUS_CONFIG.new
                  const isSelected = selectedLead?.id === lead.id
                  return (
                    <button 
                      key={lead.id}
                      onClick={() => onSelectLead(lead)}
                      className={`w-full text-left p-4 rounded-xl transition-all flex flex-col gap-3 border ${
                        isSelected 
                          ? 'bg-brand-cyan/5 border-brand-cyan/20 shadow-[0_0_15px_rgba(6,182,212,0.05)]' 
                          : 'bg-white/[0.01] border-transparent hover:bg-white/[0.03]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 ${isSelected ? 'bg-gradient-to-br from-brand-cyan to-brand-blue' : 'bg-white/10'}`}>
                            {lead.name?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate text-white">{lead.name || 'Sin nombre'}</p>
                            <p className="text-xs text-text-soft truncate mt-0.5 flex items-center gap-1.5">
                              {lead.email ? <><Mail className="w-3 h-3"/> {lead.email}</> : lead.phone ? <><Phone className="w-3 h-3"/> {lead.phone}</> : 'Sin datos de contacto'}
                            </p>
                          </div>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium whitespace-nowrap shrink-0 ${status.color}`}>
                          {status.label}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between text-[10px] text-text-soft">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1 bg-white/5 px-1.5 py-0.5 rounded">
                            <Globe className="w-3 h-3" /> <span className="capitalize">{lead.source || 'Web Chat'}</span>
                          </span>
                          {lead.assistant && (
                            <span className="flex items-center gap-1 bg-white/5 px-1.5 py-0.5 rounded truncate max-w-[100px]">
                              <User className="w-3 h-3" /> {lead.assistant.assistant_name}
                            </span>
                          )}
                        </div>
                        <span>{new Date(lead.created_at).toLocaleDateString('es', { day: 'numeric', month: 'short' })}</span>
                      </div>
                    </button>
                  )
                })
              ) : (
                <div className="py-12 text-center flex flex-col items-center justify-center">
                  <Search className="w-8 h-8 text-white/10 mb-3" />
                  <p className="text-sm text-text-soft">No se encontraron leads con estos filtros.</p>
                </div>
              )}
            </div>
          </div>

          {/* Panel Derecho: Detalle del Lead */}
          <div className="w-full lg:w-1/2 xl:w-7/12 flex flex-col bg-card-bg/80 backdrop-blur-2xl border border-card-border rounded-2xl overflow-hidden relative">
            {selectedLead ? (
              <>
                <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
                  {/* Header Detalle */}
                  <div className="p-6 border-b border-white/[0.05] bg-white/[0.02]">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-brand-cyan to-brand-blue flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                          {selectedLead.name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-white mb-1">{selectedLead.name || 'Sin nombre'}</h2>
                          <div className="flex items-center gap-2 text-xs text-text-soft">
                            <Calendar className="w-3.5 h-3.5" /> 
                            {new Date(selectedLead.created_at).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        {['new', 'contacted', 'qualified', 'converted', 'discarded'].map(s => {
                          const conf = STATUS_CONFIG[s]
                          const isActive = selectedLead.status === s
                          return (
                            <button
                              key={s}
                              onClick={() => handleUpdateLead(selectedLead.id, { status: s })}
                              className={`text-[10px] px-2.5 py-1.5 rounded-lg border font-medium transition-all ${
                                isActive ? conf.color + ' ring-1 ring-current' : 'bg-white/5 border-white/10 text-text-soft hover:bg-white/10'
                              }`}
                            >
                              {conf.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                    
                    {/* Contacto & Contexto */}
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                          <User className="w-4 h-4 text-brand-cyan" /> Información de Contacto
                        </h3>
                        <div className="space-y-3 bg-white/[0.02] border border-white/[0.05] rounded-xl p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                              <Mail className="w-4 h-4 text-text-soft shrink-0" />
                              <span className={`text-sm truncate ${selectedLead.email ? 'text-white' : 'text-text-soft italic'}`}>
                                {selectedLead.email || 'No proporcionado'}
                              </span>
                            </div>
                            {selectedLead.email && (
                              <button onClick={() => copyToClipboard(selectedLead.email)} className="text-brand-cyan hover:text-brand-cyan/80 text-xs font-medium shrink-0">Copiar</button>
                            )}
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                              <Phone className="w-4 h-4 text-text-soft shrink-0" />
                              <span className={`text-sm truncate ${selectedLead.phone ? 'text-white' : 'text-text-soft italic'}`}>
                                {selectedLead.phone || 'No proporcionado'}
                              </span>
                            </div>
                            {selectedLead.phone && (
                              <button onClick={() => copyToClipboard(selectedLead.phone)} className="text-brand-cyan hover:text-brand-cyan/80 text-xs font-medium shrink-0">Copiar</button>
                            )}
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                          <Info className="w-4 h-4 text-brand-violet" /> Origen y Contexto
                        </h3>
                        <div className="space-y-3 bg-white/[0.02] border border-white/[0.05] rounded-xl p-4">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-text-soft">Canal</span>
                            <span className="text-white capitalize flex items-center gap-1.5"><Globe className="w-3.5 h-3.5 text-text-soft"/> {selectedLead.source || 'Web Chat'}</span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-text-soft">Asistente originador</span>
                            <span className="text-white truncate max-w-[150px]">{selectedLead.assistant?.assistant_name || 'General'}</span>
                          </div>
                          <div className="pt-3 mt-3 border-t border-white/[0.05]">
                            {selectedLead.conversation_id ? (
                              <div className="space-y-2">
                                <span className="text-xs text-text-soft">Conversación vinculada</span>
                                {selectedLead.conversation?.last_message && (
                                  <p className="text-sm text-white/80 line-clamp-2 italic">"{selectedLead.conversation.last_message}"</p>
                                )}
                                <Link 
                                  href={`/dashboard/conversations?id=${selectedLead.conversation_id}`}
                                  className="inline-flex items-center gap-1.5 text-xs text-brand-violet hover:text-brand-violet/80 font-medium mt-1"
                                >
                                  Ver conversación completa <ExternalLink className="w-3 h-3" />
                                </Link>
                              </div>
                            ) : (
                              <span className="text-xs text-text-soft">Sin conversación vinculada</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Notas Internas */}
                    <div className="flex flex-col">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                          <Edit3 className="w-4 h-4 text-brand-success" /> Notas de Seguimiento
                        </h3>
                        {!notesEditing && (
                          <button onClick={() => setNotesEditing(true)} className="text-xs text-text-soft hover:text-white flex items-center gap-1 transition-colors">
                            <Edit3 className="w-3 h-3" /> Editar
                          </button>
                        )}
                      </div>
                      
                      <div className="flex-1 min-h-[200px] bg-white/[0.02] border border-white/[0.05] rounded-xl overflow-hidden flex flex-col">
                        {notesEditing ? (
                          <div className="flex flex-col h-full">
                            <textarea
                              value={notesValue}
                              onChange={e => setNotesValue(e.target.value)}
                              placeholder="Escribe notas sobre llamadas, acuerdos, seguimiento..."
                              className="flex-1 w-full bg-transparent border-none resize-none p-4 text-sm text-white focus:outline-none focus:ring-0 custom-scrollbar"
                            />
                            <div className="p-3 border-t border-white/[0.05] bg-white/[0.01] flex justify-end gap-2">
                              <button onClick={() => { setNotesEditing(false); setNotesValue(selectedLead.notes || '') }} className="px-3 py-1.5 text-xs text-text-soft hover:text-white transition-colors">Cancelar</button>
                              <button onClick={handleSaveNotes} className="px-3 py-1.5 text-xs bg-brand-success/20 text-brand-success hover:bg-brand-success/30 rounded-lg flex items-center gap-1.5 transition-colors font-medium">
                                <Save className="w-3.5 h-3.5" /> Guardar notas
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div 
                            className="flex-1 p-4 text-sm text-white/80 whitespace-pre-wrap overflow-y-auto custom-scrollbar cursor-text"
                            onClick={() => setNotesEditing(true)}
                          >
                            {selectedLead.notes ? selectedLead.notes : <span className="text-text-soft italic">No hay notas registradas. Haz clic para agregar detalles de seguimiento.</span>}
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-text-soft bg-white/[0.01]">
                <User className="w-12 h-12 mb-4 text-white/10" />
                <p className="text-sm font-medium">Selecciona un lead para ver los detalles.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
