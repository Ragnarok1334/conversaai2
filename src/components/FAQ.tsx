"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function FAQ() {
  const faqs = [
    {
      question: "¿Qué es ConversaAI?",
      answer:
        "ConversaAI es una plataforma SaaS que permite crear asistentes de inteligencia artificial para responder clientes, captar prospectos y apoyar procesos de venta las 24 horas.",
    },
    {
      question: "¿Necesito conocimientos técnicos?",
      answer:
        "No. La plataforma está pensada para negocios que quieren automatizar sin programar. Puedes configurar tu asistente, agregar información y empezar a responder en poco tiempo.",
    },
    {
      question: "¿Puedo usarlo con WhatsApp?",
      answer:
        "Sí. ConversaAI puede integrarse con WhatsApp, redes sociales y sitios web, dependiendo del plan y la configuración que necesite tu negocio.",
    },
    {
      question: "¿Puedo personalizar las respuestas?",
      answer:
        "Sí. Puedes definir el tono de comunicación, cargar información de tu negocio, agregar preguntas frecuentes y establecer reglas para que el asistente responda de forma más alineada a tu marca.",
    },
    {
      question: "¿Sirve para captar clientes?",
      answer:
        "Sí. El asistente puede identificar oportunidades, pedir datos importantes, clasificar prospectos y ayudarte a mantener ordenadas las conversaciones comerciales.",
    },
    {
      question: "¿Tiene planes para empresas?",
      answer:
        "Sí. El plan Empresarial está diseñado para negocios con mayor volumen de conversaciones, varios asistentes, integraciones avanzadas y soporte prioritario.",
    },
  ];

  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="relative py-28 overflow-hidden bg-[#050816]">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(124,58,237,0.16),transparent_30%),radial-gradient(circle_at_80%_70%,rgba(6,182,212,0.13),transparent_28%)]" />

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 35 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.06] backdrop-blur-xl border border-white/10 mb-6">
            <HelpCircle className="w-4 h-4 text-[#06B6D4]" />
            <span className="text-sm text-[#CBD5E1] font-medium">
              Dudas comunes
            </span>
          </div>

          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-[-0.03em]">
            Preguntas{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#A855F7] via-[#2563EB] to-[#06B6D4]">
              frecuentes
            </span>
          </h2>

          <p className="text-[#94A3B8] text-lg">
            Todo lo que necesitas saber antes de empezar con ConversaAI.
          </p>
        </motion.div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.45,
                  delay: index * 0.06,
                }}
                viewport={{ once: true }}
                className={`relative overflow-hidden rounded-2xl backdrop-blur-2xl border transition-all duration-300 ${
                  isOpen
                    ? "bg-white/[0.07] border-[#7C3AED]/40 shadow-[0_0_45px_rgba(124,58,237,0.16)]"
                    : "bg-white/[0.04] border-white/10 hover:bg-white/[0.06]"
                }`}
              >
                <button
                  className="relative z-10 w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                >
                  <span className="font-semibold text-white pr-8">
                    {faq.question}
                  </span>

                  <span
                    className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all duration-300 ${
                      isOpen
                        ? "bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] border-transparent text-white"
                        : "bg-white/[0.05] border-white/10 text-[#94A3B8]"
                    }`}
                  >
                    <ChevronDown
                      className={`w-5 h-5 transition-transform duration-300 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </span>
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="px-6 pb-6 text-[#CBD5E1] leading-relaxed">
                        <p>{faq.answer}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {isOpen && (
                  <div className="absolute inset-0 bg-gradient-to-br from-[#7C3AED]/10 via-transparent to-[#06B6D4]/10 pointer-events-none" />
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
