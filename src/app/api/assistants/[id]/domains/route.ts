import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { extractDomain } from '@/lib/security'
import { logAuditEvent } from '@/lib/audit'

export const dynamic = 'force-dynamic'

const MAX_BODY_BYTES = 4 * 1024
const MAX_DOMAIN_LENGTH = 253

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: assistantId } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data: assistant } = await supabase
      .from('assistants')
      .select('id')
      .eq('id', assistantId)
      .eq('user_id', user.id)
      .single()

    if (!assistant) {
      return NextResponse.json({ error: 'Asistente no encontrado o sin acceso' }, { status: 404 })
    }

    const admin = createSupabaseAdmin()
    const { data: domains, error } = await admin
      .from('assistant_domains')
      .select('id, domain, is_verified, verification_status, last_seen_at, last_seen_url, install_events_count, is_active, updated_at, created_at')
      .eq('assistant_id', assistantId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(domains || [], {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
      }
    })
  } catch (error) {
    console.error('[GET /api/assistants/[id]/domains]', error instanceof Error ? error.message : 'unknown error')
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: assistantId } = await params
    const contentLength = request.headers.get('content-length')
    if (contentLength && Number.isFinite(Number(contentLength)) && Number(contentLength) > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Solicitud demasiado grande' }, { status: 413 })
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data: assistant } = await supabase
      .from('assistants')
      .select('id')
      .eq('id', assistantId)
      .eq('user_id', user.id)
      .single()

    if (!assistant) {
      return NextResponse.json({ error: 'Asistente no encontrado' }, { status: 404 })
    }

    const rawBody = await request.text()
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Solicitud demasiado grande' }, { status: 413 })
    }

    let body: unknown
    try {
      body = JSON.parse(rawBody)
    } catch {
      return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 })
    }

    const domainValue = (body as Record<string, unknown>).domain
    if (typeof domainValue !== 'string' || !domainValue.trim() || domainValue.length > MAX_DOMAIN_LENGTH) {
      return NextResponse.json({ error: 'Dominio inválido' }, { status: 400 })
    }

    const normalizedDomain = extractDomain(domainValue.trim())
    if (!normalizedDomain || normalizedDomain.length > MAX_DOMAIN_LENGTH) {
      return NextResponse.json({ error: 'Dominio inválido' }, { status: 400 })
    }

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

    const { count, error: countError } = await admin
      .from('assistant_domains')
      .select('id', { count: 'exact', head: true })
      .eq('assistant_id', assistantId)

    if (countError) throw countError

    const currentDomainCount = count || 0
    if (planLimits.domains !== null && currentDomainCount >= planLimits.domains) {
      return NextResponse.json(
        { error: `Has alcanzado el límite de dominios para tu plan actual (${planLimits.domains}).` },
        { status: 403 }
      )
    }

    const { data: existing } = await admin
      .from('assistant_domains')
      .select('id')
      .eq('assistant_id', assistantId)
      .eq('domain', normalizedDomain)
      .maybeSingle()

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
    console.error('[POST /api/assistants/[id]/domains]', error instanceof Error ? error.message : 'unknown error')
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
