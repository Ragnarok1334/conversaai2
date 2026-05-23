import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { PLAN_CONFIGS, PlanKey } from '@/lib/plans'

export default async function CheckoutPlaceholderPage({
  searchParams,
}: {
  searchParams: { plan?: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const planId = searchParams.plan as PlanKey
  const plan = PLAN_CONFIGS[planId]

  if (!plan) {
    redirect('/dashboard/billing')
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-4">
        Checkout: Plan {plan.label}
      </h1>
      <p className="text-text-secondary mb-8 text-lg">
        Aquí se integrará la pasarela de pagos (Stripe, MercadoPago, etc.) para procesar la suscripción de <strong>{plan.price}</strong> {plan.period}.
      </p>

      <div className="p-6 bg-white/[0.03] border border-white/10 rounded-2xl w-full text-left mb-8">
        <h3 className="text-white font-medium mb-4">Detalles técnicos para la futura integración:</h3>
        <ul className="list-disc list-inside text-text-soft space-y-2 text-sm">
          <li>El usuario actual es: <code className="text-brand-cyan">{user.email}</code></li>
          <li>Plan a suscribir: <code className="text-brand-cyan">{plan.key}</code></li>
          <li>Endpoint recomendado: <code className="text-brand-cyan">{plan.checkoutUrl}</code></li>
          <li>Crear sesión de pago y redirigir a URL externa, o usar componente incrustado.</li>
          <li>Escuchar webhooks del proveedor para actualizar <code>status</code> en Supabase.</li>
        </ul>
      </div>

      <Link 
        href="/dashboard/billing"
        className="px-6 py-3 rounded-xl bg-white/[0.06] border border-white/10 text-white font-medium hover:bg-white/10 transition-all"
      >
        Volver a facturación
      </Link>
    </div>
  )
}
