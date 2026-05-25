'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2, AlertTriangle, X } from 'lucide-react'

interface DeleteAssistantButtonProps {
  assistantId: string
  assistantName: string
}

export function DeleteAssistantButton({ assistantId, assistantName }: DeleteAssistantButtonProps) {
  const router = useRouter()
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleDelete = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/assistants/${assistantId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al eliminar')
      setShowConfirm(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar el asistente')
      setLoading(false)
    }
  }

  return (
    <>
      {/* Botón de eliminar — detiene la propagación al Link padre */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setShowConfirm(true)
        }}
        title="Eliminar asistente"
        className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-text-soft hover:text-brand-pink hover:bg-brand-pink/10 border border-transparent hover:border-brand-pink/20 transition-all opacity-0 group-hover:opacity-100"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>

      {/* Modal de confirmación */}
      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowConfirm(false)
          }}
        >
          <div className="bg-[#0f1629] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-brand-pink/10 border border-brand-pink/20 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-brand-pink" />
              </div>
              <button
                onClick={() => setShowConfirm(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-text-soft hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <h3 className="text-lg font-bold text-white mb-2">¿Eliminar asistente?</h3>
            <p className="text-sm text-slate-400 mb-1">
              Estás por eliminar el asistente:
            </p>
            <p className="text-sm font-semibold text-white bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 mb-4">
              {assistantName}
            </p>
            <p className="text-xs text-slate-500 mb-6">
              Esta acción es permanente y eliminará todos los datos asociados. No se puede deshacer.
            </p>

            {error && (
              <p className="text-xs text-brand-pink bg-brand-pink/10 border border-brand-pink/20 rounded-lg px-3 py-2 mb-4">
                {error}
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={loading}
                className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 bg-white/[0.04] text-sm font-medium text-slate-300 hover:bg-white/[0.08] hover:text-white transition-all disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 px-4 py-2.5 rounded-xl bg-brand-pink text-white text-sm font-bold hover:opacity-90 active:scale-95 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Eliminando...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Sí, eliminar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
