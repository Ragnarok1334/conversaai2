'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MessageSquare, Globe, Send, MessageCircle, Clock, Plus, Settings, Search, Filter, CheckCircle2, Users } from 'lucide-react'
import Link from 'next/link'
import ChannelConnectActions from '@/components/dashboard/ChannelConnectActions'
import { ConvertLeadModal } from './ConvertLeadModal'

const channelIcon: Record<string, React.ReactNode> = {
  webchat: <Globe className="w-4 h-4" />,
  telegram: <Send className="w-4 h-4" />,
  whatsapp: <MessageCircle className="w-4 h-4" />,
}

export default function ConversationsClient({ user, assistants, currentPlan, effectiveStatus, messagesLimit, currentMessagesUsed }: { user: any, assistants: any[], currentPlan: string, effectiveStatus: string, messagesLimit: number, currentMessagesUsed: number }) {
  const supabase = createClient()
  
  const [conversations, setConversations] = useState<any[]>([])
  const [stats, setStats] = useState<any>({})
  const [loading, setLoading] = useState(true)
  
  const [selectedConv, setSelectedConv] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [showConvertModal, setShowConvertModal] = useState(false)
  
  const [toastMsg, setToastMsg] = useState('')
  const showToast = (msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 3000)
  }

  // Filtros
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [channelFilter, setChannelFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const limit = 25

  const fetchConversations = async (pageNum = 1, append = false) => {
    try {
      const query = new URLSearchParams({
        limit: limit.toString(),
        page: pageNum.toString()
      })
      if (statusFilter !== 'all') query.append('status', statusFilter)
      if (channelFilter !== 'all') query.append('channel', channelFilter)
      if (search) query.append('search', search)

      const res = await fetch(`/api/conversations?${query.toString()}`)
      const data = await res.json()
      if (data.conversations) {
        if (append) {
          setConversations(prev => {
            const newConvs = data.conversations.filter((c: any) => !prev.some(p => p.id === c.id))
            return [...prev, ...newConvs]
          })
        } else {
          setConversations(data.conversations)
        }
        setHasMore(data.conversations.length === limit)
        setStats(data.stats || {})
      }
    } catch (error) {
      console.error('Error fetching conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchConversations(nextPage, true)
  }

  // Trigger fetch when filters change
  useEffect(() => {
    if (!['free', 'expired', 'cancelled'].includes(effectiveStatus)) {
      setPage(1)
      fetchConversations(1, false)
    } else {
      setLoading(false)
    }
  }, [search, statusFilter, channelFilter, effectiveStatus])

  const fetchMessages = async (id: string) => {
    setLoadingMessages(true)
    try {
      const res = await fetch(`/api/conversations/${id}`)
      const data = await res.json()
      if (data.messages) {
        setMessages(data.messages)
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
    } finally {
      setLoadingMessages(false)
    }
  }

  useEffect(() => {
    if (['free', 'expired', 'cancelled'].includes(effectiveStatus)) return

    // Suscripción Realtime (Registrar .on ANTES de .subscribe())
    const channel = supabase.channel(`realtime-conversations-${user.id}`)

    channel
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'conversations', filter: `user_id=eq.${user.id}` },
        (payload) => {
          setConversations((prev) => [payload.new, ...prev])
          // Update stats optimistically (simple)
          setStats((prev: any) => ({ ...prev, total: (prev.total || 0) + 1 }))
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'conversations', filter: `user_id=eq.${user.id}` },
        (payload) => {
          setConversations((prev) =>
            prev.map((c) => (c.id === payload.new.id ? { ...c, ...payload.new } : c))
          )
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `user_id=eq.${user.id}` },
        (payload) => {
          // Si la conversación insertada es la que está seleccionada, agregamos el mensaje a la vista
          setSelectedConv((currentSelected: any) => {
            if (currentSelected && currentSelected.id === payload.new.conversation_id) {
              setMessages((prev) => [...prev, payload.new])
            }
            return currentSelected
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user.id])

  const handleSelectConversation = (conv: any) => {
    setSelectedConv(conv)
    fetchMessages(conv.id)
  }

  const handleUpdateStatus = async (convId: string, status: string) => {
    try {
      // Optimistic update
      setConversations(prev => prev.map(c => c.id === convId ? { ...c, status } : c))
      if (selectedConv && selectedConv.id === convId) {
        setSelectedConv({ ...selectedConv, status })
      }

      const res = await fetch(`/api/conversations/${convId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })
      if (!res.ok) throw new Error('Error updating status')
      showToast('Estado actualizado')
    } catch (error) {
      console.error('Error updating status', error)
      showToast('Error al actualizar estado')
    }
  }

  // Filtrado local para búsqueda instantánea, el backend hará el paginado real
  const filteredConversations = conversations.filter(c => {
    const matchesSearch = !search || c.visitor_name?.toLowerCase().includes(search.toLowerCase()) || 
                          c.last_message?.toLowerCase().includes(search.toLowerCase()) ||
                          c.visitor_email?.toLowerCase().includes(search.toLowerCase()) ||
                          c.visitor_phone?.toLowerCase().includes(search.toLowerCase()) ||
                          c.assistant?.assistant_name?.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter
    const matchesChannel = channelFilter === 'all' || c.channel === channelFilter
    return matchesSearch && matchesStatus && matchesChannel
  })

  // Selección automática
  useEffect(() => {
    if (filteredConversations.length > 0) {
      if (!selectedConv || !filteredConversations.find(c => c.id === selectedConv.id)) {
        handleSelectConversation(filteredConversations[0])
      }
    } else {
      if (selectedConv && conversations.length > 0) {
        // Search hid everything, don't necessarily clear it, or clear it if strict
        setSelectedConv(null)
      }
    }
  }, [filteredConversations, selectedConv])

  if (loading) {
    return <div className="p-8 text-center text-text-soft">Cargando conversaciones...</div>
  }

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
      <div className="mb-6 shrink-0 flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Conversaciones</h1>
          <p className="text-text-soft mt-1">
            Revisa las interacciones de tus clientes en tiempo real.
          </p>
        </div>

        {/* Plan Usage Card */}
        {messagesLimit > 0 && effectiveStatus !== 'free' && (
          <div className="bg-card-bg/80 border border-card-border p-4 rounded-xl flex flex-col min-w-[250px] shadow-sm">
            <div className="flex justify-between items-center mb-1">
              <p className="text-xs text-text-soft uppercase font-semibold">Uso del plan</p>
              <p className="text-xs font-bold text-white">{currentMessagesUsed} / {messagesLimit}</p>
            </div>
            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mb-2">
              <div 
                className={`h-full rounded-full transition-all ${currentMessagesUsed / messagesLimit > 0.9 ? 'bg-brand-pink' : 'bg-brand-violet'}`}
                style={{ width: `${Math.min((currentMessagesUsed / messagesLimit) * 100, 100)}%` }}
              ></div>
            </div>
            <p className="text-[10px] text-text-soft leading-tight">
              Cada respuesta real consume 1 mensaje.<br/>
              Ver el historial no consume mensajes.
            </p>
            {currentMessagesUsed >= messagesLimit && (
              <p className="text-[10px] text-brand-pink mt-1.5 font-medium">Límite alcanzado. Las nuevas respuestas se pausarán.</p>
            )}
            {currentMessagesUsed >= messagesLimit * 0.9 && currentMessagesUsed < messagesLimit && (
              <p className="text-[10px] text-brand-cyan mt-1.5 font-medium">Estás cerca de tu límite.</p>
            )}
          </div>
        )}
      </div>

      {effectiveStatus === 'free' ? (
        <div className="flex-1 bg-card-bg/80 backdrop-blur-2xl border border-card-border rounded-3xl p-8 lg:p-12 shadow-[0_0_50px_rgba(124,58,237,0.05)] flex items-center justify-center flex-col overflow-y-auto custom-scrollbar">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-brand-violet/20 to-brand-cyan/20 border border-brand-violet/30 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(124,58,237,0.2)] shrink-0">
            <MessageSquare className="w-10 h-10 text-brand-violet" />
          </div>
          <h2 className="text-2xl font-bold mb-3">Activa tu prueba para recibir conversaciones</h2>
          <p className="text-text-secondary mb-6 max-w-md text-center">
            Cuando actives tu prueba o elijas un plan, podrás recibir mensajes desde el Web Chat, ver conversaciones y organizar leads.
          </p>
          <div className="flex gap-4">
            <Link href="/dashboard/billing" className="px-6 py-2.5 rounded-xl bg-brand-violet hover:bg-brand-violet/90 text-white font-medium transition-all shadow-[0_0_20px_rgba(124,58,237,0.3)] hover:shadow-[0_0_30px_rgba(124,58,237,0.5)]">
              Activar prueba gratis
            </Link>
            <Link href="/precios" className="px-6 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-white border border-white/[0.05] font-medium transition-colors">
              Ver planes
            </Link>
          </div>
        </div>
      ) : effectiveStatus === 'expired' || effectiveStatus === 'cancelled' ? (
        <div className="flex-1 bg-card-bg/80 backdrop-blur-2xl border border-card-border rounded-3xl p-8 lg:p-12 shadow-[0_0_50px_rgba(236,72,153,0.05)] flex items-center justify-center flex-col overflow-y-auto custom-scrollbar">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-brand-pink/20 to-brand-pink/10 border border-brand-pink/30 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(236,72,153,0.2)] shrink-0">
            <MessageSquare className="w-10 h-10 text-brand-pink" />
          </div>
          <h2 className="text-2xl font-bold mb-3">Tu acceso a conversaciones está pausado</h2>
          <p className="text-text-secondary mb-6 max-w-md text-center">
            Reactiva tu plan para seguir recibiendo y gestionando conversaciones en tiempo real.
          </p>
          <Link href="/precios" className="px-6 py-2.5 rounded-xl bg-brand-pink hover:bg-brand-pink/90 text-white font-medium transition-all shadow-[0_0_20px_rgba(236,72,153,0.3)] hover:shadow-[0_0_30px_rgba(236,72,153,0.5)]">
            Ver planes
          </Link>
        </div>
      ) : conversations.length === 0 && !search ? (
        <div className="flex-1 bg-card-bg/80 backdrop-blur-2xl border border-card-border rounded-3xl p-8 lg:p-12 shadow-[0_0_50px_rgba(124,58,237,0.05)] flex items-center justify-center flex-col overflow-y-auto custom-scrollbar">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-brand-violet/20 to-brand-cyan/20 border border-brand-violet/30 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(124,58,237,0.2)] shrink-0">
            <MessageSquare className="w-10 h-10 text-brand-violet" />
          </div>
          <h2 className="text-2xl font-bold mb-3">Aún no tienes conversaciones</h2>
          <p className="text-text-secondary mb-2 max-w-md text-center">
            Cuando instales el Web Chat y tus visitantes escriban, aquí aparecerán las conversaciones generadas por tus asistentes.
          </p>
          <div className="mt-6">
            <ChannelConnectActions assistants={assistants} currentPlan={currentPlan} />
          </div>
        </div>
      ) : (
        <div className="flex-1 flex gap-6 min-h-0">
          {/* Left: List */}
          <div className="w-1/3 flex flex-col bg-card-bg/80 backdrop-blur-2xl border border-card-border rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-white/[0.05] space-y-3 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-soft" />
                <input 
                  type="text" 
                  placeholder="Buscar mensaje o visitante..." 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/[0.1] rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-text-soft focus:outline-none focus:border-brand-violet/50"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <select 
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="bg-white/[0.03] border border-white/[0.1] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none flex-1"
                >
                  <option value="all">Todos los estados</option>
                  <option value="open">Abiertas</option>
                  <option value="pending">Pendientes</option>
                  <option value="closed">Cerradas</option>
                </select>

                <select 
                  value={channelFilter}
                  onChange={e => setChannelFilter(e.target.value)}
                  className="bg-white/[0.03] border border-white/[0.1] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none flex-1"
                >
                  <option value="all">Todos los canales</option>
                  <option value="webchat">Web Chat</option>
                  <option value="telegram" disabled className="text-text-soft">Telegram (Próx.)</option>
                  <option value="whatsapp" disabled className="text-text-soft">WhatsApp (Próx.)</option>
                </select>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
              {filteredConversations.map((conv) => {
                const isPartialLead = conv.visitor_name && !conv.visitor_email && !conv.visitor_phone;
                const isCompleteLead = conv.visitor_name && (conv.visitor_email || conv.visitor_phone);
                return (
                  <button 
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv)}
                    className={`w-full text-left p-3 rounded-xl transition-colors flex flex-col gap-2 ${selectedConv?.id === conv.id ? 'bg-white/[0.08]' : 'hover:bg-white/[0.04]'}`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-medium text-sm truncate">{conv.visitor_name || conv.visitor_email || 'Visitante anónimo'}</span>
                      <span className="text-[10px] text-text-soft shrink-0">{getTimeAgo(conv.last_message_at)}</span>
                    </div>
                    <div className="flex justify-between items-end">
                      <p className={`text-xs truncate flex-1 pr-2 ${selectedConv?.id === conv.id ? 'text-brand-violet/80' : 'text-text-soft'}`}>{conv.last_message || 'Sin mensajes'}</p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {conv.lead && conv.lead.length > 0 && <Users className="w-3.5 h-3.5 text-brand-cyan" />}
                        <span className={`${selectedConv?.id === conv.id ? 'text-brand-violet' : 'text-text-soft'}`}>{channelIcon[conv.channel] || channelIcon.webchat}</span>
                      </div>
                    </div>
                  </button>
                )
              })}
              {filteredConversations.length === 0 && (
                <p className="text-center text-xs text-text-soft py-4">No hay conversaciones</p>
              )}
              {hasMore && filteredConversations.length > 0 && (
                <div className="pt-2 pb-4 flex justify-center">
                  <button 
                    onClick={loadMore}
                    className="px-4 py-2 text-xs font-medium text-text-soft hover:text-white bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.05] rounded-xl transition-colors"
                  >
                    Cargar más
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right: Detail */}
          <div className="flex-1 flex bg-card-bg/80 backdrop-blur-2xl border border-card-border rounded-2xl overflow-hidden relative">
            {selectedConv ? (
              <>
                <div className="flex-1 flex flex-col min-w-0 border-r border-white/[0.05]">
                  {/* Detail Header */}
                  <div className="p-4 border-b border-white/[0.05] flex justify-between items-center bg-white/[0.02]">
                    <div className="min-w-0 pr-4">
                      <h3 className="font-semibold truncate">{selectedConv.visitor_name || selectedConv.visitor_email || 'Visitante anónimo'}</h3>
                      <p className="text-xs text-text-soft flex items-center gap-1.5 mt-0.5 truncate">
                        {channelIcon[selectedConv.channel] || channelIcon.webchat}
                        <span className="capitalize">{selectedConv.channel}</span> 
                        <span className="w-1 h-1 rounded-full bg-white/20"></span> 
                        <span className="truncate">{selectedConv.assistant?.assistant_name || 'Asistente general'}</span>
                        <span className="w-1 h-1 rounded-full bg-white/20"></span>
                        <span className={
                          selectedConv.status === 'open' ? 'text-brand-cyan' :
                          selectedConv.status === 'pending' ? 'text-brand-violet' : 'text-text-soft'
                        }>
                          {selectedConv.status === 'open' ? 'Abierta' : selectedConv.status === 'pending' ? 'Pendiente' : 'Cerrada'}
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {selectedConv.status !== 'closed' && (
                        <button
                          onClick={() => handleUpdateStatus(selectedConv.id, 'closed')}
                          className="px-3 py-1.5 bg-white/[0.05] hover:bg-white/[0.1] text-text-soft hover:text-white border border-white/[0.05] text-xs font-medium rounded-lg transition-colors"
                        >
                          Cerrar
                        </button>
                      )}
                      {selectedConv.status === 'open' && (
                        <button
                          onClick={() => handleUpdateStatus(selectedConv.id, 'pending')}
                          className="px-3 py-1.5 bg-brand-violet/10 hover:bg-brand-violet/20 text-brand-violet border border-brand-violet/20 text-xs font-medium rounded-lg transition-colors"
                        >
                          Marcar pendiente
                        </button>
                      )}
                      {selectedConv.status !== 'open' && (
                        <button
                          onClick={() => handleUpdateStatus(selectedConv.id, 'open')}
                          className="px-3 py-1.5 bg-brand-cyan/10 hover:bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/20 text-xs font-medium rounded-lg transition-colors"
                        >
                          Reabrir
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Messages Timeline */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-[#050b1a]">
                    {loadingMessages ? (
                      <div className="text-center text-text-soft text-sm">Cargando mensajes...</div>
                    ) : messages.length === 0 ? (
                      <div className="text-center text-text-soft text-sm">No hay mensajes.</div>
                    ) : (
                      messages.map((msg: any) => (
                        <div key={msg.id} className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'self-end items-end ml-auto' : 'self-start items-start'}`}>
                          <div className={`p-3.5 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-gradient-to-br from-brand-violet/30 to-brand-cyan/20 text-white rounded-br-sm border border-brand-violet/30 shadow-[0_4px_20px_rgba(124,58,237,0.1)]' : 'bg-white/[0.03] text-white/90 rounded-bl-sm border border-white/[0.05]'}`}>
                            {msg.content}
                          </div>
                          <span className="text-[10px] text-text-soft mt-1.5 mx-1 font-medium">
                            {new Date(msg.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Sidebar Contexto */}
                <div className="w-64 bg-white/[0.01] flex flex-col p-5 overflow-y-auto custom-scrollbar shrink-0">
                  <h4 className="text-xs font-semibold text-text-soft uppercase tracking-wider mb-4">Datos detectados</h4>
                  
                  {(!selectedConv.visitor_name && !selectedConv.visitor_email && !selectedConv.visitor_phone && (!selectedConv.lead || selectedConv.lead.length === 0)) ? (
                    <div className="text-center py-6 px-2 bg-white/[0.02] rounded-xl border border-white/[0.05] mt-2">
                      <div className="inline-block px-2 py-1 mb-3 rounded-md bg-white/[0.05] border border-white/[0.1] text-[10px] font-medium text-text-soft">
                        Sin contacto
                      </div>
                      <p className="text-xs text-text-soft">Todavía no se detectan datos de contacto.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Badge of lead status */}
                      <div className="mb-4">
                        {selectedConv.visitor_name && (selectedConv.visitor_email || selectedConv.visitor_phone) ? (
                          <div className="inline-block px-2.5 py-1 rounded-md bg-brand-cyan/10 border border-brand-cyan/20 text-[10px] font-medium text-brand-cyan uppercase tracking-wider">
                            Lead completo
                          </div>
                        ) : selectedConv.visitor_name ? (
                          <div className="inline-block px-2.5 py-1 rounded-md bg-brand-violet/10 border border-brand-violet/20 text-[10px] font-medium text-brand-violet uppercase tracking-wider">
                            Lead parcial
                          </div>
                        ) : null}
                      </div>

                      {selectedConv.visitor_name && (
                        <div>
                          <p className="text-[10px] text-text-soft uppercase">Nombre</p>
                          <p className="text-sm font-medium truncate">{selectedConv.visitor_name}</p>
                        </div>
                      )}
                      {selectedConv.visitor_email && (
                        <div>
                          <p className="text-[10px] text-text-soft uppercase">Email</p>
                          <p className="text-sm font-medium text-brand-cyan truncate">{selectedConv.visitor_email}</p>
                        </div>
                      )}
                      {selectedConv.visitor_phone && (
                        <div>
                          <p className="text-[10px] text-text-soft uppercase">Teléfono</p>
                          <p className="text-sm font-medium truncate">{selectedConv.visitor_phone}</p>
                        </div>
                      )}
                      {selectedConv.last_message && (
                        <div>
                          <p className="text-[10px] text-text-soft uppercase">Mensaje de interés</p>
                          <p className="text-xs text-white/80 line-clamp-3 leading-relaxed mt-0.5">{selectedConv.last_message}</p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-8 pt-6 border-t border-white/[0.05]">
                    <h4 className="text-xs font-semibold text-text-soft uppercase tracking-wider mb-4">Lead relacionado</h4>
                    {selectedConv.lead && selectedConv.lead.length > 0 ? (
                      <Link 
                        href={`/dashboard/leads?id=${selectedConv.lead[0].id}`}
                        className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-brand-cyan/10 hover:bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/20 text-sm font-medium rounded-xl transition-all"
                      >
                        <Users className="w-4 h-4" /> Ver Lead
                      </Link>
                    ) : (
                      <button
                        onClick={() => setShowConvertModal(true)}
                        className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-brand-violet/10 hover:bg-brand-violet/20 text-brand-violet border border-brand-violet/20 text-sm font-medium rounded-xl transition-all"
                      >
                        <Users className="w-4 h-4" /> Convertir a Lead
                      </button>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-text-soft bg-white/[0.01]">
                <MessageSquare className="w-12 h-12 mb-4 text-white/10" />
                <p className="text-sm font-medium">Selecciona una conversación para ver los detalles.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedConv && (
        <ConvertLeadModal
          isOpen={showConvertModal}
          onClose={() => setShowConvertModal(false)}
          conversation={selectedConv}
          onSuccess={(newLead) => {
            const updatedConv = { ...selectedConv, lead: [newLead] }
            setSelectedConv(updatedConv)
            setConversations(prev => prev.map(c => c.id === updatedConv.id ? updatedConv : c))
          }}
        />
      )}
    </div>
  )
}

function getTimeAgo(dateStr: string): string {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Ahora'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}
