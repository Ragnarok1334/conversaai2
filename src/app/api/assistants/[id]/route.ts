import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logAuditEvent, logSecurityEvent } from '@/lib/audit'

// GET /api/assistants/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('assistants')
      .select(`
        *, 
        assistant_test_messages(*),
        assistant_domains ( verification_status )
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Asistente no encontrado' }, { status: 404 })
    }

    const { data: convData } = await supabase
      .from('conversations')
      .select('created_at')
      .eq('assistant_id', id)

    const { data: leadsData } = await supabase
      .from('leads')
      .select('created_at')
      .eq('assistant_id', id)

    const conversationsCount = convData?.length || 0
    const leadsCount = leadsData?.length || 0

    const lastConvAt = conversationsCount > 0 ? Math.max(...(convData || []).map(c => new Date(c.created_at).getTime())) : 0
    const lastLeadAt = leadsCount > 0 ? Math.max(...(leadsData || []).map(l => new Date(l.created_at).getTime())) : 0
    const lastActivityAt = Math.max(new Date(data.created_at).getTime(), lastConvAt, lastLeadAt)

    const { calculateAssistantHealth } = await import('@/lib/assistant/assistant-health')
    
    const health = calculateAssistantHealth(
      data,
      data.assistant_domains || [],
      { conversations: conversationsCount, leads: leadsCount }
    )

    const enrichedAssistant = {
      ...data,
      conversationsCount,
      leadsCount,
      lastActivityAt: new Date(lastActivityAt).toISOString(),
      health
    }

    return NextResponse.json({ assistant: enrichedAssistant })
  } catch (error) {
    console.error('[GET /api/assistants/[id]]', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// PATCH /api/assistants/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      await logSecurityEvent({ eventType: 'unauthorized_api_access', severity: 'warning', message: 'Intento de actualizar asistente sin auth', req: request })
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()

    // Whitelist allowed fields
    const allowedFields = [
      'assistant_name', 'name', 'business_name', 'business_type',
      'instructions', 'behavior', 'channel', 'tone',
      'objective', 'main_goal', 'fallback_message', 'welcome_message',
      'status', 'knowledge_blocks', 'faqs', 'services', 'schedule', 'language'
    ]

    const updates: Record<string, any> = { updated_at: new Date().toISOString() }

    for (const key of allowedFields) {
      if (key in body && body[key] !== undefined) {
        let val = body[key]
        
        // Validation for string fields
        if (typeof val === 'string') {
          val = val.trim()
          if (key === 'channel' && (val === 'telegram' || val === 'whatsapp')) {
             return NextResponse.json({ error: `El canal ${val} no está disponible en este momento.` }, { status: 400 })
          }
          if (['assistant_name', 'name', 'business_name', 'channel', 'tone', 'objective'].includes(key) && val.length > 100) {
            return NextResponse.json({ error: `El campo ${key} excede la longitud máxima permitida (100).` }, { status: 400 })
          }
          if (['fallback_message', 'welcome_message'].includes(key) && val.length > 500) {
            return NextResponse.json({ error: `El campo ${key} excede la longitud máxima permitida (500).` }, { status: 400 })
          }
          if (key === 'instructions' && val.length > 2000) {
            return NextResponse.json({ error: `Las instrucciones exceden la longitud máxima permitida (2000).` }, { status: 400 })
          }
        }

        // Validation for status whitelist
        if (key === 'status') {
          if (!['active', 'inactive', 'draft'].includes(val)) {
            return NextResponse.json({ error: `El estado '${val}' no es válido.` }, { status: 400 })
          }
        }

        // Validation for knowledge_blocks
        if (key === 'knowledge_blocks') {
          if (val !== null && !Array.isArray(val)) {
            return NextResponse.json({ error: 'El campo knowledge_blocks debe ser un array o null.' }, { status: 400 })
          }
          if (Array.isArray(val)) {
            for (const block of val) {
              if (typeof block.type !== 'string' || typeof block.title !== 'string' || typeof block.content !== 'string' || typeof block.is_active !== 'boolean') {
                return NextResponse.json({ error: 'Formato inválido en bloque de conocimiento.' }, { status: 400 })
              }
              if (block.title.length > 120) return NextResponse.json({ error: 'Título de bloque excede 120 caracteres.' }, { status: 400 })
              if (block.content.length > 5000) return NextResponse.json({ error: 'Contenido de bloque excede 5000 caracteres.' }, { status: 400 })
            }
          }
        }

        updates[key] = val
      }
    }

    // Validate behavior structure if it's being updated
    if ('behavior' in updates && updates.behavior !== null) {
      const b = updates.behavior
      if (typeof b !== 'object' || Array.isArray(b)) {
        return NextResponse.json({ error: 'El campo behavior debe ser un objeto válido.' }, { status: 400 })
      }
      
      // Enforce specific boolean rules structure if rules object exists
      if (b.rules && typeof b.rules === 'object') {
        const allowedRules = ['askName', 'askContact', 'offerPricesWhenAsked', 'suggestAppointment', 'escalateIfUnknown', 'doNotInvent', 'alwaysSpanish']
        for (const rule in b.rules) {
          if (!allowedRules.includes(rule) || typeof b.rules[rule] !== 'boolean') {
            return NextResponse.json({ error: `La regla de behavior '${rule}' no es válida o no es boolean.` }, { status: 400 })
          }
        }
      }
    }

    if (Object.keys(updates).length === 1) { // only updated_at
      return NextResponse.json({ error: 'No hay campos válidos para actualizar.' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('assistants')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error || !data) {
      await logSecurityEvent({ userId: user.id, eventType: 'assistant_update_forbidden', severity: 'warning', message: `No se pudo actualizar el asistente ${id}. ¿Permisos o inexistente?`, req: request })
      return NextResponse.json({ error: 'No se pudo actualizar' }, { status: 404 })
    }

    await logAuditEvent({ userId: user.id, action: 'assistant_updated', entityType: 'assistant', entityId: id, description: 'Asistente actualizado', metadata: { updates: Object.keys(updates) }, req: request })

    return NextResponse.json({ assistant: data })
  } catch (error) {
    console.error('[PATCH /api/assistants/[id]]', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// DELETE /api/assistants/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      await logSecurityEvent({ eventType: 'unauthorized_api_access', severity: 'warning', message: 'Intento de eliminar asistente sin auth', req: _request })
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { error } = await supabase
      .from('assistants')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      await logSecurityEvent({ userId: user.id, eventType: 'assistant_delete_forbidden', severity: 'warning', message: `No se pudo eliminar el asistente ${id}`, req: _request })
      throw error
    }

    await logAuditEvent({ userId: user.id, action: 'assistant_deleted', entityType: 'assistant', entityId: id, description: 'Asistente eliminado', req: _request })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/assistants/[id]]', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
