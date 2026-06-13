"use client";

import { ShieldCheck } from "lucide-react";

export function OAuthDisclaimer() {
  return (
    <section className="relative py-16 bg-[#050816] border-t border-white/5">
      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-3xl mx-auto bg-brand-cyan/5 border border-brand-cyan/20 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row gap-6 items-start md:items-center">
          <div className="w-12 h-12 rounded-full bg-brand-cyan/10 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-6 h-6 text-brand-cyan" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white mb-2">
              Inicio de sesión con Google o Facebook
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              ConversaAI permite iniciar sesión con Google o Facebook para facilitar el acceso seguro a la cuenta. Cuando usas estos métodos, ConversaAI puede recibir tu nombre y correo electrónico para crear o iniciar sesión en tu cuenta. No publicamos contenido en tus redes sociales, no accedemos a mensajes privados y no solicitamos permisos innecesarios.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
