import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: { id?: string; all?: boolean } = {}
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const supabaseAdmin = createSupabaseAdmin()

    // Marcar una específica
    if (body.id) {
      const { error } = await supabaseAdmin
        .from('notifications')
        .update({ is_read: true })
        .eq('id', body.id)
        .eq('user_id', user.id) // Ensure security

      if (error) {
        console.error('[PATCH /api/notifications/read] error:', error)
        return NextResponse.json({ error: 'Could not update notification' }, { status: 500 })
      }
      return NextResponse.json({ success: true })
    }

    // Marcar todas
    if (body.all) {
      const { error } = await supabaseAdmin
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false)

      if (error) {
        console.error('[PATCH /api/notifications/read] error:', error)
        return NextResponse.json({ error: 'Could not update notifications' }, { status: 500 })
      }
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Missing id or all param' }, { status: 400 })
  } catch (err) {
    console.error('[PATCH /api/notifications/read] exception:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
