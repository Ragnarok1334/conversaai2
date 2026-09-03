import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { logAuditEvent } from '@/lib/audit'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string; domainId: string }> }) {
  try {
    const { id: assistantId, domainId } = await params
    if (!UUID_RE.test(assistantId) || !UUID_RE.test(domainId)) {
      return NextResponse.json({ error: 'Identificador inválido' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data: assistant } = await supabase
      .from('assistants')
      .select('id')
      .eq('id', assistantId)
      .eq('user_id', user.id)
      .single()

    if (!assistant) {
      return NextResponse.json({ error: 'Asistente no encontrado o sin acceso' }, { status: 404 })
    }

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
      .eq('assistant_id', assistantId)
      .eq('user_id', user.id)

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
    console.error('[DELETE /api/assistants/[id]/domains/[domainId]]', error instanceof Error ? error.message : 'unknown error')
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
