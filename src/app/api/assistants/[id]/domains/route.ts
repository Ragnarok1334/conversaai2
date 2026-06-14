import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { extractDomain } from '@/lib/security'
import { logAuditEvent } from '@/lib/audit'

// Forzar renderizado dinámico para evitar cache de Next.js
export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: assistantId } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar propiedad con cliente autenticado
    const { data: assistant } = await supabase
      .from('assistants')
      .select('id')
      .eq('id', assistantId)
      .eq('user_id', user.id)
      .single()

    if (!assistant) {
      return NextResponse.json({ error: 'Asistente no encontrado o sin acceso' }, { status: 404 })
    }

    // Usar admin (service_role) para leer los datos reales sin restricciones de RLS
    const admin = createSupabaseAdmin()
    const { data: domains, error } = await admin
      .from('assistant_domains')
      .select('id, domain, is_verified, verification_status, last_seen_at, last_seen_url, install_events_count, is_active, updated_at, created_at')
      .eq('assistant_id', assistantId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(domains || [], {
      headers: {
        // Evitar cache en el navegador y en Next.js
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
      }
    })
  } catch (error) {
    console.error('[GET /api/assistants/[id]/domains]', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: assistantId } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar propiedad
    const { data: assistant } = await supabase
      .from('assistants')
      .select('id')
      .eq('id', assistantId)
      .eq('user_id', user.id)
      .single()

    if (!assistant) {
      return NextResponse.json({ error: 'Asistente no encontrado' }, { status: 404 })
    }

    const body = await request.json()
    const { domain } = body

    const normalizedDomain = extractDomain(domain)
    if (!normalizedDomain) {
      return NextResponse.json({ error: 'Dominio inválido' }, { status: 400 })
    }

    // --- Verificación de límites y suscripción ---
    const admin = createSupabaseAdmin()
    
    const [subRes, profileRes] = await Promise.all([
      admin
        .from('subscriptions')
        .select('plan, assistants_limit, status, current_period_end, grace_ends_at, cancel_at_period_end')
        .eq('user_id', user.id)
        .single(),
      admin
        .from('profiles')
        .select('trial_used, trial_ends_at')
        .eq('id', user.id)
        .single()
    ])

    const sub = subRes.data
    const profile = profileRes.data

    const { getEffectiveSubscriptionStatus } = await import('@/lib/billing/subscription-status')
    const { normalizePlan, getPlanLimits } = await import('@/lib/plans')
    
    const effectiveStatus = getEffectiveSubscriptionStatus(sub, profile)
    
    if (['free', 'expired', 'cancelled'].includes(effectiveStatus)) {
      return NextResponse.json(
        { error: 'No tienes un plan activo. Renueva tu plan o activa tu prueba gratis para autorizar dominios.' },
        { status: 403 }
      )
    }

    const rawPlan = sub ? sub.plan : 'free'
    const planKey = normalizePlan(rawPlan)
    const planLimits = getPlanLimits(planKey)

    // Contar dominios actuales
    const { count, error: countError } = await admin
      .from('assistant_domains')
      .select('*', { count: 'exact', head: true })
      .eq('assistant_id', assistantId)

    if (countError) throw countError

    const currentDomainCount = count || 0
    if (planLimits.domains !== null && currentDomainCount >= planLimits.domains) {
      return NextResponse.json(
        { error: `Has alcanzado el límite de dominios para tu plan actual (${planLimits.domains}).` },
        { status: 403 }
      )
    }

    // Verificar duplicado (usando admin para evitar restricciones RLS)
    const { data: existing } = await admin
      .from('assistant_domains')
      .select('id')
      .eq('assistant_id', assistantId)
      .eq('domain', normalizedDomain)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'El dominio ya está registrado.' }, { status: 400 })
    }

    const { data, error } = await admin
      .from('assistant_domains')
      .insert({
        assistant_id: assistantId,
        user_id: user.id,
        domain: normalizedDomain,
        is_active: true,
        is_verified: false,
        verification_status: 'pending',
      })
      .select('id, domain, is_verified, verification_status, last_seen_at, last_seen_url, install_events_count, is_active, updated_at, created_at')
      .single()

    if (error) throw error

    await logAuditEvent({
      userId: user.id,
      action: 'widget_domain_added',
      description: `Dominio ${normalizedDomain} agregado para el asistente.`,
      entityType: 'assistant_domains',
      entityId: data.id,
      req: request,
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('[POST /api/assistants/[id]/domains]', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
