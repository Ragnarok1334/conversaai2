'use client'

import React, { useState } from 'react'
import { AlertCircle, CalendarX2, Check, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Props {
  planKey: string;
  effectiveStatus: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
}

export function SubscriptionManager({ planKey, effectiveStatus, cancelAtPeriodEnd, currentPeriodEnd }: Props) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isPaidPlan = planKey !== 'free' && planKey !== 'trial'
  const isActive = effectiveStatus === 'active' || effectiveStatus === 'past_due'
  
  if (!isPaidPlan || effectiveStatus === 'expired') {
    return null; // Ocultar si no aplica
  }

  const periodEndDate = currentPeriodEnd ? new Date(currentPeriodEnd).toLocaleDateString('es-CL') : 'el final del periodo'

  const handleCancel = async () => {
    if (!agreed) return;
    
    setLoading(true)
    setError(null)
    
    try {
      const res = await fetch('/api/billing/subscription/cancel', {
        method: 'POST'
      })
      const data = await res.json()
      
      if (!res.ok) throw new Error(data.error || 'Error al cancelar')
      
      setIsOpen(false)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="bg-card-bg/80 backdrop-blur-2xl border border-card-border rounded-3xl p-8 mt-10">
        <div className="flex items-start gap-4 flex-col sm:flex-row">
          <div className="p-3 bg-brand-pink/10 rounded-xl border border-brand-pink/20 shrink-0">
            <CalendarX2 className="w-6 h-6 text-brand-pink" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-semibold mb-2">Administrar suscripción</h3>
            {cancelAtPeriodEnd ? (
              <>
                <p className="text-text-secondary text-sm mb-2">
                  <strong className="text-brand-pink">Suscripción cancelada.</strong> Tu plan seguirá activo hasta el {periodEndDate}. Después de esa fecha, tu cuenta volverá al plan gratuito y no se realizarán más cobros.
                </p>
                {/* No mostrar Reactivar según lo pedido ("Si no existe lógica segura, no mostrar") */}
              </>
            ) : (
              <>
                <p className="text-text-secondary text-sm mb-2">
                  Puedes cancelar tu suscripción cuando quieras. Mantendrás el acceso a tu plan hasta el final del periodo ya pagado.
                </p>
                <p className="text-sm font-medium text-amber-400 mb-6 bg-amber-400/10 inline-block px-3 py-1.5 rounded-lg border border-amber-400/20">
                  La cancelación no genera devolución del dinero ya pagado.
                </p>
                <div className="mt-2">
                  <button
                    onClick={() => setIsOpen(true)}
                    className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-brand-pink/10 border border-brand-pink/20 hover:bg-brand-pink/20 text-brand-pink transition-colors text-sm font-medium"
                  >
                    Cancelar suscripción
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-md p-6 relative animate-in fade-in zoom-in-95 duration-200 shadow-2xl">
            <button
              onClick={() => { setIsOpen(false); setAgreed(false); setError(null); }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="mb-6">
              <div className="w-12 h-12 rounded-full bg-brand-pink/10 border border-brand-pink/20 flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6 text-brand-pink" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Cancelar suscripción</h3>
              <p className="text-slate-300 text-sm mb-4">
                Tu suscripción se cancelará al finalizar el periodo actual. Mantendrás el acceso a tu plan hasta el <strong className="text-white">{periodEndDate}</strong>.
              </p>
              
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-sm text-amber-400 font-medium flex gap-2 items-start mb-6">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                No se realizará devolución del dinero ya pagado.
              </div>
              
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative flex items-center justify-center mt-0.5">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="appearance-none w-5 h-5 border-2 border-slate-600 rounded cursor-pointer checked:bg-brand-pink checked:border-brand-pink transition-colors"
                  />
                  {agreed && <Check className="w-3.5 h-3.5 text-white absolute pointer-events-none" />}
                </div>
                <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                  Entiendo que la cancelación no genera devolución y que conservaré el acceso hasta el final del periodo pagado.
                </span>
              </label>

              {error && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg">
                  {error}
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
              <button
                onClick={() => { setIsOpen(false); setAgreed(false); setError(null); }}
                className="px-4 py-2 rounded-xl font-medium text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                disabled={loading}
              >
                Mantener suscripción
              </button>
              <button
                onClick={handleCancel}
                disabled={!agreed || loading}
                className="px-4 py-2 rounded-xl font-medium text-sm text-white bg-brand-pink hover:bg-brand-pink/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
              >
                {loading ? 'Cancelando...' : 'Cancelar suscripción'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
