'use client'

import { motion } from 'framer-motion'
import { Code2, Send, MessageSquare, AlertTriangle } from 'lucide-react'
import { BuilderFormData } from './types'

interface Props {
  form: BuilderFormData
  setForm: (form: BuilderFormData) => void
  currentPlan: string // Kept for backwards compatibility if needed by parent
}

export function ChannelsStep({ form, setForm, currentPlan }: Props) {
  const updateChannel = (channel: keyof BuilderFormData['channels'], field: string, value: any) => {
    setForm({
      ...form,
      channels: {
        ...form.channels,
        [channel]: { ...form.channels[channel], [field]: value }
      }
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="bg-card-bg/60 backdrop-blur border border-white/10 rounded-3xl p-6 lg:p-8 space-y-6 shadow-xl">
        <div className="border-b border-white/[0.06] pb-4">
          <h2 className="font-semibold text-xl mb-1 text-white">Conecta tus canales</h2>
          <p className="text-sm text-slate-400">Publica tu asistente donde tus clientes ya te escriben.</p>
        </div>

        <div className="space-y-4">
          {/* Web Chat */}
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 hover:border-brand-cyan/30 transition-all">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-cyan/10 flex items-center justify-center">
                  <Code2 className="w-5 h-5 text-brand-cyan" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Web Chat</h3>
                  <p className="text-xs text-slate-400">Instala un widget en tu sitio web.</p>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs font-medium text-slate-400 mr-2">Disponible</span>
                <input type="checkbox" className="hidden" checked={form.channels.webchat.enabled} onChange={(e) => updateChannel('webchat', 'enabled', e.target.checked)} />
                <div className={`w-10 h-5 rounded-full transition-colors flex items-center px-0.5 ${form.channels.webchat.enabled ? 'bg-brand-cyan' : 'bg-slate-700'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ${form.channels.webchat.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
              </label>
            </div>
            {!form.channels.webchat.enabled && (
               <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs flex gap-2">
                 <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                 Web Chat es el único canal disponible actualmente. Si lo desactivas, tu asistente no tendrá un canal funcional.
               </div>
            )}
          </div>

          {/* Telegram */}
          <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-5 opacity-60 pointer-events-none">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-violet/10 flex items-center justify-center">
                  <Send className="w-5 h-5 text-brand-violet" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Telegram</h3>
                  <p className="text-xs text-slate-400">Telegram estará disponible próximamente para planes compatibles.</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-brand-violet/10 border border-brand-violet/20 rounded-full text-xs font-bold text-brand-violet">
                PRÓXIMAMENTE
              </span>
            </div>
          </div>

          {/* WhatsApp */}
          <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-5 opacity-60 pointer-events-none">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">WhatsApp</h3>
                  <p className="text-xs text-slate-400">Integración con WhatsApp API.</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-xs font-bold text-emerald-500">
                PRÓXIMAMENTE
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
