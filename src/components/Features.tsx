"use client";

import { motion } from "framer-motion";
import {
  MessageSquareText,
  Magnet,
  Users,
  Share2,
  BarChart3,
  Settings,
} from "lucide-react";

export function Features() {
  const features = [
    {
      icon: <MessageSquareText className="w-6 h-6 text-[#A855F7]" />,
      title: "Respuestas automáticas con IA",
      description:
        "Entiende el contexto y responde de forma natural a las dudas de tus clientes al instante.",
    },
    {
      icon: <Magnet className="w-6 h-6 text-[#06B6D4]" />,
      title: "Captura inteligente de leads",
      description:
        "Identifica clientes potenciales y solicita sus datos de contacto en el momento adecuado.",
    },
    {
      icon: <Users className="w-6 h-6 text-[#2563EB]" />,
      title: "Seguimiento de clientes",
      description:
        "Mantén un registro de cada interacción y haz seguimiento automático para cerrar ventas.",
    },
    {
      icon: <Share2 className="w-6 h-6 text-[#EC4899]" />,
      title: "Integración con WhatsApp y redes",
      description:
        "Conecta tu asistente con WhatsApp, Instagram, Facebook y tu sitio web fácilmente.",
    },
    {
      icon: <BarChart3 className="w-6 h-6 text-[#22C55E]" />,
      title: "Panel de estadísticas",
      description:
        "Mide el rendimiento de tus conversaciones, leads captados y tiempos de respuesta.",
    },
    {
      icon: <Settings className="w-6 h-6 text-[#7C3AED]" />,
      title: "Personalización del asistente",
      description:
        "Dale a tu IA la personalidad, el tono y las reglas exactas de tu negocio.",
    },
  ];

  return (
    <section
      id="funciones"
      className="relative py-28 overflow-hidden bg-[#050816]"
    >
      {/* Background Glow */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-[#7C3AED]/10 blur-[140px] rounded-full" />

      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[#06B6D4]/10 blur-[140px] rounded-full" />

      <div className="container mx-auto px-4 md:px-6 relative z-10">

        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto mb-20"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.06] backdrop-blur-xl border border-white/10 mb-6 shadow-[0_0_30px_rgba(124,58,237,0.15)]">
            <span className="w-2 h-2 rounded-full bg-[#06B6D4]" />

            <span className="text-sm text-[#CBD5E1] font-medium">
              Funciones inteligentes
            </span>
          </div>

          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-[-0.03em]">
            Todo lo que necesitas para{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#A855F7] via-[#2563EB] to-[#06B6D4]">
              conversar mejor
            </span>
          </h2>

          <p className="text-[#94A3B8] text-lg leading-relaxed">
            Nuestra plataforma combina inteligencia artificial avanzada con
            herramientas diseñadas para automatizar conversaciones, captar
            clientes y aumentar conversiones.
          </p>
        </motion.div>

        {/* Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-7">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 35 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                delay: index * 0.08,
              }}
              viewport={{ once: true }}
              className="group relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.05] backdrop-blur-2xl p-7 hover:-translate-y-2 transition-all duration-500 shadow-[0_0_40px_rgba(124,58,237,0.06)] hover:shadow-[0_0_50px_rgba(124,58,237,0.16)]"
            >
              {/* Hover Glow */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-[#7C3AED]/10 via-transparent to-[#06B6D4]/10" />

              {/* Icon */}
              <div className="relative z-10 w-14 h-14 rounded-2xl bg-[#0B1026] border border-white/10 flex items-center justify-center mb-7 shadow-inner group-hover:scale-110 transition-transform duration-300">
                {feature.icon}
              </div>

              {/* Title */}
              <h3 className="relative z-10 text-xl font-semibold text-white mb-4">
                {feature.title}
              </h3>

              {/* Description */}
              <p className="relative z-10 text-[#94A3B8] leading-relaxed">
                {feature.description}
              </p>

              {/* Border Glow */}
              <div className="absolute inset-0 rounded-[2rem] border border-transparent group-hover:border-[#7C3AED]/20 transition-all duration-500" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}