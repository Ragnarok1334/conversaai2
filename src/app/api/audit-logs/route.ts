import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Usamos el cliente regular ya que RLS limitará la búsqueda al propio usuario.
    const { data, error } = await supabase
      .from('audit_logs')
      .select('id, action, description, created_at, ip_address, user_agent')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('[GET /api/audit-logs] DB Error:', error)
      return NextResponse.json({ error: 'Error al obtener los logs de auditoría' }, { status: 500 })
    }

    return NextResponse.json({ logs: data })
  } catch (error) {
    console.error('[GET /api/audit-logs]', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
