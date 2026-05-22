"use client";

import { motion } from "framer-motion";
import { Building2, BrainCircuit, Rocket } from "lucide-react";

export function HowItWorks() {
  const steps = [
    {
      num: "01",
      icon: <Building2 className="w-6 h-6 text-[#A855F7]" />,
      title: "Configura tu negocio",
      description:
        "Conecta tus canales, define tu perfil de empresa y personaliza el tono de tu asistente.",
    },
    {
      num: "02",
      icon: <BrainCircuit className="w-6 h-6 text-[#06B6D4]" />,
      title: "Entrena tu asistente IA",
      description:
        "Agrega preguntas frecuentes, servicios, productos y reglas para que la IA responda como tu marca.",
    },
    {
      num: "03",
      icon: <Rocket className="w-6 h-6 text-[#22C55E]" />,
      title: "Empieza a vender automáticamente",
      description:
        "Tu asistente responde clientes, captura prospectos y guía conversaciones hacia la compra.",
    },
  ];

  return (
    <section
      id="como-funciona"
      className="relative py-28 overflow-hidden bg-[#050816]"
    >
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(124,58,237,0.18),transparent_32%),radial-gradient(circle_at_50%_100%,rgba(6,182,212,0.12),transparent_30%)]" />

      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:70px_70px] opacity-60" />

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 35 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto mb-20"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.06] backdrop-blur-xl border border-white/10 mb-6 shadow-[0_0_30px_rgba(124,58,237,0.15)]">
            <span className="w-2 h-2 rounded-full bg-[#A855F7]" />
            <span className="text-sm text-[#CBD5E1] font-medium">
              Proceso simple
            </span>
          </div>

          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-[-0.03em]">
            Activa tu asistente en{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#A855F7] via-[#2563EB] to-[#06B6D4]">
              minutos
            </span>
          </h2>

          <p className="text-[#94A3B8] text-lg leading-relaxed">
            Un proceso rápido, visual y sin conocimientos técnicos. Configura,
            entrena y empieza a automatizar conversaciones desde el primer día.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="relative grid md:grid-cols-3 gap-8">
          {/* Connector line */}
          <div className="hidden md:block absolute top-[72px] left-[16%] right-[16%] h-[2px] bg-gradient-to-r from-[#7C3AED]/20 via-[#06B6D4]/50 to-[#22C55E]/20" />

          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 45 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.6,
                delay: index * 0.12,
              }}
              viewport={{ once: true }}
              className="relative group"
            >
              <div className="relative h-full rounded-[2rem] bg-white/[0.05] backdrop-blur-2xl border border-white/10 p-8 text-center overflow-hidden hover:-translate-y-2 transition-all duration-500 shadow-[0_0_40px_rgba(124,58,237,0.06)] hover:shadow-[0_0_60px_rgba(6,182,212,0.14)]">
                {/* Hover glow */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-[#7C3AED]/10 via-transparent to-[#06B6D4]/10" />

                {/* Number circle */}
                <div className="relative z-10 mx-auto mb-7 w-28 h-28 rounded-full bg-[#050816] border border-white/10 flex items-center justify-center shadow-[0_0_45px_rgba(124,58,237,0.22)]">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#7C3AED]/30 to-[#06B6D4]/30 blur-xl" />

                  <div className="relative w-20 h-20 rounded-full bg-gradient-to-r from-[#7C3AED] via-[#2563EB] to-[#06B6D4] p-[2px]">
                    <div className="w-full h-full rounded-full bg-[#050816] flex items-center justify-center">
                      <span className="text-2xl font-bold text-white">
                        {step.num}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Icon */}
                <div className="relative z-10 mx-auto mb-5 w-12 h-12 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center">
                  {step.icon}
                </div>

                <h3 className="relative z-10 text-xl font-bold text-white mb-4">
                  {step.title}
                </h3>

                <p className="relative z-10 text-[#94A3B8] leading-relaxed">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}