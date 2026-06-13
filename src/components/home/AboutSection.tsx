"use client";

import { CheckCircle2, MessageSquare, ShieldCheck } from "lucide-react";

export function AboutSection() {
  return (
    <section className="relative py-24 bg-[#050816] overflow-hidden" id="about">
      {/* Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1000px] h-[400px] bg-brand-violet/5 blur-[120px] pointer-events-none rounded-full" />
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 tracking-tight">
              ¿Qué es ConversaAI?
            </h2>
            <p className="text-lg md:text-xl text-slate-300 leading-relaxed">
              ConversaAI es una plataforma SaaS que permite crear asistentes de inteligencia artificial para atender clientes, responder preguntas frecuentes, gestionar conversaciones y capturar leads desde un sitio web. La plataforma está pensada para negocios que quieren automatizar parte de su atención y mejorar el seguimiento de sus clientes desde un panel centralizado.
            </p>
          </div>

          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-10 shadow-2xl">
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                "Crea asistentes IA entrenados con información de tu negocio.",
                "Instala un Web Chat en tu sitio web.",
                "Gestiona conversaciones y leads desde el panel.",
                "Revisa diagnósticos, planes y estado de tus asistentes.",
                "Usa inicio de sesión seguro con correo, Google o Facebook.",
              ].map((bullet, idx) => (
                <li key={idx} className="flex items-start gap-4">
                  <div className="mt-1 w-6 h-6 rounded-full bg-brand-cyan/10 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-brand-cyan" />
                  </div>
                  <span className="text-slate-300 leading-relaxed">{bullet}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
