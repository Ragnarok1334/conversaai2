"use client";

import { motion } from "framer-motion";
import { Sparkles, ArrowRight, Zap } from "lucide-react";

export function CTA() {
  return (
    <section className="relative py-32 overflow-hidden bg-[#050816]">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(124,58,237,0.18),transparent_32%),radial-gradient(circle_at_80%_80%,rgba(6,182,212,0.15),transparent_28%)]" />

      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-[#7C3AED]/10 blur-[140px] rounded-full" />

      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[#06B6D4]/10 blur-[140px] rounded-full" />

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 35 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-[2.5rem] bg-white/[0.06] backdrop-blur-2xl border border-white/10 max-w-6xl mx-auto"
        >
          {/* Internal glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#7C3AED]/15 via-transparent to-[#06B6D4]/12" />

          <div className="absolute -top-32 -left-32 w-80 h-80 bg-[#7C3AED]/20 blur-[100px] rounded-full" />

          <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-[#06B6D4]/20 blur-[100px] rounded-full" />

          {/* Content */}
          <div className="relative z-10 px-8 py-16 md:px-16 md:py-24 text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.06] backdrop-blur-xl border border-white/10 mb-8 shadow-[0_0_30px_rgba(124,58,237,0.12)]">
              <Zap className="w-4 h-4 text-[#06B6D4]" />

              <span className="text-sm text-[#CBD5E1] font-medium">
                Automatización inteligente
              </span>
            </div>

            {/* Title */}
            <h2 className="text-4xl md:text-6xl font-bold text-white mb-8 tracking-[-0.04em] leading-tight max-w-4xl mx-auto">
              Empieza a automatizar tus{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#A855F7] via-[#2563EB] to-[#06B6D4]">
                conversaciones
              </span>{" "}
              hoy mismo
            </h2>

            {/* Description */}
            <p className="text-xl text-[#CBD5E1] max-w-2xl mx-auto mb-12 leading-relaxed">
              Convierte mensajes en clientes con una inteligencia artificial que
              responde, organiza y trabaja por tu negocio las 24 horas del día.
            </p>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
              <a
                href="#precios"
                className="group inline-flex items-center gap-3 px-10 py-5 rounded-2xl bg-gradient-to-r from-[#7C3AED] via-[#2563EB] to-[#06B6D4] text-white font-bold text-lg hover:scale-105 transition-all duration-300 shadow-[0_0_50px_rgba(124,58,237,0.45)]"
              >
                <Sparkles className="w-5 h-5" />

                Crear mi asistente IA

                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
              </a>

              <a
                href="#funciones"
                className="px-10 py-5 rounded-2xl bg-white/[0.06] backdrop-blur-xl border border-white/10 text-white font-semibold text-lg hover:bg-white/[0.09] hover:scale-105 transition-all duration-300"
              >
                Ver funciones
              </a>
            </div>

            {/* Small trust text */}
            <div className="flex flex-wrap justify-center items-center gap-6 mt-10 text-sm text-[#94A3B8]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
                Configuración rápida
              </div>

              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#06B6D4]" />
                Sin conocimientos técnicos
              </div>

              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#A855F7]" />
                Soporte incluido
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
