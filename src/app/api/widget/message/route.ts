import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { generateAssistantReply, type AssistantConfig } from '@/lib/openai'
import { isUnlimited, normalizePlan, getPlanConfig } from '@/lib/plans'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { assistantId, message, conversationId } = body

    if (!assistantId) {
      return NextResponse.json({ error: 'Missing assistantId' }, { status: 400, headers: corsHeaders })
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0 || message.length > 1000) {
      return NextResponse.json({ error: 'Mensaje inválido o demasiado largo.' }, { status: 400, headers: corsHeaders })
    }

    const supabaseAdmin = createSupabaseAdmin()

    // 1. Fetch assistant and check status
    const { data: assistant, error: assistantError } = await supabaseAdmin
      .from('assistants')
      .select('*')
      .eq('id', assistantId)
      .single()

    if (assistantError || !assistant) {
      return NextResponse.json({ error: 'Asistente no encontrado.' }, { status: 404, headers: corsHeaders })
    }

    if (assistant.status !== 'active') {
      return NextResponse.json({ error: 'El asistente no está activo.' }, { status: 403, headers: corsHeaders })
    }

    const ownerId = assistant.user_id

    // 2. Fetch owner subscription limits
    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('plan, current_messages_used, messages_limit, status')
      .eq('user_id', ownerId)
      .single()

    if (!sub || sub.status !== 'active') {
      return NextResponse.json({ error: 'El servicio del asistente no está activo.' }, { status: 403, headers: corsHeaders })
    }

    const normalizedPlan = normalizePlan(sub.plan)
    const planConfig = getPlanConfig(normalizedPlan)
    const effectiveLimit = planConfig.messagesLimit

    // 3. Verify message limit
    if (!isUnlimited(effectiveLimit) && sub.current_messages_used >= (effectiveLimit ?? 0)) {
      return NextResponse.json({
        error: 'El asistente alcanzó el límite mensual de mensajes.',
        code: 'MESSAGE_LIMIT_REACHED'
      }, { status: 403, headers: corsHeaders })
    }

    // 4. Generate AI Reply
    const config: AssistantConfig = {
      assistantName: assistant.assistant_name || '',
      businessName: assistant.business_name || '',
      businessType: assistant.business_type || '',
      channel: assistant.channel || 'webchat',
      tone: assistant.tone || 'profesional',
      mainGoal: assistant.main_goal || '',
      instructions: assistant.instructions || '',
      faqs: assistant.faqs || '',
      services: assistant.services || '',
      schedule: assistant.schedule || '',
      fallbackMessage: assistant.fallback_message || '',
      language: assistant.language || 'es',
    }

    const reply = await generateAssistantReply(config, message.trim())

    // 5. Update message usage
    await supabaseAdmin.from('subscriptions')
      .update({ current_messages_used: sub.current_messages_used + 1 })
      .eq('user_id', ownerId)

    // 6. Return response
    return NextResponse.json({ reply, conversationId: conversationId || `conv_${Date.now()}` }, { headers: corsHeaders })

  } catch (error) {
    console.error('[POST /api/widget/message]', error)
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500, headers: corsHeaders })
  }
}
