'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, CheckCircle2, XCircle, AlertCircle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function FlowReturnPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  
  const [status, setStatus] = useState<'verifying' | 'success' | 'rejected' | 'error' | 'no-token'>('verifying')

  useEffect(() => {
    if (!token) {
      setTimeout(() => setStatus('no-token'), 0)
      return
    }

    const verifyPayment = async () => {
      try {
        const res = await fetch(`/api/billing/flow/status?token=${token}`)
        const data = await res.json()
        
        if (!res.ok) {
          throw new Error(data.error || 'Error verificando pago')
        }

        if (data.status === 'paid') {
          setStatus('success')
        } else if (data.status === 'rejected' || data.status === 'failed' || data.status === 'cancelled') {
          setStatus('rejected')
        } else {
          // If pending, we can consider it success and tell them to wait, or error.
          // In flow, if they come back it usually is processed.
          setStatus('success') 
        }
      } catch (error) {
        console.error('Verify error:', error)
        setStatus('error')
      }
    }

    verifyPayment()
  }, [token])

  return (
    <div className="max-w-md mx-auto mt-20 p-8 bg-card-bg/80 backdrop-blur-2xl border border-card-border rounded-3xl text-center shadow-xl">
      {status === 'verifying' && (
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-brand-violet animate-spin" />
          <h2 className="text-xl font-semibold">Verificando tu pago...</h2>
          <p className="text-sm text-text-secondary">Por favor espera un momento, estamos confirmando con Flow.</p>
        </div>
      )}

      {status === 'success' && (
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-brand-success/10 rounded-full flex items-center justify-center mb-2">
            <CheckCircle2 className="w-8 h-8 text-brand-success" />
          </div>
          <h2 className="text-xl font-semibold text-white">¡Pago exitoso!</h2>
          <p className="text-sm text-text-secondary">Tu plan ha sido activado correctamente. Ya puedes disfrutar de todos los beneficios.</p>
        </div>
      )}

      {status === 'rejected' && (
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-brand-pink/10 rounded-full flex items-center justify-center mb-2">
            <XCircle className="w-8 h-8 text-brand-pink" />
          </div>
          <h2 className="text-xl font-semibold text-white">Pago rechazado</h2>
          <p className="text-sm text-text-secondary">Tu banco o Flow han rechazado la transacción. No se te ha cobrado nada.</p>
        </div>
      )}

      {(status === 'error' || status === 'no-token') && (
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mb-2">
            <AlertCircle className="w-8 h-8 text-amber-500" />
          </div>
          <h2 className="text-xl font-semibold text-white">Estado desconocido</h2>
          <p className="text-sm text-text-secondary">
            {status === 'no-token' 
              ? 'Volviste desde Flow pero no encontramos el token de la transacción. Si tu pago fue aprobado, se reflejará en unos momentos.'
              : 'Ocurrió un error al verificar el estado del pago. Si fue cobrado, se actualizará pronto.'}
          </p>
        </div>
      )}

      {status !== 'verifying' && (
        <div className="mt-8">
          <Link 
            href="/dashboard/billing"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/[0.04] border border-white/10 hover:bg-white/10 transition-colors text-sm font-medium text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a Billing
          </Link>
        </div>
      )}
    </div>
  )
}
