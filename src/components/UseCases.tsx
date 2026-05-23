"use client";

import { ShoppingBag, Stethoscope, Home, Briefcase, User, Store, Coffee, Scissors, Dumbbell, GraduationCap, Server } from "lucide-react";
import { Marquee } from "@/components/magicui/marquee";
import { BlurFade } from "@/components/magicui/blur-fade";

const cases = [
  { icon: <Scissors className="w-5 h-5 text-brand-pink" />, title: "Barberías y Estéticas" },
  { icon: <Stethoscope className="w-5 h-5 text-brand-cyan" />, title: "Clínicas y Consultorios" },
  { icon: <Coffee className="w-5 h-5 text-brand-blue" />, title: "Restaurantes" },
  { icon: <ShoppingBag className="w-5 h-5 text-brand-violet" />, title: "Tiendas online (E-commerce)" },
  { icon: <Briefcase className="w-5 h-5 text-brand-purple" />, title: "Agencias" },
  { icon: <Home className="w-5 h-5 text-brand-success" />, title: "Inmobiliarias" },
  { icon: <GraduationCap className="w-5 h-5 text-yellow-500" />, title: "Escuelas y Cursos" },
  { icon: <Store className="w-5 h-5 text-orange-500" />, title: "Servicios a domicilio" },
  { icon: <Dumbbell className="w-5 h-5 text-red-500" />, title: "Gimnasios" },
  { icon: <Server className="w-5 h-5 text-slate-400" />, title: "Soporte técnico" },
];

export function UseCases() {
  const firstRow = cases.slice(0, Math.ceil(cases.length / 2));
  const secondRow = cases.slice(Math.ceil(cases.length / 2));

  return (
    <section className="py-24 bg-[#050816] relative border-y border-white/5 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0B1026]/50 to-transparent pointer-events-none" />
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <BlurFade delay={0.2}>
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Pensado para negocios que reciben mensajes todos los días
            </h2>
            <p className="text-text-secondary text-lg">
              No importa tu industria, si hablas con clientes, ConversaAI puede ayudarte.
            </p>
          </div>
        </BlurFade>

        <BlurFade delay={0.4}>
          <div className="relative flex w-full flex-col items-center justify-center overflow-hidden">
            <Marquee pauseOnHover className="[--duration:40s]">
              {firstRow.map((useCase, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 px-6 py-4 rounded-full bg-white/[0.03] border border-white/10 hover:bg-white/[0.08] hover:border-white/20 transition-all cursor-default"
                >
                  {useCase.icon}
                  <span className="text-white font-medium whitespace-nowrap">
                    {useCase.title}
                  </span>
                </div>
              ))}
            </Marquee>
            <Marquee reverse pauseOnHover className="[--duration:40s] mt-4">
              {secondRow.map((useCase, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 px-6 py-4 rounded-full bg-white/[0.03] border border-white/10 hover:bg-white/[0.08] hover:border-white/20 transition-all cursor-default"
                >
                  {useCase.icon}
                  <span className="text-white font-medium whitespace-nowrap">
                    {useCase.title}
                  </span>
                </div>
              ))}
            </Marquee>
            <div className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-[#050816] dark:from-background"></div>
            <div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-[#050816] dark:from-background"></div>
          </div>
        </BlurFade>
      </div>
    </section>
  );
}
