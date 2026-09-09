'use client'

import { CheckCircle2, CircleDashed, Globe2, MessageSquare, Palette, Rocket, Users } from 'lucide-react'

interface Domain { is_verified: boolean; last_seen_at: string | null }
interface Props {
  widgetConfig: Record<string, unknown> | null
  domains: Domain[]
  conversationsCount: number
  leadsCount: number
  activeSection: 'design' | 'install'
  onSectionChange: (section: 'design' | 'install') => void
}

export function AssistantWebChatHub({ widgetConfig, domains, conversationsCount, leadsCount, activeSection, onSectionChange }: Props) {
  const customized = Boolean(widgetConfig && Object.keys(widgetConfig).length)
  const domain = domains.length > 0
  const installed = domains.some(item => item.is_verified && Boolean(item.last_seen_at))
  const completed = [customized, domain, installed].filter(Boolean).length

  const steps = [
    { label: 'Diseño', detail: customized ? 'Personalizado' : 'Pendiente', done: customized, icon: Palette, action: () => onSectionChange('design') },
    { label: 'Dominio', detail: domain ? 'Autorizado' : 'Pendiente', done: domain, icon: Globe2, action: () => onSectionChange('install') },
    { label: 'Publicado', detail: installed ? 'Detectado' : 'Sin detectar', done: installed, icon: Rocket, action: () => onSectionChange('install') },
  ]

  return (
    <section className="overflow-hidden rounded-3xl border border-card-border bg-card-bg shadow-sm">
      <div className="flex flex-col gap-5 border-b border-card-border p-5 sm:flex-row sm:items-center sm:justify-between lg:p-6">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-brand-cyan" />
            <h2 className="dashboard-strong text-xl font-bold">Web Chat</h2>
            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${installed ? 'border-emerald-500/25 bg-emerald-500/10 text-brand-success' : 'border-amber-500/25 bg-amber-500/10 text-amber-500'}`}>
              {installed ? 'En línea' : 'En configuración'}
            </span>
          </div>
          <p className="dashboard-muted text-sm">Personaliza el chat y publícalo en tu sitio sin perderte entre opciones.</p>
        </div>
        <div className="min-w-[180px]">
          <div className="mb-2 flex justify-between text-xs"><span className="dashboard-muted">Progreso</span><strong className="dashboard-strong">{completed}/3 listo</strong></div>
          <div className="h-2 overflow-hidden rounded-full bg-black/10"><div className="h-full rounded-full bg-gradient-to-r from-brand-violet to-brand-cyan transition-all" style={{ width: `${(completed / 3) * 100}%` }} /></div>
        </div>
      </div>

      <div className="grid gap-3 p-5 sm:grid-cols-3 lg:p-6">
        {steps.map(({ label, detail, done, icon: Icon, action }) => (
          <button key={label} type="button" onClick={action} className={`group flex cursor-pointer items-center gap-3 rounded-2xl border p-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-brand-cyan/40 ${activeSection === (label === 'Diseño' ? 'design' : 'install') ? 'border-brand-violet/30 bg-brand-violet/5' : 'border-card-border'}`}>
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${done ? 'bg-emerald-500/10 text-brand-success' : 'bg-amber-500/10 text-amber-500'}`}><Icon className="h-4 w-4" /></span>
            <span className="min-w-0"><strong className="dashboard-strong block text-sm">{label}</strong><small className="dashboard-muted">{detail}</small></span>
            {done ? <CheckCircle2 className="ml-auto h-4 w-4 text-brand-success" /> : <CircleDashed className="ml-auto h-4 w-4 text-amber-500" />}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 border-t border-card-border">
        <div className="flex items-center gap-3 p-4 lg:px-6"><MessageSquare className="h-4 w-4 text-brand-violet" /><div><strong className="dashboard-strong block text-sm">{conversationsCount}</strong><span className="dashboard-muted text-xs">conversaciones</span></div></div>
        <div className="flex items-center gap-3 border-l border-card-border p-4 lg:px-6"><Users className="h-4 w-4 text-brand-cyan" /><div><strong className="dashboard-strong block text-sm">{leadsCount}</strong><span className="dashboard-muted text-xs">leads captados</span></div></div>
      </div>
    </section>
  )
}
