import { Sparkles, Crown, Zap, Bot, MessageSquare, Briefcase, Building } from 'lucide-react'
import Link from 'next/link'
import { formatLimit, getChannelLabel } from '@/lib/plans'

interface Props {
  plan: {
    key: string
    label: string
    status: string
    channels: string[]
    description: string
  }
  usage: {
    assistantsUsed: number
    assistantsLimit: number | null
    messagesUsed: number
    messagesLimit: number | null
    messagesPercentage: number
    assistantsPercentage: number
  }
}

export function PlanUsageCard({ plan, usage }: Props) {
  const isPremium = plan?.key !== 'free'
  const messagesPct = usage?.messagesPercentage ?? 0;
  const assistantsPct = usage?.assistantsPercentage ?? 0;
  const messagesUsed = usage?.messagesUsed ?? 0;
  const assistantsUsed = usage?.assistantsUsed ?? 0;
  const messagesLimit = usage?.messagesLimit ?? null;
  const assistantsLimit = usage?.assistantsLimit ?? null;

  const getPlanIcon = () => {
    switch (plan.key) {
      case 'pro': return <Crown className="w-3.5 h-3.5" />
      case 'business': return <Briefcase className="w-3.5 h-3.5" />
      case 'enterprise': return <Building className="w-3.5 h-3.5" />
      default: return <Sparkles className="w-3.5 h-3.5" />
    }
  }

  return (
    <div className={`relative overflow-hidden rounded-[2rem] border ${isPremium ? 'border-brand-violet/30' : 'border-card-border'} bg-card-bg/80 backdrop-blur-2xl w-full`}>
      {isPremium && (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(124,58,237,0.15),transparent_60%)] pointer-events-none" />
      )}

      {/* Outer padding wrapper */}
      <div className="relative z-10 p-6 md:p-8">

        {/* === TOP ROW: Plan label + badge + status === */}
        <div className="flex flex-wrap items-center gap-3 mb-1">
          <h2 className="text-xl font-bold text-white whitespace-nowrap">Tu Plan</h2>
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
            isPremium
              ? 'bg-gradient-to-r from-brand-violet to-brand-blue text-white shadow-[0_0_12px_rgba(124,58,237,0.5)]'
              : 'bg-white/10 text-white border border-white/10'
          }`}>
            {getPlanIcon()}
            {plan.label}
          </div>
          {plan.status !== 'active' && (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-brand-pink/20 text-brand-pink border border-brand-pink/30 whitespace-nowrap">
              Inactivo
            </span>
          )}
        </div>

        {/* Description */}
        <p className="text-sm text-text-soft mb-3">
          {plan.description}
        </p>

        {/* Channels */}
        <div className="flex flex-wrap gap-2 mb-6">
          {plan.channels.map(c => (
            <span key={c} className="text-xs px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.08] text-text-secondary">
              {getChannelLabel(c)}
            </span>
          ))}
        </div>

        {/* === BOTTOM ROW: Metrics + Button === */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-5">

          {/* Metrics area */}
          <div className="flex-1 grid grid-cols-1 xs:grid-cols-2 gap-x-8 gap-y-4 min-w-0">

            {/* Messages metric */}
            <div className="space-y-2 min-w-0">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 text-text-secondary text-xs font-medium whitespace-nowrap">
                  <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                  Mensajes del ciclo
                </div>
                <span className={`text-xs font-semibold whitespace-nowrap ${messagesPct > 90 ? 'text-brand-pink' : 'text-white'}`}>
                  {messagesUsed.toLocaleString()}
                  <span className="text-text-soft font-normal"> / {formatLimit(messagesLimit)}</span>
                </span>
              </div>
              <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${messagesPct > 90 ? 'bg-brand-pink' : 'bg-gradient-to-r from-brand-violet via-brand-blue to-brand-cyan'}`}
                  style={{ width: `${Math.min(messagesPct, 100)}%` }}
                />
              </div>
            </div>

            {/* Assistants metric */}
            <div className="space-y-2 min-w-0">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 text-text-secondary text-xs font-medium whitespace-nowrap">
                  <Bot className="w-3.5 h-3.5 shrink-0" />
                  Asistentes creados
                </div>
                <span className={`text-xs font-semibold whitespace-nowrap ${assistantsPct > 90 ? 'text-brand-pink' : 'text-white'}`}>
                  {assistantsUsed}
                  <span className="text-text-soft font-normal"> / {formatLimit(assistantsLimit)}</span>
                </span>
              </div>
              <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${assistantsPct > 90 ? 'bg-brand-pink' : 'bg-gradient-to-r from-brand-violet via-brand-blue to-brand-cyan'}`}
                  style={{ width: `${Math.min(assistantsPct, 100)}%` }}
                />
              </div>
            </div>

          </div>

          {/* Action button */}
          <div className="sm:ml-6 shrink-0 mt-2 sm:mt-0">
            {plan.key === 'free' ? (
              <Link
                href="/dashboard/billing#plan-business"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-violet to-brand-blue text-white text-sm font-semibold shadow-[0_0_15px_rgba(124,58,237,0.4)] hover:shadow-[0_0_25px_rgba(124,58,237,0.6)] hover:scale-[1.02] transition-all duration-200 whitespace-nowrap border-0 w-full sm:w-auto"
              >
                <Zap className="w-4 h-4 shrink-0" />
                Mejorar a Business
              </Link>
            ) : plan.key === 'enterprise' ? (
              <Link href="/contact" className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] transition-colors text-sm font-medium text-text-secondary whitespace-nowrap w-full sm:w-auto">
                Contactar soporte
              </Link>
            ) : (
              <Link
                href="/dashboard/billing"
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] transition-colors text-sm font-medium text-text-secondary whitespace-nowrap w-full sm:w-auto"
              >
                Administrar facturación
              </Link>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
