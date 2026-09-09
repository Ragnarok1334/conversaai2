'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Code2, Palette, Settings2 } from 'lucide-react'
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
  assistantName: string
  businessName: string
  widgetConfig: Record<string, unknown> | null
  domains: Domain[]
  conversationsCount: number
  leadsCount: number
  currentPlan: string
  planLimits: unknown
  effectivePlanStatus: string
  initialFocus?: 'appearance' | 'install' | null
}

export function AssistantWebChatTab({
  assistantId, assistantName, businessName, widgetConfig, domains,
  conversationsCount, leadsCount, currentPlan, planLimits,
  effectivePlanStatus, initialFocus
}: Props) {
  const [section, setSection] = useState<'design' | 'install'>(initialFocus === 'install' ? 'install' : 'design')

  useEffect(() => {
    if (initialFocus) setSection(initialFocus === 'install' ? 'install' : 'design')
  }, [initialFocus])

  const isCustomized = Boolean(widgetConfig && Object.keys(widgetConfig).length > 0)
  const isInstalled = domains.some(domain => Boolean(domain.last_seen_at) && domain.is_verified)

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      <AssistantWebChatHub
        widgetConfig={widgetConfig}
        domains={domains}
        conversationsCount={conversationsCount}
        leadsCount={leadsCount}
        activeSection={section}
        onSectionChange={setSection}
      />

      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-card-border bg-card-bg p-1.5 shadow-sm">
        <button type="button" onClick={() => setSection('design')} className={`flex cursor-pointer items-center justify-between rounded-xl px-4 py-3 text-left transition-all ${section === 'design' ? 'bg-gradient-to-r from-brand-violet to-brand-cyan text-white shadow-lg' : 'dashboard-muted hover:bg-white/5'}`}>
          <span className="flex items-center gap-3"><Palette className="h-4 w-4" /><span><strong className="block text-sm">Diseño</strong><small className={`hidden sm:block ${section === 'design' ? 'text-white/75' : 'dashboard-muted'}`}>Textos, colores y botón</small></span></span>
          {isCustomized && <CheckCircle2 className="h-4 w-4" />}
        </button>
        <button type="button" onClick={() => setSection('install')} className={`flex cursor-pointer items-center justify-between rounded-xl px-4 py-3 text-left transition-all ${section === 'install' ? 'bg-gradient-to-r from-brand-violet to-brand-cyan text-white shadow-lg' : 'dashboard-muted hover:bg-white/5'}`}>
          <span className="flex items-center gap-3"><Code2 className="h-4 w-4" /><span><strong className="block text-sm">Instalación</strong><small className={`hidden sm:block ${section === 'install' ? 'text-white/75' : 'dashboard-muted'}`}>Dominio, código y verificación</small></span></span>
          {isInstalled ? <CheckCircle2 className="h-4 w-4" /> : <Settings2 className="h-4 w-4" />}
        </button>
      </div>

      {section === 'design' ? (
        <AssistantCustomization assistantId={assistantId} assistantName={assistantName} businessName={businessName} initialConfig={widgetConfig || {}} currentPlan={currentPlan} onContinue={() => setSection('install')} />
      ) : (
        <AssistantInstallation assistantId={assistantId} planLimits={planLimits} effectivePlanStatus={effectivePlanStatus} />
      )}
    </div>
  )
}
