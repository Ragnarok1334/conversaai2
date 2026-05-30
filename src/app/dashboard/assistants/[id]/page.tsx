import { createClient } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { AssistantPlayground } from '@/components/dashboard/AssistantPlayground'
import { AssistantInstallation } from '@/components/dashboard/AssistantInstallation'
import { getPlanLimits, normalizePlan } from '@/lib/plans'
import { Bot, Globe, MessageCircle, Send, Calendar, CheckCircle2, XCircle, ArrowLeft, Pencil, Settings, Play, Info } from 'lucide-react'
import Link from 'next/link'

const channelLabel: Record<string, string> = { webchat: 'Web Chat', telegram: 'Telegram', whatsapp: 'WhatsApp' }
const channelIcon: Record<string, React.ReactNode> = {
  webchat: <Globe className="w-4 h-4" />,
  telegram: <Send className="w-4 h-4" />,
  whatsapp: <MessageCircle className="w-4 h-4" />,
}

export default async function AssistantDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string; channel?: string }>
}) {
  const { id } = await params
  const { tab = 'overview', channel = 'webchat' } = await searchParams

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  // Use Admin to get plan
  const supabaseAdmin = createSupabaseAdmin()
  const { data: sub } = await supabaseAdmin
    .from('subscriptions')
    .select('plan, status')
    .eq('user_id', user.id)
    .single()

  const planLimits = sub && sub.status === 'active' 
    ? getPlanLimits(normalizePlan(sub.plan)) 
    : getPlanLimits('free')

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

  const tabs = [
    { id: 'overview', label: 'Resumen', icon: <Info className="w-4 h-4" /> },
    { id: 'test', label: 'Prueba', icon: <Play className="w-4 h-4" /> },
    { id: 'install', label: 'Instalación', icon: <Globe className="w-4 h-4" /> },
    { id: 'settings', label: 'Configuración', icon: <Settings className="w-4 h-4" /> },
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/assistants" className="p-2.5 rounded-xl bg-card-bg border border-card-border hover:bg-white/10 transition-colors text-text-soft hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl gradient-btn flex items-center justify-center text-white font-bold text-xl shadow-lg">
              {assistant.assistant_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold leading-tight">{assistant.assistant_name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                  assistant.status === 'active'
                    ? 'bg-brand-success/10 text-brand-success'
                    : 'bg-white/10 text-text-soft'
                }`}>
                  {assistant.status === 'active' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                  {assistant.status === 'active' ? 'Activo' : 'Inactivo'}
                </span>
                <span className="text-text-soft text-sm">{assistant.business_name}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/assistants/${id}?tab=edit`}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card-bg border border-card-border hover:bg-white/10 transition-colors text-sm font-semibold"
          >
            <Pencil className="w-4 h-4" />
            Editar asistente
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-white/5 scrollbar-hide">
        {tabs.map((t) => {
          // Si el tab es edit, no es uno de estos tabs visuales principales, pero los settings sí
          const isActive = tab === t.id
          return (
            <Link
              key={t.id}
              href={`/dashboard/assistants/${id}?tab=${t.id}${t.id === 'install' ? '&channel=webchat' : ''}`}
              className={`flex items-center gap-2 px-5 py-3 rounded-t-xl font-medium text-sm transition-colors border-b-2 ${
                isActive
                  ? 'border-brand-violet text-white bg-brand-violet/5'
                  : 'border-transparent text-text-soft hover:text-white hover:bg-white/[0.02]'
              }`}
            >
              {t.icon}
              {t.label}
            </Link>
          )
        })}
      </div>

      {/* TAB CONTENT: OVERVIEW */}
      {tab === 'overview' && (
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-card-bg/80 backdrop-blur-2xl border border-card-border rounded-3xl p-6 space-y-4">
              <h2 className="font-bold border-b border-white/[0.06] pb-3 text-lg">Configuración base</h2>
              <div className="space-y-4 text-sm">
                <InfoRow label="Canal inicial" value={
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
                <div className="pt-4 border-t border-white/[0.06]">
                  <p className="text-xs font-semibold text-text-soft mb-2 uppercase tracking-wide">Instrucciones</p>
                  <p className="text-sm text-text-secondary leading-relaxed line-clamp-4">{assistant.instructions}</p>
                </div>
              )}
            </div>
          </div>
          <div className="lg:col-span-2">
            <div className="bg-card-bg/80 backdrop-blur-2xl border border-card-border rounded-3xl p-8">
              <h2 className="font-bold border-b border-white/[0.06] pb-3 mb-6 text-lg">Historial de pruebas (Playground)</h2>
              {testMessages.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
                    <Bot className="w-8 h-8 text-text-soft/60" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Aún no hay pruebas</h3>
                  <p className="text-text-soft mb-6">Prueba tu asistente para ver sus respuestas aquí.</p>
                  <Link href={`/dashboard/assistants/${id}?tab=test`} className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 font-semibold hover:bg-white/10 transition-colors">
                    Ir al Playground
                  </Link>
                </div>
              ) : (
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
                  {testMessages.slice(0, 20).map((m: { id: string; user_message: string; assistant_reply: string; created_at: string }) => (
                    <div key={m.id} className="text-sm space-y-2 pb-4 border-b border-white/[0.05] last:border-0">
                      <p className="text-xs text-text-soft font-medium flex items-center gap-2">
                        {new Date(m.created_at).toLocaleString('es', { dateStyle: 'long', timeStyle: 'short' })}
                      </p>
                      <div className="bg-brand-violet/10 border border-brand-violet/20 rounded-2xl px-4 py-3 rounded-tr-sm self-end">
                        <strong className="text-brand-purple text-xs block mb-1">Tú:</strong>
                        <p className="text-white/90">{m.user_message}</p>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 rounded-tl-sm self-start">
                        <strong className="text-brand-cyan text-xs block mb-1">Asistente:</strong>
                        <p className="text-text-secondary whitespace-pre-wrap">{m.assistant_reply}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: TEST */}
      {tab === 'test' && (
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-bold">Prueba tu asistente</h2>
            <p className="text-text-soft mt-1">Valida sus respuestas antes de instalarlo con tus clientes. <strong className="text-brand-cyan">Los mensajes enviados consumen tu límite mensual.</strong></p>
          </div>
          <AssistantPlayground
            assistantId={assistant.id}
            assistantConfig={config}
            title={assistant.assistant_name}
          />
        </div>
      )}

      {/* TAB CONTENT: INSTALL */}
      {tab === 'install' && (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Link
              href={`/dashboard/assistants/${id}?tab=install&channel=webchat`}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                channel === 'webchat' ? 'bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20' : 'bg-white/5 text-text-soft border border-transparent hover:bg-white/10'
              }`}
            >
              Web Chat
            </Link>
            <Link
              href={`/dashboard/assistants/${id}?tab=install&channel=telegram`}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                channel === 'telegram' ? 'bg-[#0088cc]/10 text-[#0088cc] border border-[#0088cc]/20' : 'bg-white/5 text-text-soft border border-transparent hover:bg-white/10'
              }`}
            >
              Telegram
            </Link>
            <Link
              href={`/dashboard/assistants/${id}?tab=install&channel=whatsapp`}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                channel === 'whatsapp' ? 'bg-brand-success/10 text-brand-success border border-brand-success/20' : 'bg-white/5 text-text-soft border border-transparent hover:bg-white/10'
              }`}
            >
              WhatsApp
            </Link>
          </div>
          <AssistantInstallation assistantId={assistant.id} channel={channel} planLimits={planLimits} />
        </div>
      )}

      {/* TAB CONTENT: SETTINGS (EDIT) */}
      {(tab === 'settings' || tab === 'edit') && (
        <div className="max-w-3xl bg-card-bg/80 backdrop-blur-2xl border border-card-border rounded-3xl p-8 text-center">
          <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Pencil className="w-8 h-8 text-text-soft" />
          </div>
          <h2 className="text-xl font-bold mb-2">Editar configuración</h2>
          <p className="text-text-soft mb-6">Redirigiendo a la vista de edición avanzada del asistente...</p>
          {/* Se puede integrar el formulario entero aquí o dejar que el middleware / frontend lo navegue,
              por ahora un link manual por si NextJS tardó. */}
          <Link href={`/dashboard/assistants/${id}?tab=edit`} className="gradient-btn px-6 py-3 rounded-xl font-semibold text-white">
            Abrir editor
          </Link>
        </div>
      )}

    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-text-soft shrink-0">{label}</span>
      <span className="text-right font-medium text-white/90">{value}</span>
    </div>
  )
}
