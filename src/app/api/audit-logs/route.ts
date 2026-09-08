import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { createSupabaseAdmin } = await import('@/lib/supabase/admin')
    const supabaseAdmin = createSupabaseAdmin()

    // Older installations used `details`; newer ones use `description`.
    // Selecting the row and normalizing server-side supports both schemas.
    const { data, error } = await supabaseAdmin
      .from('audit_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('[GET /api/audit-logs] DB Error:', error)
      return NextResponse.json({ error: 'Error al obtener los logs de auditoría' }, { status: 500 })
    }

    const logs = (data ?? []).map((row) => ({
      id: row.id,
      action: row.action,
      description: row.description ?? row.details ?? 'Actividad registrada',
      created_at: row.created_at,
      ip_address: row.ip_address ?? null,
      user_agent: row.user_agent ?? null,
    }))

    return NextResponse.json({ logs })
  } catch (error) {
    console.error('[GET /api/audit-logs]', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
