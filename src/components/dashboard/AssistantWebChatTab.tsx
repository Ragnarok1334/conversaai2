'use client'

import { useEffect, useRef } from 'react'
import { AssistantWebChatHub } from './AssistantWebChatHub'
import { AssistantCustomization } from './AssistantCustomization'
import { AssistantInstallation } from './AssistantInstallation'

interface Domain {
  id: string
  domain: string
  is_verified: boolean
  verification_status: string
  last_seen_at: string | null
}

interface Props {
  assistantId: string
  widgetConfig: any
  domains: Domain[]
  conversationsCount: number
  leadsCount: number
  currentPlan: string
  planLimits: any
  effectivePlanStatus: string
  initialFocus?: 'appearance' | 'install' | null
}

export function AssistantWebChatTab({
  assistantId,
  widgetConfig,
  domains,
  conversationsCount,
  leadsCount,
  currentPlan,
  planLimits,
  effectivePlanStatus,
  initialFocus
}: Props) {
  const appearanceRef = useRef<HTMLDivElement>(null)
  const installRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Scroll to the specific section if initialFocus is provided
    if (initialFocus === 'appearance' && appearanceRef.current) {
      setTimeout(() => {
        appearanceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100) // Small delay to ensure render layout is complete
    } else if (initialFocus === 'install' && installRef.current) {
      setTimeout(() => {
        installRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }
  }, [initialFocus])

  const scrollToAppearance = () => {
    appearanceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  
  const scrollToInstall = () => {
    installRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <AssistantWebChatHub 
        assistantId={assistantId}
        widgetConfig={widgetConfig}
        domains={domains}
        conversationsCount={conversationsCount}
        leadsCount={leadsCount}
        onScrollToAppearance={scrollToAppearance}
        onScrollToInstall={scrollToInstall}
      />

      <div ref={appearanceRef} className="scroll-mt-6">
        <h2 className="text-3xl font-bold text-white mb-6">Personalización del Web Chat</h2>
        <AssistantCustomization 
          assistantId={assistantId}
          initialConfig={widgetConfig || {}}
          currentPlan={currentPlan}
        />
      </div>

      <div ref={installRef} className="scroll-mt-6">
        <h2 className="text-3xl font-bold text-white mb-6 pt-8 border-t border-white/10">Instalación y Dominios</h2>
        <AssistantInstallation 
          assistantId={assistantId}
          planLimits={planLimits}
          effectivePlanStatus={effectivePlanStatus}
        />
      </div>
    </div>
  )
}
