import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { validateWidgetDomain } from '@/lib/security'
import { logSecurityEvent } from '@/lib/audit'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const assistantId = searchParams.get('assistantId') || searchParams.get('id')

    if (!assistantId || assistantId.length > 64 || !UUID_RE.test(assistantId)) {
      return NextResponse.json({ error: 'assistantId inválido' }, { status: 400, headers: corsHeaders })
    }

    const supabaseAdmin = createSupabaseAdmin()
    const { data: assistant, error } = await supabaseAdmin
      .from('assistants')
      .select('id,user_id,status,assistant_name,business_name,welcome_message,widget_config,allow_all_domains')
      .eq('id', assistantId)
      .maybeSingle()

    if (error || !assistant) {
      return NextResponse.json({ error: 'Asistente no encontrado' }, { status: 404, headers: corsHeaders })
    }

    if (assistant.status !== 'active') {
      return NextResponse.json({ error: 'El asistente no está activo' }, { status: 403, headers: corsHeaders })
    }

    const [subRes, profileRes] = await Promise.all([
      supabaseAdmin
        .from('subscriptions')
        .select('plan,current_messages_used,messages_limit,status,current_period_end,grace_ends_at,cancel_at_period_end')
        .eq('user_id', assistant.user_id)
        .maybeSingle(),
      supabaseAdmin
        .from('profiles')
        .select('trial_ends_at')
        .eq('id', assistant.user_id)
        .maybeSingle(),
    ])

    if (subRes.error || profileRes.error) {
      console.error('[GET /api/widget/config] Subscription/profile lookup failed')
      return NextResponse.json({ error: 'No se pudo validar el estado del asistente.' }, { status: 503, headers: corsHeaders })
    }

    const { getEffectiveSubscriptionStatus } = await import('@/lib/billing/subscription-status')
    const effectiveStatus = getEffectiveSubscriptionStatus(subRes.data, profileRes.data)

    if (['free', 'expired', 'cancelled'].includes(effectiveStatus)) {
      return NextResponse.json({ error: 'El chat no está disponible en este momento.' }, { status: 403, headers: corsHeaders })
    }

    const { normalizePlan } = await import('@/lib/plans')
    const currentPlan = subRes.data ? normalizePlan(subRes.data.plan) : 'free'

    const domainValidation = await validateWidgetDomain({ assistantId, req: request })
    if (!domainValidation.isValid) {
      await logSecurityEvent({
        userId: assistant.user_id,
        eventType: 'widget_config_domain_blocked',
        severity: 'warning',
        message: 'Widget config request from unauthorized domain.',
        req: request,
      })
      return NextResponse.json({ error: 'Este dominio no está autorizado para usar este asistente.' }, { status: 403, headers: corsHeaders })
    }

    const { sanitizeWidgetConfigForPlan } = await import('@/lib/widget-config')
    const safeWidgetConfig = sanitizeWidgetConfigForPlan(assistant.widget_config || {}, currentPlan)

    return NextResponse.json({
      id: assistant.id,
      name: assistant.assistant_name || '',
      businessName: assistant.business_name || '',
      welcomeMessage: assistant.welcome_message || '',
      status: 'online',
      widgetConfig: safeWidgetConfig,
    }, { headers: corsHeaders })
  } catch (error: unknown) {
    console.error('[GET /api/widget/config] Error:', error instanceof Error ? error.message : 'Unknown error')
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers: corsHeaders })
  }
}
