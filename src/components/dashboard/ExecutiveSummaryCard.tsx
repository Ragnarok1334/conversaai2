import React from 'react'
import Link from 'next/link'
import { Sparkles, Settings, Rocket, Activity, AlertTriangle, ArrowUpRight, CheckCircle2 } from 'lucide-react'

export interface ExecutiveSummary {
  status: 'empty' | 'setup' | 'ready' | 'active' | 'attention'
  title: string
  message: string
  highlights: {
    label: string
    value: string
    status: 'success' | 'warning' | 'neutral' | 'danger' | 'attention'
  }[]
  nextStep: {
    title: string
    description: string
    cta: string
    href: string
  }
}

interface Props {
  summary: ExecutiveSummary
}

export function ExecutiveSummaryCard({ summary }: Props) {
  const getStatusConfig = () => {
    switch (summary.status) {
      case 'empty':
        return {
          icon: <Sparkles className="w-6 h-6 text-brand-cyan" />,
          borderColor: 'border-brand-cyan/30',
          bgColor: 'bg-brand-cyan/5',
          glowColor: 'bg-brand-cyan/20',
          gradient: 'from-brand-cyan/10 to-transparent'
        }
      case 'setup':
        return {
          icon: <Settings className="w-6 h-6 text-brand-violet" />,
          borderColor: 'border-brand-violet/30',
          bgColor: 'bg-brand-violet/5',
          glowColor: 'bg-brand-violet/20',
          gradient: 'from-brand-violet/10 to-transparent'
        }
      case 'ready':
        return {
          icon: <Rocket className="w-6 h-6 text-brand-blue" />,
          borderColor: 'border-brand-blue/30',
          bgColor: 'bg-brand-blue/5',
          glowColor: 'bg-brand-blue/20',
          gradient: 'from-brand-blue/10 to-transparent'
        }
      case 'active':
        return {
          icon: <Activity className="w-6 h-6 text-brand-success" />,
          borderColor: 'border-brand-success/30',
          bgColor: 'bg-brand-success/5',
          glowColor: 'bg-brand-success/20',
          gradient: 'from-brand-success/10 to-transparent'
        }
      case 'attention':
        return {
          icon: <AlertTriangle className="w-6 h-6 text-brand-pink" />,
          borderColor: 'border-brand-pink/30',
          bgColor: 'bg-brand-pink/5',
          glowColor: 'bg-brand-pink/20',
          gradient: 'from-brand-pink/10 to-transparent'
        }
    }
  }

  const config = getStatusConfig()

  return (
    <div className={`relative overflow-hidden rounded-[2rem] border ${config.borderColor} bg-card-bg/80 backdrop-blur-2xl p-6 md:p-8 flex flex-col h-full`}>
      {/* Background glow */}
      <div className={`absolute top-0 left-0 w-full h-32 bg-gradient-to-b ${config.gradient} opacity-50 pointer-events-none`} />
      <div className={`absolute -top-10 -right-10 w-40 h-40 rounded-full ${config.glowColor} blur-[60px] pointer-events-none`} />

      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-start gap-4 mb-5">
          <div className={`p-3 rounded-2xl ${config.bgColor} border ${config.borderColor} shrink-0`}>
            {config.icon}
          </div>
          <div className="pt-1">
            <h2 className="text-xl font-bold text-white leading-tight mb-1">{summary.title}</h2>
            <p className="text-sm text-text-secondary leading-relaxed">{summary.message}</p>
          </div>
        </div>

        {/* Highlights */}
        <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-5 gap-3 mb-6">
          {summary.highlights.map((h, i) => {
            const isDanger = h.status === 'danger' || h.status === 'attention'
            const isWarning = h.status === 'warning'
            const isSuccess = h.status === 'success'
            
            const badgeColor = isDanger 
              ? 'bg-brand-pink/10 border-brand-pink/20 text-brand-pink' 
              : isWarning 
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                : isSuccess
                  ? 'bg-brand-success/10 border-brand-success/20 text-brand-success'
                  : 'bg-white/[0.04] border-white/10 text-white'

            return (
              <div key={i} className="flex flex-col gap-1 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <span className="text-[10px] uppercase font-bold text-text-soft tracking-wider">{h.label}</span>
                <span className={`text-xs font-semibold px-2 py-1 rounded-lg border ${badgeColor} inline-block w-max`}>
                  {h.value}
                </span>
              </div>
            )
          })}
        </div>

        {/* CTA Section */}
        <div className={`mt-auto p-4 rounded-2xl ${config.bgColor} border ${config.borderColor} flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4`}>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 opacity-70" />
              {summary.nextStep.title}
            </h3>
            <p className="text-xs text-text-soft mt-0.5 ml-6">{summary.nextStep.description}</p>
          </div>
          <Link
            href={summary.nextStep.href}
            className={`shrink-0 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all border
              ${summary.status === 'attention' 
                ? 'bg-brand-pink text-white hover:bg-brand-pink/90 border-transparent shadow-[0_0_15px_rgba(236,72,153,0.3)]'
                : 'bg-white/10 text-white hover:bg-white/15 border-white/10'
              }
            `}
          >
            {summary.nextStep.cta} <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
