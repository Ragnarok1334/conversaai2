import { motion, AnimatePresence } from 'framer-motion'
import { X, Play, AlertCircle, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { PlanKey } from '@/lib/plans'

interface AssistantTestModalProps {
  open: boolean
  onClose: () => void
  assistantId: string
  plan: PlanKey
  planLimits: any
  usage: any
}

export function AssistantTestModal({
  open, onClose, assistantId, plan, planLimits, usage
}: AssistantTestModalProps) {
  const router = useRouter()
  if (!open) return null

  const usedMessages = usage?.messagesUsed ?? 0
  const totalMessages = planLimits.messagesPerMonth
  const isUnlimited = totalMessages === Infinity
  const remainingMessages = isUnlimited ? null : Math.max(0, totalMessages - usedMessages)
  const isLimitReached = !isUnlimited && remainingMessages === 0

  const handleContinue = () => {
    if (isLimitReached) {
      router.push('/dashboard/billing')
    } else {
      router.push(`/dashboard/assistants/${assistantId}?tab=test`)
    }
    onClose()
  }

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
          className="bg-[#080f28] border border-white/10 rounded-3xl p-6 max-w-md w-full shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.05)] relative overflow-hidden"
        >
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-brand-violet to-brand-blue" />

          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-violet/10 border border-brand-violet/20 flex items-center justify-center">
              <Play className="w-6 h-6 text-brand-violet" />
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/[0.05] rounded-xl text-text-soft hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <h3 className="text-xl font-bold text-white mb-2">Probar asistente</h3>
          <p className="text-sm text-text-soft mb-6">
            Los mensajes enviados durante esta prueba se descontarán de tu límite mensual. Esto te permite validar respuestas reales antes de instalar el asistente con tus clientes.
          </p>

          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-3 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-text-soft">Plan actual:</span>
              <span className="text-white font-medium capitalize">{plan}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-soft">Mensajes disponibles:</span>
              <span className={`font-semibold ${isLimitReached ? 'text-brand-pink' : 'text-brand-cyan'}`}>
                {isUnlimited ? 'Ilimitados' : remainingMessages} / {totalMessages}
              </span>
            </div>
            {isLimitReached && (
              <div className="mt-2 p-3 rounded-lg bg-brand-pink/10 border border-brand-pink/20 text-brand-pink text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                Alcanzaste el límite mensual de mensajes de tu plan.
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.1] text-text-soft font-semibold hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleContinue}
              className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all shadow-lg flex items-center justify-center gap-2 ${
                isLimitReached 
                  ? 'bg-brand-pink/20 text-brand-pink hover:bg-brand-pink/30 border border-brand-pink/30'
                  : 'gradient-btn text-white hover:opacity-90 glow-violet'
              }`}
            >
              {isLimitReached ? 'Mejorar plan' : 'Continuar prueba'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
