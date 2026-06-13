"use client";

import { Bot, Code2, Users, LayoutDashboard } from "lucide-react";

export function AboutSection() {
  const cards = [
    {
      icon: <Bot className="w-6 h-6 text-[#06B6D4]" />,
      title: "Asistentes IA personalizados",
      desc: "Entrénalos con servicios, horarios, precios y reglas de atención."
    },
    {
      icon: <Code2 className="w-6 h-6 text-[#8b5cf6]" />,
      title: "Web Chat para tu sitio",
      desc: "Instala el asistente en tu página para atender visitantes."
    },
    {
      icon: <Users className="w-6 h-6 text-[#22C55E]" />,
      title: "Captura de leads",
      desc: "Guarda datos de contacto e intereses de clientes potenciales."
    },
    {
      icon: <LayoutDashboard className="w-6 h-6 text-[#F59E0B]" />,
      title: "Panel centralizado",
      desc: "Gestiona asistentes, conversaciones, leads, planes y soporte."
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
              ¿Qué hace ConversaAI?
            </h2>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-3xl mx-auto">
              ConversaAI ayuda a negocios a automatizar parte de su atención digital mediante asistentes IA entrenados con información del negocio. Los asistentes pueden atender visitantes, responder dudas comunes, recopilar datos de clientes interesados y organizar conversaciones para seguimiento comercial.
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
