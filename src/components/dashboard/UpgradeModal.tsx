'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, X, Lock } from 'lucide-react'

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  icon?: 'lock' | 'sparkles'
}

export function UpgradeModal({ 
  isOpen, 
  onClose, 
  title = 'Mejora tu plan', 
  description = 'Esta función es exclusiva para planes superiores. Actualiza tu cuenta para desbloquearla.',
  icon = 'lock'
}: UpgradeModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
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
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-text-soft hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="relative z-10 flex flex-col items-center text-center">
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-violet/20 to-brand-cyan/20 border border-brand-violet/30 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(124,58,237,0.2)]`}>
                {icon === 'lock' ? <Lock className="w-8 h-8 text-brand-violet" /> : <Sparkles className="w-8 h-8 text-brand-violet" />}
              </div>
              
              <h3 className="text-2xl font-bold text-white mb-2">
                {title}
              </h3>
              
              <p className="text-text-secondary mb-6">
                {description}
              </p>

              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 w-full text-left mb-6 space-y-2">
                <div className="flex justify-between items-center border-b border-white/[0.05] pb-2">
                  <span className="text-sm text-text-soft">Plan Free</span>
                  <span className="text-sm font-medium">Básico</span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-sm text-brand-violet font-medium">Plan Pro</span>
                  <span className="text-sm font-medium text-white">Ilimitado*</span>
                </div>
              </div>

              <button 
                onClick={onClose}
                className="w-full bg-white/[0.06] border border-white/[0.1] hover:bg-white/10 py-3.5 rounded-xl text-text-secondary font-semibold transition-colors"
              >
                Facturación próximamente
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
