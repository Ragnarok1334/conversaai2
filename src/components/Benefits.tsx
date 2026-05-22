"use client";

import { CheckCircle2, TrendingUp, Clock, Users, Zap } from "lucide-react";
import { motion } from "framer-motion";

export function Benefits() {
  const benefits = [
    "Atiende clientes fuera de horario",
    "Reduce tiempo de respuesta",
    "Automatiza preguntas frecuentes",
    "Mejora la experiencia del cliente",
    "Aumenta conversiones",
    "Organiza prospectos automáticamente",
  ];

  const leads = [
    {
      initials: "JP",
      name: "Juan Pérez",
      source: "WhatsApp",
      status: "Convertido",
    },
    {
      initials: "AM",
      name: "Ana Martínez",
      source: "Instagram",
      status: "Calificado",
    },
    {
      initials: "CR",
      name: "Carlos Ruiz",
      source: "Web Chat",
      status: "Nuevo lead",
    },
  ];

  return (
    <section
      id="beneficios"
      className="relative py-28 overflow-hidden bg-[#0B1026]"
    >
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_45%,rgba(124,58,237,0.18),transparent_32%),radial-gradient(circle_at_15%_85%,rgba(6,182,212,0.14),transparent_28%)]" />

      <div className="absolute left-0 top-0 w-[500px] h-[500px] bg-[#2563EB]/10 rounded-full blur-[140px]" />

      <div className="absolute right-0 bottom-0 w-[500px] h-[500px] bg-[#A855F7]/10 rounded-full blur-[140px]" />

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">

          {/* Left content */}
          <motion.div
            initial={{ opacity: 0, y: 35 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.06] backdrop-blur-xl border border-white/10 mb-6 shadow-[0_0_30px_rgba(6,182,212,0.12)]">
              <Zap className="w-4 h-4 text-[#06B6D4]" />
              <span className="text-sm text-[#CBD5E1] font-medium">
                Beneficios para tu negocio
              </span>
            </div>

            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-[-0.03em] leading-tight">
              Convierte cada conversación en una{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#A855F7] via-[#2563EB] to-[#06B6D4]">
                oportunidad real de venta
              </span>
            </h2>

            <p className="text-[#CBD5E1] text-lg mb-9 leading-relaxed">
              No dejes que los clientes se enfríen por falta de respuesta.
              ConversaAI mantiene el interés, responde al instante y guía a tus
              usuarios hacia la compra en todo momento.
            </p>

            <div className="grid sm:grid-cols-2 gap-4">
              {benefits.map((benefit, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{
                    duration: 0.45,
                    delay: index * 0.06,
                  }}
                  viewport={{ once: true }}
                  className="flex items-start gap-3 rounded-2xl bg-white/[0.04] border border-white/10 p-4 backdrop-blur-xl hover:bg-white/[0.07] transition-all duration-300"
                >
                  <CheckCircle2 className="w-5 h-5 text-[#22C55E] shrink-0 mt-0.5" />
                  <span className="text-white font-medium">{benefit}</span>
                </motion.div>
              ))}
            </div>

            <button className="mt-10 px-7 py-4 rounded-2xl bg-white/[0.06] backdrop-blur-xl border border-white/10 text-white font-semibold hover:bg-white/10 hover:scale-105 transition-all duration-300 shadow-[0_0_35px_rgba(124,58,237,0.14)]">
              Descubrir más ventajas
            </button>
          </motion.div>

          {/* Right visual dashboard */}
          <motion.div
            initial={{ opacity: 0, x: 45 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.75 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="relative rounded-[2rem] bg-white/[0.06] backdrop-blur-2xl border border-white/10 p-6 shadow-[0_0_80px_rgba(124,58,237,0.18)] overflow-hidden">

              {/* Internal glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#7C3AED]/12 via-transparent to-[#06B6D4]/10 pointer-events-none" />

              <div className="absolute -top-24 -right-20 w-64 h-64 bg-[#06B6D4]/20 blur-[90px] rounded-full" />

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-7">
                  <div>
                    <p className="text-[#94A3B8] text-sm mb-1">
                      Panel de oportunidades
                    </p>
                    <h3 className="text-2xl font-bold text-white">
                      Leads generados
                    </h3>
                  </div>

                  <div className="px-3 py-1.5 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/20 text-[#22C55E] text-sm font-semibold">
                    +32%
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="rounded-2xl bg-[#050816]/70 border border-white/10 p-4">
                    <TrendingUp className="w-5 h-5 text-[#22C55E] mb-3" />
                    <p className="text-2xl font-bold text-white">340</p>
                    <p className="text-xs text-[#94A3B8]">Leads</p>
                  </div>

                  <div className="rounded-2xl bg-[#050816]/70 border border-white/10 p-4">
                    <Clock className="w-5 h-5 text-[#06B6D4] mb-3" />
                    <p className="text-2xl font-bold text-white">24/7</p>
                    <p className="text-xs text-[#94A3B8]">Atención</p>
                  </div>

                  <div className="rounded-2xl bg-[#050816]/70 border border-white/10 p-4">
                    <Users className="w-5 h-5 text-[#A855F7] mb-3" />
                    <p className="text-2xl font-bold text-white">89%</p>
                    <p className="text-xs text-[#94A3B8]">Calidad</p>
                  </div>
                </div>

                {/* Lead list */}
                <div className="space-y-4">
                  {leads.map((lead, index) => (
                    <motion.div
                      key={index}
                      animate={{ y: [0, index % 2 === 0 ? -4 : 4, 0] }}
                      transition={{
                        repeat: Infinity,
                        duration: 4 + index,
                        ease: "easeInOut",
                      }}
                      className="flex items-center justify-between p-4 bg-white/[0.05] border border-white/10 rounded-2xl backdrop-blur-xl"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] p-[2px]">
                          <div className="w-full h-full rounded-full bg-[#050816] flex items-center justify-center text-white font-bold text-sm">
                            {lead.initials}
                          </div>
                        </div>

                        <div>
                          <p className="text-white font-medium">
                            {lead.name}
                          </p>
                          <p className="text-[#94A3B8] text-sm">
                            Lead desde {lead.source}
                          </p>
                        </div>
                      </div>

                      <span className="text-[#22C55E] text-xs font-semibold px-3 py-1.5 bg-[#22C55E]/10 border border-[#22C55E]/20 rounded-full">
                        {lead.status}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            {/* Floating small card */}
            <motion.div
              animate={{ y: [0, -12, 0] }}
              transition={{
                repeat: Infinity,
                duration: 5,
                ease: "easeInOut",
              }}
              className="absolute -left-8 -bottom-8 hidden md:block rounded-2xl bg-white/[0.07] backdrop-blur-2xl border border-white/10 p-5 shadow-[0_0_45px_rgba(6,182,212,0.18)]"
            >
              <p className="text-[#94A3B8] text-xs mb-1">
                Tiempo de respuesta
              </p>
              <p className="text-white text-2xl font-bold">
                3 seg
              </p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}