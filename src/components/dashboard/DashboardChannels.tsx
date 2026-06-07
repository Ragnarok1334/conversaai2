'use client'

import { Globe, Send, MessageCircle, CheckCircle2, Clock, Lock, ExternalLink } from 'lucide-react'
import Link from 'next/link'

interface Props {
  channels: {
    webchat: string   // 'connected' | 'pending'
    telegram: string  // 'connected' | 'pending' | 'locked'
    whatsapp: string  // always 'coming_soon'
  }
  planKey: string
  firstAssistantId?: string
}

interface ChannelConfig {
  key: string
  name: string
  icon: React.ElementType
  iconColor: string
  description: string
  status: string
  statusLabel: string
  statusColor: string
  statusIcon: React.ElementType
  ctaLabel?: string
  ctaHref?: string
  disabled?: boolean
}

export function DashboardChannels({ channels, planKey, firstAssistantId }: Props) {
  const channelList: ChannelConfig[] = [
    {
      key: 'webchat',
      name: 'Web Chat',
      icon: Globe,
      iconColor: 'text-brand-cyan',
      description: 
        channels.webchat === 'installed' ? 'Detectado recientemente en tu sitio.'
        : channels.webchat === 'pending' ? 'El dominio está autorizado, falta detectar el script.'
        : 'Agrega el dominio donde instalarás el widget.',
      status: channels.webchat,
      statusLabel:
        channels.webchat === 'installed' ? 'Instalado'
        : channels.webchat === 'pending' ? 'Pendiente'
        : channels.webchat === 'blocked' ? 'Bloqueado'
        : 'Falta dominio',
      statusColor:
        channels.webchat === 'installed' ? 'text-brand-success'
        : channels.webchat === 'pending' ? 'text-amber-400'
        : channels.webchat === 'blocked' ? 'text-brand-pink'
        : 'text-slate-400',
      statusIcon:
        channels.webchat === 'installed' ? CheckCircle2
        : channels.webchat === 'blocked' ? Lock
        : Clock,
      ctaLabel:
        channels.webchat === 'installed' ? 'Ver instalación'
        : channels.webchat === 'pending' ? 'Copiar script'
        : channels.webchat === 'blocked' ? 'Revisar dominios'
        : 'Agregar dominio',
      ctaHref: firstAssistantId
        ? `/dashboard/assistants/${firstAssistantId}?tab=install&channel=webchat`
        : '/dashboard/create-assistant',
    },
    {
      key: 'telegram',
      name: 'Telegram',
      icon: Send,
      iconColor: channels.telegram === 'locked' ? 'text-slate-500' : 'text-[#0088cc]',
      description: channels.telegram === 'locked'
        ? 'Disponible desde el plan Pro.'
        : 'Conecta tu bot de Telegram.',
      status: channels.telegram,
      statusLabel:
        channels.telegram === 'connected' ? 'Conectado'
        : channels.telegram === 'locked' ? 'No incluido en tu plan'
        : 'Pendiente de configurar',
      statusColor:
        channels.telegram === 'connected' ? 'text-brand-success'
        : channels.telegram === 'locked' ? 'text-slate-500'
        : 'text-amber-400',
      statusIcon:
        channels.telegram === 'connected' ? CheckCircle2
        : channels.telegram === 'locked' ? Lock
        : Clock,
      ctaLabel:
        channels.telegram === 'locked' ? 'Ver planes'
        : channels.telegram === 'connected' ? 'Ver configuración'
        : 'Configurar',
      ctaHref:
        channels.telegram === 'locked' ? '/dashboard/billing'
        : firstAssistantId
          ? `/dashboard/assistants/${firstAssistantId}?tab=install&channel=telegram`
          : '/dashboard/assistants',
      disabled: channels.telegram === 'locked',
    },
    {
      key: 'whatsapp',
      name: 'WhatsApp',
      icon: MessageCircle,
      iconColor: 'text-slate-500',
      description: 'Integración con WhatsApp Business en desarrollo.',
      status: 'coming_soon',
      statusLabel: 'Próximamente',
      statusColor: 'text-slate-500',
      statusIcon: Clock,
      disabled: true,
    },
  ]

  return (
    <div className="bg-card-bg/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
      <h2 className="text-base font-semibold text-white mb-5">Canales e integraciones</h2>
      <div className="space-y-3">
        {channelList.map((ch) => {
          const StatusIcon = ch.statusIcon
          return (
            <div
              key={ch.key}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                ch.disabled
                  ? 'bg-white/[0.01] border-white/[0.04] opacity-60'
                  : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.1]'
              }`}
            >
              <div className={`w-9 h-9 rounded-xl ${ch.disabled ? 'bg-white/[0.04]' : 'bg-white/[0.06]'} flex items-center justify-center flex-shrink-0`}>
                <ch.icon className={`w-4 h-4 ${ch.iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{ch.name}</p>
                <p className="text-[11px] text-slate-500">{ch.description}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className={`flex items-center gap-1 text-[10px] font-semibold ${ch.statusColor}`}>
                  <StatusIcon className="w-3 h-3" />
                  {ch.statusLabel}
                </div>
                {ch.ctaHref && !ch.disabled && (
                  <Link
                    href={ch.ctaHref}
                    className="inline-flex items-center gap-1 text-[10px] font-semibold text-brand-cyan hover:text-brand-cyan/80 transition-colors ml-1 border border-brand-cyan/20 rounded-md px-2 py-1"
                  >
                    {ch.ctaLabel} <ExternalLink className="w-2.5 h-2.5" />
                  </Link>
                )}
                {ch.ctaHref && ch.disabled && ch.key === 'telegram' && (
                  <Link
                    href={ch.ctaHref}
                    className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400 hover:text-slate-300 transition-colors ml-1 border border-white/10 rounded-md px-2 py-1"
                  >
                    {ch.ctaLabel}
                  </Link>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
