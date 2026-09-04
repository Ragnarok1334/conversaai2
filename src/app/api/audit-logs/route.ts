import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/security'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const allowed = await checkRateLimit(`audit-logs-${user.id}`, 'audit-logs-read', 60, 60)
    if (!allowed) {
      return NextResponse.json({ error: 'Demasiadas solicitudes. Inténtalo de nuevo más tarde.' }, { status: 429 })
    }

    const { data, error } = await supabase
      .from('audit_logs')
      .select('id, action, description, created_at, ip_address, user_agent')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('[GET /api/audit-logs] DB Error:', error.message)
      return NextResponse.json({ error: 'Error al obtener los logs de auditoría' }, { status: 500 })
    }

    return NextResponse.json({ logs: data })
  } catch (error) {
    console.error('[GET /api/audit-logs]', error instanceof Error ? error.message : 'Unknown error')
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
