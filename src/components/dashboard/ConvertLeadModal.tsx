import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, X, Loader2, Save } from 'lucide-react'

interface ConvertLeadModalProps {
  isOpen: boolean
  onClose: () => void
  conversation: any
  onSuccess: (lead: any) => void
}

export function ConvertLeadModal({ isOpen, onClose, conversation, onSuccess }: ConvertLeadModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    name: conversation?.visitor_name || '',
    email: conversation?.visitor_email || '',
    phone: conversation?.visitor_phone || '',
    notes: conversation?.last_message ? `Último mensaje: ${conversation.last_message}` : ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/leads/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: conversation.id,
          assistant_id: conversation.assistant_id,
          source: conversation.channel,
          ...formData
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al convertir a lead')
      }

      onSuccess(data.lead)
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card-bg border border-card-border rounded-2xl shadow-2xl z-50 overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-violet/10 flex items-center justify-center border border-brand-violet/20">
                    <Users className="w-5 h-5 text-brand-violet" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Convertir a Lead</h2>
                    <p className="text-xs text-text-soft">Crea un registro para este visitante</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-text-soft" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 rounded-lg bg-brand-pink/10 border border-brand-pink/20 text-brand-pink text-sm">
                    {error}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-medium text-text-soft">Nombre</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-white/[0.03] border border-white/[0.1] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-violet/50 transition-colors"
                    placeholder="Ej. Juan Pérez"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-text-soft">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-white/[0.03] border border-white/[0.1] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-violet/50 transition-colors"
                    placeholder="Ej. juan@empresa.com"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-text-soft">Teléfono</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-white/[0.03] border border-white/[0.1] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-violet/50 transition-colors"
                    placeholder="Ej. +569 1234 5678"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-text-soft">Notas de la conversación</label>
                  <textarea
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full bg-white/[0.03] border border-white/[0.1] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-violet/50 transition-colors resize-none h-24"
                    placeholder="Detalles relevantes..."
                  />
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-white/[0.05]">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-text-soft hover:text-white transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading || (!formData.name && !formData.email && !formData.phone)}
                    className="flex items-center gap-2 px-5 py-2 bg-brand-violet text-white text-sm font-medium rounded-xl hover:bg-brand-violet/90 transition-all disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Guardar Lead
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
