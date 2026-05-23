"use client";

import { NumberTicker } from "@/components/magicui/number-ticker";
import { BlurFade } from "@/components/magicui/blur-fade";

export function Stats() {
  return (
    <section className="py-20 bg-[#050816] relative border-y border-white/5">
      <div className="container mx-auto px-4">
        <BlurFade delay={0.2}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4 divide-x divide-white/5">
            <div className="flex flex-col items-center justify-center text-center px-4">
              <span className="text-4xl md:text-5xl font-bold text-white mb-2">
                24/7
              </span>
              <span className="text-sm text-text-soft">Atención automática</span>
            </div>
            
            <div className="flex flex-col items-center justify-center text-center px-4">
              <span className="text-4xl md:text-5xl font-bold text-white mb-2 flex items-center">
                <NumberTicker value={50000} className="text-white" />+
              </span>
              <span className="text-sm text-text-soft">Mensajes al mes en Business</span>
            </div>

            <div className="flex flex-col items-center justify-center text-center px-4">
              <span className="text-4xl md:text-5xl font-bold text-white mb-2 flex items-center">
                <NumberTicker value={20} className="text-white" />+
              </span>
              <span className="text-sm text-text-soft">Asistentes IA en Business</span>
            </div>

            <div className="flex flex-col items-center justify-center text-center px-4">
              <span className="text-4xl md:text-5xl font-bold text-white mb-2">
                <NumberTicker value={3} className="text-white" />
              </span>
              <span className="text-sm text-text-soft">Canales principales</span>
            </div>
          </div>
        </BlurFade>
      </div>
    </section>
  );
}
