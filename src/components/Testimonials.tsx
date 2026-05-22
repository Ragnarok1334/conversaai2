"use client";

import { Star, Quote } from "lucide-react";
import { motion } from "framer-motion";

export function Testimonials() {
  const testimonials = [
    {
      content:
        "Antes perdíamos muchos mensajes cuando cerrábamos la tienda. Ahora ConversaAI responde dudas de precios, stock y envíos en automático. No reemplazó nuestro trato humano, pero sí nos ayudó a llegar mucho más rápido.",
      name: "Mariana Silva",
      role: "Dueña de tienda online",
      business: "EcoStore",
      initials: "MS",
      gradient: "from-[#7C3AED] to-[#A855F7]",
    },
    {
      content:
        "Lo usamos principalmente para orientar pacientes y recibir solicitudes de cita. Me gusta porque filtra preguntas repetidas y deja ordenados los datos antes de que mi asistente confirme la agenda.",
      name: "Roberto Casas",
      role: "Director clínico",
      business: "Clínica Casas",
      initials: "RC",
      gradient: "from-[#06B6D4] to-[#2563EB]",
    },
    {
      content:
        "En inmobiliaria el tiempo de respuesta es clave. El asistente pregunta presupuesto, zona y tipo de propiedad antes de pasar el contacto. Así mi equipo habla con prospectos más claros y mejor preparados.",
      name: "Laura Gómez",
      role: "Asesora inmobiliaria",
      business: "Gómez Propiedades",
      initials: "LG",
      gradient: "from-[#EC4899] to-[#7C3AED]",
    },
  ];

  return (
    <section className="relative py-28 overflow-hidden bg-[#0B1026]">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(124,58,237,0.16),transparent_30%),radial-gradient(circle_at_80%_80%,rgba(6,182,212,0.13),transparent_28%)]" />

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 35 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto mb-20"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.06] backdrop-blur-xl border border-white/10 mb-6">
            <Star className="w-4 h-4 text-[#06B6D4] fill-[#06B6D4]" />
            <span className="text-sm text-[#CBD5E1] font-medium">
              Opiniones de clientes
            </span>
          </div>

          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-[-0.03em]">
            Negocios que ya trabajan{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#A855F7] via-[#2563EB] to-[#06B6D4]">
              más rápido con IA
            </span>
          </h2>

          <p className="text-[#94A3B8] text-lg leading-relaxed">
            Testimonios de negocios que usan automatización para responder mejor,
            ordenar prospectos y ahorrar tiempo todos los días.
          </p>
        </motion.div>

        {/* Testimonials */}
        <div className="grid md:grid-cols-3 gap-7">
          {testimonials.map((testi, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 45 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.6,
                delay: index * 0.1,
              }}
              viewport={{ once: true }}
              className="group relative overflow-hidden rounded-[2rem] bg-white/[0.05] backdrop-blur-2xl border border-white/10 p-8 hover:-translate-y-2 transition-all duration-500 shadow-[0_0_40px_rgba(124,58,237,0.06)] hover:shadow-[0_0_55px_rgba(6,182,212,0.14)]"
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-[#7C3AED]/10 via-transparent to-[#06B6D4]/10" />

              <Quote className="relative z-10 w-8 h-8 text-[#A855F7] mb-6 opacity-80" />

              <div className="relative z-10 flex items-center gap-1 mb-6">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className="w-4 h-4 fill-[#06B6D4] text-[#06B6D4]"
                  />
                ))}
              </div>

              <p className="relative z-10 text-[#CBD5E1] leading-relaxed mb-8 min-h-[170px]">
                “{testi.content}”
              </p>

              <div className="relative z-10 flex items-center gap-4 pt-6 border-t border-white/10">
                <div
                  className={`w-12 h-12 rounded-full bg-gradient-to-r ${testi.gradient} p-[2px]`}
                >
                  <div className="w-full h-full rounded-full bg-[#050816] flex items-center justify-center text-white font-bold">
                    {testi.initials}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-white">{testi.name}</h4>
                  <p className="text-sm text-[#94A3B8]">{testi.role}</p>
                  <p className="text-xs text-[#06B6D4]">{testi.business}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}