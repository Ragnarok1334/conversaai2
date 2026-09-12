import { Globe, Send, MessageCircle } from 'lucide-react'
import Link from 'next/link'
import { normalizePlan, getPlanConfig } from '@/lib/plans'

type Assistant = {
  id: string
  assistant_name: string
  status: string
}

interface ChannelConnectActionsProps {
  assistants: Assistant[]
  currentPlan: string
}

export default function ChannelConnectActions({ assistants, currentPlan }: ChannelConnectActionsProps) {
  const plan = normalizePlan(currentPlan)
  const config = getPlanConfig(plan)
  
  const activeAssistant = assistants.find(a => a.status === 'active')
  const primaryAssistant = activeAssistant || assistants[0] || null

  return (
    <div className="w-full text-left mt-6">
      <h3 className="text-lg font-semibold mb-4 text-center sm:text-left">Conecta tus canales</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Web Chat */}
        <div className="bg-card-bg/50 border border-card-border p-5 rounded-2xl flex flex-col items-start gap-3 transition-colors hover:bg-white/[0.02]">
          <div className="w-10 h-10 rounded-xl gradient-btn flex items-center justify-center shadow-[0_0_20px_rgba(124,58,237,0.2)]">
            <Globe className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-sm text-white">Web Chat</h4>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-success/10 text-brand-success border border-brand-success/20">Disponible</span>
            </div>
            <p className="text-xs text-text-soft">Instala el widget en tu sitio web para empezar a recibir conversaciones.</p>
          </div>
          <div className="mt-auto pt-4 w-full">
            {primaryAssistant ? (
              <Link 
                href={`/dashboard/assistants/${primaryAssistant.id}?tab=install&channel=webchat`}
                className="block w-full text-center px-4 py-2 rounded-lg bg-white/[0.05] border border-white/[0.1] hover:bg-white/[0.1] transition-colors text-xs font-medium"
              >
                Instalar o verificar
              </Link>
            ) : (
              <Link 
                href="/dashboard/create-assistant"
                className="block w-full text-center px-4 py-2 rounded-lg bg-brand-violet text-white hover:opacity-90 transition-opacity text-xs font-medium"
              >
                Crear asistente
              </Link>
            )}
          </div>
        </div>

        {/* Telegram */}
        <div className="bg-card-bg/50 border border-card-border p-5 rounded-2xl flex flex-col items-start gap-3 transition-colors hover:bg-white/[0.02]">
          <div className="w-10 h-10 rounded-xl bg-[#2AABEE]/20 flex items-center justify-center border border-[#2AABEE]/30 shadow-[0_0_20px_rgba(42,171,238,0.1)]">
            <Send className="w-5 h-5 text-[#2AABEE]" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-sm text-white">Telegram</h4>
              {config.channels.telegram ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-success/10 text-brand-success border border-brand-success/20">Disponible</span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-violet/10 text-brand-violet border border-brand-violet/20">Disponible desde Starter</span>
              )}
            </div>
            <p className="text-xs text-text-soft">Conecta tu asistente a Telegram para atender mensajes desde tu bot.</p>
          </div>
          <div className="mt-auto pt-4 w-full">
            {config.channels.telegram ? (
              primaryAssistant ? (
                <Link 
                  href={`/dashboard/assistants/${primaryAssistant.id}?tab=install&channel=telegram`}
                  className="block w-full text-center px-4 py-2 rounded-lg bg-white/[0.05] border border-white/[0.1] hover:bg-white/[0.1] transition-colors text-xs font-medium"
                >
                  Configurar Telegram
                </Link>
              ) : (
                <Link 
                  href="/dashboard/create-assistant"
                  className="block w-full text-center px-4 py-2 rounded-lg bg-brand-violet text-white hover:opacity-90 transition-opacity text-xs font-medium"
                >
                  Crear asistente
                </Link>
              )
            ) : (
              <Link 
                href="/dashboard/billing"
                className="block w-full text-center px-4 py-2 rounded-lg bg-brand-violet text-white hover:opacity-90 transition-opacity text-xs font-medium"
              >
                Mejorar plan
              </Link>
            )}
          </div>
        </div>

        {/* WhatsApp */}
        <div className="bg-card-bg/50 border border-card-border p-5 rounded-2xl flex flex-col items-start gap-3 transition-colors hover:bg-white/[0.02]">
          <div className="w-10 h-10 rounded-xl bg-[#25D366]/10 flex items-center justify-center border border-[#25D366]/20">
            <MessageCircle className="w-5 h-5 text-[#25D366]" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-sm text-white">WhatsApp</h4>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${config.channels.whatsapp ? 'bg-brand-success/10 text-brand-success border-brand-success/20' : 'bg-brand-violet/10 text-brand-violet border-brand-violet/20'}`}>{config.channels.whatsapp ? 'Disponible' : 'Desde plan Negocio'}</span>
            </div>
            <p className="text-xs text-text-soft">Conecta WhatsApp Business Cloud API al mismo asistente e inbox.</p>
          </div>
          <div className="mt-auto pt-4 w-full">
            {config.channels.whatsapp && primaryAssistant ? <Link href={`/dashboard/assistants/${primaryAssistant.id}?tab=whatsapp`} className="block w-full rounded-lg border border-[#25D366]/25 bg-[#25D366]/10 px-4 py-2 text-center text-xs font-medium text-[#159447] hover:bg-[#25D366]/15">Configurar WhatsApp</Link> : <Link href={primaryAssistant ? '/dashboard/billing' : '/dashboard/create-assistant'} className="block w-full rounded-lg bg-brand-violet px-4 py-2 text-center text-xs font-medium text-white hover:opacity-90">{primaryAssistant ? 'Mejorar plan' : 'Crear asistente'}</Link>}
          </div>
        </div>

      </div>
    </div>
  )
}
