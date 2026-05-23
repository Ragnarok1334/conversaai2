'use client'

import { useState, useEffect } from 'react'
import { Check, Sparkles, X, Lock } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { PLAN_CONFIGS } from '@/lib/plans'
import { createClient } from '@/lib/supabase/client'

export function Pricing() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState('')

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

  const handleUpgradeClick = (e: React.MouseEvent, planName: string) => {
    e.preventDefault()
    setSelectedPlan(planName)
    setShowUpgradeModal(true)
  }

  return (
    <section id="precios" className="relative py-28 overflow-hidden bg-[#050816]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,rgba(124,58,237,0.18),transparent_32%),radial-gradient(circle_at_85%_80%,rgba(6,182,212,0.14),transparent_28%)]" />

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 35 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto mb-20"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.06] backdrop-blur-xl border border-white/10 mb-6">
            <Sparkles className="w-4 h-4 text-[#06B6D4]" />
            <span className="text-sm text-[#CBD5E1] font-medium">Planes flexibles</span>
          </div>

          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-[-0.03em]">
            Planes diseñados para{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#A855F7] via-[#2563EB] to-[#06B6D4]">
              escalar
            </span>
          </h2>

          <p className="text-[#94A3B8] text-lg">
            Elige el plan que mejor se adapte al tamaño y necesidades de tu negocio.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.key}
              initial={{ opacity: 0, y: 45 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className={`relative rounded-[2rem] p-8 flex flex-col overflow-hidden backdrop-blur-2xl transition-all duration-500 hover:-translate-y-2 ${
                plan.popular
                  ? 'bg-white/[0.08] border border-[#7C3AED]/50 shadow-[0_0_70px_rgba(124,58,237,0.24)] lg:-translate-y-4'
                  : 'bg-white/[0.05] border border-white/10 shadow-[0_0_40px_rgba(6,182,212,0.06)]'
              }`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#7C3AED]/10 via-transparent to-[#06B6D4]/10 opacity-60" />

              {plan.popular && (
                <div className="absolute -top-0 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#7C3AED] via-[#2563EB] to-[#06B6D4] text-white text-xs font-bold uppercase tracking-wider py-1.5 px-4 rounded-b-xl shadow-lg">
                  Más popular
                </div>
              )}

              <div className="relative z-10 flex-1 flex flex-col">
                <h3 className="text-2xl font-semibold text-white mb-2">{plan.label}</h3>
                <p className="text-[#94A3B8] text-sm min-h-[40px] mb-6">{plan.description}</p>

                <div className="mb-6">
                  <span className="text-4xl font-bold text-white">{plan.price}</span>
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

                {plan.key === 'free' && (
                  <Link
                    href={isLoggedIn ? '/dashboard/create-assistant' : '/register'}
                    className="w-full py-3.5 rounded-xl font-semibold transition-all duration-300 text-center inline-block bg-white/[0.06] border border-white/10 text-white hover:bg-white/10 hover:scale-[1.02]"
                  >
                    {isLoggedIn ? 'Crear asistente' : 'Empezar gratis'}
                  </Link>
                )}
                {(plan.key === 'pro' || plan.key === 'business') && (
                  <button
                    onClick={(e) => handleUpgradeClick(e, plan.label)}
                    className={`w-full py-3.5 rounded-xl font-semibold transition-all duration-300 text-center inline-block hover:scale-[1.02] ${
                      plan.popular
                        ? 'bg-gradient-to-r from-[#7C3AED] via-[#2563EB] to-[#06B6D4] text-white shadow-[0_0_30px_rgba(124,58,237,0.3)]'
                        : 'bg-white/[0.06] border border-white/10 text-white hover:bg-white/10'
                    }`}
                  >
                    Mejorar a {plan.label}
                  </button>
                )}
                {plan.key === 'enterprise' && (
                  <Link
                    href="mailto:ventas@conversaai.com"
                    className="w-full py-3.5 rounded-xl font-semibold transition-all duration-300 text-center inline-block bg-white/[0.06] border border-white/10 text-white hover:bg-white/10 hover:scale-[1.02]"
                  >
                    Contactar ventas
                  </Link>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {showUpgradeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowUpgradeModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-card-bg/90 backdrop-blur-2xl border border-card-border rounded-3xl p-8 shadow-2xl overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-brand-violet/10 via-transparent to-brand-cyan/10 pointer-events-none" />
              
              <button 
                onClick={() => setShowUpgradeModal(false)}
                className="absolute top-4 right-4 p-2 text-text-soft hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-violet/20 to-brand-cyan/20 border border-brand-violet/30 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(124,58,237,0.2)]">
                  <Lock className="w-8 h-8 text-brand-violet" />
                </div>
                
                <h3 className="text-2xl font-bold text-white mb-2">
                  Plan {selectedPlan}
                </h3>
                
                <p className="text-text-secondary mb-8">
                  Estamos integrando nuestra pasarela de pagos. La facturación automatizada estará disponible próximamente.
                </p>

                <button 
                  onClick={() => setShowUpgradeModal(false)}
                  className="w-full gradient-btn py-3.5 rounded-xl text-white font-semibold shadow-lg hover:opacity-90 transition-opacity"
                >
                  Entendido
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  )
}
