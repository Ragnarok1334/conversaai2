'use client'

import { motion } from 'framer-motion'
import { Code2, Send, MessageSquare } from 'lucide-react'
import { BuilderFormData } from './types'

interface Props {
  form: BuilderFormData
  setForm: (form: BuilderFormData) => void
  currentPlan: string
}

export function ChannelsStep({ form, setForm, currentPlan }: Props) {
  const isProOrAbove = currentPlan === 'pro' || currentPlan === 'business' || currentPlan === 'enterprise'

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
          </div>

          {/* Telegram */}
          <div className={`bg-white/[0.02] border border-white/5 rounded-2xl p-5 transition-all ${isProOrAbove ? 'hover:border-brand-violet/30' : 'opacity-80'}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-violet/10 flex items-center justify-center">
                  <Send className="w-5 h-5 text-brand-violet" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Telegram</h3>
                  <p className="text-xs text-slate-400">Conecta tu bot de Telegram.</p>
                </div>
              </div>
              
              {isProOrAbove ? (
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs font-medium text-slate-400 mr-2">Disponible</span>
                  <input type="checkbox" className="hidden" checked={form.channels.telegram.enabled} onChange={(e) => updateChannel('telegram', 'enabled', e.target.checked)} />
                  <div className={`w-10 h-5 rounded-full transition-colors flex items-center px-0.5 ${form.channels.telegram.enabled ? 'bg-brand-violet' : 'bg-slate-700'}`}>
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${form.channels.telegram.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                  </div>
                </label>
              ) : (
                <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-medium text-slate-400">
                  Desde plan Pro
                </span>
              )}
            </div>
            
            {isProOrAbove && form.channels.telegram.enabled && (
              <div className="pt-4 border-t border-white/5">
                <label className="text-xs font-medium text-slate-300 block mb-1">Token de Telegram BotFather</label>
                <input
                  type="text"
                  value={form.channels.telegram.token}
                  onChange={(e) => updateChannel('telegram', 'token', e.target.value)}
                  placeholder="123456789:ABCDEF..."
                  className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-violet/60 focus:ring-1 focus:ring-brand-violet/20"
                />
              </div>
            )}
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
