'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MessageSquare, Globe, Send, MessageCircle, Clock, Plus, Settings, Search, Filter, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import ChannelConnectActions from '@/components/dashboard/ChannelConnectActions'

const channelIcon: Record<string, React.ReactNode> = {
  webchat: <Globe className="w-4 h-4" />,
  telegram: <Send className="w-4 h-4" />,
  whatsapp: <MessageCircle className="w-4 h-4" />,
}

export default function ConversationsClient({ user, assistants, currentPlan }: { user: any, assistants: any[], currentPlan: string }) {
  const supabase = createClient()
  
  const [conversations, setConversations] = useState<any[]>([])
  const [stats, setStats] = useState<any>({})
  const [loading, setLoading] = useState(true)
  
  const [selectedConv, setSelectedConv] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)

  // Filtros
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const fetchConversations = async () => {
    try {
      const res = await fetch(`/api/conversations?limit=100`)
      const data = await res.json()
      if (data.conversations) {
        setConversations(data.conversations)
        setStats(data.stats || {})
      }
    } catch (error) {
      console.error('Error fetching conversations:', error)
    } finally {
      setLoading(false)
    }
  }

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
    fetchConversations()

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
    } catch (error) {
      console.error('Error updating status', error)
      // Revert in case of failure could be added here
    }
  }

  // Filtrado local básico para UI fluida
  const filteredConversations = conversations.filter(c => {
    const matchesSearch = c.visitor_name?.toLowerCase().includes(search.toLowerCase()) || 
                          c.last_message?.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter
    return matchesSearch && matchesStatus
  })

  if (loading) {
    return <div className="p-8 text-center text-text-soft">Cargando conversaciones...</div>
  }

  return (
    <div className="max-w-7xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
      {/* Header & Stats */}
      <div className="mb-6 shrink-0">
        <h1 className="text-3xl font-bold tracking-tight">Conversaciones</h1>
        <p className="text-text-soft mt-1">
          Revisa las interacciones de tus clientes en tiempo real.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-card-bg/50 border border-card-border p-4 rounded-xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand-violet/10 flex items-center justify-center text-brand-violet"><MessageSquare className="w-5 h-5"/></div>
            <div><p className="text-sm text-text-soft">Total</p><p className="font-bold text-xl">{stats.total || 0}</p></div>
          </div>
          <div className="bg-card-bg/50 border border-card-border p-4 rounded-xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand-cyan/10 flex items-center justify-center text-brand-cyan"><Clock className="w-5 h-5"/></div>
            <div><p className="text-sm text-text-soft">Abiertas</p><p className="font-bold text-xl">{stats.open || 0}</p></div>
          </div>
          <div className="bg-card-bg/50 border border-card-border p-4 rounded-xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand-success/10 flex items-center justify-center text-brand-success"><CheckCircle2 className="w-5 h-5"/></div>
            <div><p className="text-sm text-text-soft">Cerradas</p><p className="font-bold text-xl">{stats.closed || 0}</p></div>
          </div>
          <div className="bg-card-bg/50 border border-card-border p-4 rounded-xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center"><Globe className="w-5 h-5"/></div>
            <div><p className="text-sm text-text-soft">Web Chat</p><p className="font-bold text-xl">{stats.webchat || 0}</p></div>
          </div>
        </div>
      </div>

      {conversations.length === 0 && !search ? (
        <div className="flex-1 bg-card-bg/80 backdrop-blur-2xl border border-card-border rounded-3xl p-8 lg:p-12 shadow-[0_0_50px_rgba(124,58,237,0.05)] flex items-center justify-center flex-col overflow-y-auto custom-scrollbar">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-brand-violet/20 to-brand-cyan/20 border border-brand-violet/30 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(124,58,237,0.2)] shrink-0">
            <MessageSquare className="w-10 h-10 text-brand-violet" />
          </div>
          <h2 className="text-2xl font-bold mb-3">Aún no tienes conversaciones</h2>
          <p className="text-text-secondary mb-2 max-w-md text-center">
            Cuando tus asistentes respondan desde Web Chat, Telegram o WhatsApp, las conversaciones aparecerán aquí en tiempo real.
          </p>
          <p className="text-sm text-text-soft mb-4 text-center">
            {assistants.length > 0 ? 'Instala un canal para empezar a recibir mensajes de clientes.' : 'Primero crea un asistente para conectarlo a tus canales.'}
          </p>
          
          <ChannelConnectActions assistants={assistants} currentPlan={currentPlan} />
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
              <div className="flex gap-2">
                <select 
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="bg-white/[0.03] border border-white/[0.1] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                >
                  <option value="all">Todos los estados</option>
                  <option value="open">Abiertas</option>
                  <option value="pending">Pendientes</option>
                  <option value="closed">Cerradas</option>
                </select>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
              {filteredConversations.map((conv) => (
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
                    <p className="text-xs text-text-soft truncate flex-1 pr-2">{conv.last_message || 'Sin mensajes'}</p>
                    <span className="shrink-0">{channelIcon[conv.channel] || channelIcon.webchat}</span>
                  </div>
                </button>
              ))}
              {filteredConversations.length === 0 && (
                <p className="text-center text-xs text-text-soft py-4">No hay conversaciones</p>
              )}
            </div>
          </div>

          {/* Right: Detail */}
          <div className="flex-1 flex flex-col bg-card-bg/80 backdrop-blur-2xl border border-card-border rounded-2xl overflow-hidden relative">
            {selectedConv ? (
              <>
                {/* Detail Header */}
                <div className="p-4 border-b border-white/[0.05] flex justify-between items-center bg-white/[0.02]">
                  <div>
                    <h3 className="font-semibold">{selectedConv.visitor_name || selectedConv.visitor_email || 'Visitante anónimo'}</h3>
                    <p className="text-xs text-text-soft flex items-center gap-1">
                      {channelIcon[selectedConv.channel] || channelIcon.webchat}
                      <span className="capitalize">{selectedConv.channel}</span> · {selectedConv.assistant?.assistant_name || 'Asistente'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedConv.status}
                      onChange={(e) => handleUpdateStatus(selectedConv.id, e.target.value)}
                      className={`text-xs px-3 py-1.5 rounded-lg border font-medium outline-none ${
                        selectedConv.status === 'open' ? 'bg-brand-cyan/10 text-brand-cyan border-brand-cyan/20' :
                        selectedConv.status === 'closed' ? 'bg-white/10 text-white/70 border-white/20' :
                        'bg-brand-violet/10 text-brand-violet border-brand-violet/20'
                      }`}
                    >
                      <option value="open">Abierta</option>
                      <option value="pending">Pendiente</option>
                      <option value="closed">Cerrada</option>
                    </select>
                  </div>
                </div>

                {/* Messages Timeline */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                  {loadingMessages ? (
                    <div className="text-center text-text-soft text-sm">Cargando mensajes...</div>
                  ) : messages.length === 0 ? (
                    <div className="text-center text-text-soft text-sm">No hay mensajes.</div>
                  ) : (
                    messages.map((msg: any) => (
                      <div key={msg.id} className={`flex flex-col max-w-[80%] ${msg.role === 'user' ? 'self-end items-end ml-auto' : 'self-start items-start'}`}>
                        <div className={`p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-brand-violet/20 text-white rounded-br-sm border border-brand-violet/30' : 'bg-white/[0.05] text-white/90 rounded-bl-sm border border-white/[0.05]'}`}>
                          {msg.content}
                        </div>
                        <span className="text-[10px] text-text-soft mt-1 mx-1">
                          {new Date(msg.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-text-soft text-sm">
                Selecciona una conversación para ver los detalles.
              </div>
            )}
          </div>
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
