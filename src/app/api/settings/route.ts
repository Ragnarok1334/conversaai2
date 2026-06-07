import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { logAuditEvent } from '@/lib/audit'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabaseAdmin = createSupabaseAdmin()
    const { data: settings } = await supabaseAdmin
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

    // If no settings row yet, return safe defaults
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
        dashboard_density: 'comfortable',
        default_dashboard_page: 'dashboard',
        language: 'es'
      })
    }

    return NextResponse.json(settings)
  } catch (err) {
    console.error('[GET /api/settings]', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()

    if (process.env.NODE_ENV === 'development') {
      console.log(`[PATCH /api/settings] User: ${user.id} | Body:`, body)
    }

    // Only allow safe boolean fields — never trust user_id from body
    const booleanFields = [
      'weekly_summary', 'lead_alerts', 'conversation_alerts',
      'usage_limit_alerts', 'billing_alerts', 'security_alerts',
      'product_updates', 'email_notifications', 'dashboard_notifications',
      'telegram_notifications'
    ]
    const patch: Record<string, unknown> = {}
    
    for (const key of booleanFields) {
      if (key in body) {
        // Validate it's actually a boolean to prevent SQL type errors
        if (typeof body[key] === 'boolean') {
          patch[key] = body[key]
        }
      }
    }

    if (Object.keys(patch).length === 0) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[PATCH /api/settings] No valid boolean fields found in body.`)
      }
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const supabaseAdmin = createSupabaseAdmin()

    // Upsert — creates the row if it doesn't exist
    const { data, error } = await supabaseAdmin
      .from('user_settings')
      .upsert(
        { user_id: user.id, ...patch, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )
      .select()
      .single()

    if (error) {
      console.error('[PATCH /api/settings] upsert error details:', error)
      return NextResponse.json({ error: 'Error guardando preferencias' }, { status: 500 })
    }

    // Only log if not just read
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
    console.error('[PATCH /api/settings] unexpected error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
