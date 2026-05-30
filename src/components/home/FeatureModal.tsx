'use client'

import { useRef, useEffect } from 'react'
import { X, CheckCircle2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { FeatureData } from './FeaturesSection'

interface FeatureModalProps {
  feature: FeatureData | null
  onClose: () => void
}

/**
 * FeatureModal — Modal reutilizable para mostrar detalle completo de un feature.
 * - Se abre/cierra con animación Framer Motion.
 * - Cierra al hacer click fuera del panel o al presionar Escape.
 * - Accesible: focus trap en el botón de cierre, role="dialog".
 */
export function FeatureModal({ feature, onClose }: FeatureModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null)

  // Cierra con Escape y hace focus al botón X al abrir
  useEffect(() => {
    if (!feature) return
    closeRef.current?.focus()
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [feature, onClose])

  return (
    <AnimatePresence>
      {feature && (
        /* Backdrop */
        <motion.div
          key="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ background: 'rgba(5, 8, 22, 0.82)', backdropFilter: 'blur(8px)' }}
          onClick={onClose}
          aria-label="Cerrar modal"
        >
          {/* Panel — stopPropagation para no cerrar al click dentro */}
          <motion.div
            key="modal-panel"
            initial={{ opacity: 0, scale: 0.94, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 24 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg rounded-[2rem] border border-white/10 bg-[#080f28]/95 backdrop-blur-2xl p-8 shadow-[0_32px_80px_rgba(0,0,0,0.7),0_0_60px_rgba(124,58,237,0.12)] overflow-hidden"
          >
            {/* Glow de fondo decorativo */}
            <div
              className="absolute top-0 right-0 w-56 h-56 rounded-full pointer-events-none"
              style={{
                background: `radial-gradient(circle, ${feature.glowColor ?? 'rgba(124,58,237,0.18)'}, transparent 70%)`,
                filter: 'blur(40px)',
                transform: 'translate(30%, -30%)',
              }}
            />

            {/* Botón cerrar */}
            <button
              ref={closeRef}
              onClick={onClose}
              aria-label="Cerrar"
              className="absolute top-5 right-5 z-20 w-9 h-9 flex items-center justify-center rounded-full bg-white/[0.06] border border-white/10 text-[#94A3B8] hover:bg-white/10 hover:text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/60"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Icono */}
            <div
              className="relative z-10 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 border border-white/10"
              style={{ background: feature.iconBg ?? '#0B1026' }}
            >
              {feature.icon}
            </div>

            {/* Título */}
            <h2
              id="modal-title"
              className="relative z-10 text-2xl font-bold text-white mb-3 leading-tight"
            >
              {feature.title}
            </h2>

            {/* Descripción extendida */}
            <p className="relative z-10 text-[#94A3B8] leading-relaxed mb-6">
              {feature.longDescription ?? feature.description}
            </p>

            {/* Lista de beneficios */}
            {feature.benefits && feature.benefits.length > 0 && (
              <ul className="relative z-10 space-y-2.5 mb-8">
                {feature.benefits.map((b, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-[#06B6D4] mt-0.5 shrink-0" />
                    <span className="text-sm text-[#CBD5E1] leading-snug">{b}</span>
                  </li>
                ))}
              </ul>
            )}

            {/* Botón cerrar secundario */}
            <button
              onClick={onClose}
              className="relative z-10 w-full py-3 rounded-xl bg-gradient-to-r from-[#7C3AED] via-[#2563EB] to-[#06B6D4] text-white text-sm font-semibold hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/60"
            >
              Entendido
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
