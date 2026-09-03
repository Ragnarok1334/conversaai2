import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { logAuditEvent } from '@/lib/audit'

const MAX_BODY_BYTES = 8 * 1024
const SETTINGS_FIELDS = [
  'weekly_summary', 'lead_alerts', 'conversation_alerts',
  'usage_limit_alerts', 'billing_alerts', 'security_alerts',
  'product_updates', 'email_notifications', 'dashboard_notifications',
  'telegram_notifications'
] as const

const SAFE_SELECT = SETTINGS_FIELDS.join(',')

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabaseAdmin = createSupabaseAdmin()
    const { data: settings, error } = await supabaseAdmin
      .from('user_settings')
      .select(SAFE_SELECT)
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) {
      console.error('[GET /api/settings] lookup failed')
      return NextResponse.json({ error: 'No se pudieron cargar las preferencias' }, { status: 500 })
    }

    if (!settings) {
      return NextResponse.json({
        weekly_summary: false,
        lead_alerts: true,
        conversation_alerts: true,
        usage_limit_alerts: true,
        billing_alerts: true,
        security_alerts: true,
        product_updates: false,
        email_notifications: false,
        dashboard_notifications: true,
        telegram_notifications: false,
      })
    }

    return NextResponse.json(settings)
  } catch (err) {
    console.error('[GET /api/settings] Error:', err instanceof Error ? err.message : 'unknown')
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const contentLength = Number.parseInt(req.headers.get('content-length') || '', 10)
    if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Solicitud demasiado grande' }, { status: 413 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const rawBody = await req.text()
    if (new TextEncoder().encode(rawBody).length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Solicitud demasiado grande' }, { status: 413 })
    }

    let body: unknown
    try {
      body = JSON.parse(rawBody)
    } catch {
      return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
    }
    if (!isPlainObject(body)) return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 })

    const patch: Record<string, boolean> = {}
    for (const key of SETTINGS_FIELDS) {
      if (key in body) {
        if (typeof body[key] !== 'boolean') {
          return NextResponse.json({ error: `Valor inválido para ${key}` }, { status: 400 })
        }
        patch[key] = body[key]
      }
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const supabaseAdmin = createSupabaseAdmin()
    const { data, error } = await supabaseAdmin
      .from('user_settings')
      .upsert(
        { user_id: user.id, ...patch, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )
      .select(SAFE_SELECT)
      .single()

    if (error) {
      console.error('[PATCH /api/settings] upsert failed')
      return NextResponse.json({ error: 'Error guardando preferencias' }, { status: 500 })
    }

    await logAuditEvent({
      userId: user.id,
      action: 'notification_settings_updated',
      entityType: 'settings',
      entityId: user.id,
      description: 'Se actualizaron las preferencias de notificación',
      metadata: { updates: Object.keys(patch) },
      req
    })

    return NextResponse.json(data)
  } catch (err) {
    console.error('[PATCH /api/settings] Error:', err instanceof Error ? err.message : 'unknown')
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
