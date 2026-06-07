'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Users, Mail, Phone, Globe, TrendingUp, Clock, CheckCircle2, Plus, Link as LinkIcon, Search, MessageSquare } from 'lucide-react'
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

  // Filtros
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const fetchLeads = async () => {
    try {
      const res = await fetch(`/api/leads?limit=100`)
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
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user.id])

  const handleUpdateStatus = async (leadId: string, status: string) => {
    try {
      // Optimistic update
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status } : l))

      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })
      if (!res.ok) throw new Error('Error updating status')
    } catch (error) {
      console.error('Error updating status', error)
    }
  }

  const filteredLeads = leads.filter(l => {
    const matchesSearch = (l.name?.toLowerCase().includes(search.toLowerCase()) || 
                           l.email?.toLowerCase().includes(search.toLowerCase()) ||
                           l.phone?.toLowerCase().includes(search.toLowerCase()))
    const matchesStatus = statusFilter === 'all' || l.status === statusFilter
    return (!search || matchesSearch) && matchesStatus
  })

  if (loading) {
    return <div className="p-8 text-center text-text-soft">Cargando leads...</div>
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Leads</h1>
        <p className="text-text-soft mt-1">
          Gestiona los clientes potenciales capturados por tus asistentes en tiempo real.
        </p>
      </div>

      {leads.length > 0 || search ? (
        <>
          {/* Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-card-bg/50 border border-card-border p-4 rounded-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-brand-violet/10 flex items-center justify-center text-brand-violet"><Users className="w-5 h-5"/></div>
              <div><p className="text-sm text-text-soft">Total Leads</p><p className="font-bold text-xl">{stats.total || 0}</p></div>
            </div>
            <div className="bg-card-bg/50 border border-card-border p-4 rounded-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-brand-cyan/10 flex items-center justify-center text-brand-cyan"><TrendingUp className="w-5 h-5"/></div>
              <div><p className="text-sm text-text-soft">Nuevos</p><p className="font-bold text-xl">{stats.new || 0}</p></div>
            </div>
            <div className="bg-card-bg/50 border border-card-border p-4 rounded-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-brand-success/10 flex items-center justify-center text-brand-success"><CheckCircle2 className="w-5 h-5"/></div>
              <div><p className="text-sm text-text-soft">Convertidos</p><p className="font-bold text-xl">{stats.converted || 0}</p></div>
            </div>
            <div className="bg-card-bg/50 border border-card-border p-4 rounded-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-brand-blue/10 flex items-center justify-center text-brand-blue"><Clock className="w-5 h-5"/></div>
              <div><p className="text-sm text-text-soft">En proceso</p><p className="font-bold text-xl">{(stats.contacted || 0) + (stats.qualified || 0)}</p></div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-card-bg/80 backdrop-blur-2xl border border-card-border rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.05] flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-soft" />
                <input 
                  type="text" 
                  placeholder="Buscar nombre, email..." 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/[0.1] rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-text-soft focus:outline-none focus:border-brand-violet/50"
                />
              </div>
              <select 
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="bg-white/[0.03] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white focus:outline-none w-full sm:w-auto"
              >
                <option value="all">Todos los estados</option>
                <option value="new">Nuevos</option>
                <option value="contacted">Contactados</option>
                <option value="qualified">Calificados</option>
                <option value="converted">Convertidos</option>
                <option value="discarded">Descartados</option>
              </select>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.05] bg-white/[0.02]">
                    <th className="text-left px-6 py-3 text-text-soft font-medium">Nombre</th>
                    <th className="text-left px-6 py-3 text-text-soft font-medium">Contacto</th>
                    <th className="text-left px-6 py-3 text-text-soft font-medium">Fuente</th>
                    <th className="text-left px-6 py-3 text-text-soft font-medium">Estado</th>
                    <th className="text-left px-6 py-3 text-text-soft font-medium">Fecha</th>
                    <th className="text-right px-6 py-3 text-text-soft font-medium">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.length > 0 ? (
                    filteredLeads.map((lead) => {
                      const status = STATUS_CONFIG[lead.status] || STATUS_CONFIG.new
                      return (
                        <tr key={lead.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full gradient-btn flex items-center justify-center text-white text-xs font-bold shrink-0">
                                {lead.name?.charAt(0).toUpperCase() || '?'}
                              </div>
                              <span className="font-medium truncate">{lead.name || 'Sin nombre'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              {lead.email && (
                                <div className="flex items-center gap-1.5 text-text-soft text-xs truncate">
                                  <Mail className="w-3 h-3 shrink-0" /> {lead.email}
                                </div>
                              )}
                              {lead.phone && (
                                <div className="flex items-center gap-1.5 text-text-soft text-xs truncate">
                                  <Phone className="w-3 h-3 shrink-0" /> {lead.phone}
                                </div>
                              )}
                              {!lead.email && !lead.phone && <span className="text-xs text-text-soft">Sin contacto</span>}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/[0.1] text-text-soft capitalize">
                              <Globe className="w-3 h-3" />
                              {lead.source || 'webchat'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${status.color}`}>
                              {status.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-text-soft text-xs">
                            {new Date(lead.created_at).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-3">
                              {lead.conversation_id && (
                                <Link 
                                  href={`/dashboard/conversations?id=${lead.conversation_id}`}
                                  className="text-text-soft hover:text-brand-violet transition-colors text-xs flex items-center gap-1"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" /> Ver conv.
                                </Link>
                              )}
                              <select
                                value={lead.status}
                                onChange={(e) => handleUpdateStatus(lead.id, e.target.value)}
                                className="bg-white/[0.05] hover:bg-white/[0.1] transition-colors border border-white/[0.1] rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
                              >
                                <option value="new">Nuevo</option>
                                <option value="contacted">Contactado</option>
                                <option value="qualified">Calificado</option>
                                <option value="converted">Convertido</option>
                                <option value="discarded">Descartado</option>
                              </select>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-text-soft">
                        No se encontraron leads con esos filtros.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-card-bg/80 backdrop-blur-2xl border border-card-border rounded-3xl p-8 lg:p-12 shadow-[0_0_50px_rgba(6,182,212,0.05)] flex items-center justify-center flex-col max-w-4xl mx-auto overflow-y-auto custom-scrollbar">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-brand-cyan/20 to-brand-blue/20 border border-brand-cyan/30 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(6,182,212,0.2)] shrink-0">
            <Users className="w-10 h-10 text-brand-cyan" />
          </div>
          <h2 className="text-2xl font-bold mb-3">Aún no tienes leads</h2>
          <p className="text-text-secondary mb-2 max-w-md text-center">
            Tus asistentes capturarán prospectos cuando los visitantes compartan correo, teléfono o nombre.
          </p>
          <p className="text-sm text-text-soft mb-4 text-center">
            {assistants.length > 0 ? 'Los leads aparecerán aquí automáticamente cuando un cliente deje sus datos.' : 'Primero crea un asistente para conectarlo a tus canales.'}
          </p>
          <ChannelConnectActions assistants={assistants} currentPlan={currentPlan} />
        </div>
      )}
    </div>
  )
}
