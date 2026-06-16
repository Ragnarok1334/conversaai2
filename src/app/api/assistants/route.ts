import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { canUseChannel, PlanKey, normalizePlan, getPlanLimits } from '@/lib/plans'
import { getEffectiveSubscriptionStatus } from '@/lib/billing/subscription-status'
import { logAuditEvent } from '@/lib/audit'
import { revalidatePath } from 'next/cache'

export const dynamic = 'force-dynamic'

// GET /api/assistants — list user's assistants
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data: assistants, error } = await supabase
      .from('assistants')
      .select(`
        *,
        assistant_domains ( verification_status )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Fetch counts for conversations and leads, keeping it optimized
    const { data: convData } = await supabase
      .from('conversations')
      .select('assistant_id, created_at')
      .eq('user_id', user.id)

    const { data: leadsData } = await supabase
      .from('leads')
      .select('assistant_id, created_at')
      .eq('user_id', user.id)

    const { calculateAssistantHealth } = await import('@/lib/assistant/assistant-health')

    // Compute stats
    const enrichedAssistants = assistants?.map(assistant => {
      const convs = convData?.filter(c => c.assistant_id === assistant.id) || []
      const leads = leadsData?.filter(l => l.assistant_id === assistant.id) || []
      
      const conversationsCount = convs.length
      const leadsCount = leads.length
      
      const lastConvAt = convs.length > 0 ? Math.max(...convs.map(c => new Date(c.created_at).getTime())) : 0
      const lastLeadAt = leads.length > 0 ? Math.max(...leads.map(l => new Date(l.created_at).getTime())) : 0
      const lastActivityAt = Math.max(new Date(assistant.created_at).getTime(), lastConvAt, lastLeadAt)

      const health = calculateAssistantHealth(
        assistant,
        assistant.assistant_domains || [],
        { conversations: conversationsCount, leads: leadsCount }
      )

      return {
        ...assistant,
        conversationsCount,
        leadsCount,
        lastActivityAt: new Date(lastActivityAt).toISOString(),
        health
      }
    })

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

    // PASO 3: Obtener usuario autenticado desde el servidor (nunca desde el frontend)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Debes iniciar sesión para crear un asistente.' },
        { status: 401 }
      )
    }

    // PASO 4: Leer y validar body
    const body = await request.json()

    // Acepta tanto los nombres del nuevo payload anidado como los legacy snake_case
    const name = body.assistant_name || body.name || ''
    const businessName = body.business_name || body.businessName || ''
    const businessInfo = body.instructions || body.business_info || body.businessInfo || ''
    const language = 'es' // siempre español por ahora

    // Comportamiento: viene de behavior.* o de legacy fields a nivel raíz
    const behavior = body.behavior ?? {}
    const channel = behavior.initialChannel || body.channel || 'webchat'
    const tone = behavior.tone || body.tone || 'profesional'
    const mainGoal = behavior.goal || body.main_goal || null
    const salesLevel = behavior.salesLevel || null
    const responseStyle = behavior.responseStyle || null
    const rules = behavior.rules ?? null

    // Campos adicionales
    const faqs = body.faqs || null
    const services = body.services || null
    const schedule = body.schedule || body.business_hours || body.businessHours || null
    const fallbackMessage = body.fallback_message || body.fallbackMessage || null
    const welcomeMessage = body.welcome_message || body.welcomeMessage || null

    // Knowledge blocks
    const rawBlocks = body.knowledge_blocks || body.knowledgeBlocks
    let finalKnowledgeBlocks = null
    if (rawBlocks && Array.isArray(rawBlocks)) {
      const validBlocks = rawBlocks
        .filter((b: any) => b && typeof b === 'object' && b.is_active !== false && b.enabled !== false && typeof b.content === 'string' && b.content.trim().length > 0)
        .map((b: any) => ({
          id: b.id || crypto.randomUUID(),
          type: b.type || 'general',
          title: b.title || 'Información',
          content: b.content,
          is_active: true,
          sort_order: b.sort_order || 0
        }))
      if (validBlocks.length > 0) {
        finalKnowledgeBlocks = validBlocks
      }
    }

    // Canales del nuevo objeto channels
    const channels = body.channels ?? {}

    const validTones = ['amigable', 'profesional', 'vendedor', 'cercano', 'directo']
    if (!validTones.includes(tone)) {
      return NextResponse.json(
        { success: false, error: 'El tono seleccionado no es válido.' },
        { status: 400 }
      )
    }

    if (!name.trim()) {
      return NextResponse.json(
        { success: false, error: 'El nombre del asistente es obligatorio.' },
        { status: 400 }
      )
    }
    const instructionsLength = businessInfo.trim().length;
    const hasValidBlock = finalKnowledgeBlocks !== null;
    if (instructionsLength < 80 && !hasValidBlock) {
      return NextResponse.json(
        { success: false, error: 'Agrega información mínima del negocio para entrenar el asistente.' },
        { status: 400 }
      )
    }

    // --- Subscription & Limit Checks via admin client (bypasses RLS) ---
    const supabaseAdmin = createSupabaseAdmin()
    
    const [subRes, profileRes] = await Promise.all([
      supabaseAdmin
        .from('subscriptions')
        .select('plan, assistants_limit, status, current_period_end, grace_ends_at, cancel_at_period_end')
        .eq('user_id', user.id)
        .single(),
      supabaseAdmin
        .from('profiles')
        .select('trial_used, trial_ends_at')
        .eq('id', user.id)
        .single()
    ])

    const sub = subRes.data
    const profile = profileRes.data

    const effectiveStatus = getEffectiveSubscriptionStatus(sub, profile)
    
    if (effectiveStatus === 'free' || effectiveStatus === 'expired' || effectiveStatus === 'cancelled') {
      return NextResponse.json(
        { 
          success: false,
          error: 'No tienes un plan activo. Renueva tu plan o activa tu prueba gratis para crear asistentes.',
          code: 'PLAN_NOT_ACTIVE'
        },
        { status: 403 }
      )
    }

    const rawPlan = sub ? sub.plan : 'free'
    const planKey = normalizePlan(rawPlan) as PlanKey
    const planLimits = getPlanLimits(planKey)
    const assistantsLimit = planLimits.assistants

    // Verify channel is allowed for this plan
    if (!canUseChannel(planKey, channel)) {
      return NextResponse.json(
        {
          success: false,
          error: `Tu plan actual (${planKey}) no permite el canal: ${channel}. Actualiza tu plan para desbloquearlo.`,
          code: 'CHANNEL_NOT_ALLOWED',
          plan: planKey,
          channel,
        },
        { status: 403 }
      )
    }

    // Count current assistants
    const { count, error: countErr } = await supabase
      .from('assistants')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if (countErr) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[POST /api/assistants] countErr:', countErr)
      }
      throw countErr
    }

    if (assistantsLimit !== null && (count || 0) >= assistantsLimit) {
      return NextResponse.json(
        {
          success: false,
          error: 'Alcanzaste el límite de asistentes de tu plan actual.',
          code: 'ASSISTANT_LIMIT_REACHED',
          limit: assistantsLimit,
          used: count || 0,
          plan: planKey,
        },
        { status: 403 }
      )
    }
    // -----------------------------------

    // PASO 5 & 6: Construir payload con columnas que SÍ existen en la tabla assistants
    // Las columnas como behavior, business_info, business_hours se guardan si la tabla las tiene.
    // Si no existen, el fallback hace un insert solo con las columnas base conocidas.
    const behaviorData = {
      initialChannel: channel,
      tone,
      goal: mainGoal,
      salesLevel,
      responseStyle,
      rules,
    }

    // Payload con todas las columnas posibles (incluyendo extendidas)
    const assistantPayloadFull = {
      user_id: user.id,
      assistant_name: name,
      business_name: businessName || name,
      business_type: body.business_type || body.businessType || null,
      channel: 'webchat',
      tone,
      main_goal: mainGoal,
      instructions: businessInfo || null,
      faqs,
      services,
      schedule,
      fallback_message: fallbackMessage,
      language,
      status: 'active',
      behavior: behaviorData,
      ...(welcomeMessage ? { welcome_message: welcomeMessage } : {}),
      ...(businessInfo ? { business_info: businessInfo } : {}),
      ...(schedule ? { business_hours: schedule } : {}),
      ...(finalKnowledgeBlocks ? { knowledge_blocks: finalKnowledgeBlocks } : {}),
    }

    // Payload mínimo solo con columnas base (fallback si las extendidas no existen)
    const assistantPayloadBase = {
      user_id: user.id,
      assistant_name: name,
      business_name: businessName || name,
      channel: 'webchat',
      tone,
      main_goal: mainGoal,
      instructions: businessInfo || null,
      language,
      status: 'active'
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[POST /api/assistants] assistantPayload (full):', {
        ...assistantPayloadFull,
      })
    }

    // Intentar primero con payload completo (incluyendo behavior y campos extendidos)
    let { data: assistant, error: assistantError } = await supabase
      .from('assistants')
      .insert(assistantPayloadFull)
      .select()
      .single()

    // Si falla por columna desconocida (código PGRST204 o 42703), hacer fallback al payload base
    if (assistantError) {
      const isColumnError =
        assistantError.message?.includes('column') ||
        assistantError.code === '42703' ||
        assistantError.code === 'PGRST204'

      if (isColumnError) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(
            '[POST /api/assistants] Columna extendida no existe, reintentando con payload base...',
            assistantError.message
          )
        }
        const fallbackResult = await supabase
          .from('assistants')
          .insert(assistantPayloadBase)
          .select()
          .single()

        assistant = fallbackResult.data
        assistantError = fallbackResult.error
      }
    }

    if (assistantError || !assistant) {
      console.error('[api/assistants][POST] Supabase insert error:', {
        message: assistantError?.message,
        details: assistantError?.details,
        hint: assistantError?.hint,
        code: assistantError?.code
      })

      if (assistantError?.code === '23514' && assistantError?.message?.includes('assistants_tone_check')) {
        return NextResponse.json(
          {
            success: false,
            error: 'El tono seleccionado no está permitido por la base de datos. Actualiza la configuración de tonos.',
            details: process.env.NODE_ENV === 'development' ? assistantError?.message : undefined,
          },
          { status: 500 } // Or 400 if user wants, but user didn't specify code for this one, actually "devolver error claro"
        )
      }

      return NextResponse.json(
        {
          success: false,
          error: 'No se pudo crear el asistente.',
          details: process.env.NODE_ENV === 'development' ? assistantError?.message : undefined,
        },
        { status: 500 }
      )
    }

    // PASO 7: Insertar canales en assistant_channels (si la tabla existe)
    // Si la tabla no existe todavía, el error se captura de forma segura
    // y no impide que el asistente se cree exitosamente.
    try {
      const telegramToken = ''
      const telegramTokenTrimmed = ''

      const channelsPayload = [
        {
          assistant_id: assistant.id,
          user_id: user.id,
          channel: 'webchat',
          is_enabled: true,
          config: { status: 'active' },
        },
        {
          assistant_id: assistant.id,
          user_id: user.id,
          channel: 'telegram',
          is_enabled: false,
          config: { status: 'coming_soon' },
        },
        {
          assistant_id: assistant.id,
          user_id: user.id,
          channel: 'whatsapp',
          is_enabled: false,
          config: { status: 'coming_soon' },
        },
      ]

      if (process.env.NODE_ENV === 'development') {
        // Log seguro — ocultar token real
        const safeChannelsPayload = channelsPayload.map((ch) => {
          if (ch.channel === 'telegram' && 'telegram_token' in ch.config) {
            return { ...ch, config: { ...ch.config, telegram_token: '***' } }
          }
          return ch
        })
        console.log('[POST /api/assistants] channelsPayload:', safeChannelsPayload)
      }

      const { error: channelsError } = await supabase
        .from('assistant_channels')
        .insert(channelsPayload)

      if (channelsError) {
        // No fallamos el request completo si assistant_channels no existe aún
        // Dejamos el asistente creado y logueamos el error para debugging
        console.error(
          '[POST /api/assistants] channelsError (non-fatal):',
          channelsError.message
        )
      }
    } catch (channelsCatchErr) {
      // Si la tabla assistant_channels no existe todavía, este bloque lo absorbe
      console.error(
        '[POST /api/assistants] channels insert failed (non-fatal):',
        channelsCatchErr
      )
    }

    // PASO 8: Respuesta de éxito
    await logAuditEvent({ userId: user.id, action: 'assistant_created', entityType: 'assistant', entityId: assistant.id, description: `Asistente creado: ${assistant.assistant_name}`, req: request })

    try {
      revalidatePath('/dashboard')
      revalidatePath('/dashboard/assistants')
    } catch (e) {
      console.error('[POST /api/assistants] Failed to revalidate paths:', e)
    }

    return NextResponse.json(
      {
        success: true,
        assistant,
      },
      { status: 201 }
    )
  } catch (error) {
    const err = error as any
    console.error('[api/assistants][POST] Error creating assistant:', err)
    return NextResponse.json(
      {
        success: false,
        error: 'Error al crear asistente',
        details: process.env.NODE_ENV === 'development' ? String(err?.message || err) : undefined,
      },
      { status: 500 }
    )
  }
}
