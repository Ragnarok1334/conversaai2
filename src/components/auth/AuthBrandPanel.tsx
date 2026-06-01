'use client'

import { Bot, MessageSquare, Users, Globe, Send, CheckCircle2, Zap, Shield, TrendingUp } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

const BENEFITS = [
  { icon: Bot, text: 'Crea asistentes para ventas, soporte o reservas.' },
  { icon: Globe, text: 'Instala Web Chat en tu sitio web en minutos.' },
  { icon: Users, text: 'Captura leads automáticamente sin esfuerzo.' },
  { icon: MessageSquare, text: 'Revisa conversaciones en tiempo real.' },
  { icon: Send, text: 'Conecta Telegram según tu plan.' },
  { icon: Zap, text: 'Automatiza respuestas las 24 horas.' },
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
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-brand-violet/25 blur-[140px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full bg-brand-cyan/20 blur-[120px]" />
      </div>
      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.3) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative z-10 flex flex-col gap-10 h-full">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity w-fit">
          <Image src="/logo.png" alt="ConversaAI" width={40} height={40} className="rounded-xl shadow-[0_0_20px_rgba(124,58,237,0.5)]" />
          <span className="text-xl font-bold text-white tracking-tight">ConversaAI</span>
        </Link>

        {/* Headline */}
        <div className="space-y-4 flex-1 flex flex-col justify-center">
          <h2 className="text-3xl xl:text-4xl font-bold text-white leading-tight">
            Automatiza tu atención<br />
            <span className="bg-gradient-to-r from-brand-violet to-brand-cyan bg-clip-text text-transparent">
              desde el primer día
            </span>
          </h2>
          <p className="text-slate-400 text-base leading-relaxed max-w-sm">
            Crea asistentes IA, captura leads y responde clientes desde un solo panel.
          </p>

          {/* Benefits list */}
          <ul className="space-y-3 pt-2">
            {BENEFITS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-brand-cyan" />
                </div>
                <span className="text-sm text-slate-300">{text}</span>
              </li>
            ))}
          </ul>

          {/* Trust chips */}
          <div className="flex flex-wrap gap-2 pt-4">
            {TRUST_CHIPS.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs text-slate-400">
                <Icon className="w-3.5 h-3.5 text-brand-violet" />
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Footer quote */}
        <p className="text-xs text-slate-600">
          © {new Date().getFullYear()} ConversaAI · Todos los derechos reservados
        </p>
      </div>
    </div>
  )
}
