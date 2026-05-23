import { createClient } from '@/lib/supabase/server'
import { MessageSquare, Globe, Send, MessageCircle, Clock, Bot, Plus, Settings } from 'lucide-react'
import Link from 'next/link'

const channelIcon: Record<string, React.ReactNode> = {
  webchat:  <Globe className="w-4 h-4" />,
  telegram: <Send className="w-4 h-4" />,
  whatsapp: <MessageCircle className="w-4 h-4" />,
}

export default async function ConversationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: dbConvs } = await supabase
    .from('conversations')
    .select('*, assistant:assistants(assistant_name, business_name)')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  const conversations = dbConvs || []

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Conversaciones</h1>
        <p className="text-text-soft mt-1">
          Historial de interacciones con tus asistentes.
        </p>
      </div>

      {conversations.length > 0 ? (
        <>
          {/* Summary bar */}
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5 text-text-soft">
              <MessageSquare className="w-4 h-4 text-brand-violet" />
              {conversations.length} conversacion{conversations.length !== 1 ? 'es' : ''}
            </span>
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
          </div>
        </>
      ) : (
        <div className="bg-card-bg/80 backdrop-blur-2xl border border-card-border rounded-3xl p-12 text-center max-w-2xl mx-auto mt-12 shadow-[0_0_50px_rgba(124,58,237,0.05)]">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-brand-violet/20 to-brand-cyan/20 border border-brand-violet/30 flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(124,58,237,0.2)]">
            <MessageSquare className="w-10 h-10 text-brand-violet" />
          </div>
          <h2 className="text-2xl font-bold mb-3">Aún no tienes conversaciones</h2>
          <p className="text-text-secondary mb-8">
            Las conversaciones aparecerán aquí cuando tus asistentes empiecen a responder clientes.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              href="/dashboard/create-assistant"
              className="w-full sm:w-auto gradient-btn px-6 py-3 rounded-xl text-white font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Crear asistente
            </Link>
            <Link 
              href="/dashboard/settings"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white/[0.04] border border-white/[0.1] hover:bg-white/[0.08] transition-colors text-text-main font-semibold flex items-center justify-center gap-2"
            >
              <Settings className="w-4 h-4 text-text-soft" />
              Configurar Web Chat
            </Link>
          </div>
        </div>
      )}
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
