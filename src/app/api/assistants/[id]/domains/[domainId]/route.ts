import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { logAuditEvent } from '@/lib/audit'

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string; domainId: string }> }) {
  try {
    const { id: assistantId, domainId } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar propiedad
    const { data: assistant } = await supabase
      .from('assistants')
      .select('id')
      .eq('id', assistantId)
      .eq('user_id', user.id)
      .single()

    if (!assistant) {
      return NextResponse.json({ error: 'Asistente no encontrado o sin acceso' }, { status: 404 })
    }

    // Verificar que el dominio existe y pertenece a este asistente
    const { data: domainRec } = await supabase
      .from('assistant_domains')
      .select('id, domain')
      .eq('id', domainId)
      .eq('assistant_id', assistantId)
      .single()

    if (!domainRec) {
      return NextResponse.json({ error: 'Dominio no encontrado' }, { status: 404 })
    }

    const admin = createSupabaseAdmin()
    const { error } = await admin
      .from('assistant_domains')
      .delete()
      .eq('id', domainId)

    if (error) throw error

    await logAuditEvent({
      userId: user.id,
      action: 'widget_domain_removed',
      description: `Dominio ${domainRec.domain} eliminado.`,
      entityType: 'assistant_domains',
      entityId: domainId,
      req: request
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/assistants/[id]/domains/[domainId]]', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
