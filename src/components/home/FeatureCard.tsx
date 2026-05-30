'use client'

import { ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import type { FeatureData } from './FeaturesSection'

interface FeatureCardProps {
  feature: FeatureData
  index: number
  onOpenModal: (feature: FeatureData) => void
}

/**
 * FeatureCard — Tarjeta individual de feature.
 *
 * Hover:
 *   - scale(1.02) via Tailwind hover:scale-[1.02]
 *   - shadow elevado: hover:shadow-[0_8px_32px_rgba(0,0,0,0.35)]
 *   - glow gradient de fondo que aparece con opacity
 *   - transición suave 300ms
 *
 * El título y la descripción tienen z-10 y position relative
 * para que nunca sean cubiertos por el overlay de hover.
 *
 * El ícono escala levemente al hover pero no mueve el contenido.
 * El botón "Saber más" abre el modal con la info completa.
 */
export function FeatureCard({ feature, index, onOpenModal }: FeatureCardProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
      viewport={{ once: true }}
      /* 
        Hover: scale suave + shadow elevado.
        NO usamos hover:-translate-y-* porque puede mover el layout.
        Usamos scale para dar la sensación de "lift" sin desplazar títulos.
      */
      className="group relative flex flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.05] backdrop-blur-2xl p-7 transition-all duration-300 ease-out hover:scale-[1.02] hover:shadow-[0_8px_32px_rgba(0,0,0,0.35)] hover:border-white/[0.18] focus-within:ring-2 focus-within:ring-[#7C3AED]/50"
    >
      {/* 
        Glow de hover — posición absoluta, z-0.
        Nunca interfiere con el contenido porque todo el texto tiene z-10.
      */}
      <div
        className="absolute inset-0 z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-[2rem]"
        style={{
          background:
            'linear-gradient(135deg, rgba(124,58,237,0.10) 0%, rgba(6,182,212,0.07) 100%)',
        }}
        aria-hidden="true"
      />

      {/* Border glow sutil al hover */}
      <div
        className="absolute inset-0 z-0 rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ boxShadow: 'inset 0 0 0 1px rgba(124,58,237,0.22)' }}
        aria-hidden="true"
      />

      {/* Icono — escala suave, sin mover el layout */}
      <div
        className="relative z-10 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 border border-white/10 transition-transform duration-300 group-hover:scale-110 shrink-0"
        style={{ background: feature.iconBg ?? '#0B1026' }}
      >
        {feature.icon}
      </div>

      {/* Título — z-10 garantiza visibilidad sobre el overlay */}
      <h3 className="relative z-10 text-lg font-semibold text-white mb-3 leading-snug">
        {feature.title}
      </h3>

      {/* Descripción breve */}
      <p className="relative z-10 text-[#94A3B8] text-sm leading-relaxed flex-1">
        {feature.description}
      </p>

      {/* Botón "Saber más" — abre modal */}
      <div className="relative z-10 mt-6">
        <button
          onClick={() => onOpenModal(feature)}
          aria-label={`Saber más sobre ${feature.title}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-[#A855F7] hover:text-[#06B6D4] transition-colors duration-200 focus:outline-none focus:underline group/btn"
        >
          Saber más
          {/* La flecha se mueve 4px hacia la derecha al hover del botón, NO de la tarjeta */}
          <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover/btn:translate-x-1" />
        </button>
      </div>
    </motion.article>
  )
}
