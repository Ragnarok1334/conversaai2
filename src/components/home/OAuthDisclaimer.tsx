"use client";

import { ShieldCheck } from "lucide-react";

import Link from "next/link";

export function OAuthDisclaimer() {
  return (
    <section className="relative py-16 bg-[#050816] border-t border-white/5">
      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-3xl mx-auto bg-gradient-to-br from-brand-cyan/5 to-brand-violet/5 border border-white/10 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row gap-6 items-start shadow-[0_0_40px_rgba(6,182,212,0.05)]">
          <div className="w-12 h-12 rounded-full bg-brand-cyan/10 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-6 h-6 text-brand-cyan" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-white mb-3">
              Inicio de sesión seguro
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed mb-4">
              ConversaAI permite crear o acceder a una cuenta usando correo, Google o Facebook. Cuando eliges Google o Facebook, utilizamos únicamente tu nombre y correo electrónico para autenticarte y asociar tu acceso con tu cuenta.
            </p>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-400 mb-5">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-cyan" />
                No publicamos en tus redes sociales.
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-cyan" />
                No leemos mensajes privados.
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-cyan" />
                No solicitamos permisos de Gmail, Drive, Calendar ni contactos.
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-cyan" />
                Puedes revisar más detalles en nuestra Política de Privacidad.
              </li>
            </ul>
            <Link href="/privacidad" className="text-sm font-semibold text-brand-cyan hover:text-white transition-colors flex items-center gap-1 w-fit">
              Ver Política de Privacidad <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
