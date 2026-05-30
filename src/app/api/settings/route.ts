import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'

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
        weekly_summary: true,
        lead_alerts: false,
        conversation_alerts: true,
        message_limit_alerts: true,
        payment_alerts: true,
        dashboard_density: 'comfortable',
        default_dashboard_page: 'dashboard',
        display_name: user.user_metadata?.name || null,
        company_name: null,
        phone: null,
        country: null,
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

    // Only allow safe fields — never trust user_id from body
    const allowed = [
      'weekly_summary', 'lead_alerts', 'conversation_alerts',
      'message_limit_alerts', 'payment_alerts',
      'dashboard_density', 'default_dashboard_page',
      'display_name', 'company_name', 'phone', 'country',
    ]
    const patch: Record<string, unknown> = {}
    for (const key of allowed) {
      if (key in body) patch[key] = body[key]
    }

    if (Object.keys(patch).length === 0) {
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
      console.error('[PATCH /api/settings] upsert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('[PATCH /api/settings]', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
