"use client";

import { motion } from "framer-motion";
import { MiniChart } from "@/components/MiniChart";
import {
  Clock,
  MessageSquare,
  TrendingUp,
  Sparkles,
  Send,
} from "lucide-react";

import { TypeAnimation } from "react-type-animation";
import { ParticlesBackground } from "@/components/ParticlesBackground";

export function Hero() {
  return (
    <section className="relative min-h-screen pt-32 pb-24 flex items-center overflow-hidden bg-[#050816]">

      <ParticlesBackground />
      
      {/* Premium Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(124,58,237,0.22),transparent_32%),radial-gradient(circle_at_80%_30%,rgba(6,182,212,0.18),transparent_30%),linear-gradient(135deg,#050816_0%,#0B1026_45%,#111C44_100%)]" />

      {/* Grid Effect */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:linear-gradient(to_bottom,black,transparent)]" />

      {/* Glow Effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#7C3AED]/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#06B6D4]/20 rounded-full blur-[120px]" />

      <div className="container mx-auto px-4 md:px-6 relative z-[2]">
        <div className="grid lg:grid-cols-2 gap-14 items-center">

          {/* LEFT SIDE */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="flex flex-col gap-7"
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.06] backdrop-blur-xl border border-white/10 w-fit shadow-[0_0_30px_rgba(124,58,237,0.15)]">
              <Sparkles className="w-4 h-4 text-[#06B6D4]" />
              <span className="text-sm font-medium text-[#CBD5E1]">
                IA para ventas y atención
              </span>
            </div>

            {/* Title */}
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight tracking-[-0.04em]">
              Automatiza tus{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#A855F7] via-[#2563EB] to-[#06B6D4] drop-shadow-[0_0_25px_rgba(168,85,247,0.35)]">
                conversaciones
              </span>{" "}
              con inteligencia artificial
            </h1>

            {/* Description */}
            <p className="text-lg text-[#CBD5E1] max-w-xl leading-relaxed">
              ConversaAI ayuda a tu negocio a responder clientes, captar
              prospectos y cerrar más ventas las 24 horas con asistentes
              inteligentes.
            </p>

            {/* Buttons */}
            <div className="flex flex-wrap items-center gap-4 mt-2">
              <button className="px-8 py-4 rounded-2xl text-white font-semibold text-lg bg-gradient-to-r from-[#7C3AED] via-[#2563EB] to-[#06B6D4] hover:scale-105 transition-all duration-300 shadow-[0_0_40px_rgba(124,58,237,0.45)] flex items-center gap-2">
                Probar ConversaAI
              </button>

              <button className="px-8 py-4 rounded-2xl bg-white/[0.06] backdrop-blur-xl border border-white/10 text-white font-semibold text-lg hover:bg-white/10 transition-all duration-300">
                Ver funciones
              </button>
            </div>

            {/* Small Info */}
            <div className="flex flex-wrap items-center gap-6 mt-4">
              <div className="flex items-center gap-2 text-sm text-[#94A3B8]">
                <Clock className="w-4 h-4 text-[#A855F7]" />
                <span>Disponible 24/7</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-[#94A3B8]">
                <MessageSquare className="w-4 h-4 text-[#06B6D4]" />
                <span>Atención automática</span>
              </div>
            </div>
          </motion.div>

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
                    ¡Hola! Me gustaría saber el precio del plan Pro.
                  </p>
                </div>

                <div className="self-start bg-white/[0.05] border border-white/10 rounded-2xl rounded-tl-none p-4 max-w-[80%]">
                  <TypeAnimation
  sequence={[
    "¡Hola! 👋 El plan Pro cuesta $49/mes e incluye integraciones con WhatsApp, respuestas ilimitadas y soporte prioritario.",
    2000,
    "También puedes entrenar tu asistente con documentos y automatizar conversaciones las 24 horas.",
    2000,
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