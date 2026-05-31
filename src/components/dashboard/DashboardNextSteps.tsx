'use client'

import { ChevronRight, Bot, Globe, Send, MessageCircle, CreditCard, TrendingUp, AlertCircle } from 'lucide-react'
import Link from 'next/link'

interface Props {
  assistantCount: number
  leadCount: number
  planKey: string
  channels: {
    webchat: string
    telegram: string
    whatsapp: string
  }
  usage: {
    assistantsUsed: number
    assistantsLimit: number | null
    messagesPercentage: number
  }
  recentAssistants: { id: string }[]
}

interface Step {
  id: string
  icon: React.ElementType
  iconColor: string
  iconBg: string
  title: string
  description: string
  cta: string
  href: string
  urgent?: boolean
}

export function DashboardNextSteps({ assistantCount, leadCount, planKey, channels, usage, recentAssistants }: Props) {
  const steps: Step[] = []
  const firstAssistantId = recentAssistants[0]?.id ?? null

  // 1. No assistants → create first one
  if (assistantCount === 0) {
    steps.push({
      id: 'create-assistant',
      icon: Bot,
      iconColor: 'text-brand-violet',
      iconBg: 'bg-brand-violet/10',
      title: 'Crea tu primer asistente',
      description: 'Configura un asistente IA en minutos y empieza a responder clientes automáticamente.',
      cta: 'Crear asistente',
      href: '/dashboard/create-assistant',
    })
  }

  // 2. Has assistants but webchat is not yet installed
  if (assistantCount > 0 && channels.webchat === 'pending' && firstAssistantId) {
    steps.push({
      id: 'install-webchat',
      icon: Globe,
      iconColor: 'text-brand-cyan',
      iconBg: 'bg-brand-cyan/10',
      title: 'Instala tu Web Chat',
      description: 'Tu asistente está listo. Agrega el widget a tu sitio web para empezar a recibir consultas.',
      cta: 'Ver instalación',
      href: `/dashboard/assistants/${firstAssistantId}?tab=install&channel=webchat`,
    })
  }

  // 3. Telegram status
  if (channels.telegram === 'pending' && firstAssistantId) {
    steps.push({
      id: 'setup-telegram',
      icon: Send,
      iconColor: 'text-[#0088cc]',
      iconBg: 'bg-[#0088cc]/10',
      title: 'Configura Telegram',
      description: 'Tu plan incluye Telegram. Conecta tu bot para responder mensajes automáticamente.',
      cta: 'Configurar',
      href: `/dashboard/assistants/${firstAssistantId}?tab=install&channel=telegram`,
    })
  } else if (channels.telegram === 'locked') {
    steps.push({
      id: 'unlock-telegram',
      icon: Send,
      iconColor: 'text-slate-400',
      iconBg: 'bg-slate-800/60',
      title: 'Telegram disponible desde Pro',
      description: 'Actualiza tu plan para conectar tu bot de Telegram y llegar a más clientes.',
      cta: 'Ver planes',
      href: '/dashboard/billing',
    })
  }

  // 4. No leads yet
  if (assistantCount > 0 && leadCount === 0) {
    steps.push({
      id: 'get-leads',
      icon: MessageCircle,
      iconColor: 'text-brand-pink',
      iconBg: 'bg-brand-pink/10',
      title: 'Prueba tu asistente para captar prospectos',
      description: 'Cuando un visitante comparte su nombre, correo o teléfono, se registra automáticamente como lead.',
      cta: 'Probar asistente',
      href: firstAssistantId ? `/dashboard/assistants/${firstAssistantId}` : '/dashboard/assistants',
    })
  }

  // 5. Near message limit
  if (usage.messagesPercentage >= 80) {
    steps.push({
      id: 'upgrade-messages',
      icon: AlertCircle,
      iconColor: 'text-amber-400',
      iconBg: 'bg-amber-400/10',
      title: 'Tu consumo de mensajes está cerca del límite',
      description: `Llevas el ${usage.messagesPercentage}% de tus mensajes este ciclo.`,
      cta: planKey === 'business' || planKey === 'enterprise' ? 'Administrar' : 'Mejorar plan',
      href: '/dashboard/billing',
      urgent: true,
    })
  }

  // 6. Assistants at limit
  if (usage.assistantsLimit && usage.assistantsUsed >= usage.assistantsLimit) {
    steps.push({
      id: 'upgrade-assistants',
      icon: CreditCard,
      iconColor: 'text-amber-400',
      iconBg: 'bg-amber-400/10',
      title: 'Alcanzaste el límite de asistentes',
      description: `Tu plan permite hasta ${usage.assistantsLimit} asistentes. Para crear más, actualiza tu plan.`,
      cta: planKey === 'business' || planKey === 'enterprise' ? 'Administrar' : 'Mejorar plan',
      href: '/dashboard/billing',
      urgent: true,
    })
  }

  // 7. WhatsApp coming soon info card (don't add CTA if 0 other steps)
  const whatsappStep: Step = {
    id: 'whatsapp-soon',
    icon: MessageCircle,
    iconColor: 'text-brand-success/50',
    iconBg: 'bg-brand-success/5',
    title: 'WhatsApp — Próximamente',
    description: 'Estamos trabajando en la integración con WhatsApp Business. Estarás entre los primeros en saberlo.',
    cta: 'Ver planes',
    href: '/precios',
  }

  // Only show whatsapp step if fewer than 2 other steps
  const displaySteps = steps.slice(0, 3)
  if (displaySteps.length < 3) displaySteps.push(whatsappStep)

  if (displaySteps.length === 0) return null

  return (
    <div className="bg-card-bg/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-5">
        <TrendingUp className="w-4 h-4 text-brand-cyan" />
        <h2 className="text-base font-semibold text-white">Próximos pasos recomendados</h2>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {displaySteps.map((step) => (
          <div
            key={step.id}
            className={`rounded-xl p-4 border transition-colors ${
              step.urgent
                ? 'bg-amber-500/5 border-amber-500/20'
                : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12]'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg ${step.iconBg} flex items-center justify-center mb-3`}>
              <step.icon className={`w-4 h-4 ${step.iconColor}`} />
            </div>
            <p className="text-sm font-semibold text-white mb-1">{step.title}</p>
            <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">{step.description}</p>
            <Link
              href={step.href}
              className={`inline-flex items-center gap-1 text-xs font-semibold transition-colors ${
                step.urgent ? 'text-amber-400 hover:text-amber-300' : 'text-brand-cyan hover:text-brand-cyan/80'
              }`}
            >
              {step.cta} <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}
