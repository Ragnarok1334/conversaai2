'use client'

import { motion } from 'framer-motion'
import { Code2, Send, MessageCircle, Camera, MessagesSquare, CheckCircle2, Clock3 } from 'lucide-react'
import { BuilderFormData } from './types'

interface Props {
  form: BuilderFormData
  setForm: (form: BuilderFormData) => void
  currentPlan: string
}

const futureChannels = [
  { key: 'instagram', name: 'Instagram', detail: 'Respuestas a mensajes directos de la cuenta comercial.', icon: Camera, color: 'text-pink-500 bg-pink-500/10', group: 'Meta' },
  { key: 'facebook', name: 'Facebook', detail: 'Atención automatizada para mensajes de Messenger.', icon: MessagesSquare, color: 'text-blue-500 bg-blue-500/10', group: 'Meta' },
  { key: 'telegram', name: 'Telegram', detail: 'Conexión mediante un bot administrado por el negocio.', icon: Send, color: 'text-sky-500 bg-sky-500/10', group: 'Bot API' },
] as const

export function ChannelsStep({ form }: Props) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="bg-card-bg/60 backdrop-blur border border-white/10 rounded-3xl p-6 lg:p-8 shadow-xl">
        <div className="border-b border-white/[0.06] pb-4 mb-5">
          <h2 className="font-semibold text-xl mb-1 text-white">Canales</h2>
          <p className="text-sm text-slate-400">El asistente nace con Web Chat. Los demás canales se conectarán después sin volver a entrenarlo.</p>
        </div>

        <div className="rounded-2xl p-5 border border-brand-cyan/30 bg-brand-cyan/[0.06] mb-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-cyan/10 flex items-center justify-center shrink-0"><Code2 className="w-5 h-5 text-brand-cyan" /></div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-white">Web Chat</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-success/10 border border-brand-success/20 text-brand-success font-bold">DISPONIBLE</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">Widget para sitios web. Después de crear el asistente podrás copiar el script y autorizar el dominio.</p>
              </div>
            </div>
            {form.channels.webchat.enabled && <CheckCircle2 className="w-5 h-5 text-brand-success shrink-0" />}
          </div>
        </div>

        <div className="mb-3">
          <h3 className="text-sm font-semibold text-white">Canales adicionales</h3>
          <p className="text-xs text-slate-400 mt-1">WhatsApp se conecta después de crear el asistente. Los demás canales siguen en preparación.</p>
        </div>

        <div className="mb-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-4">
          <div className="flex items-start gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500"><MessageCircle className="h-4.5 w-4.5" /></div><div><div className="flex flex-wrap items-center gap-2"><h4 className="text-sm font-semibold text-white">WhatsApp Business</h4><span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-emerald-500">PLAN NEGOCIO O SUPERIOR</span></div><p className="mt-1 text-xs leading-relaxed text-slate-400">Usa el mismo entrenamiento para responder mensajes, capturar leads y derivar a una persona.</p></div></div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          {futureChannels.map((channel) => {
            const Icon = channel.icon
            return (
              <div key={channel.key} className="rounded-2xl p-4 border border-white/[0.07] bg-white/[0.02]">
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${channel.color}`}><Icon className="w-4.5 h-4.5" /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-semibold text-white">{channel.name}</h4>
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-slate-400">{channel.group}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{channel.detail}</p>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-3"><Clock3 className="w-3 h-3" /> En preparación</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </motion.div>
  )
}
