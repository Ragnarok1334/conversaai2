import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
      .select(`*, assistant_test_messages(*)`)
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Asistente no encontrado' }, { status: 404 })
    }

    return NextResponse.json({ assistant: data })
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
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()

    // Whitelist allowed fields
    const allowedFields = [
      'assistant_name', 'name', 'business_name', 'business_type',
      'instructions', 'behavior', 'channel', 'tone',
      'objective', 'main_goal', 'fallback_message', 'welcome_message',
      'status'
    ]

    const updates: Record<string, any> = { updated_at: new Date().toISOString() }

    for (const key of allowedFields) {
      if (key in body && body[key] !== undefined) {
        let val = body[key]
        
        // Validation for string fields
        if (typeof val === 'string') {
          val = val.trim()
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
      return NextResponse.json({ error: 'No se pudo actualizar' }, { status: 404 })
    }

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
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { error } = await supabase
      .from('assistants')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/assistants/[id]]', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
