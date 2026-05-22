import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { AssistantPlayground } from '@/components/dashboard/AssistantPlayground'
import { Bot, Globe, MessageCircle, Send, Calendar, CheckCircle2, XCircle, ArrowLeft, Pencil } from 'lucide-react'
import Link from 'next/link'

const channelLabel: Record<string, string> = { webchat: 'Web Chat', telegram: 'Telegram', whatsapp: 'WhatsApp' }
const channelIcon: Record<string, React.ReactNode> = {
  webchat: <Globe className="w-4 h-4" />,
  telegram: <Send className="w-4 h-4" />,
  whatsapp: <MessageCircle className="w-4 h-4" />,
}

export default async function AssistantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: assistant } = await supabase
    .from('assistants')
    .select('*, assistant_test_messages(id, user_message, assistant_reply, created_at)')
    .eq('id', id)
    .single()

  if (!assistant) notFound()

  const testMessages = (assistant.assistant_test_messages || []).sort(
    (a: { created_at: string }, b: { created_at: string }) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  const config = {
    assistantName: assistant.assistant_name,
    businessName: assistant.business_name,
    businessType: assistant.business_type,
    channel: assistant.channel,
    tone: assistant.tone,
    mainGoal: assistant.main_goal,
    instructions: assistant.instructions,
    faqs: assistant.faqs,
    services: assistant.services,
    schedule: assistant.schedule,
    fallbackMessage: assistant.fallback_message,
    language: assistant.language,
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/assistants" className="p-2 rounded-xl bg-card-bg border border-card-border hover:bg-white/10 transition-colors text-text-soft hover:text-text-main">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{assistant.assistant_name}</h1>
            <p className="text-text-soft text-sm">{assistant.business_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border font-medium ${
            assistant.status === 'active'
              ? 'bg-brand-success/10 border-brand-success/30 text-brand-success'
              : 'bg-white/[0.06] border-white/10 text-text-soft'
          }`}>
            {assistant.status === 'active' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            {assistant.status === 'active' ? 'Activo' : 'Inactivo'}
          </span>
          <Link
            href={`/dashboard/assistants/${id}?tab=edit`}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-card-bg border border-card-border hover:bg-white/10 transition-colors text-sm font-medium"
          >
            <Pencil className="w-4 h-4" />
            Editar
          </Link>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Info + History */}
        <div className="lg:col-span-1 space-y-6">
          {/* Config card */}
          <div className="bg-card-bg/80 backdrop-blur-2xl border border-card-border rounded-2xl p-6 space-y-4">
            <h2 className="font-semibold border-b border-white/[0.06] pb-3">Configuración</h2>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl gradient-btn flex items-center justify-center text-white font-bold text-xl">
                {assistant.assistant_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold">{assistant.assistant_name}</p>
                <p className="text-sm text-text-soft">{assistant.business_name}</p>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <InfoRow label="Canal" value={
                <span className="inline-flex items-center gap-1.5 text-brand-cyan">
                  {channelIcon[assistant.channel]}
                  {channelLabel[assistant.channel] || assistant.channel}
                </span>
              } />
              <InfoRow label="Tono" value={<span className="capitalize">{assistant.tone}</span>} />
              <InfoRow label="Objetivo" value={<span className="capitalize">{assistant.main_goal}</span>} />
              <InfoRow label="Idioma" value={assistant.language === 'es' ? 'Español' : assistant.language} />
              {assistant.schedule && <InfoRow label="Horario" value={assistant.schedule} />}
              <InfoRow label="Creado" value={
                <span className="flex items-center gap-1 text-text-soft">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(assistant.created_at).toLocaleDateString('es', { day: '2-digit', month: 'long', year: 'numeric' })}
                </span>
              } />
            </div>

            {assistant.instructions && (
              <div className="pt-3 border-t border-white/[0.06]">
                <p className="text-xs font-medium text-text-soft mb-2">Instrucciones</p>
                <p className="text-xs text-text-secondary leading-relaxed line-clamp-4">{assistant.instructions}</p>
              </div>
            )}
          </div>

          {/* Test history */}
          <div className="bg-card-bg/80 backdrop-blur-2xl border border-card-border rounded-2xl p-6">
            <h2 className="font-semibold border-b border-white/[0.06] pb-3 mb-4">Historial de pruebas</h2>
            {testMessages.length === 0 ? (
              <div className="text-center py-6">
                <Bot className="w-8 h-8 text-text-soft/40 mx-auto mb-2" />
                <p className="text-sm text-text-soft">Aún no hay pruebas registradas.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {testMessages.slice(0, 10).map((m: { id: string; user_message: string; assistant_reply: string; created_at: string }) => (
                  <div key={m.id} className="text-xs space-y-1.5 pb-3 border-b border-white/[0.05] last:border-0">
                    <p className="text-text-soft font-medium">
                      {new Date(m.created_at).toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' })}
                    </p>
                    <p className="text-text-secondary bg-brand-violet/10 rounded-lg px-3 py-2">{m.user_message}</p>
                    <p className="text-text-soft bg-white/[0.03] rounded-lg px-3 py-2 line-clamp-2">{m.assistant_reply}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Playground */}
        <div className="lg:col-span-2">
          <h2 className="font-semibold text-lg mb-4">Playground</h2>
          <AssistantPlayground
            assistantId={assistant.id}
            assistantConfig={config}
            title={assistant.assistant_name}
          />
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-text-soft shrink-0">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  )
}
