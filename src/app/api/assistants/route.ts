import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/assistants — list user's assistants
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('assistants')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ assistants: data })
  } catch (error) {
    console.error('[GET /api/assistants]', error)
    return NextResponse.json({ error: 'Error al obtener asistentes' }, { status: 500 })
  }
}

// POST /api/assistants — create a new assistant
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const {
      assistant_name,
      business_name,
      business_type,
      channel,
      tone,
      main_goal,
      instructions,
      faqs,
      services,
      schedule,
      fallback_message,
      language,
    } = body

    if (!assistant_name || !business_name) {
      return NextResponse.json({ error: 'Nombre del asistente y negocio son requeridos' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('assistants')
      .insert({
        user_id: user.id,
        assistant_name,
        business_name,
        business_type: business_type || null,
        channel: channel || 'webchat',
        tone: tone || 'profesional',
        main_goal: main_goal || null,
        instructions: instructions || null,
        faqs: faqs || null,
        services: services || null,
        schedule: schedule || null,
        fallback_message: fallback_message || null,
        language: language || 'es',
        status: 'active',
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ assistant: data }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/assistants]', error)
    return NextResponse.json({ error: 'Error al crear asistente' }, { status: 500 })
  }
}
