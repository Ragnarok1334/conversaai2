import { Mail, MessageCircle, Send, Clock, ArrowUpRight } from "lucide-react"
import Link from "next/link"
import { CONTACT_INFO } from "@/lib/contact"

export function ContactInfo() {
  return (
    <div className="bg-card-bg/80 backdrop-blur-2xl border border-card-border rounded-[2rem] p-8 md:p-10 shadow-2xl relative overflow-hidden h-full">
      <div className="absolute top-0 right-0 w-64 h-64 bg-brand-violet/5 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand-cyan/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="relative z-10">
        <h3 className="text-2xl font-bold text-white mb-3">Hablemos de tu proyecto</h3>
        <p className="text-text-secondary mb-10 text-sm leading-relaxed">
          Cuéntanos qué quieres automatizar y te ayudaremos a elegir la mejor solución para tu negocio.
        </p>

        <div className="space-y-6">
          {/* Email */}
          <div className="flex gap-4 group">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-text-soft shrink-0 group-hover:bg-brand-violet/10 group-hover:text-brand-violet transition-colors">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-white mb-1">{CONTACT_INFO.email}</p>
              <Link 
                href={`mailto:${CONTACT_INFO.email}`}
                className="text-sm text-text-soft hover:text-brand-violet inline-flex items-center gap-1 transition-colors"
              >
                Enviar correo <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          <div className="h-px w-full bg-white/[0.05]" />

          {/* WhatsApp */}
          <div className="flex gap-4 group">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-text-soft shrink-0 group-hover:bg-[#25D366]/10 group-hover:text-[#25D366] transition-colors">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-white mb-1">Atención rápida por WhatsApp</p>
              <Link 
                href={CONTACT_INFO.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-text-soft hover:text-[#25D366] inline-flex items-center gap-1 transition-colors"
              >
                Escribir por WhatsApp <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          <div className="h-px w-full bg-white/[0.05]" />

          {/* Telegram */}
          <div className="flex gap-4 group">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-text-soft shrink-0 group-hover:bg-[#0088cc]/10 group-hover:text-[#0088cc] transition-colors">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-white mb-1">También puedes escribirnos por Telegram</p>
              <Link 
                href={CONTACT_INFO.telegram}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-text-soft hover:text-[#0088cc] inline-flex items-center gap-1 transition-colors"
              >
                Abrir Telegram <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          <div className="h-px w-full bg-white/[0.05]" />

          {/* Schedule */}
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-text-soft shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div className="flex flex-col justify-center">
              <p className="font-semibold text-white mb-1">Horario de atención</p>
              <p className="text-sm text-text-soft">{CONTACT_INFO.schedule}</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
