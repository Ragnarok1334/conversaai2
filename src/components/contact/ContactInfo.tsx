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
                href={`https://mail.google.com/mail/?view=cm&fs=1&to=${CONTACT_INFO.email}&su=Consulta%20sobre%20ConversaAI`}
                target="_blank"
                rel="noopener noreferrer"
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
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" className="w-5 h-5 fill-current">
                <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/>
              </svg>
            </div>
            <div>
              <p className="font-semibold text-white mb-1">Atención rápida por WhatsApp</p>
              {CONTACT_INFO.whatsapp ? (
                <Link 
                  href={CONTACT_INFO.whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-text-soft hover:text-[#25D366] inline-flex items-center gap-1 transition-colors"
                >
                  Escribir por WhatsApp <ArrowUpRight className="w-3 h-3" />
                </Link>
              ) : (
                <div className="flex flex-col">
                  <span className="text-sm text-text-soft opacity-70">Deshabilitado temporalmente</span>
                  <span className="text-[10px] text-text-soft opacity-50">Configurar NEXT_PUBLIC_WHATSAPP_NUMBER</span>
                </div>
              )}
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
