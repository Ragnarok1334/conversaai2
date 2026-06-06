import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { validateWidgetDomain, checkRateLimit } from '@/lib/security'
import { logSecurityEvent, logAuditEvent } from '@/lib/audit'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function POST(req: Request) {
  const isDev = process.env.NODE_ENV === 'development'

  try {
    let body: { assistantId?: string; pageUrl?: string; visitorId?: string }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json(
        { error: 'Body no válido' },
        { status: 400, headers: corsHeaders }
      )
    }

    const { assistantId, pageUrl, visitorId } = body

    if (!assistantId) {
      return NextResponse.json(
        { error: 'Falta assistantId' },
        { status: 400, headers: corsHeaders }
      )
    }

    // --- Rate Limit ---
    const forwardedFor = req.headers.get('x-forwarded-for')
    const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : 'unknown'
    const rlKey = `widget_ping:${assistantId}:${ip}`

    const isAllowed = await checkRateLimit(rlKey, 'widget_ping', 30, 60)
    if (!isAllowed) {
      await logSecurityEvent({
        eventType: 'widget_ping_rate_limited',
        severity: 'warning',
        message: 'Rate limit excedido para ping de widget',
        req,
      })
      return NextResponse.json(
        { error: 'Demasiados intentos' },
        { status: 429, headers: corsHeaders }
      )
    }

    // --- Validación de dominio ---
    const domainValidation = await validateWidgetDomain({ assistantId, req, pageUrl })
    const { isValid, normalizedDomain } = domainValidation

    if (!isValid) {
      await logSecurityEvent({
        eventType: 'widget_domain_blocked',
        severity: 'warning',
        message: `Dominio no autorizado para ping: ${normalizedDomain}`,
        metadata: { assistantId, visitorId, pageUrl, normalizedDomain },
        req,
      })
      return NextResponse.json(
        { error: 'Este dominio no está autorizado para usar este asistente.' },
        { status: 403, headers: corsHeaders }
      )
    }

    // --- Actualización de assistant_domains ---
    // Solo actualizamos si existe un dbDomainId (fila real en la tabla)
    if (!domainValidation.dbDomainId) {
      // Caso: localhost en dev sin fila registrada → permitir el widget pero no actualizar DB
      if (isDev) {
        return NextResponse.json(
          {
            success: true,
            status: 'allowed_dev_no_db_record',
            assistantId,
            normalizedDomain,
            warning: 'El dominio no tiene fila en assistant_domains. Agrega localhost para actualizar la verificación.',
          },
          { headers: corsHeaders }
        )
      }
      // En producción esto no debería ocurrir (el dominio fue validado pero no tiene fila)
      return NextResponse.json(
        { error: 'No se encontró el registro de dominio.' },
        { status: 500, headers: corsHeaders }
      )
    }

    const admin = createSupabaseAdmin()
    const userAgent = req.headers.get('user-agent') || null
    const now = new Date().toISOString()

    // Leer el contador actual de forma segura desde backend (service_role)
    const { data: currentDomain, error: selectError } = await admin
      .from('assistant_domains')
      .select('install_events_count, user_id')
      .eq('id', domainValidation.dbDomainId)
      .single()

    if (selectError || !currentDomain) {
      console.error('[ping] Error leyendo fila actual:', selectError)
      return NextResponse.json(
        { error: 'Error interno al leer el dominio' },
        { status: 500, headers: corsHeaders }
      )
    }

    const nextCount = (currentDomain.install_events_count ?? 0) + 1

    // Actualizar usando assistant_id + domain + is_active como condición (más robusto)
    const { data: updatedRows, error: updateError } = await admin
      .from('assistant_domains')
      .update({
        is_verified: true,
        verification_status: 'verified',
        last_seen_at: now,
        last_seen_url: pageUrl || null,
        last_seen_user_agent: userAgent,
        last_seen_ip: ip !== 'unknown' ? ip : null,
        install_events_count: nextCount,
        updated_at: now,
      })
      .eq('assistant_id', assistantId)
      .eq('domain', normalizedDomain!)
      .eq('is_active', true)
      .select('id, assistant_id, domain, is_verified, verification_status, last_seen_at, install_events_count')

    if (updateError) {
      console.error('[ping] Error actualizando assistant_domains:', updateError)
      return NextResponse.json(
        { error: 'Error interno al actualizar el dominio', detail: isDev ? updateError.message : undefined },
        { status: 500, headers: corsHeaders }
      )
    }

    // Si no actualizó ninguna fila, reportar error
    if (!updatedRows || updatedRows.length === 0) {
      console.error('[ping] UPDATE no afectó ninguna fila:', { assistantId, normalizedDomain })
      if (isDev) {
        return NextResponse.json(
          {
            error: 'No matching assistant_domain row updated',
            assistantId,
            normalizedDomain,
          },
          { status: 500, headers: corsHeaders }
        )
      }
      return NextResponse.json(
        { error: 'No se pudo verificar el dominio' },
        { status: 500, headers: corsHeaders }
      )
    }

    const updatedRow = updatedRows[0]

    // Registrar auditoría solo en primer ping (install_events_count era 0)
    if (nextCount === 1) {
      await logAuditEvent({
        userId: currentDomain.user_id,
        action: 'widget_installation_detected',
        description: `El script del widget fue detectado por primera vez en ${normalizedDomain}`,
        entityType: 'assistant_domains',
        entityId: updatedRow.id,
        req,
      })
    }

    // Respuesta con debug info en desarrollo
    if (isDev) {
      return NextResponse.json(
        {
          success: true,
          status: 'verified',
          assistantId,
          normalizedDomain,
          updatedDomainId: updatedRow.id,
          updatedRow,
        },
        { headers: corsHeaders }
      )
    }

    return NextResponse.json(
      { success: true, status: 'verified' },
      { headers: corsHeaders }
    )
  } catch (error) {
    console.error('[POST /api/widget/ping] Error inesperado:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500, headers: corsHeaders }
    )
  }
}
