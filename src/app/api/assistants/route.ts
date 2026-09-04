import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/security'

// GET /api/assistants — list user's assistants
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Debes iniciar sesión.' }, { status: 401 })

    const { data: assistants, error } = await supabase
      .from('assistants')
      .select('id, name, business, instructions, tone, behavior, faq, services, schedule, channels, allow_all_domains, created_at, updated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[GET /api/assistants]', error.message)
      return NextResponse.json({ error: 'Error al obtener asistentes' }, { status: 500 })
    }

    const enrichedAssistants = (assistants || []).map((assistant) => ({
      ...assistant,
      channels: Array.isArray(assistant.channels) ? assistant.channels : [],
      faq: Array.isArray(assistant.faq) ? assistant.faq : [],
      services: Array.isArray(assistant.services) ? assistant.services : [],
    }))

    return NextResponse.json({ assistants: enrichedAssistants })
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
    if (authError || !user) return NextResponse.json({ error: 'Debes iniciar sesión para crear un asistente.' }, { status: 401 })

    const rateLimited = await checkRateLimit(`assistant-create-${user.id}`, 'assistant-create', 5, 600)
    if (rateLimited) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Intenta nuevamente más tarde.' },
        { status: 429, headers: { 'Retry-After': '600' } }
      )
    }

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ success: false, error: 'El cuerpo de la solicitud no es JSON válido.' }, { status: 400 })
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ success: false, error: 'El cuerpo debe ser un objeto JSON.' }, { status: 400 })
    }

    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const business = typeof body.business === 'string' ? body.business.trim() : ''
    const instructions = typeof body.instructions === 'string' ? body.instructions.trim() : ''
    const tone = typeof body.tone === 'string' ? body.tone : 'amigable'
    const behavior = typeof body.behavior === 'string' ? body.behavior.trim() : ''
    const faq = Array.isArray(body.faq) ? body.faq : []
    const services = Array.isArray(body.services) ? body.services : []
    const schedule = Array.isArray(body.schedule) ? body.schedule : []
    const knowledge = Array.isArray(body.knowledge) ? body.knowledge : []
    const channels = Array.isArray(body.channels) ? body.channels : ['webchat']
    const allowAllDomains = body.allow_all_domains === true

    if (!name || name.length > 100) return NextResponse.json({ success: false, error: 'El nombre es obligatorio y debe tener máximo 100 caracteres.' }, { status: 400 })
    if (business.length > 2000) return NextResponse.json({ success: false, error: 'El negocio no puede superar 2000 caracteres.' }, { status: 400 })
    if (instructions.length > 10000) return NextResponse.json({ success: false, error: 'Las instrucciones no pueden superar 10000 caracteres.' }, { status: 400 })
    if (behavior.length > 5000) return NextResponse.json({ success: false, error: 'El comportamiento no puede superar 5000 caracteres.' }, { status: 400 })

    const allowedTones = ['amigable', 'profesional', 'vendedor', 'cercano', 'directo']
    if (!allowedTones.includes(tone)) return NextResponse.json({ success: false, error: 'Tono no válido.' }, { status: 400 })

    const allowedChannels = ['webchat', 'telegram', 'whatsapp']
    if (channels.length === 0 || channels.length > 3 || channels.some((channel) => typeof channel !== 'string' || !allowedChannels.includes(channel))) {
      return NextResponse.json({ success: false, error: 'Canales no válidos.' }, { status: 400 })
    }

    if (faq.length > 50 || services.length > 50 || schedule.length > 50 || knowledge.length > 50) {
      return NextResponse.json({ success: false, error: 'Demasiados elementos en la configuración.' }, { status: 400 })
    }

    const knowledgeSize = knowledge.reduce((total, item) => total + (typeof item === 'string' ? item.length : JSON.stringify(item).length), 0)
    if (knowledgeSize > 100000) return NextResponse.json({ success: false, error: 'La base de conocimiento es demasiado grande.' }, { status: 400 })

    const supabaseAdmin = createSupabaseAdmin()
    const { data: profile } = await supabaseAdmin.from('profiles').select('plan, trial_ends_at').eq('id', user.id).maybeSingle()
    const plan = profile?.plan || 'free'
    const trialActive = !!profile?.trial_ends_at && new Date(profile.trial_ends_at).getTime() > Date.now()
    const effectivePlan = trialActive ? 'pro' : plan

    const channelLimits: Record<string, string[]> = {
      free: ['webchat'],
      starter: ['webchat', 'telegram'],
      pro: ['webchat', 'telegram', 'whatsapp'],
      business: ['webchat', 'telegram', 'whatsapp'],
    }
    const allowedForPlan = channelLimits[effectivePlan] || channelLimits.free
    if (channels.some((channel) => !allowedForPlan.includes(channel))) {
      return NextResponse.json({ success: false, error: 'Uno o más canales no están disponibles en tu plan.' }, { status: 403 })
    }

    // The database trigger/RPC enforces the assistant quota atomically.
    const { data: assistant, error: insertError } = await supabaseAdmin
      .from('assistants')
      .insert({
        user_id: user.id,
        name,
        business,
        instructions,
        tone,
        behavior,
        faq,
        services,
        schedule,
        knowledge,
        channels,
        allow_all_domains: allowAllDomains,
      })
      .select('id, name, business, instructions, tone, behavior, faq, services, schedule, knowledge, channels, allow_all_domains, created_at, updated_at')
      .single()

    if (insertError || !assistant) {
      console.error('[POST /api/assistants]', insertError?.message || 'insert failed')
      if (insertError?.code === '23505' || insertError?.message?.toLowerCase().includes('limit')) {
        return NextResponse.json({ success: false, error: 'Has alcanzado el límite de asistentes de tu plan.' }, { status: 403 })
      }
      return NextResponse.json({ success: false, error: 'No se pudo crear el asistente.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, assistant }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/assistants]', error instanceof Error ? error.message : 'Unknown error')
    return NextResponse.json({ success: false, error: 'No se pudo crear el asistente.' }, { status: 500 })
  }
}
