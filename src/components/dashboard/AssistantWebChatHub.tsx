'use client'

import { CheckCircle2, ChevronRight, Clock, MessageSquare, Target } from 'lucide-react'
import Link from 'next/link'

interface Domain {
  id: string
  domain: string
  is_verified: boolean
  verification_status: string
  last_seen_at: string | null
}

interface AssistantWebChatHubProps {
  assistantId: string
  widgetConfig: any
  domains: Domain[]
  conversationsCount: number
  leadsCount: number
  onScrollToAppearance: () => void
  onScrollToInstall: () => void
}

export function AssistantWebChatHub({
  assistantId,
  widgetConfig,
  domains,
  conversationsCount,
  leadsCount,
  onScrollToAppearance,
  onScrollToInstall
}: AssistantWebChatHubProps) {
  
  const isCustomized = Boolean(widgetConfig && Object.keys(widgetConfig).length > 0)
  const hasDomain = domains.length > 0
  const isDetected = domains.some(d => d.last_seen_at !== null)
  const hasConversations = conversationsCount > 0

  return (
    <div className="bg-card-bg/60 backdrop-blur border border-white/10 rounded-3xl p-6 lg:p-8 shadow-xl mb-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Target className="w-6 h-6 text-brand-cyan" />
          Configura e instala tu Web Chat
        </h2>
        <p className="text-slate-400 mt-2">
          Personaliza cómo se verá el asistente, autoriza tu dominio e instala el script en tu sitio.
        </p>
      </div>

      <div className="grid lg:grid-cols-5 gap-4">
        {/* Step 1: Appearance */}
        <div className="relative p-5 rounded-2xl border bg-black/20 transition-all flex flex-col justify-between border-white/10 hover:border-white/20">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                isCustomized ? 'bg-brand-success/20 text-brand-success' : 'bg-brand-cyan/20 text-brand-cyan'
              }`}>
                {isCustomized ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-sm font-bold">1</span>}
              </div>
              <h3 className="font-semibold text-white">Apariencia</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              {isCustomized ? 'Web Chat personalizado.' : 'Ajusta colores y textos.'}
            </p>
          </div>
          <button 
            onClick={onScrollToAppearance}
            className={`w-full py-2 rounded-xl text-xs font-semibold transition-colors ${
              isCustomized ? 'bg-white/5 text-slate-300 hover:bg-white/10' : 'bg-brand-cyan text-slate-900 hover:bg-brand-cyan/90'
            }`}
          >
            {isCustomized ? 'Editar apariencia' : 'Personalizar Web Chat'}
          </button>
          <ChevronRight className="hidden lg:block absolute -right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
        </div>

        {/* Step 2: Domain */}
        <div className={`relative p-5 rounded-2xl border bg-black/20 transition-all flex flex-col justify-between ${
          !isCustomized ? 'opacity-50 grayscale pointer-events-none border-transparent' : 'border-white/10 hover:border-white/20'
        }`}>
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                hasDomain ? 'bg-brand-success/20 text-brand-success' : 'bg-white/10 text-slate-400'
              }`}>
                {hasDomain ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-sm font-bold">2</span>}
              </div>
              <h3 className="font-semibold text-white">Dominio</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              {hasDomain ? 'Dominio autorizado.' : 'Indica dónde se instalará.'}
            </p>
          </div>
          <button 
            onClick={onScrollToInstall}
            className={`w-full py-2 rounded-xl text-xs font-semibold transition-colors ${
              hasDomain ? 'bg-white/5 text-slate-300 hover:bg-white/10' : 'bg-brand-cyan text-slate-900 hover:bg-brand-cyan/90'
            }`}
          >
            {hasDomain ? 'Gestionar dominios' : 'Autorizar dominio'}
          </button>
          <ChevronRight className="hidden lg:block absolute -right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
        </div>

        {/* Step 3: Script */}
        <div className={`relative p-5 rounded-2xl border bg-black/20 transition-all flex flex-col justify-between ${
          !hasDomain ? 'opacity-50 grayscale pointer-events-none border-transparent' : 'border-white/10 hover:border-white/20'
        }`}>
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                isDetected ? 'bg-brand-success/20 text-brand-success' : 'bg-white/10 text-slate-400'
              }`}>
                {isDetected ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-sm font-bold">3</span>}
              </div>
              <h3 className="font-semibold text-white">Instalación</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              {isDetected ? 'Script copiado.' : 'Copia e instala el script.'}
            </p>
          </div>
          <button 
            onClick={onScrollToInstall}
            className={`w-full py-2 rounded-xl text-xs font-semibold transition-colors ${
              isDetected ? 'bg-white/5 text-slate-300 hover:bg-white/10' : 'bg-brand-cyan text-slate-900 hover:bg-brand-cyan/90'
            }`}
          >
            {isDetected ? 'Ver código' : 'Copiar script'}
          </button>
          <ChevronRight className="hidden lg:block absolute -right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
        </div>

        {/* Step 4: Verification */}
        <div className={`relative p-5 rounded-2xl border bg-black/20 transition-all flex flex-col justify-between ${
          !hasDomain ? 'opacity-50 grayscale pointer-events-none border-transparent' : 'border-white/10 hover:border-white/20'
        }`}>
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                isDetected ? 'bg-brand-success/20 text-brand-success' : 'bg-amber-500/20 text-amber-500'
              }`}>
                {isDetected ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
              </div>
              <h3 className="font-semibold text-white">Verificación</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              {isDetected ? 'Instalación confirmada.' : 'Esperando detección...'}
            </p>
          </div>
          <button 
            onClick={onScrollToInstall}
            className={`w-full py-2 rounded-xl text-xs font-semibold transition-colors ${
              isDetected ? 'bg-white/5 text-slate-300 hover:bg-white/10' : 'bg-amber-500 text-amber-950 hover:bg-amber-400'
            }`}
          >
            {isDetected ? 'Verificado' : 'Verificar instalación'}
          </button>
          <ChevronRight className="hidden lg:block absolute -right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
        </div>

        {/* Step 5: Test / Conversations */}
        <div className={`relative p-5 rounded-2xl border bg-black/20 transition-all flex flex-col justify-between ${
          !isDetected ? 'opacity-50 grayscale pointer-events-none border-transparent' : 'border-brand-violet/30 hover:border-brand-violet/50'
        }`}>
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                hasConversations ? 'bg-brand-violet/20 text-brand-violet' : 'bg-white/10 text-slate-400'
              }`}>
                {hasConversations ? <MessageSquare className="w-4 h-4" /> : <span className="text-sm font-bold">5</span>}
              </div>
              <h3 className="font-semibold text-white">Conversaciones</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              {hasConversations ? `${conversationsCount} chats recibidos.` : 'Esperando primer chat.'}
            </p>
          </div>
          <Link 
            href={`/dashboard/assistants/${assistantId}?tab=test`}
            className="w-full flex items-center justify-center py-2 rounded-xl bg-brand-violet text-white text-xs font-semibold transition-colors hover:bg-brand-violet/90"
          >
            Probar asistente
          </Link>
        </div>
      </div>
    </div>
  )
}
