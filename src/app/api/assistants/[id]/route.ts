import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logAuditEvent, logSecurityEvent } from '@/lib/audit'
import { revalidatePath } from 'next/cache'

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

    // Get user's plan for feature limits
    const { createSupabaseAdmin } = await import('@/lib/supabase/admin')
    const supabaseAdmin = createSupabaseAdmin()
    const { data: sub } = await supabaseAdmin.from('subscriptions').select('plan').eq('user_id', user.id).single()
    const { normalizePlan } = await import('@/lib/plans')
    const currentPlan = sub ? normalizePlan(sub.plan) : 'free'
    
    const isPro = currentPlan === 'pro'
    const isGrowthOrAbove = currentPlan === 'growth' || currentPlan === 'business' || currentPlan === 'enterprise'
    const canUseQuickQuestions = isPro || isGrowthOrAbove
    const canUseThemeAndSecondary = isGrowthOrAbove
    const canUseSubtitle = isPro || isGrowthOrAbove

    const body = await request.json()

    // Whitelist allowed fields
    const allowedFields = [
      'assistant_name', 'name', 'business_name', 'business_type',
      'instructions', 'behavior', 'channel', 'tone',
      'objective', 'main_goal', 'fallback_message', 'welcome_message',
      'status', 'knowledge_blocks', 'faqs', 'services', 'schedule', 'language',
      'widget_config'
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
          if (key === 'tone') {
             const validTones = ['amigable', 'profesional', 'vendedor', 'cercano', 'directo']
             if (!validTones.includes(val)) {
                return NextResponse.json({ error: 'El tono seleccionado no es válido.' }, { status: 400 })
             }
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

        // Validation for widget_config
        if (key === 'widget_config') {
          if (typeof val !== 'object' || Array.isArray(val) || val === null) {
            return NextResponse.json({ error: 'Formato inválido en widget_config.' }, { status: 400 })
          }
          
          const cleanConfig: Record<string, any> = {}
          const sanitizeText = (txt: any) => typeof txt === 'string' ? txt.replace(/[<>]/g, '').trim() : ''
          const isValidHex = (hex: any) => typeof hex === 'string' && /^#[0-9A-Fa-f]{6}$/i.test(hex)

          if (val.displayName) cleanConfig.displayName = sanitizeText(val.displayName).slice(0, 60)
          if (val.welcomeMessage) cleanConfig.welcomeMessage = sanitizeText(val.welcomeMessage).slice(0, 240)
          
          if (canUseSubtitle && val.subtitle) cleanConfig.subtitle = sanitizeText(val.subtitle).slice(0, 90)
          if (canUseSubtitle && val.launcherText) cleanConfig.launcherText = sanitizeText(val.launcherText).slice(0, 40)
          
          if (isValidHex(val.primaryColor)) cleanConfig.primaryColor = val.primaryColor
          if (canUseThemeAndSecondary && isValidHex(val.secondaryColor)) cleanConfig.secondaryColor = val.secondaryColor
          
          if (canUseThemeAndSecondary && val.theme && ['modern', 'minimal', 'premium'].includes(val.theme)) {
            cleanConfig.theme = val.theme
          } else {
            cleanConfig.theme = 'modern'
          }

          if (val.position && ['bottom-right', 'bottom-left'].includes(val.position)) {
            cleanConfig.position = val.position
          }

          if (canUseQuickQuestions && Array.isArray(val.quickQuestions)) {
            cleanConfig.quickQuestions = val.quickQuestions
              .map(sanitizeText)
              .filter((q: string) => q.length > 0)
              .slice(0, 4)
              .map((q: string) => q.slice(0, 80))
          }

          val = cleanConfig
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

    // Validate final combined state of knowledge
    const { data: currentAssistant, error: fetchErr } = await supabase
      .from('assistants')
      .select('instructions, knowledge_blocks')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();
      
    if (!fetchErr && currentAssistant) {
      const finalInstructions = updates.instructions !== undefined ? updates.instructions : (currentAssistant.instructions || '');
      const finalBlocks = updates.knowledge_blocks !== undefined ? updates.knowledge_blocks : (currentAssistant.knowledge_blocks || []);
      const instLen = (finalInstructions || '').trim().length;
      const hasValidBlock = (finalBlocks || []).some((b: any) => b.is_active && (b.content || '').trim().length >= 80);
      
      // Si updates.knowledge_blocks es explícitamente vacío y la base de datos tenía, respetamos la decisión del usuario solo si es válido
      if (instLen < 80 && !hasValidBlock) {
         return NextResponse.json({ error: 'Agrega información mínima del negocio para entrenar el asistente.' }, { status: 400 })
      }
    }

    const { data, error } = await supabase
      .from('assistants')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error || !data) {
      if (error?.code === '23514' && error?.message?.includes('assistants_tone_check')) {
        return NextResponse.json(
          {
            success: false,
            error: 'El tono seleccionado no está permitido por la base de datos. Actualiza la configuración de tonos.',
            details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
          },
          { status: 500 }
        )
      }
      await logSecurityEvent({ userId: user.id, eventType: 'assistant_update_forbidden', severity: 'warning', message: `No se pudo actualizar el asistente ${id}. ¿Permisos o inexistente?`, req: request })
      return NextResponse.json({ error: 'No se pudo actualizar' }, { status: 404 })
    }

    await logAuditEvent({ userId: user.id, action: 'assistant_updated', entityType: 'assistant', entityId: id, description: 'Asistente actualizado', metadata: { updates: Object.keys(updates) }, req: request })

    try {
      revalidatePath('/dashboard')
      revalidatePath('/dashboard/assistants')
      revalidatePath(`/dashboard/assistants/${id}`)
    } catch (e) {
      console.error('[PATCH /api/assistants/[id]] Failed to revalidate paths:', e)
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

    try {
      revalidatePath('/dashboard')
      revalidatePath('/dashboard/assistants')
    } catch (e) {
      console.error('[DELETE /api/assistants/[id]] Failed to revalidate paths:', e)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/assistants/[id]]', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
