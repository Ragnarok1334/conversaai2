'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Crown, Zap, Loader2, Bot, MessageSquare, Briefcase, Building } from 'lucide-react'
import Link from 'next/link'
import type { UserSubscription, PlanConfig } from '@/lib/plans'
import { getPlanConfig, isUnlimited, formatLimit, getChannelLabel } from '@/lib/plans'

export function PlanUsageCard() {
  const [data, setData] = useState<{
    subscription: UserSubscription
    planConfig: PlanConfig
    usage: {
      assistantsUsed: number
      messagesUsed: number
      messagesPercentage: number
      assistantsPercentage: number
    }
  } | null>(null)
  
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/subscription')
      .then((res) => res.json())
      .then((d) => {
        if (!d.error) setData(d)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="bg-card-bg/60 backdrop-blur-2xl border border-card-border rounded-3xl p-8 flex items-center justify-center min-h-[180px]">
        <Loader2 className="w-8 h-8 text-brand-violet animate-spin" />
      </div>
    )
  }

  if (!data) return null

  const { subscription, planConfig, usage } = data
  const isPremium = subscription.plan !== 'free'

  const getPlanIcon = () => {
    switch(subscription.plan) {
      case 'pro': return <Crown className="w-4 h-4" />
      case 'business': return <Briefcase className="w-4 h-4" />
      case 'enterprise': return <Building className="w-4 h-4" />
      default: return <Sparkles className="w-4 h-4" />
    }
  }

  return (
    <div className={`relative overflow-hidden rounded-[2rem] border ${isPremium ? 'border-brand-violet/30' : 'border-card-border'} bg-card-bg/80 backdrop-blur-2xl p-6 md:p-8`}>
      {isPremium && (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(124,58,237,0.15),transparent_60%)] pointer-events-none" />
      )}
      
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 relative z-10">
        
        {/* Left: Plan Info */}
        <div className="space-y-3 min-w-[200px]">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold">Tu Plan</h2>
            <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
              isPremium 
                ? 'bg-gradient-to-r from-brand-violet to-brand-blue text-white shadow-[0_0_15px_rgba(124,58,237,0.5)]'
                : 'bg-white/10 text-text-main border border-white/10'
            }`}>
              {getPlanIcon()}
              {planConfig.label}
            </div>
            {subscription.status !== 'active' && (
              <span className="px-2 py-1 rounded-full text-xs font-semibold bg-brand-pink/20 text-brand-pink border border-brand-pink/30">
                Inactivo
              </span>
            )}
          </div>
          <p className="text-sm text-text-soft">
            {planConfig.description}
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            {planConfig.channels.map(c => (
              <span key={c} className="text-xs px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.08] text-text-secondary">
                {getChannelLabel(c)}
              </span>
            ))}
          </div>
        </div>

        {/* Center: Usage Metrics */}
        <div className="flex-1 w-full grid sm:grid-cols-2 gap-6 lg:border-l lg:border-white/[0.08] lg:pl-8">
          
          {/* Messages */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 text-sm">
              <div className="flex items-center gap-1.5 text-text-secondary whitespace-nowrap">
                <MessageSquare className="w-4 h-4" />
                <span className="font-medium">Mensajes</span>
              </div>
              <span className={`whitespace-nowrap ${usage.messagesPercentage > 90 ? 'text-brand-pink font-semibold' : 'text-text-main font-medium'}`}>
                {usage.messagesUsed.toLocaleString()} <span className="text-text-soft font-normal">/ {formatLimit(planConfig.messagesLimit)}</span>
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-white/[0.04] overflow-hidden border border-white/[0.05]">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${usage.messagesPercentage}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className={`h-full rounded-full ${usage.messagesPercentage > 90 ? 'bg-brand-pink' : 'bg-gradient-to-r from-brand-violet via-brand-blue to-brand-cyan'}`}
              />
            </div>
          </div>

          {/* Assistants */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 text-sm">
              <div className="flex items-center gap-1.5 text-text-secondary whitespace-nowrap">
                <Bot className="w-4 h-4" />
                <span className="font-medium">Asistentes</span>
              </div>
              <span className={`whitespace-nowrap ${usage.assistantsPercentage > 90 ? 'text-brand-pink font-semibold' : 'text-text-main font-medium'}`}>
                {usage.assistantsUsed} <span className="text-text-soft font-normal">/ {formatLimit(planConfig.assistantsLimit)}</span>
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-white/[0.04] overflow-hidden border border-white/[0.05]">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${usage.assistantsPercentage}%` }}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
                className={`h-full rounded-full ${usage.assistantsPercentage > 90 ? 'bg-brand-pink' : 'bg-gradient-to-r from-brand-violet via-brand-blue to-brand-cyan'}`}
              />
            </div>
          </div>

        </div>

        {/* Right: Actions */}
        <div className="flex-shrink-0 w-full lg:w-auto lg:border-l lg:border-white/[0.08] lg:pl-8">
          {subscription.plan === 'free' ? (
            <Link href="/precios" className="w-full relative group overflow-hidden rounded-xl p-[1px] block">
              <span className="absolute inset-0 bg-gradient-to-r from-brand-violet via-brand-cyan to-brand-violet opacity-70 group-hover:opacity-100 transition-opacity duration-300 rounded-xl" />
              <div className="relative bg-background px-6 py-3 rounded-xl flex items-center justify-center gap-2 group-hover:bg-opacity-0 transition-all duration-300">
                <Zap className="w-4 h-4 text-brand-cyan group-hover:text-white transition-colors" />
                <span className="text-sm font-bold text-white">Mejorar plan</span>
              </div>
            </Link>
          ) : subscription.plan === 'enterprise' ? (
            <button className="w-full px-6 py-3 rounded-xl bg-white/[0.04] border border-white/[0.1] hover:bg-white/[0.08] transition-colors text-sm font-medium text-text-secondary">
              Contactar soporte
            </button>
          ) : (
            <button className="w-full px-6 py-3 rounded-xl bg-white/[0.04] border border-white/[0.1] hover:bg-white/[0.08] transition-colors text-sm font-medium text-text-secondary">
              Administrar facturación
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
