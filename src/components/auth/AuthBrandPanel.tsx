'use client'

import { motion } from 'framer-motion'
import { Bot, MessageSquare, Users, Globe, Send, CheckCircle2, Zap, Shield, TrendingUp, Sparkles, Activity } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

const BENEFITS = [
  { icon: Bot, text: 'Crea asistentes para ventas, soporte o reservas.' },
  { icon: Globe, text: 'Instala Web Chat en tu sitio web en minutos.' },
  { icon: Users, text: 'Captura leads automáticamente sin esfuerzo.' },
]

const TRUST_CHIPS = [
  { icon: Shield, label: 'Sin configuración compleja' },
  { icon: TrendingUp, label: 'Panel en tiempo real' },
  { icon: CheckCircle2, label: 'Asistentes especializados' },
]

export function AuthBrandPanel() {
  return (
    <div className="relative hidden lg:flex flex-col justify-between h-full min-h-screen overflow-hidden bg-[#050816] p-10 xl:p-14">
      {/* Animated background glows */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-brand-violet/25 blur-[140px]" 
        />
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full bg-brand-cyan/20 blur-[120px]" 
        />
      </div>
      
      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.3) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative z-10 flex flex-col gap-10 h-full">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity w-fit">
            <Image src="/logo.png" alt="ConversaAI" width={40} height={40} className="rounded-xl shadow-[0_0_20px_rgba(124,58,237,0.5)]" />
            <span className="text-xl font-bold text-white tracking-tight">ConversaAI</span>
          </Link>
        </motion.div>

        {/* Headline */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="space-y-4 flex-1 flex flex-col justify-center"
        >
          <h2 className="text-3xl xl:text-4xl font-bold text-white leading-tight">
            Convierte conversaciones<br />
            <span className="bg-gradient-to-r from-brand-violet to-brand-cyan bg-clip-text text-transparent">
              en clientes
            </span>
          </h2>
          <p className="text-slate-400 text-base leading-relaxed max-w-sm">
            Crea asistentes IA para vender, atender y capturar leads desde un solo panel.
          </p>

          {/* Live Mock Visual */}
          <div className="relative mt-6 mb-4 w-full max-w-sm">
            {/* Indicadores de estado mock */}
            <div className="flex gap-2 mb-3">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-success/10 border border-brand-success/20 text-[10px] font-semibold text-brand-success">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-success opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-brand-success"></span>
                </span>
                IA activa
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-cyan/10 border border-brand-cyan/20 text-[10px] font-semibold text-brand-cyan">
                <Activity className="w-3 h-3" /> 12 leads hoy
              </span>
            </div>

            {/* Chat flotante mock */}
            <div className="space-y-3">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="bg-white/[0.05] border border-white/10 rounded-2xl rounded-tl-sm p-3 w-[85%] text-sm text-slate-300"
              >
                Hola, ¿tienen disponibilidad para mañana?
              </motion.div>
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 1.5 }}
                className="bg-gradient-to-r from-brand-violet/20 to-brand-cyan/20 border border-brand-cyan/30 rounded-2xl rounded-tr-sm p-3 w-[85%] ml-auto text-sm text-white relative shadow-[0_0_15px_rgba(124,58,237,0.15)]"
              >
                ¡Hola! Sí, tenemos un espacio a las 15:00 hrs. ¿Te gustaría que lo reserve a tu nombre? ✨
                <div className="absolute -bottom-2 -left-2 bg-[#050816] rounded-full p-1 border border-white/10">
                  <Sparkles className="w-3 h-3 text-brand-cyan" />
                </div>
              </motion.div>
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 2.5 }}
                className="flex items-center justify-center gap-2 mt-4"
              >
                 <div className="bg-brand-success/10 border border-brand-success/20 px-3 py-1.5 rounded-full text-xs font-medium text-brand-success flex items-center gap-1.5 shadow-lg">
                    <Users className="w-3 h-3" /> Nuevo lead capturado
                 </div>
              </motion.div>
            </div>
          </div>

          {/* Trust chips */}
          <div className="flex flex-wrap gap-2 pt-4">
            {TRUST_CHIPS.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs text-slate-400">
                <Icon className="w-3.5 h-3.5 text-brand-violet" />
                {label}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Footer quote */}
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-xs text-slate-600"
        >
          © {new Date().getFullYear()} ConversaAI · Todos los derechos reservados
        </motion.p>
      </div>
    </div>
  )
}
