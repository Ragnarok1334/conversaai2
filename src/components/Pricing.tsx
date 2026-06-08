'use client'

import { useState, useEffect } from 'react'
import { Check, Sparkles, Shield, Zap, Clock, Building2 } from 'lucide-react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { PLAN_CONFIGS } from '@/lib/plans'
import { createClient } from '@/lib/supabase/client'
import { BorderBeam } from '@/components/magicui/border-beam'
import { ShimmerButton } from '@/components/magicui/shimmer-button'
import { BlurFade } from '@/components/magicui/blur-fade'


export function Pricing({ currentPlanId }: { currentPlanId?: string }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [trialUsed, setTrialUsed] = useState(false)
  const [startingTrial, setStartingTrial] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        setIsLoggedIn(true)
        const { data: profile } = await supabase
          .from('profiles')
          .select('trial_used')
          .eq('id', data.session.user.id)
          .single()
        if (profile?.trial_used) {
          setTrialUsed(true)
        }
      }
    })
  }, [])

  const corePlans = [
    PLAN_CONFIGS.starter,
    PLAN_CONFIGS.pro,
    PLAN_CONFIGS.growth,
    PLAN_CONFIGS.business
  ]
  const trialPlan = PLAN_CONFIGS.trial
  const enterprisePlan = PLAN_CONFIGS.enterprise

  const hasPaidPlan = currentPlanId && !['trial', 'free'].includes(currentPlanId)
  
  const handleStartTrial = async () => {
    if (!isLoggedIn) {
      window.location.href = '/register'
      return
    }
    
    setStartingTrial(true)
    try {
      const res = await fetch('/api/billing/trial/start', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al iniciar prueba')
      
      window.location.href = '/dashboard'
    } catch (err: any) {
      alert(err.message)
      setStartingTrial(false)
    }
  }

  return (
    <section id="precios" className="relative py-28 overflow-hidden bg-[#050816]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,rgba(124,58,237,0.18),transparent_32%),radial-gradient(circle_at_85%_80%,rgba(6,182,212,0.14),transparent_28%)]" />

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <BlurFade delay={0.2} yOffset={30}>
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.06] backdrop-blur-xl border border-white/10 mb-6">
              <Sparkles className="w-4 h-4 text-[#06B6D4]" />
              <span className="text-sm text-[#CBD5E1] font-medium">Planes flexibles</span>
            </div>

            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-[-0.03em]">
              Elige tu plan ideal
            </h2>

            <p className="text-[#94A3B8] text-lg mb-8">
              No pagas solo por mensajes. Pagas por automatizar áreas completas de tu negocio: ventas, soporte, reservas, sucursales y seguimiento de leads.
            </p>
            
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-[#CBD5E1]">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#06B6D4]" />
                <span>Cancela cuando quieras</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#06B6D4]" />
                <span>Soporte incluido</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#06B6D4]" />
                <span>Actualización inmediata</span>
              </div>
            </div>
          </div>
        </BlurFade>

        {/* TRIAL BLOCK */}
        {!hasPaidPlan && (
          <BlurFade delay={0.3} yOffset={30} className="max-w-4xl mx-auto mb-12">
            <div className="relative rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden backdrop-blur-2xl bg-white/[0.03] border border-brand-cyan/20 shadow-[0_0_40px_rgba(6,182,212,0.06)]">
              <div className="absolute inset-0 bg-gradient-to-br from-[#06B6D4]/5 to-transparent opacity-60 pointer-events-none" />
              <div className="relative z-10 flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-2xl font-bold text-white">Prueba Gratis</h3>
                  <span className="bg-brand-cyan/20 text-brand-cyan text-xs font-bold uppercase tracking-wider py-1 px-3 rounded-full">7 días</span>
                </div>
                <p className="text-[#94A3B8] text-sm max-w-lg">
                  Crea tu primer asistente y prueba el poder de ConversaAI sin ingresar tarjeta de crédito.
                </p>
              </div>
              <div className="relative z-10 shrink-0 w-full md:w-auto">
                {currentPlanId === 'trial' ? (
                  <button disabled className="w-full md:w-auto px-8 py-3 rounded-xl text-sm font-semibold bg-white/5 border border-white/10 text-white/50 cursor-not-allowed">
                    Plan activo
                  </button>
                ) : trialUsed ? (
                  <button disabled className="w-full md:w-auto px-8 py-3 rounded-xl text-sm font-semibold bg-white/5 border border-white/10 text-white/50 cursor-not-allowed">
                    Prueba ya utilizada
                  </button>
                ) : (
                  <button 
                    onClick={handleStartTrial}
                    disabled={startingTrial}
                    className="w-full md:w-auto px-8 py-3 rounded-xl text-sm font-semibold transition-all duration-300 text-center bg-brand-cyan/10 border border-brand-cyan/30 text-brand-cyan hover:bg-brand-cyan/20 hover:scale-[1.02]"
                  >
                    {startingTrial ? 'Activando...' : 'Comenzar prueba'}
                  </button>
                )}
              </div>
            </div>
          </BlurFade>
        )}

        {/* CORE PLANS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto items-stretch mb-12">
          {corePlans.map((plan, index) => {
            const isCurrentPlan = currentPlanId === plan.key;
            
            return (
              <BlurFade delay={0.4 + index * 0.1} key={plan.key} yOffset={45} className="flex flex-col h-full">
                <div
                  className={`relative h-full rounded-[2rem] p-6 sm:p-8 flex flex-col overflow-hidden backdrop-blur-2xl transition-all duration-500 hover:-translate-y-2 ${
                    plan.highlighted
                      ? 'bg-white/[0.08] shadow-[0_0_70px_rgba(124,58,237,0.24)] lg:-translate-y-4'
                      : 'bg-white/[0.05] border border-white/10 shadow-[0_0_40px_rgba(6,182,212,0.06)]'
                  }`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-[#7C3AED]/10 via-transparent to-[#06B6D4]/10 opacity-60 pointer-events-none" />
                  {plan.highlighted && <BorderBeam size={250} duration={12} delay={9} />}

                  {plan.badge && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#7C3AED] via-[#2563EB] to-[#06B6D4] text-white text-xs font-bold uppercase tracking-wider py-1 px-3 rounded-b-xl shadow-lg whitespace-nowrap">
                      {plan.badge}
                    </div>
                  )}
                  
                  {isCurrentPlan && !plan.badge && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-bold uppercase tracking-wider py-1 px-3 rounded-b-xl shadow-lg whitespace-nowrap">
                      Plan actual
                    </div>
                  )}

                  <div className="relative z-10 flex-1 flex flex-col">
                    <h3 className="text-xl font-bold text-white mb-2 pt-2">{plan.label}</h3>
                    <p className="text-[#94A3B8] text-xs min-h-[48px] mb-6 leading-relaxed">{plan.description}</p>

                    <div className="mb-6 flex flex-col sm:flex-row sm:items-baseline gap-1 min-h-[40px]">
                      <span className={`font-bold text-white leading-none text-3xl`}>
                        {plan.priceLabel}
                      </span>
                      <span className="text-[#94A3B8] text-sm">{plan.period}</span>
                    </div>

                    <div className="flex-1 space-y-6 mb-8">
                      <ul className="space-y-3.5">
                        {plan.features.map((feature, fIndex) => (
                          <li key={fIndex} className="flex items-start gap-3">
                            <Check className="w-4 h-4 text-[#22C55E] shrink-0 mt-0.5" />
                            <span className="text-[#CBD5E1] text-xs sm:text-sm leading-tight">{feature}</span>
                          </li>
                        ))}
                      </ul>

                      {plan.futureFeatures && plan.futureFeatures.length > 0 && (
                        <div className="pt-4 border-t border-white/5 flex flex-wrap gap-2">
                          {plan.futureFeatures.map((feature, fIndex) => (
                            <span key={fIndex} className="bg-white/5 border border-white/10 text-white/60 text-[10px] uppercase font-bold tracking-wider py-1 px-2 rounded-md">
                              {feature} ⏱
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {isCurrentPlan ? (
                      <button disabled className="w-full py-3.5 mt-auto rounded-xl text-sm font-semibold bg-white/5 border border-white/10 text-white/50 cursor-not-allowed">
                        Plan activo
                      </button>
                    ) : (
                      <Link
                        href={!isLoggedIn ? `/login?redirect=${encodeURIComponent('/dashboard/billing')}` : '/dashboard/billing'}
                        className="w-full mt-auto block"
                      >
                        {plan.highlighted ? (
                          <ShimmerButton className="w-full text-sm font-semibold" shimmerColor="#A855F7" background="linear-gradient(90deg, #7C3AED, #2563EB, #06B6D4)">
                            {plan.cta}
                          </ShimmerButton>
                        ) : (
                          <button className="w-full py-3.5 rounded-xl text-sm font-semibold transition-all duration-300 text-center bg-white/[0.06] border border-white/10 text-white hover:bg-white/10 hover:scale-[1.02]">
                            {plan.cta}
                          </button>
                        )}
                      </Link>
                    )}
                  </div>
                </div>
              </BlurFade>
            )
          })}
        </div>

        {/* ENTERPRISE BLOCK */}
        <BlurFade delay={0.8} yOffset={30} className="max-w-4xl mx-auto">
            <div className="relative rounded-[2rem] p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-8 overflow-hidden backdrop-blur-2xl bg-gradient-to-r from-brand-violet/5 via-brand-cyan/5 to-transparent border border-white/10 shadow-[0_0_40px_rgba(124,58,237,0.06)]">
              <div className="relative z-10 flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <Building2 className="w-8 h-8 text-brand-violet" />
                  <h3 className="text-3xl font-bold text-white">{enterprisePlan.label}</h3>
                </div>
                <p className="text-[#94A3B8] text-base mb-6 max-w-lg">
                  {enterprisePlan.description}
                </p>
                <ul className="flex flex-col sm:flex-row gap-4 sm:gap-8 mb-6">
                  {enterprisePlan.features.slice(0,2).map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-[#CBD5E1]">
                      <Check className="w-4 h-4 text-[#22C55E]" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="relative z-10 shrink-0 w-full md:w-auto text-center md:text-right">
                <div className="text-[#94A3B8] text-sm mb-2">A partir de</div>
                <div className="text-3xl font-bold text-white mb-6">{enterprisePlan.priceLabel}</div>
                <Link
                  href={enterprisePlan.href}
                  className="w-full md:w-auto inline-block px-8 py-3.5 rounded-xl text-sm font-bold transition-all duration-300 text-center bg-white text-black hover:bg-white/90 hover:scale-[1.02]"
                >
                  {enterprisePlan.cta}
                </Link>
              </div>
            </div>
        </BlurFade>

        <div className="max-w-4xl mx-auto mt-20 text-center">
          <h3 className="text-2xl font-bold mb-4 text-white">¿Cómo contratar un plan?</h3>
          <p className="text-text-secondary text-sm">
            Elige el plan que mejor se ajuste a tu volumen de conversaciones y número de asistentes. Los planes pagados se activan de forma automática desde la sección de facturación en tu panel de control utilizando Flow. Si necesitas un plan personalizado, puedes solicitar Enterprise a través de nuestro equipo comercial.
          </p>
        </div>

      </div>
    </section>
  )
}
