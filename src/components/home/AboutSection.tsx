"use client";

import { Bot, Code2, Users, LayoutDashboard } from "lucide-react";

export function AboutSection() {
  const cards = [
    {
      icon: <Bot className="w-6 h-6 text-[#06B6D4]" />,
      title: "Crea asistentes IA",
      desc: "Entrena asistentes con información real de tu negocio, servicios, horarios, precios y reglas de atención."
    },
    {
      icon: <Code2 className="w-6 h-6 text-[#8b5cf6]" />,
      title: "Instala Web Chat",
      desc: "Agrega el asistente a tu sitio web para atender visitantes y responder dudas de forma automática."
    },
    {
      icon: <Users className="w-6 h-6 text-[#22C55E]" />,
      title: "Captura leads",
      desc: "Guarda datos de contacto, intereses y conversaciones importantes para dar seguimiento comercial."
    },
    {
      icon: <LayoutDashboard className="w-6 h-6 text-[#F59E0B]" />,
      title: "Gestiona desde el panel",
      desc: "Revisa asistentes, conversaciones, leads, diagnósticos, planes y soporte desde un dashboard centralizado."
    }
  ];

  return (
    <section className="relative py-20 bg-[#050816] overflow-hidden" id="about">
      {/* Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1000px] h-[300px] bg-brand-violet/5 blur-[120px] pointer-events-none rounded-full" />
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
              ¿Qué es ConversaAI?
            </h2>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-3xl mx-auto">
              ConversaAI es una plataforma SaaS que ayuda a negocios a crear asistentes de inteligencia artificial para atender clientes, responder preguntas frecuentes y capturar leads desde su sitio web.
            </p>
            <p className="mt-3 text-sm text-[#94A3B8]">
              Desde un solo panel puedes configurar tus asistentes, gestionar conversaciones, revisar clientes potenciales, controlar dominios autorizados y administrar tu plan.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {cards.map((card, idx) => (
              <div key={idx} className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-[0_0_30px_rgba(0,0,0,0.5)] hover:bg-white/[0.05] transition-all duration-300">
                <div className="w-12 h-12 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center mb-5">
                  {card.icon}
                </div>
                <h3 className="text-white font-semibold mb-2">{card.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
