import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { canUseChannel, PlanKey, isUnlimited } from '@/lib/plans'

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

    // --- Subscription & Limit Checks ---
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('plan, assistants_limit, status')
      .eq('user_id', user.id)
      .single()

    if (!sub || sub.status !== 'active') {
      return NextResponse.json({ error: 'Suscripción inactiva o no encontrada' }, { status: 403 })
    }

    const requestedChannel = channel || 'webchat'
    if (!canUseChannel(sub.plan as PlanKey, requestedChannel)) {
      return NextResponse.json({ error: `Tu plan actual no permite el canal: ${requestedChannel}. Actualiza tu plan para desbloquearlo.` }, { status: 403 })
    }

    const { count, error: countErr } = await supabase
      .from('assistants')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if (countErr) throw countErr

    if (!isUnlimited(sub.assistants_limit) && (count || 0) >= sub.assistants_limit) {
      return NextResponse.json({ error: `Has alcanzado el límite de asistentes de tu plan (${sub.assistants_limit}). Actualiza tu cuenta para crear más.` }, { status: 403 })
    }
    // -----------------------------------

    const { data, error } = await supabase
      .from('assistants')
      .insert({
        user_id: user.id,
        assistant_name,
        business_name,
        business_type: business_type || null,
        channel: requestedChannel,
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
