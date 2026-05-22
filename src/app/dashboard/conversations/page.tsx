import { createClient } from '@/lib/supabase/server'
import { MessageSquare, Globe, Send, MessageCircle, Clock, Bot, AlertCircle } from 'lucide-react'

const channelIcon: Record<string, React.ReactNode> = {
  webchat:  <Globe className="w-4 h-4" />,
  telegram: <Send className="w-4 h-4" />,
  whatsapp: <MessageCircle className="w-4 h-4" />,
}

const MOCK_CONVERSATIONS = [
  { id: 'm1', channel: 'webchat', last_message: '¿Cuáles son sus horarios de atención?', created_at: new Date().toISOString(), assistant: { assistant_name: 'Asistente Demo', business_name: 'Mi Negocio' } },
  { id: 'm2', channel: 'whatsapp', last_message: 'Me interesa el Plan Pro, ¿pueden llamarme?', created_at: new Date(Date.now() - 3600000).toISOString(), assistant: { assistant_name: 'Asistente Demo', business_name: 'Mi Negocio' } },
  { id: 'm3', channel: 'telegram', last_message: 'Quiero agendar una cita para mañana.', created_at: new Date(Date.now() - 86400000).toISOString(), assistant: { assistant_name: 'Asistente Demo', business_name: 'Mi Negocio' } },
]

export default async function ConversationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: dbConvs } = await supabase
    .from('conversations')
    .select('*, assistant:assistants(assistant_name, business_name)')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  const conversations = (dbConvs && dbConvs.length > 0) ? dbConvs : MOCK_CONVERSATIONS
  const isDemo = !dbConvs || dbConvs.length === 0

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Conversaciones</h1>
        <p className="text-text-soft mt-1">
          Historial de interacciones con tus asistentes.
          {isDemo && <span className="ml-2 text-brand-cyan text-xs font-medium px-2 py-0.5 rounded-full bg-brand-cyan/10 border border-brand-cyan/20">Vista demo</span>}
        </p>
      </div>

      {/* Summary bar */}
      <div className="flex items-center gap-4 text-sm">
        <span className="flex items-center gap-1.5 text-text-soft">
          <MessageSquare className="w-4 h-4 text-brand-violet" />
          {conversations.length} conversacion{conversations.length !== 1 ? 'es' : ''}
        </span>
        {isDemo && (
          <div className="flex items-center gap-1.5 text-brand-cyan text-xs">
            <AlertCircle className="w-3.5 h-3.5" />
            Datos de ejemplo — activa tu asistente para ver conversaciones reales
          </div>
        )}
      </div>

      {/* List */}
      <div className="bg-card-bg/80 backdrop-blur-2xl border border-card-border rounded-2xl overflow-hidden divide-y divide-white/[0.05]">
        {conversations.map((conv) => {
          const icon = channelIcon[conv.channel || 'webchat'] || channelIcon.webchat
          const timeAgo = getTimeAgo(conv.created_at)
          const assistantObj = conv.assistant as { assistant_name?: string; business_name?: string } | null

          return (
            <div key={conv.id} className="flex gap-4 px-6 py-4 hover:bg-white/[0.02] transition-colors group">
              {/* Channel icon */}
              <div className="w-11 h-11 rounded-xl gradient-btn flex items-center justify-center flex-shrink-0 shadow-[0_0_20px_rgba(124,58,237,0.2)]">
                <span className="text-white">{icon}</span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium">{assistantObj?.assistant_name || 'Asistente'}</span>
                  <span className="text-xs text-text-soft">·</span>
                  <span className="text-xs text-text-soft capitalize">{conv.channel || 'webchat'}</span>
                </div>
                <p className="text-sm text-text-soft truncate">{conv.last_message || 'Sin mensajes'}</p>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-text-soft flex-shrink-0">
                <Clock className="w-3.5 h-3.5" />
                {timeAgo}
              </div>
            </div>
          )
        })}

        {conversations.length === 0 && (
          <div className="text-center py-20">
            <Bot className="w-12 h-12 text-text-soft/30 mx-auto mb-4" />
            <p className="font-semibold">No hay conversaciones aún</p>
            <p className="text-sm text-text-soft">Las conversaciones aparecerán aquí cuando tu asistente empiece a responder clientes.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Ahora'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}
