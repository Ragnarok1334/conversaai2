"use client";

import { motion } from "framer-motion";
import { MiniChart } from "@/components/MiniChart";
import {
  Clock,
  MessageSquare,
  TrendingUp,
  Sparkles,
  Send,
  CheckCircle2,
  Users,
  Globe,
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

import { TypeAnimation } from "react-type-animation";
import { Particles } from "@/components/magicui/particles";
import { BlurFade } from "@/components/magicui/blur-fade";
import { AnimatedGradientText } from "@/components/magicui/animated-gradient-text";
import { ShimmerButton } from "@/components/magicui/shimmer-button";
import { AuroraText } from "@/components/ui/aurora-text";

export function Hero() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      setIsLoggedIn(!!data.session);
    });
  }, []);

  return (
    <section className="relative min-h-screen pt-32 pb-24 flex items-center overflow-hidden bg-[#050816]">
      <Particles
        className="absolute inset-0 z-0 pointer-events-none"
        quantity={60}
        ease={80}
        color="#ffffff"
      />
      
      {/* Premium Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(124,58,237,0.22),transparent_32%),radial-gradient(circle_at_80%_30%,rgba(6,182,212,0.18),transparent_30%),linear-gradient(135deg,#050816_0%,#0B1026_45%,#111C44_100%)]" />

      {/* Grid Effect */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:linear-gradient(to_bottom,black,transparent)]" />

      {/* Glow Effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#7C3AED]/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#06B6D4]/20 rounded-full blur-[120px]" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-14 items-center">

          {/* LEFT SIDE */}
          <div className="flex flex-col gap-5">
            <BlurFade delay={0.1}>
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] backdrop-blur-xl border border-white/10 w-fit shadow-[0_0_20px_rgba(124,58,237,0.1)]">
                <Sparkles className="w-3.5 h-3.5 text-[#06B6D4]" />
                <span className="text-xs font-semibold text-white/80">
                  Plataforma SaaS de asistentes IA para negocios
                </span>
              </div>
            </BlurFade>

            <BlurFade delay={0.2}>
              {/* Title */}
              <h1 className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl max-w-2xl">
                 Atiende clientes con IA y convierte{" "}
                 <AuroraText
                   colors={["#8b5cf6", "#06b6d4", "#3b82f6", "#a855f7"]}
                   speed={1}
                >
                   conversaciones en leads
                 </AuroraText>
               </h1>
            </BlurFade>

            <BlurFade delay={0.3}>
              {/* Description */}
              <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
                ConversaAI es una plataforma SaaS que permite crear asistentes de inteligencia artificial para responder preguntas, capturar datos de contacto y gestionar conversaciones desde un panel centralizado.
              </p>
            </BlurFade>

            <BlurFade delay={0.4}>
              {/* Buttons */}
              <div className="flex flex-wrap items-center gap-4 mt-2">
                <Link href={isLoggedIn ? "/dashboard/create-assistant" : "/register"}>
                  <ShimmerButton className="font-semibold text-lg" shimmerColor="#A855F7" background="linear-gradient(90deg, #7C3AED, #2563EB, #06B6D4)">
                    Comenzar gratis
                  </ShimmerButton>
                </Link>
                <Link href="/#como-funciona" className="px-8 py-4 rounded-[100px] bg-white/[0.06] border border-white/10 text-white font-semibold text-lg hover:bg-white/10 transition-colors">
                  Ver cómo funciona
                </Link>
              </div>
              <div className="mt-4 text-sm text-[#94A3B8] max-w-xl">
                <p>Puedes iniciar sesión con correo, Google o Facebook. Si usas Google o Facebook, solo utilizamos tu nombre y correo electrónico para crear o acceder a tu cuenta.</p>
                <Link href="/privacidad" className="text-[#06B6D4] hover:text-white transition-colors inline-block mt-2">
                  Política de Privacidad &rarr;
                </Link>
              </div>
            </BlurFade>

            <BlurFade delay={0.5}>
              {/* Small Info */}
              <div className="flex flex-wrap items-center gap-4 mt-6 border-t border-white/10 pt-6">
                <div className="flex items-center gap-1.5 text-sm text-[#94A3B8]">
                  <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
                  <span>Sin código complejo</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-[#94A3B8]">
                  <Clock className="w-4 h-4 text-[#22C55E]" />
                  <span>Respuestas 24/7</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-[#94A3B8]">
                  <Users className="w-4 h-4 text-[#22C55E]" />
                  <span>Captura de leads</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-[#94A3B8]">
                  <Globe className="w-4 h-4 text-[#22C55E]" />
                  <span>Instalación Web Chat</span>
                </div>
              </div>
            </BlurFade>
          </div>

          {/* RIGHT SIDE */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            {/* Dashboard */}
            <div className="relative rounded-[2rem] bg-white/[0.06] backdrop-blur-2xl border border-white/10 shadow-[0_0_80px_rgba(6,182,212,0.18)] p-5 overflow-hidden">

              {/* Internal Glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-cyan-500/10 pointer-events-none" />

              <div className="absolute -top-24 -right-24 w-56 h-56 bg-cyan-400/20 blur-[80px] rounded-full" />

              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] p-[2px]">
                    <div className="w-full h-full bg-[#050816] rounded-full flex items-center justify-center text-xs font-bold text-white">
                      AI
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-white">
                      Asistente ConversaAI
                    </h3>

                    <p className="text-xs text-[#22C55E] flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
                      En línea
                    </p>
                  </div>
                </div>
              </div>

              {/* Chat */}
              <div className="flex flex-col gap-4 mb-5 relative z-10">

                <div className="self-end bg-[#7C3AED]/20 border border-[#7C3AED]/30 rounded-2xl rounded-tr-none p-4 max-w-[80%]">
                  <p className="text-sm text-white">
                    Hola, quiero saber cómo puede ayudarme el asistente.
                  </p>
                </div>

                <div className="self-start bg-white/[0.05] border border-white/10 rounded-2xl rounded-tl-none p-4 max-w-[80%]">
                  <TypeAnimation
  sequence={[
    "¡Claro! ConversaAI responde preguntas frecuentes, captura datos de contacto y organiza conversaciones para que puedas dar seguimiento desde tu panel.",
    4000,
    "Puedes entrenarlo con información de tu negocio e instalarlo como Web Chat en tu sitio.",
    4000,
  ]}
  wrapper="p"
  speed={55}
  repeat={Infinity}
  className="text-sm text-[#CBD5E1] leading-relaxed"
/>
                </div>
              </div>

              {/* Input */}
              <div className="relative z-10">
                <input
                  type="text"
                  disabled
                  placeholder="Escribe un mensaje..."
                  className="w-full bg-[#050816]/80 border border-white/10 rounded-xl py-4 px-4 text-sm text-[#94A3B8] outline-none"
                />

                <button className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] rounded-lg text-white shadow-lg">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Floating Card 1 */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{
                repeat: Infinity,
                duration: 4,
                ease: "easeInOut",
              }}
              className="absolute -left-10 top-10 bg-white/[0.06] backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-[0_0_40px_rgba(124,58,237,0.18)] hidden md:block"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#22C55E]/20 rounded-xl text-[#22C55E]">
                  <TrendingUp className="w-5 h-5" />
                </div>

                <div>
                  <p className="text-xs text-[#94A3B8]">
                    Leads captados
                  </p>
                  <MiniChart />

                  <p className="font-bold text-lg text-white">
                    +340 esta semana
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Floating Card 2 */}
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{
                repeat: Infinity,
                duration: 5,
                ease: "easeInOut",
              }}
              className="absolute -right-8 bottom-20 bg-white/[0.06] backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-[0_0_40px_rgba(6,182,212,0.18)] hidden md:block"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#06B6D4]/20 rounded-xl text-[#06B6D4]">
                  <Clock className="w-5 h-5" />
                </div>

                <div>
                  <p className="text-xs text-[#94A3B8]">
                    Tiempo ahorrado
                  </p>

                  <p className="font-bold text-lg text-white">
                    45 horas
                  </p>
                </div>
              </div>
            </motion.div>

          </motion.div>
        </div>
      </div>
    </section>
  );
}