"use client";

import { Check, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

export function Pricing() {
  const plans = [
    {
      name: "Básico",
      price: "$19",
      period: "/mes",
      description: "Para pequeños negocios que empiezan a automatizar.",
      features: [
        "1 Asistente IA",
        "Hasta 500 conversaciones/mes",
        "Integración web widget",
        "Respuestas base",
        "Soporte por email",
      ],
      popular: false,
    },
    {
      name: "Pro",
      price: "$49",
      period: "/mes",
      description: "Ideal para empresas que quieren escalar sus ventas.",
      features: [
        "3 Asistentes IA",
        "Conversaciones ilimitadas",
        "Integración WhatsApp & IG",
        "Captura avanzada de leads",
        "Entrenamiento con documentos",
        "Soporte prioritario",
      ],
      popular: true,
    },
    {
      name: "Empresarial",
      price: "$149",
      period: "/mes",
      description: "Para negocios con alto volumen, equipos y automatizaciones avanzadas.",
      features: [
        "10 Asistentes IA",
        "Hasta 25,000 conversaciones/mes",
        "WhatsApp, Instagram, Web y Facebook",
        "Flujos personalizados",
        "API y Webhooks",
        "Entrenamiento avanzado con documentos",
        "Soporte premium",
      ],
      popular: false,
    },
  ];

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
            <span className="text-sm text-[#CBD5E1] font-medium">
              Planes flexibles
            </span>
          </div>

          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-[-0.03em]">
            Planes simples para{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#A855F7] via-[#2563EB] to-[#06B6D4]">
              empezar hoy
            </span>
          </h2>

          <p className="text-[#94A3B8] text-lg">
            Elige el plan que mejor se adapte al tamaño y necesidades de tu negocio.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 45 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className={`relative rounded-[2rem] p-8 flex flex-col overflow-hidden backdrop-blur-2xl transition-all duration-500 hover:-translate-y-2 ${
                plan.popular
                  ? "bg-white/[0.08] border border-[#7C3AED]/50 shadow-[0_0_70px_rgba(124,58,237,0.24)] md:-translate-y-4"
                  : "bg-white/[0.05] border border-white/10 shadow-[0_0_40px_rgba(6,182,212,0.06)]"
              }`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#7C3AED]/10 via-transparent to-[#06B6D4]/10 opacity-60" />

              {plan.popular && (
                <div className="absolute -top-0 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#7C3AED] via-[#2563EB] to-[#06B6D4] text-white text-xs font-bold uppercase tracking-wider py-2 px-5 rounded-b-2xl">
                  Más popular
                </div>
              )}

              <div className="relative z-10">
                <h3 className="text-2xl font-semibold text-white mb-3">
                  {plan.name}
                </h3>

                <p className="text-[#94A3B8] text-sm min-h-12 mb-7">
                  {plan.description}
                </p>

                <div className="mb-8">
                  <span className="text-5xl font-bold text-white">
                    {plan.price}
                  </span>
                  <span className="text-[#94A3B8]">{plan.period}</span>
                </div>

                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, fIndex) => (
                    <li key={fIndex} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-[#22C55E] shrink-0" />
                      <span className="text-[#CBD5E1] text-sm">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <Link
                href={`/register?plan=${plan.name.toLowerCase()}`}
                className={`relative z-10 w-full mt-auto py-4 rounded-2xl font-semibold transition-all duration-300 text-center inline-block ${
                  plan.popular
                    ? "bg-gradient-to-r from-[#7C3AED] via-[#2563EB] to-[#06B6D4] text-white shadow-[0_0_40px_rgba(124,58,237,0.45)] hover:scale-105"
                    : "bg-white/[0.06] border border-white/10 text-white hover:bg-white/10 hover:scale-105"
                }`}
              >
                {plan.name === "Empresarial" ? "Contratar plan" : plan.name === "Pro" ? "Contratar plan" : "Contratar plan"}
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
