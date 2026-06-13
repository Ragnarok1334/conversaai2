'use client'

import { useState, useEffect } from 'react'
import { Receipt, Loader2, XCircle, AlertCircle } from 'lucide-react'
import { getProviderBadge } from '@/lib/payment-providers'
import { formatMoney, formatCryptoAmount } from '@/lib/money'

interface PaymentMetadata {
  cryptoCurrency?: string  // e.g. "USDT", "BTC", "ETH"
  cryptoAmount?: number    // e.g. 39.99 for USDT or 0.00059 for BTC
  cryptoAddress?: string
  [key: string]: any
}

interface Payment {
  id: string
  plan: string
  amount: number
  currency: string
  status: string
  provider: string
  flow_order: string
  created_at: string
  metadata?: PaymentMetadata
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  paid: {
    label: 'Pagado',
    className: 'bg-brand-success/10 text-brand-success border-brand-success/20',
  },
  pending: {
    label: 'Pendiente',
    className: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  },
  rejected: {
    label: 'Rechazado',
    className: 'bg-brand-pink/10 text-brand-pink border-brand-pink/20',
  },
  failed: {
    label: 'Fallido',
    className: 'bg-brand-pink/10 text-brand-pink border-brand-pink/20',
  },
  cancelled: {
    label: 'Cancelado',
    className: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  },
  expired: {
    label: 'Expirado',
    className: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  },
}

const PROVIDER_COLORS: Record<string, string> = {
  flow: 'bg-brand-cyan/10 text-brand-cyan border-brand-cyan/20',
  paypal: 'bg-[#003087]/20 text-[#009CDE] border-[#009CDE]/20',
  crypto: 'bg-[#26A17B]/10 text-[#26A17B] border-[#26A17B]/20',
}

export function PaymentHistory() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null)
  const [isCanceling, setIsCanceling] = useState<string | null>(null)
  const [cancelError, setCancelError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/billing/payments')
      .then(async (res) => {
        if (!res.ok) throw new Error('Error al cargar pagos')
        const data = await res.json()
        if (data.payments) setPayments(data.payments)
      })
      .catch(() => setError('No se pudo cargar el historial.'))
      .finally(() => setLoading(false))
  }, [])

  const handleCancelPayment = async (id: string) => {
    setIsCanceling(id)
    setCancelError(null)
    try {
      const res = await fetch(`/api/billing/payments/${id}/cancel`, {
        method: 'POST'
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setPayments(prev => prev.map(p => p.id === id ? { ...p, status: 'cancelled' } : p))
        setConfirmCancelId(null)
      } else {
        setCancelError(data.error || 'No se pudo cancelar el pago.')
      }
    } catch (error) {
      setCancelError('Error de red al cancelar.')
    } finally {
      setIsCanceling(null)
    }
  }

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status] || {
      label: status,
      className: 'bg-white/5 text-slate-300 border-white/10',
    }
    return (
      <span className={`px-2.5 py-1 border rounded-full text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    )
  }

  const getProviderBadgeEl = (provider: string) => {
    const colorClass = PROVIDER_COLORS[provider] || 'bg-white/5 text-slate-300 border-white/10'
    return (
      <span className={`uppercase text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded border ${colorClass}`}>
        {getProviderBadge(provider)}
      </span>
    )
  }

  const formatAmountDisplay = (payment: Payment) => {
    const cur = (payment.currency || 'CLP').toUpperCase()
    const meta = payment.metadata

    // If crypto and we have actual crypto amount, show it
    if (payment.provider === 'crypto' && meta?.cryptoCurrency && meta?.cryptoAmount != null) {
      return (
        <div className="text-right">
          <span className="font-bold text-white">
            {formatMoney(payment.amount, cur)}
          </span>
          <p className="text-[11px] text-[#26A17B] mt-0.5">
            ≈ {formatCryptoAmount(meta.cryptoAmount, meta.cryptoCurrency)}
          </p>
        </div>
      )
    }

    return (
      <span className="font-bold text-white">
        {formatMoney(payment.amount, cur)}
      </span>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="bg-card-bg/80 backdrop-blur-2xl border border-card-border rounded-3xl p-8 relative overflow-hidden flex flex-col h-full">
      <div className="absolute top-0 right-0 w-32 h-32 bg-brand-violet/10 rounded-full blur-[50px] pointer-events-none" />

      <div className="flex items-center gap-3 mb-6 relative z-10">
        <div className="p-3 bg-white/[0.04] rounded-xl border border-white/[0.05]">
          <Receipt className="w-6 h-6 text-brand-violet" />
        </div>
        <h3 className="text-xl font-semibold">Historial de pagos</h3>
      </div>

      <div className="flex-1 relative z-10">
        {loading ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="w-6 h-6 text-brand-violet animate-spin opacity-50" />
          </div>
        ) : error ? (
          <p className="text-text-secondary text-sm text-red-400/80">{error}</p>
        ) : payments.length === 0 ? (
          <p className="text-text-secondary text-sm">
            Aún no tienes pagos registrados. Cuando actives un plan, tus comprobantes aparecerán aquí.
          </p>
        ) : (
          <div className="space-y-3 overflow-y-auto pr-1 max-h-[300px] conversa-scrollbar">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="flex flex-col p-4 bg-white/[0.02] border border-white/5 rounded-2xl gap-3 hover:bg-white/[0.04] transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-semibold text-white capitalize">
                        Plan {payment.plan}
                      </span>
                      {getStatusBadge(payment.status)}
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-2 flex-wrap">
                      <span>{formatDate(payment.created_at)}</span>
                      <span className="hidden sm:inline">•</span>
                      {getProviderBadgeEl(payment.provider)}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:flex-col sm:items-end gap-1 shrink-0">
                    {formatAmountDisplay(payment)}
                    <span
                      className="text-[10px] text-slate-500 font-mono truncate max-w-[90px]"
                      title={payment.flow_order}
                    >
                      {payment.flow_order?.split('-').pop() || '—'}
                    </span>
                  </div>
                </div>

                {/* Confirm Cancel Inline */}
                {confirmCancelId === payment.id && payment.status === 'pending' && (
                  <div className="mt-2 p-3 bg-black/40 border border-brand-pink/20 rounded-xl flex flex-col gap-3">
                    <div className="flex items-start gap-2 text-sm text-slate-300">
                      <AlertCircle className="w-4 h-4 text-brand-pink shrink-0 mt-0.5" />
                      <p>¿Cancelar este intento de pago? Esto solo ocultará este intento pendiente en ConversaAI. Si ya realizaste el pago en el proveedor, por favor espera.</p>
                    </div>
                    {cancelError && isCanceling !== payment.id && (
                      <p className="text-xs text-brand-pink font-medium">{cancelError}</p>
                    )}
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => {
                          setConfirmCancelId(null)
                          setCancelError(null)
                        }}
                        disabled={isCanceling === payment.id}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                      >
                        Mantener pendiente
                      </button>
                      <button 
                        onClick={() => handleCancelPayment(payment.id)}
                        disabled={isCanceling === payment.id}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-pink/10 hover:bg-brand-pink/20 text-brand-pink transition-colors flex items-center gap-1"
                      >
                        {isCanceling === payment.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                        Cancelar intento
                      </button>
                    </div>
                  </div>
                )}

                {/* Cancel Button Trigger */}
                {payment.status === 'pending' && confirmCancelId !== payment.id && (
                  <div className="flex justify-end border-t border-white/5 pt-2 mt-1">
                    <button 
                      onClick={() => {
                        setConfirmCancelId(payment.id)
                        setCancelError(null)
                      }}
                      className="text-xs text-slate-400 hover:text-white transition-colors px-2 py-1 rounded-md"
                    >
                      Cancelar intento
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
