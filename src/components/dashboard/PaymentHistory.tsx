'use client'

import { useState, useEffect } from 'react'
import { Receipt, Loader2, ExternalLink } from 'lucide-react'

interface Payment {
  id: string
  plan: string
  amount: number
  currency: string
  status: string
  provider: string
  flow_order: string
  created_at: string
}

export function PaymentHistory() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/billing/payments')
      .then(res => res.json())
      .then(data => {
        if (data.payments) setPayments(data.payments)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <span className="px-2.5 py-1 bg-brand-success/10 text-brand-success border border-brand-success/20 rounded-full text-xs font-medium">Pagado</span>
      case 'pending':
        return <span className="px-2.5 py-1 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-full text-xs font-medium">Pendiente</span>
      case 'rejected':
      case 'failed':
        return <span className="px-2.5 py-1 bg-brand-pink/10 text-brand-pink border border-brand-pink/20 rounded-full text-xs font-medium">Rechazado</span>
      case 'cancelled':
        return <span className="px-2.5 py-1 bg-slate-500/10 text-slate-400 border border-slate-500/20 rounded-full text-xs font-medium">Cancelado</span>
      default:
        return <span className="px-2.5 py-1 bg-white/5 text-slate-300 border border-white/10 rounded-full text-xs font-medium">{status}</span>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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
        ) : payments.length === 0 ? (
          <p className="text-text-secondary text-sm">
            Aún no tienes pagos registrados. Cuando actives un plan, tus comprobantes aparecerán aquí.
          </p>
        ) : (
          <div className="space-y-3 overflow-y-auto pr-2 max-h-[250px] custom-scrollbar">
            {payments.map(payment => (
              <div key={payment.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl gap-4 hover:bg-white/[0.04] transition-colors">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-white capitalize">Plan {payment.plan}</span>
                    {getStatusBadge(payment.status)}
                  </div>
                  <div className="text-xs text-slate-400 flex items-center gap-2">
                    {formatDate(payment.created_at)}
                    <span className="hidden sm:inline">•</span>
                    <span className="uppercase text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                      {payment.provider === 'paypal' ? 'PayPal' : payment.provider === 'crypto' ? 'Cripto' : 'Flow'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:flex-col sm:items-end gap-1">
                  <span className="font-bold text-white">
                    ${payment.amount.toLocaleString('es-CL')} <span className="text-xs text-slate-400 font-normal">{payment.currency}</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono" title={payment.flow_order}>
                    {payment.flow_order.split('-').pop()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
