import { motion, AnimatePresence } from 'framer-motion'
import { X, Globe, MessageCircle, Send, CheckCircle2, Lock } from 'lucide-react'
import Link from 'next/link'
import type { PlanKey } from '@/lib/plans'

interface AssistantInstallModalProps {
  open: boolean
  onClose: () => void
  assistantId: string
  plan: PlanKey
  planLimits: { channels: { whatsapp: boolean; telegram: boolean } }
  assistantChannels: Array<{ channel: string }>
}

export function AssistantInstallModal({
  open, onClose, assistantId, planLimits, assistantChannels
}: AssistantInstallModalProps) {
  if (!open) return null

  const hasWebchat = assistantChannels.some(c => c.channel === 'webchat')
  const hasTelegram = assistantChannels.some(c => c.channel === 'telegram')

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        style={{ background: 'rgba(5,8,22,0.8)', backdropFilter: 'blur(8px)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-[#080f28] border border-white/10 rounded-3xl p-6 max-w-xl w-full shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.05)] relative overflow-hidden"
        >
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-brand-cyan via-brand-violet to-brand-blue" />
          
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-white">Instala tu asistente</h3>
              <p className="text-sm text-text-soft mt-1">Elige dónde quieres conectar este asistente para empezar a responder clientes.</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/[0.05] rounded-xl text-text-soft hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            {/* WEB CHAT */}
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:border-brand-cyan/30 transition-all group">
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-brand-cyan/10 border border-brand-cyan/20 flex items-center justify-center shrink-0">
                    <Globe className="w-5 h-5 text-brand-cyan" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white flex items-center gap-2">
                      Web Chat
                      {hasWebchat ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-success/10 text-brand-success font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Configurado
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-text-soft font-medium">
                          Disponible
                        </span>
                      )}
                    </h4>
                    <p className="text-sm text-text-soft mt-1">Instala un widget en tu sitio web para atender visitantes automáticamente.</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <Link
                  href={`/dashboard/assistants/${assistantId}?tab=install`}
                  className="px-4 py-2 rounded-xl bg-brand-cyan/10 text-brand-cyan text-sm font-semibold hover:bg-brand-cyan/20 transition-colors"
                >
                  Ver instalación
                </Link>
              </div>
            </div>

            {/* TELEGRAM */}
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:border-[#0088cc]/30 transition-all group">
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#0088cc]/10 border border-[#0088cc]/20 flex items-center justify-center shrink-0">
                    <Send className="w-5 h-5 text-[#0088cc]" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white flex items-center gap-2">
                      Telegram
                      {!planLimits.channels.telegram ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-pink/10 text-brand-pink font-medium flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Desde plan Pro
                        </span>
                      ) : hasTelegram ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-success/10 text-brand-success font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Configurado
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-text-soft font-medium">
                          Pendiente
                        </span>
                      )}
                    </h4>
                    <p className="text-sm text-text-soft mt-1">Conecta tu asistente con Telegram para responder mensajes desde tu bot.</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                {!planLimits.channels.telegram ? (
                  <Link
                    href="/dashboard/billing"
                    className="px-4 py-2 rounded-xl bg-brand-violet/10 border border-brand-violet/20 text-brand-purple text-sm font-semibold hover:bg-brand-violet/20 transition-colors"
                  >
                    Mejorar plan
                  </Link>
                ) : (
                  <Link
                    href={`/dashboard/assistants/${assistantId}?tab=channels`}
                    className="px-4 py-2 rounded-xl bg-[#0088cc]/10 text-[#0088cc] text-sm font-semibold hover:bg-[#0088cc]/20 transition-colors"
                  >
                    {hasTelegram ? 'Ver configuración' : 'Configurar Telegram'}
                  </Link>
                )}
              </div>
            </div>

            {/* WHATSAPP */}
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-brand-success/10 border border-brand-success/20 flex items-center justify-center shrink-0">
                    <MessageCircle className="w-5 h-5 text-brand-success" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white flex items-center gap-2">
                      WhatsApp
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-success/10 text-brand-success font-medium">
                        {planLimits.channels.whatsapp ? 'Disponible' : 'Plan Negocio'}
                      </span>
                    </h4>
                    <p className="text-sm text-text-soft mt-1">Conecta un número de WhatsApp Business y atiende desde ConversaAI.</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <Link
                  href={planLimits.channels.whatsapp ? `/dashboard/assistants/${assistantId}?tab=whatsapp` : '/dashboard/billing'}
                  className="px-4 py-2 rounded-xl bg-brand-success/10 text-brand-success text-sm font-semibold hover:bg-brand-success/20 transition-colors"
                >
                  {planLimits.channels.whatsapp ? 'Configurar WhatsApp' : 'Ver planes'}
                </Link>
              </div>
            </div>

          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
