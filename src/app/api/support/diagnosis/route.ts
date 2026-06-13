import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateAssistantHealth } from '@/lib/assistant/assistant-health'
import { normalizePlan } from '@/lib/plans'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Default response structure
    const diagnosis: any = {
      account: { status: 'ok', message: 'Cuenta en orden.' },
      plan: { status: 'ok', plan: 'trial', subscriptionStatus: 'none', message: 'Suscripción activa.' },
      assistants: { status: 'ok', total: 0, active: 0, needsTraining: 0, needsInstallation: 0, message: 'Ningún asistente.' },
      webchat: { status: 'ok', verifiedDomains: 0, pendingDomains: 0, lastSeenAt: null, message: 'Sin dominios instalados.' },
      payments: { status: 'ok', pendingPayments: 0, lastPaymentStatus: null, message: 'Pagos al día.' },
      activity: { conversationsCount: 0, leadsCount: 0, lastConversationAt: null, lastLeadAt: null },
      recommendations: [],
      supportContext: { userId: user.id, email: user.email, plan: 'trial', assistantsTotal: 0, generatedAt: new Date().toISOString() }
    }

    // 1. Fetch Profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!profile) {
      diagnosis.account.status = 'warning'
      diagnosis.account.message = 'No se pudo cargar el perfil del usuario.'
    } else if (!profile.business_name) {
      diagnosis.account.status = 'warning'
      diagnosis.account.message = 'Falta el nombre del negocio en el perfil.'
    } else {
      diagnosis.account.message = `Perfil de ${profile.business_name} cargado correctamente.`
    }

    // 2. Fetch Subscription & Payments
    let subData: any = null
    if (profile?.subscription_id) {
      const { data } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('id', profile.subscription_id)
        .single()
      subData = data
    }
    
    const { data: payments } = await supabase
      .from('billing_payments')
      .select('status, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    const currentPlan = normalizePlan(subData?.plan ?? 'trial')
    diagnosis.plan.plan = currentPlan
    diagnosis.plan.subscriptionStatus = subData?.status ?? 'none'
    diagnosis.supportContext.plan = currentPlan

    const lastPayment = payments && payments.length > 0 ? payments[0] : null
    const pendingPayments = payments ? payments.filter((p: any) => p.status === 'pending').length : 0

    diagnosis.payments.pendingPayments = pendingPayments
    diagnosis.payments.lastPaymentStatus = lastPayment?.status || null

    if (subData?.status === 'active' || subData?.status === 'trialing') {
      diagnosis.plan.status = 'ok'
      diagnosis.plan.message = `Suscripción ${subData?.status === 'trialing' ? 'en prueba' : 'activa'}.`
    } else if (subData?.status === 'canceled') {
      diagnosis.plan.status = 'warning'
      diagnosis.plan.message = 'Suscripción cancelada.'
    } else if (!subData && currentPlan === 'trial') {
      diagnosis.plan.status = 'ok'
      diagnosis.plan.message = 'Plan Trial activo.'
    } else {
      diagnosis.plan.status = 'error'
      diagnosis.plan.message = 'Problemas con la suscripción.'
    }

    const isActive = subData?.status === 'active' || subData?.status === 'trialing'

    if (pendingPayments > 0) {
      diagnosis.plan.status = diagnosis.plan.status === 'ok' ? 'warning' : diagnosis.plan.status
      diagnosis.payments.status = 'warning'
      diagnosis.payments.message = 'Pago pendiente de confirmación.'
    } else if (lastPayment?.status === 'failed') {
      if (!isActive) {
        diagnosis.payments.status = 'error'
        diagnosis.payments.message = 'Pago fallido y suscripción no activa.'
      } else {
        // Ignoramos el error crítico si está activa
        diagnosis.payments.status = 'ok'
        diagnosis.payments.message = 'Pagos al día.'
      }
    }

    // 3. Fetch Assistants & Domains
    const { data: assistantsData } = await supabase
      .from('assistants')
      .select('*, assistant_domains(verification_status, last_seen_at)')
      .eq('user_id', user.id)

    const assistants = assistantsData || []
    diagnosis.supportContext.assistantsTotal = assistants.length
    diagnosis.assistants.total = assistants.length

    // 4. Fetch Activity Counts & Dates
    const [{ data: convData }, { data: leadsData }] = await Promise.all([
      supabase.from('conversations').select('assistant_id, created_at').eq('user_id', user.id),
      supabase.from('leads').select('assistant_id, created_at').eq('user_id', user.id)
    ])

    const convs = convData || []
    const leads = leadsData || []

    diagnosis.activity.conversationsCount = convs.length
    diagnosis.activity.leadsCount = leads.length
    diagnosis.activity.lastConversationAt = convs.length > 0 ? new Date(Math.max(...convs.map(c => new Date(c.created_at).getTime()))).toISOString() : null
    diagnosis.activity.lastLeadAt = leads.length > 0 ? new Date(Math.max(...leads.map(l => new Date(l.created_at).getTime()))).toISOString() : null

    let verifiedDomainsCount = 0
    let pendingDomainsCount = 0
    let latestSeenAt = 0
    
    let needsTrainingIds: string[] = []
    let needsInstallationIds: string[] = []

    assistants.forEach(a => {
      const cCount = convs.filter(c => c.assistant_id === a.id).length
      const lCount = leads.filter(l => l.assistant_id === a.id).length
      const health = calculateAssistantHealth(a, a.assistant_domains || [], { conversations: cCount, leads: lCount })
      
      if (health.baseState === 'Activo') diagnosis.assistants.active++
      if (health.baseState === 'Necesita entrenamiento') {
        diagnosis.assistants.needsTraining++
        needsTrainingIds.push(a.id)
      }
      if (health.baseState === 'Falta instalación' || health.baseState === 'Falta canal') {
        diagnosis.assistants.needsInstallation++
        needsInstallationIds.push(a.id)
      }

      const domains = a.assistant_domains || []
      domains.forEach((d: any) => {
        if (d.verification_status === 'verified' || d.verification_status === 'installed') verifiedDomainsCount++
        if (d.verification_status === 'pending') pendingDomainsCount++
        if (d.last_seen_at) {
          const t = new Date(d.last_seen_at).getTime()
          if (t > latestSeenAt) latestSeenAt = t
        }
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

    // 5. Intelligent Recommendations
    const recs = []

    if (diagnosis.payments.status === 'warning' || diagnosis.payments.status === 'error') {
      recs.push({
        priority: 'high', title: 'Revisa tu pago',
        description: 'Hemos detectado problemas con un pago o hay un pago pendiente.',
        href: '/dashboard/billing', actionLabel: 'Ver facturación'
      })
    }

    if (assistants.length === 0) {
      recs.push({
        priority: 'high', title: 'Crea tu primer asistente',
        description: 'La cuenta está lista, solo falta que crees y entrenes a tu primer asistente con IA.',
        href: '/dashboard/create-assistant', actionLabel: 'Crear asistente'
      })
    } else {
      if (diagnosis.assistants.needsTraining > 0) {
        const href = needsTrainingIds.length === 1 ? `/dashboard/assistants/${needsTrainingIds[0]}` : '/dashboard/assistants'
        recs.push({
          priority: 'medium', title: 'Completa el entrenamiento',
          description: 'Tienes asistentes con configuración básica. Agrega más bloques de conocimiento para mejorar sus respuestas.',
          href, actionLabel: 'Completar entrenamiento'
        })
      }
      if (diagnosis.assistants.needsInstallation > 0) {
        const href = needsInstallationIds.length === 1 ? `/dashboard/assistants/${needsInstallationIds[0]}` : '/dashboard/assistants'
        recs.push({
          priority: 'medium', title: 'Instala el Web Chat',
          description: 'Aún tienes asistentes sin instalar en tu sitio web. Autoriza tu dominio y pega el script para comenzar a chatear.',
          href, actionLabel: 'Ver instalación'
        })
      }
    }

    if (convs.length > 0 && recs.length < 3) {
      recs.push({
        priority: 'low', title: 'Revisa tus conversaciones recientes',
        description: 'Tus clientes están interactuando. Verifica cómo responde el asistente y ajusta si es necesario.',
        href: '/dashboard/conversations', actionLabel: 'Ver conversaciones'
      })
    }
    
    if (leads.length > 0 && recs.length < 3) {
      recs.push({
        priority: 'low', title: 'Da seguimiento a tus leads',
        description: 'Has capturado nuevos contactos. Asegúrate de contactarlos pronto.',
        href: '/dashboard/leads', actionLabel: 'Ver leads'
      })
    }

    diagnosis.recommendations = recs.sort((a: any, b: any) => {
      const p = { high: 0, medium: 1, low: 2 }
      return p[a.priority as keyof typeof p] - p[b.priority as keyof typeof p]
    })

    // 6. Global Status
    diagnosis.globalStatus = 'ok'
    const errorStatuses = [diagnosis.account.status, diagnosis.plan.status, diagnosis.payments.status, diagnosis.assistants.status, diagnosis.webchat.status]
    if (errorStatuses.includes('error')) {
      diagnosis.globalStatus = 'error'
    } else if (errorStatuses.includes('warning')) {
      diagnosis.globalStatus = 'warning'
    }

    return NextResponse.json(diagnosis, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[GET /api/support/diagnosis] Error:', error)
    return NextResponse.json({ error: 'No se pudo cargar el diagnóstico. Intenta más tarde.' }, { status: 500 })
  }
}
