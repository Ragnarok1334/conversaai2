import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { validateWidgetDomain } from '@/lib/security'
import { logSecurityEvent } from '@/lib/audit'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0'
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const assistantId = searchParams.get('assistantId') || searchParams.get('id')

    if (!assistantId) {
      return NextResponse.json({ error: 'Missing assistantId' }, { status: 400, headers: corsHeaders })
    }

    const supabaseAdmin = createSupabaseAdmin()

    const { data: assistant, error } = await supabaseAdmin
      .from('assistants')
      .select('*')
      .eq('id', assistantId)
      .single()

    if (error || !assistant) {
      return NextResponse.json({ error: 'Asistente no encontrado' }, { status: 404, headers: corsHeaders })
    }

    if (assistant.status !== 'active') {
      return NextResponse.json({ error: 'El asistente no está activo' }, { status: 403, headers: corsHeaders })
    }

    const { data: sub } = await supabaseAdmin.from('subscriptions').select('*').eq('user_id', assistant.user_id).single()
    const { data: profile } = await supabaseAdmin.from('profiles').select('trial_ends_at').eq('id', assistant.user_id).single()
    
    const { getEffectiveSubscriptionStatus } = await import('@/lib/billing/subscription-status')
    const effectiveStatus = getEffectiveSubscriptionStatus(sub, profile)
    
    if (['free', 'expired', 'cancelled'].includes(effectiveStatus)) {
      return NextResponse.json({ error: 'El chat no está disponible en este momento.' }, { status: 403, headers: corsHeaders })
    }

    const { normalizePlan } = await import('@/lib/plans')
    const currentPlan = sub ? normalizePlan(sub.plan) : 'free'

    // Domain validation
    const domainValidation = await validateWidgetDomain({ assistantId, req: request })
    
    if (!domainValidation.isValid) {
      await logSecurityEvent({ userId: assistant.user_id, eventType: 'widget_config_domain_blocked', severity: 'warning', message: `Widget config domain block (${domainValidation.normalizedDomain || 'no-origin'}) for assistant ${assistantId}`, req: request })
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
      widgetConfig: safeWidgetConfig
    }, { headers: corsHeaders })

  } catch (error) {
    console.error('[GET /api/widget/config]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers: corsHeaders })
  }
}
