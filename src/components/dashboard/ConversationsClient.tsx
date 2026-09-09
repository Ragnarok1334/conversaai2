'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MessageSquare, Globe, Send, MessageCircle, Search, Filter, CheckCircle2, Users, Mail, Phone, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import ChannelConnectActions from '@/components/dashboard/ChannelConnectActions'
import { ConvertLeadModal } from './ConvertLeadModal'
import { CustomSelect } from '@/components/ui/CustomSelect'

const channelIcon: Record<string, React.ReactNode> = {
  webchat: <Globe className="w-4 h-4" />,
  telegram: <Send className="w-4 h-4" />,
  whatsapp: <MessageCircle className="w-4 h-4" />,
  instagram: <Globe className="w-4 h-4" />,
  facebook: <MessageCircle className="w-4 h-4" />,
}

export default function ConversationsClient({ user, assistants, currentPlan, effectiveStatus, messagesLimit, currentMessagesUsed }: { user: any, assistants: any[], currentPlan: string, effectiveStatus: string, messagesLimit: number, currentMessagesUsed: number }) {
  const supabase = createClient()
  
  const [conversations, setConversations] = useState<any[]>([])
  const [stats, setStats] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  
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
  const [showFilters, setShowFilters] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const limit = 25

  const fetchConversations = async (pageNum = 1, append = false) => {
    try {
      setErrorMessage('')
      const query = new URLSearchParams({
        limit: limit.toString(),
        page: pageNum.toString()
      })
      if (statusFilter !== 'all') query.append('status', statusFilter)
      if (channelFilter !== 'all') query.append('channel', channelFilter)
      if (search) query.append('search', search)

      const res = await fetch(`/api/conversations?${query.toString()}`, { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'No se pudieron cargar las conversaciones')
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
      return true
    } catch (error) {
      console.error('Error fetching conversations:', error)
      setErrorMessage(error instanceof Error ? error.message : 'No se pudieron cargar las conversaciones')
      return false
    } finally {
      setLoading(false)
    }
  }

  const loadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchConversations(nextPage, true)
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    const succeeded = await fetchConversations(1, false)
    setRefreshing(false)
    if (succeeded) showToast('Conversaciones actualizadas')
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
      const res = await fetch(`/api/conversations/${id}`, { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'No se pudieron cargar los mensajes')
      if (data.messages) {
        setMessages(data.messages)
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
      setMessages([])
      showToast(error instanceof Error ? error.message : 'No se pudieron cargar los mensajes')
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
              setMessages((prev) => prev.some(message => message.id === payload.new.id) ? prev : [...prev, payload.new])
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
    const url = new URL(window.location.href)
    url.searchParams.set('id', conv.id)
    window.history.replaceState({}, '', url)
  }

  const handleUpdateStatus = async (convId: string, status: string) => {
    const previousConversations = [...conversations]
    const previousSelected = selectedConv
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
      setConversations(previousConversations)
      setSelectedConv(previousSelected)
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
  const hasActiveFilters = Boolean(search) || statusFilter !== 'all' || channelFilter !== 'all'

  // Selección automática
  useEffect(() => {
    if (filteredConversations.length > 0) {
      if (!selectedConv || !filteredConversations.find(c => c.id === selectedConv.id)) {
        const requestedId = new URLSearchParams(window.location.search).get('id')
        handleSelectConversation(filteredConversations.find(c => c.id === requestedId) || filteredConversations[0])
      }
    } else {
      setSelectedConv(null)
      setMessages([])
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

      {/* Header & summary */}
      <div className="mb-5 shrink-0 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Conversaciones</h1>
          <p className="text-text-soft mt-1">
            Revisa mensajes y da seguimiento a quienes necesitan atención.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button type="button" onClick={handleRefresh} disabled={refreshing} className="w-8 h-8 inline-flex items-center justify-center rounded-full border border-card-border text-text-soft hover:text-text-primary disabled:opacity-50" title="Actualizar conversaciones" aria-label="Actualizar conversaciones"><RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} /></button>
          <span className="px-3 py-1.5 rounded-full bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan font-medium">
            {stats.open || 0} abiertas
          </span>
          <span className="px-3 py-1.5 rounded-full bg-brand-violet/10 border border-brand-violet/20 text-brand-violet font-medium">
            {stats.pending || 0} pendientes
          </span>
          <span className="px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-text-soft font-medium">
            {stats.total || 0} totales
          </span>
          {messagesLimit > 0 && currentMessagesUsed >= messagesLimit * 0.8 && (
            <span className="px-3 py-1.5 rounded-full bg-brand-pink/10 border border-brand-pink/20 text-brand-pink font-medium">
              Uso {currentMessagesUsed}/{messagesLimit}
            </span>
          )}
        </div>
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
      ) : conversations.length === 0 && !hasActiveFilters ? (
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
        <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
          {/* Left: List */}
          <div className="w-full lg:w-[340px] min-h-[280px] lg:min-h-0 flex flex-col bg-card-bg/80 backdrop-blur-2xl border border-card-border rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-white/[0.05] space-y-3 shrink-0">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-soft" />
                  <input
                    type="text"
                    placeholder="Buscar conversación..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/[0.1] rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-text-soft focus:outline-none focus:border-brand-violet/50"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowFilters(value => !value)}
                  aria-expanded={showFilters}
                  className={`w-10 rounded-xl border flex items-center justify-center transition-colors ${showFilters || channelFilter !== 'all' ? 'bg-brand-violet/10 border-brand-violet/30 text-brand-violet' : 'bg-white/[0.03] border-white/[0.1] text-text-soft hover:text-white'}`}
                  title="Filtrar por canal"
                >
                  <Filter className="w-4 h-4" />
                </button>
              </div>
              <div className="flex gap-1 p-1 rounded-xl bg-white/[0.025] border border-white/[0.06]">
                {[
                  ['all', 'Todas'],
                  ['open', 'Abiertas'],
                  ['pending', 'Pendientes'],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setStatusFilter(value)}
                    className={`flex-1 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${statusFilter === value ? 'bg-brand-violet/15 text-brand-violet' : 'text-text-soft hover:text-white'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {showFilters && <CustomSelect value={channelFilter} onChange={setChannelFilter} options={[
                { value: 'all', label: 'Todos los canales' }, { value: 'webchat', label: 'Web Chat' },
                { value: 'whatsapp', label: 'WhatsApp' }, { value: 'instagram', label: 'Instagram' },
                { value: 'facebook', label: 'Facebook Messenger' }, { value: 'telegram', label: 'Telegram' },
              ]} />}
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
                    <div className="shrink-0 w-36"><CustomSelect value={selectedConv.status} onChange={status => handleUpdateStatus(selectedConv.id, status)} options={[
                      { value: 'open', label: 'Abierta' }, { value: 'pending', label: 'Pendiente' }, { value: 'closed', label: 'Cerrada' },
                    ]} /></div>
                  </div>

                  {(selectedConv.visitor_email || selectedConv.visitor_phone) && (
                    <div className="xl:hidden px-4 py-2 border-b border-white/[0.05] flex gap-2">
                      {selectedConv.visitor_email && <a href={`mailto:${selectedConv.visitor_email}`} className="inline-flex items-center gap-1.5 rounded-lg border border-card-border px-3 py-1.5 text-xs font-semibold"><Mail className="w-3.5 h-3.5" /> Correo</a>}
                      {selectedConv.visitor_phone && <a href={`https://wa.me/${selectedConv.visitor_phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-brand-success/15 border border-brand-success/25 px-3 py-1.5 text-xs font-semibold text-brand-success"><MessageCircle className="w-3.5 h-3.5" /> WhatsApp</a>}
                    </div>
                  )}

                  {/* Messages Timeline */}
                  <div className="conversation-timeline flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar bg-white/[0.015]">
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
                <div className="hidden xl:flex w-64 bg-white/[0.01] flex-col p-5 overflow-y-auto custom-scrollbar shrink-0">
                  <h4 className="text-xs font-semibold text-text-soft uppercase tracking-wider mb-4">Contacto</h4>
                  
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
                          <a href={`mailto:${selectedConv.visitor_email}`} className="mt-1 inline-flex items-center gap-1 text-xs text-brand-cyan"><Mail className="w-3 h-3" /> Escribir correo</a>
                        </div>
                      )}
                      {selectedConv.visitor_phone && (
                        <div>
                          <p className="text-[10px] text-text-soft uppercase">Teléfono</p>
                          <p className="text-sm font-medium truncate">{selectedConv.visitor_phone}</p>
                          <div className="mt-1 flex gap-3"><a href={`tel:${selectedConv.visitor_phone}`} className="inline-flex items-center gap-1 text-xs text-brand-blue"><Phone className="w-3 h-3" /> Llamar</a><a href={`https://wa.me/${selectedConv.visitor_phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-brand-success"><MessageCircle className="w-3 h-3" /> WhatsApp</a></div>
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
      {errorMessage && conversations.length === 0 && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-page-bg/80 backdrop-blur-sm">
          <div className="max-w-sm rounded-2xl border border-brand-pink/20 bg-card-bg p-6 text-center"><p className="font-semibold">No pudimos cargar las conversaciones</p><p className="mt-2 text-sm text-text-soft">{errorMessage}</p><button onClick={() => fetchConversations(1, false)} className="mt-4 rounded-xl bg-brand-violet px-4 py-2 text-sm font-semibold text-white">Reintentar</button></div>
        </div>
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
