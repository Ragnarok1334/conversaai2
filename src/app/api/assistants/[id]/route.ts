import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logAuditEvent, logSecurityEvent } from '@/lib/audit'
import { revalidatePath } from 'next/cache'

const ASSISTANT_SELECT = `
  id, assistant_name, business_name, business_type, channel, tone,
  main_goal, instructions, faqs, services, schedule, fallback_message,
  language, status, behavior, knowledge_blocks, widget_config,
  allow_all_domains, created_at, updated_at,
  assistant_test_messages (
    id, assistant_id, user_id, user_message, assistant_reply, created_at
  ),
  assistant_domains ( id, domain, verification_status, is_active, is_verified )
`

const MAX_REQUEST_BYTES = 256 * 1024
const MAX_KNOWLEDGE_BLOCKS = 50
const MAX_KNOWLEDGE_TOTAL = 100_000

function isValidUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function requestTooLarge(request: NextRequest) {
  const length = request.headers.get('content-length')
  return length ? Number(length) > MAX_REQUEST_BYTES : false
}

function jsonSize(value: unknown) {
  try {
    return JSON.stringify(value).length
  } catch {
    return Number.POSITIVE_INFINITY
  }
}

function validateKnowledgeBlocks(value: unknown) {
  if (value !== null && !Array.isArray(value)) {
    return 'El campo knowledge_blocks debe ser un array o null.'
  }
  if (!Array.isArray(value)) return null
  if (value.length > MAX_KNOWLEDGE_BLOCKS) {
    return `No puedes guardar más de ${MAX_KNOWLEDGE_BLOCKS} bloques de conocimiento.`
  }

  let total = 0
  for (const block of value) {
    if (!block || typeof block !== 'object' || Array.isArray(block)) {
      return 'Formato inválido en bloque de conocimiento.'
    }
    const item = block as Record<string, unknown>
    if (
      typeof item.type !== 'string' ||
      typeof item.title !== 'string' ||
      typeof item.content !== 'string' ||
      typeof item.is_active !== 'boolean'
    ) {
      return 'Formato inválido en bloque de conocimiento.'
    }
    if (item.type.length > 50) return 'Tipo de bloque excede 50 caracteres.'
    if (item.title.length > 120) return 'Título de bloque excede 120 caracteres.'
    if (item.content.length > 5_000) return 'Contenido de bloque excede 5000 caracteres.'
    total += item.title.length + item.content.length + item.type.length
  }

  return total > MAX_KNOWLEDGE_TOTAL
    ? 'El contenido total de conocimiento excede el máximo permitido.'
    : null
}

// GET /api/assistants/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!isValidUuid(id)) {
      return NextResponse.json({ error: 'Asistente no encontrado' }, { status: 404 })
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('assistants')
      .select(ASSISTANT_SELECT)
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Asistente no encontrado' }, { status: 404 })
    }

    const [conversationsResult, leadsResult] = await Promise.all([
      supabase
        .from('conversations')
        .select('created_at')
        .eq('assistant_id', id)
        .eq('user_id', user.id),
      supabase
        .from('leads')
        .select('created_at')
        .eq('assistant_id', id)
        .eq('user_id', user.id),
    ])

    if (conversationsResult.error || leadsResult.error) {
      console.error('[GET /api/assistants/[id]] Failed to load activity counts')
      return NextResponse.json({ error: 'No se pudo cargar la actividad del asistente' }, { status: 500 })
    }

    const convData = conversationsResult.data || []
    const leadsData = leadsResult.data || []
    const conversationsCount = convData.length
    const leadsCount = leadsData.length

    const timestamps = [
      data.created_at ? new Date(data.created_at).getTime() : 0,
      ...convData.map(c => c.created_at ? new Date(c.created_at).getTime() : 0),
      ...leadsData.map(l => l.created_at ? new Date(l.created_at).getTime() : 0),
    ].filter(Number.isFinite)

    const lastActivityAt = timestamps.length ? Math.max(...timestamps) : Date.now()

    const { calculateAssistantHealth } = await import('@/lib/assistant/assistant-health')
    const health = calculateAssistantHealth(
      data,
      data.assistant_domains || [],
      { conversations: conversationsCount, leads: leadsCount }
    )

    return NextResponse.json({
      assistant: {
        ...data,
        conversationsCount,
        leadsCount,
        lastActivityAt: new Date(lastActivityAt).toISOString(),
        health,
      },
    })
  } catch (error) {
    console.error('[GET /api/assistants/[id]]', error instanceof Error ? error.message : 'unknown error')
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
    if (!isValidUuid(id)) {
      return NextResponse.json({ error: 'Asistente no encontrado' }, { status: 404 })
    }
    if (requestTooLarge(request)) {
      return NextResponse.json({ error: 'La solicitud es demasiado grande.' }, { status: 413 })
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      await logSecurityEvent({ eventType: 'unauthorized_api_access', severity: 'warning', message: 'Intento de actualizar asistente sin auth', req: request })
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { createSupabaseAdmin } = await import('@/lib/supabase/admin')
    const supabaseAdmin = createSupabaseAdmin()
    const { data: sub } = await supabaseAdmin.from('subscriptions').select('plan').eq('user_id', user.id).single()
    const { data: profile } = await supabaseAdmin.from('profiles').select('trial_ends_at').eq('id', user.id).single()

    const { getEffectiveSubscriptionStatus } = await import('@/lib/billing/subscription-status')
    const effectiveStatus = getEffectiveSubscriptionStatus(sub, profile)
    const { normalizePlan } = await import('@/lib/plans')
    const currentPlan = sub ? normalizePlan(sub.plan) : 'free'

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 })
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'El cuerpo de la solicitud debe ser un objeto JSON.' }, { status: 400 })
    }
    if (jsonSize(body) > MAX_REQUEST_BYTES) {
      return NextResponse.json({ error: 'La solicitud es demasiado grande.' }, { status: 413 })
    }

    const input = body as Record<string, unknown>
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

    const stringLimits: Record<string, number> = {
      assistant_name: 100,
      business_name: 100,
      business_type: 100,
      instructions: 2_000,
      main_goal: 500,
      fallback_message: 500,
      faqs: 10_000,
      services: 10_000,
      schedule: 5_000,
      language: 10,
    }

    // Legacy aliases are mapped to the actual current database columns.
    const aliases: Record<string, string> = {
      name: 'assistant_name',
      objective: 'main_goal',
    }

    for (const [sourceKey, targetKey] of Object.entries(aliases)) {
      if (sourceKey in input && targetKey in input) {
        return NextResponse.json({ error: `No envíes '${sourceKey}' y '${targetKey}' al mismo tiempo.` }, { status: 400 })
      }
    }

    const allowedFields = [
      'assistant_name', 'business_name', 'business_type',
      'instructions', 'behavior', 'channel', 'tone',
      'main_goal', 'fallback_message', 'status', 'knowledge_blocks',
      'faqs', 'services', 'schedule', 'language', 'widget_config',
    ]

    for (const key of allowedFields) {
      if (!(key in input) || input[key] === undefined) continue
      let val = input[key]

      if (typeof val === 'string') {
        val = val.trim()
        const max = stringLimits[key]
        if (max !== undefined && val.length > max) {
          return NextResponse.json({ error: `El campo ${key} excede la longitud máxima permitida (${max}).` }, { status: 400 })
        }
      } else if (key in stringLimits) {
        return NextResponse.json({ error: `El campo ${key} debe ser texto.` }, { status: 400 })
      }

      if (key === 'channel' && val !== 'webchat') {
        return NextResponse.json({ error: 'Solo el canal webchat está disponible actualmente.' }, { status: 400 })
      }

      if (key === 'tone') {
        const validTones = ['amigable', 'profesional', 'vendedor', 'cercano', 'directo']
        if (typeof val !== 'string' || !validTones.includes(val)) {
          return NextResponse.json({ error: 'El tono seleccionado no es válido.' }, { status: 400 })
        }
      }

      if (key === 'status') {
        if (typeof val !== 'string' || !['active', 'inactive', 'draft'].includes(val)) {
          return NextResponse.json({ error: 'El estado seleccionado no es válido.' }, { status: 400 })
        }
      }

      if (key === 'knowledge_blocks') {
        const knowledgeError = validateKnowledgeBlocks(val)
        if (knowledgeError) return NextResponse.json({ error: knowledgeError }, { status: 400 })
      }

      if (key === 'behavior') {
        if (!val || typeof val !== 'object' || Array.isArray(val) || jsonSize(val) > 20_000) {
          return NextResponse.json({ error: 'El campo behavior debe ser un objeto válido y no exceder 20 KB.' }, { status: 400 })
        }
        const behavior = val as Record<string, unknown>
        if ('rules' in behavior) {
          if (!behavior.rules || typeof behavior.rules !== 'object' || Array.isArray(behavior.rules)) {
            return NextResponse.json({ error: 'La estructura de rules no es válida.' }, { status: 400 })
          }
          const allowedRules = ['askName', 'askContact', 'offerPricesWhenAsked', 'suggestAppointment', 'escalateIfUnknown', 'doNotInvent', 'alwaysSpanish']
          for (const [rule, ruleValue] of Object.entries(behavior.rules as Record<string, unknown>)) {
            if (!allowedRules.includes(rule) || typeof ruleValue !== 'boolean') {
              return NextResponse.json({ error: `La regla de behavior '${rule}' no es válida.` }, { status: 400 })
            }
          }
        }
      }

      if (key === 'widget_config') {
        if (!val || typeof val !== 'object' || Array.isArray(val) || jsonSize(val) > 20_000) {
          return NextResponse.json({ error: 'El campo widget_config debe ser un objeto válido y no exceder 20 KB.' }, { status: 400 })
        }
        if (['free', 'expired', 'cancelled'].includes(effectiveStatus)) {
          return NextResponse.json({ error: 'Tu plan no permite modificar la apariencia del Web Chat.' }, { status: 403 })
        }
        const { sanitizeWidgetConfigForPlan } = await import('@/lib/widget-config')
        val = sanitizeWidgetConfigForPlan(val, currentPlan)
      }

      updates[key] = val
    }

    if ('name' in input) updates.assistant_name = input.name
    if ('objective' in input) updates.main_goal = input.objective

    if ('name' in input && typeof input.name !== 'string') {
      return NextResponse.json({ error: 'El campo name debe ser texto.' }, { status: 400 })
    }
    if ('objective' in input && typeof input.objective !== 'string') {
      return NextResponse.json({ error: 'El campo objective debe ser texto.' }, { status: 400 })
    }
    if ('name' in input && (input.name as string).trim().length > 100) {
      return NextResponse.json({ error: 'El campo name excede 100 caracteres.' }, { status: 400 })
    }
    if ('objective' in input && (input.objective as string).trim().length > 500) {
      return NextResponse.json({ error: 'El campo objective excede 500 caracteres.' }, { status: 400 })
    }
    if ('name' in input) updates.assistant_name = (input.name as string).trim()
    if ('objective' in input) updates.main_goal = (input.objective as string).trim()

    if (Object.keys(updates).length === 1) {
      return NextResponse.json({ error: 'No hay campos válidos para actualizar.' }, { status: 400 })
    }

    if (updates.instructions !== undefined || updates.knowledge_blocks !== undefined) {
      const { data: currentAssistant, error: fetchErr } = await supabase
        .from('assistants')
        .select('instructions, knowledge_blocks')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()

      if (fetchErr || !currentAssistant) {
        return NextResponse.json({ error: 'Asistente no encontrado' }, { status: 404 })
      }

      const finalInstructions = updates.instructions !== undefined
        ? updates.instructions
        : (currentAssistant.instructions || '')
      const finalBlocks = updates.knowledge_blocks !== undefined
        ? updates.knowledge_blocks
        : (currentAssistant.knowledge_blocks || [])
      const instLen = typeof finalInstructions === 'string' ? finalInstructions.trim().length : 0
      const hasValidBlock = Array.isArray(finalBlocks) && finalBlocks.some(
        (b: any) => b?.is_active === true && typeof b?.content === 'string' && b.content.trim().length >= 80
      )

      if (instLen < 80 && !hasValidBlock) {
        return NextResponse.json({ error: 'Agrega información mínima del negocio para entrenar el asistente.' }, { status: 400 })
      }
    }

    const { data, error } = await supabase
      .from('assistants')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select(ASSISTANT_SELECT)
      .single()

    if (error || !data) {
      if (error?.code === '23514' && error?.message?.includes('assistants_tone_check')) {
        return NextResponse.json(
          { success: false, error: 'El tono seleccionado no está permitido por la base de datos.' },
          { status: 400 }
        )
      }
      await logSecurityEvent({ userId: user.id, eventType: 'assistant_update_forbidden', severity: 'warning', message: `No se pudo actualizar el asistente ${id}.`, req: request })
      return NextResponse.json({ error: 'No se pudo actualizar' }, { status: 404 })
    }

    await logAuditEvent({
      userId: user.id,
      action: 'assistant_updated',
      entityType: 'assistant',
      entityId: id,
      description: 'Asistente actualizado',
      metadata: { updates: Object.keys(updates).filter(key => key !== 'updated_at') },
      req: request,
    })

    try {
      revalidatePath('/dashboard')
      revalidatePath('/dashboard/assistants')
      revalidatePath(`/dashboard/assistants/${id}`)
    } catch (e) {
      console.error('[PATCH /api/assistants/[id]] Failed to revalidate paths:', e instanceof Error ? e.message : 'unknown error')
    }

    return NextResponse.json({ assistant: data })
  } catch (error) {
    console.error('[PATCH /api/assistants/[id]]', error instanceof Error ? error.message : 'unknown error')
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// DELETE /api/assistants/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!isValidUuid(id)) {
      return NextResponse.json({ error: 'Asistente no encontrado' }, { status: 404 })
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      await logSecurityEvent({ eventType: 'unauthorized_api_access', severity: 'warning', message: 'Intento de eliminar asistente sin auth', req: request })
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { error } = await supabase
      .from('assistants')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      await logSecurityEvent({ userId: user.id, eventType: 'assistant_delete_forbidden', severity: 'warning', message: `No se pudo eliminar el asistente ${id}`, req: request })
      return NextResponse.json({ error: 'No se pudo eliminar' }, { status: 404 })
    }

    await logAuditEvent({ userId: user.id, action: 'assistant_deleted', entityType: 'assistant', entityId: id, description: 'Asistente eliminado', req: request })

    try {
      revalidatePath('/dashboard')
      revalidatePath('/dashboard/assistants')
    } catch (e) {
      console.error('[DELETE /api/assistants/[id]] Failed to revalidate paths:', e instanceof Error ? e.message : 'unknown error')
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/assistants/[id]]', error instanceof Error ? error.message : 'unknown error')
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
