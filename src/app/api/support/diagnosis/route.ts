import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateAssistantHealth } from '@/lib/assistant/assistant-health'
import { normalizePlan } from '@/lib/plans'
import { getEffectiveSubscriptionStatus } from '@/lib/billing/subscription-status'

export const dynamic = 'force-dynamic'

const ASSISTANT_FIELDS = 'id, assistant_name, business_name, channel, tone, instructions, knowledge_blocks, status, assistant_domains(verification_status, last_seen_at)'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const diagnosis: any = {
      account: { status: 'ok', message: 'Cuenta en orden.' },
      plan: { status: 'ok', plan: 'free', subscriptionStatus: 'none', message: 'Suscripción activa.' },
      assistants: { status: 'ok', total: 0, active: 0, needsTraining: 0, needsInstallation: 0, message: 'Ningún asistente.' },
      webchat: { status: 'ok', verifiedDomains: 0, pendingDomains: 0, lastSeenAt: null, message: 'Sin dominios instalados.' },
      payments: { status: 'ok', pendingPayments: 0, lastPaymentStatus: null, message: 'Pagos al día.' },
      activity: { conversationsCount: 0, leadsCount: 0, lastConversationAt: null, lastLeadAt: null },
      recommendations: [],
      supportContext: { plan: 'free', assistantsTotal: 0, generatedAt: new Date().toISOString() }
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('business_name, subscription_id, trial_ends_at')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) {
      console.error('[GET /api/support/diagnosis] profile query failed:', profileError.message)
    }

    if (!profile) {
      diagnosis.account.status = 'warning'
      diagnosis.account.message = 'No se pudo cargar el perfil del usuario.'
    } else if (!profile.business_name) {
      diagnosis.account.status = 'warning'
      diagnosis.account.message = 'Falta el nombre del negocio en el perfil.'
    } else {
      diagnosis.account.message = `Perfil de ${profile.business_name} cargado correctamente.`
    }

    let subData: any = null
    if (profile?.subscription_id) {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('id, user_id, plan, status, current_period_start, current_period_end, grace_ends_at, cancel_at_period_end')
        .eq('id', profile.subscription_id)
        .eq('user_id', user.id)
        .maybeSingle()
      if (error) console.error('[GET /api/support/diagnosis] subscription query failed:', error.message)
      subData = data
    }

    const { data: payments, error: paymentsError } = await supabase
      .from('billing_payments')
      .select('status, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    if (paymentsError) console.error('[GET /api/support/diagnosis] payments query failed:', paymentsError.message)

    const currentPlan = normalizePlan(subData?.plan ?? 'free')
    diagnosis.plan.plan = currentPlan
    const effectiveStatus = getEffectiveSubscriptionStatus(subData, profile)
    diagnosis.plan.subscriptionStatus = effectiveStatus
    diagnosis.supportContext.plan = currentPlan

    const lastPayment = payments?.[0] || null
    const pendingPayments = payments?.filter((p) => p.status === 'pending').length ?? 0
    diagnosis.payments.pendingPayments = pendingPayments
    diagnosis.payments.lastPaymentStatus = lastPayment?.status || null

    if (effectiveStatus === 'active' || effectiveStatus === 'trialing') {
      diagnosis.plan.status = 'ok'
      diagnosis.plan.message = `Suscripción ${effectiveStatus === 'trialing' ? 'en prueba' : 'activa'}.`
    } else if (effectiveStatus === 'cancelled') {
      diagnosis.plan.status = 'warning'
      diagnosis.plan.message = 'Suscripción cancelada.'
    } else if (effectiveStatus === 'free') {
      diagnosis.plan.status = 'ok'
      diagnosis.plan.message = 'Plan Free activo.'
    } else {
      diagnosis.plan.status = 'error'
      diagnosis.plan.message = 'Problemas con la suscripción.'
    }

    const isActive = ['active', 'trialing', 'past_due'].includes(effectiveStatus)
    if (pendingPayments > 0) {
      diagnosis.plan.status = diagnosis.plan.status === 'ok' ? 'warning' : diagnosis.plan.status
      diagnosis.payments.status = 'warning'
      diagnosis.payments.message = 'Pago pendiente de confirmación.'
    } else if (lastPayment?.status === 'failed') {
      diagnosis.payments.status = isActive ? 'ok' : 'error'
      diagnosis.payments.message = isActive ? 'Pagos al día.' : 'Pago fallido y suscripción no activa.'
    }

    const [{ data: assistantsData, error: assistantsError }, { data: convData, error: convError }, { data: leadsData, error: leadsError }] = await Promise.all([
      supabase.from('assistants').select(ASSISTANT_FIELDS).eq('user_id', user.id).limit(50),
      supabase.from('conversations').select('assistant_id, created_at').eq('user_id', user.id).limit(10000),
      supabase.from('leads').select('assistant_id, created_at').eq('user_id', user.id).limit(10000)
    ])

    if (assistantsError) console.error('[GET /api/support/diagnosis] assistants query failed:', assistantsError.message)
    if (convError) console.error('[GET /api/support/diagnosis] conversations query failed:', convError.message)
    if (leadsError) console.error('[GET /api/support/diagnosis] leads query failed:', leadsError.message)

    const assistants = assistantsData || []
    const convs = convData || []
    const leads = leadsData || []

    diagnosis.supportContext.assistantsTotal = assistants.length
    diagnosis.assistants.total = assistants.length
    diagnosis.activity.conversationsCount = convs.length
    diagnosis.activity.leadsCount = leads.length
    diagnosis.activity.lastConversationAt = convs.length > 0 ? new Date(Math.max(...convs.map(c => new Date(c.created_at).getTime()))).toISOString() : null
    diagnosis.activity.lastLeadAt = leads.length > 0 ? new Date(Math.max(...leads.map(l => new Date(l.created_at).getTime()))).toISOString() : null

    let verifiedDomainsCount = 0
    let pendingDomainsCount = 0
    let latestSeenAt = 0
    const needsTrainingIds: string[] = []
    const needsInstallationIds: string[] = []

    assistants.forEach(a => {
      const cCount = convs.filter(c => c.assistant_id === a.id).length
      const lCount = leads.filter(l => l.assistant_id === a.id).length
      const health = calculateAssistantHealth(a, a.assistant_domains || [], { conversations: cCount, leads: lCount })

      if (health.baseState === 'Activo') diagnosis.assistants.active++
      if (health.baseState === 'Necesita entrenamiento') {
        diagnosis.assistants.needsTraining++
        needsTrainingIds.push(a.id)
      }
      if (health.baseState === 'Falta instalación' || health.baseState === 'En configuración') {
        diagnosis.assistants.needsInstallation++
        needsInstallationIds.push(a.id)
      }

      ;(a.assistant_domains || []).forEach((d: any) => {
        if (d.verification_status === 'verified' || d.verification_status === 'installed') verifiedDomainsCount++
        if (d.verification_status === 'pending') pendingDomainsCount++
        if (d.last_seen_at) latestSeenAt = Math.max(latestSeenAt, new Date(d.last_seen_at).getTime())
      })
    })

    diagnosis.webchat.verifiedDomains = verifiedDomainsCount
    diagnosis.webchat.pendingDomains = pendingDomainsCount
    diagnosis.webchat.lastSeenAt = latestSeenAt > 0 ? new Date(latestSeenAt).toISOString() : null

    if (assistants.length === 0) {
      diagnosis.assistants.status = 'warning'
      diagnosis.assistants.message = 'No tienes asistentes creados.'
    } else if (diagnosis.assistants.needsTraining > 0) {
      diagnosis.assistants.status = 'warning'
      diagnosis.assistants.message = 'Hay asistentes incompletos.'
    } else if (diagnosis.assistants.needsInstallation > 0) {
      diagnosis.assistants.status = 'warning'
      diagnosis.assistants.message = 'Hay asistentes sin instalar.'
    } else if (diagnosis.assistants.active > 0) {
      diagnosis.assistants.status = 'ok'
      diagnosis.assistants.message = 'Asistentes operando.'
    } else {
      diagnosis.assistants.status = 'warning'
      diagnosis.assistants.message = 'Estado de asistentes con alertas.'
    }

    if (verifiedDomainsCount > 0 || latestSeenAt > 0) {
      diagnosis.webchat.status = 'ok'
      diagnosis.webchat.message = 'Instalación detectada.'
    } else if (pendingDomainsCount > 0) {
      diagnosis.webchat.status = 'warning'
      diagnosis.webchat.message = 'Dominios pendientes de instalar.'
    } else if (assistants.length > 0) {
      diagnosis.webchat.status = 'warning'
      diagnosis.webchat.message = 'Falta instalación del Web Chat.'
    }

    const recs: any[] = []
    if (diagnosis.payments.status === 'warning' || diagnosis.payments.status === 'error') {
      recs.push({ priority: 'high', title: 'Revisa tu pago', description: 'Hemos detectado problemas con un pago o hay un pago pendiente.', href: '/dashboard/billing', actionLabel: 'Ver facturación' })
    }
    if (assistants.length === 0) {
      recs.push({ priority: 'high', title: 'Crea tu primer asistente', description: 'La cuenta está lista, solo falta que crees y entrenes a tu primer asistente con IA.', href: '/dashboard/create-assistant', actionLabel: 'Crear asistente' })
    } else {
      if (diagnosis.assistants.needsTraining > 0) {
        const href = needsTrainingIds.length === 1 ? `/dashboard/assistants/${needsTrainingIds[0]}` : '/dashboard/assistants'
        recs.push({ priority: 'medium', title: 'Completa el entrenamiento', description: 'Tienes asistentes con configuración básica. Agrega más bloques de conocimiento para mejorar sus respuestas.', href, actionLabel: 'Completar entrenamiento' })
      }
      if (diagnosis.assistants.needsInstallation > 0) {
        const href = needsInstallationIds.length === 1 ? `/dashboard/assistants/${needsInstallationIds[0]}` : '/dashboard/assistants'
        recs.push({ priority: 'medium', title: 'Instala el Web Chat', description: 'Aún tienes asistentes sin instalar en tu sitio web. Autoriza tu dominio y pega el script para comenzar a chatear.', href, actionLabel: 'Ver instalación' })
      }
    }
    if (convs.length > 0 && recs.length < 3) recs.push({ priority: 'low', title: 'Revisa tus conversaciones recientes', description: 'Tus clientes están interactuando. Verifica cómo responde el asistente y ajusta si es necesario.', href: '/dashboard/conversations', actionLabel: 'Ver conversaciones' })
    if (leads.length > 0 && recs.length < 3) recs.push({ priority: 'low', title: 'Da seguimiento a tus leads', description: 'Has capturado nuevos contactos. Asegúrate de contactarlos pronto.', href: '/dashboard/leads', actionLabel: 'Ver leads' })

    diagnosis.recommendations = recs.sort((a, b) => ({ high: 0, medium: 1, low: 2 } as Record<string, number>)[a.priority] - ({ high: 0, medium: 1, low: 2 } as Record<string, number>)[b.priority])

    diagnosis.globalStatus = 'ok'
    const statuses = [diagnosis.account.status, diagnosis.plan.status, diagnosis.payments.status, diagnosis.assistants.status, diagnosis.webchat.status]
    if (statuses.includes('error')) diagnosis.globalStatus = 'error'
    else if (statuses.includes('warning')) diagnosis.globalStatus = 'warning'

    return NextResponse.json(diagnosis, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[GET /api/support/diagnosis] Error:', error instanceof Error ? error.message : 'unknown error')
    return NextResponse.json({ error: 'No se pudo cargar el diagnóstico. Intenta más tarde.' }, { status: 500 })
  }
}
