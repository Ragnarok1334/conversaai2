import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { NextRequest } from 'next/server'

interface AuditEventParams {
  userId?: string | null
  action: string
  entityType?: string
  entityId?: string
  description?: string
  metadata?: Record<string, any>
  req?: NextRequest | Request
  ip_address?: string | null
  user_agent?: string | null
}

interface SecurityEventParams {
  userId?: string | null
  eventType: string
  severity?: 'info' | 'warning' | 'critical'
  route?: string
  message?: string
  metadata?: Record<string, any>
  req?: NextRequest | Request
  ip_address?: string | null
  user_agent?: string | null
}

function extractRequestInfo(req?: NextRequest | Request) {
  let ip_address: string | null = null
  let user_agent: string | null = null

  if (req) {
    if ('ip' in req && typeof req.ip === 'string') {
        ip_address = req.ip
    } else if (req.headers) {
      ip_address = req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || null
    }
    user_agent = req.headers?.get('user-agent') || null
  }

  return { ip_address, user_agent }
}

/**
 * Registra una acción normal en el historial de auditoría del usuario.
 * Se ejecuta con service_role para eludir el bloqueo de inserts desde el frontend.
 */
export async function logAuditEvent(params: AuditEventParams) {
  try {
    const admin = createSupabaseAdmin()
    const extracted = extractRequestInfo(params.req)
    const ip_address = params.ip_address || extracted.ip_address
    const user_agent = params.user_agent || extracted.user_agent

    const payload = {
      user_id: params.userId || null,
      action: params.action,
      entity_type: params.entityType || null,
      entity_id: params.entityId || null,
      description: params.description || null,
      metadata: params.metadata || {},
      ip_address,
      user_agent,
    }

    const { error } = await admin.from('audit_logs').insert(payload)

    if (error) {
      console.error('[logAuditEvent] Error inserting audit log:', error)
    }
  } catch (err) {
    console.error('[logAuditEvent] Exception:', err)
  }
}

/**
 * Registra eventos maliciosos, anómalos o de seguridad crítica.
 * Útil para monitorear intentos de login fallidos, rate limits excedidos, etc.
 */
export async function logSecurityEvent(params: SecurityEventParams) {
  try {
    const admin = createSupabaseAdmin()
    const extracted = extractRequestInfo(params.req)
    const ip_address = params.ip_address || extracted.ip_address
    const user_agent = params.user_agent || extracted.user_agent

    const payload = {
      user_id: params.userId || null,
      event_type: params.eventType,
      severity: params.severity || 'info',
      route: params.route || null,
      message: params.message || null,
      metadata: params.metadata || {},
      ip_address,
      user_agent,
    }

    const { error } = await admin.from('security_events').insert(payload)

    if (error) {
      console.error('[logSecurityEvent] Error inserting security event:', error)
    }

    // Opcional: Si el evento es crítico, podríamos disparar alertas o correos internos aquí.
  } catch (err) {
    console.error('[logSecurityEvent] Exception:', err)
  }
}
