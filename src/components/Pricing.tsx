'use client'

import { useState, useEffect } from 'react'
import { Check, Sparkles, Shield, Zap, Clock } from 'lucide-react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { PLAN_CONFIGS } from '@/lib/plans'
import { createClient } from '@/lib/supabase/client'
import { BorderBeam } from '@/components/magicui/border-beam'
import { ShimmerButton } from '@/components/magicui/shimmer-button'
import { BlurFade } from '@/components/magicui/blur-fade'

export function Pricing({ currentPlanId }: { currentPlanId?: string }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      setIsLoggedIn(!!data.session)
    })
  }, [])

  const plans = [
    PLAN_CONFIGS.free,
    PLAN_CONFIGS.pro,
    PLAN_CONFIGS.business,
    PLAN_CONFIGS.enterprise,
  ]

  return (
    <section id="precios" className="relative py-28 overflow-hidden bg-[#050816]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,rgba(124,58,237,0.18),transparent_32%),radial-gradient(circle_at_85%_80%,rgba(6,182,212,0.14),transparent_28%)]" />

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <BlurFade delay={0.2} yOffset={30}>
          <div className="text-center max-w-3xl mx-auto mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.06] backdrop-blur-xl border border-white/10 mb-6">
              <Sparkles className="w-4 h-4 text-[#06B6D4]" />
              <span className="text-sm text-[#CBD5E1] font-medium">Planes flexibles</span>
            </div>

            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-[-0.03em]">
              Planes y facturación
            </h2>

            <p className="text-[#94A3B8] text-lg mb-8">
              Elige el plan ideal para automatizar conversaciones, captar leads y atender clientes 24/7 con ConversaAI.
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
                <span>Actualización inmediata del plan</span>
              </div>
            </div>
          </div>
        </BlurFade>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {plans.map((plan, index) => {
            const isCurrentPlan = currentPlanId === plan.key;
            
            return (
              <BlurFade delay={0.4 + index * 0.1} key={plan.key} yOffset={45} className="flex h-full flex-col">
                <div
                  className={`relative h-full rounded-[2rem] p-8 flex flex-col overflow-hidden backdrop-blur-2xl transition-all duration-500 hover:-translate-y-2 ${
                    plan.highlighted
                      ? 'bg-white/[0.08] shadow-[0_0_70px_rgba(124,58,237,0.24)] lg:-translate-y-4'
                      : 'bg-white/[0.05] border border-white/10 shadow-[0_0_40px_rgba(6,182,212,0.06)]'
                  }`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-[#7C3AED]/10 via-transparent to-[#06B6D4]/10 opacity-60 pointer-events-none" />
                  {plan.highlighted && <BorderBeam size={250} duration={12} delay={9} />}

                {plan.badge && (
                  <div className="absolute -top-0 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#7C3AED] via-[#2563EB] to-[#06B6D4] text-white text-xs font-bold uppercase tracking-wider py-1.5 px-4 rounded-b-xl shadow-lg">
                    {plan.badge}
                  </div>
                )}
                
                {isCurrentPlan && !plan.badge && (
                  <div className="absolute -top-0 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-bold uppercase tracking-wider py-1.5 px-4 rounded-b-xl shadow-lg">
                    Plan actual
                  </div>
                )}

                <div className="relative z-10 flex-1 flex flex-col">
                  <h3 className="text-2xl font-semibold text-white mb-2">{plan.label}</h3>
                  <p className="text-[#94A3B8] text-sm min-h-[40px] mb-6">{plan.description}</p>

                  <div className="mb-6 flex items-baseline gap-1">
                    <span className={`font-bold text-white ${plan.price.length > 8 ? 'text-2xl xl:text-3xl' : 'text-4xl'}`}>
                      {plan.price}
                    </span>
                    <span className="text-[#94A3B8]">{plan.period}</span>
                  </div>

                  <ul className="space-y-4 mb-8 flex-1">
                    {plan.features.map((feature, fIndex) => (
                      <li key={fIndex} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-[#22C55E] shrink-0" />
                        <span className="text-[#CBD5E1] text-sm leading-tight">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {isCurrentPlan ? (
                    <button disabled className="w-full py-3.5 mt-auto rounded-xl font-semibold bg-white/5 border border-white/10 text-white/50 cursor-not-allowed">
                      Plan activo
                    </button>
                  ) : plan.external ? (
                    <a
                      href={plan.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full mt-auto block"
                    >
                      {plan.highlighted ? (
                        <ShimmerButton className="w-full font-semibold" shimmerColor="#A855F7" background="linear-gradient(90deg, #7C3AED, #2563EB, #06B6D4)">
                          {plan.cta}
                        </ShimmerButton>
                      ) : (
                        <button className="w-full py-3.5 rounded-xl font-semibold transition-all duration-300 text-center bg-white/[0.06] border border-white/10 text-white hover:bg-white/10 hover:scale-[1.02]">
                          {plan.cta}
                        </button>
                      )}
                    </a>
                  ) : (
                    <Link
                      href={
                        !isLoggedIn
                          ? (plan.key === 'free' ? '/register' : `/login?redirect=${encodeURIComponent(plan.href)}`)
                          : plan.href
                      }
                      className="w-full mt-auto block"
                    >
                      {plan.highlighted ? (
                        <ShimmerButton className="w-full font-semibold" shimmerColor="#A855F7" background="linear-gradient(90deg, #7C3AED, #2563EB, #06B6D4)">
                          {plan.cta}
                        </ShimmerButton>
                      ) : (
                        <button className="w-full py-3.5 rounded-xl font-semibold transition-all duration-300 text-center bg-white/[0.06] border border-white/10 text-white hover:bg-white/10 hover:scale-[1.02]">
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
      </div>
    </section>
  )
}
