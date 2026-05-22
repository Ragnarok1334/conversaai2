import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateAssistantReply, type AssistantConfig } from '@/lib/openai'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { assistantId, assistantConfig, userMessage } = body

    if (!userMessage || typeof userMessage !== 'string' || userMessage.trim().length === 0) {
      return NextResponse.json({ error: 'Mensaje requerido' }, { status: 400 })
    }

    let config: AssistantConfig

    if (assistantId) {
      // Load from DB and verify ownership
      const { data: assistant, error: dbError } = await supabase
        .from('assistants')
        .select('*')
        .eq('id', assistantId)
        .eq('user_id', user.id)
        .single()

      if (dbError || !assistant) {
        return NextResponse.json({ error: 'Asistente no encontrado' }, { status: 404 })
      }

      config = {
        assistantName: assistant.assistant_name,
        businessName: assistant.business_name,
        businessType: assistant.business_type,
        channel: assistant.channel,
        tone: assistant.tone,
        mainGoal: assistant.main_goal,
        instructions: assistant.instructions,
        faqs: assistant.faqs,
        services: assistant.services,
        schedule: assistant.schedule,
        fallbackMessage: assistant.fallback_message,
        language: assistant.language,
      }
    } else if (assistantConfig) {
      // Preview mode — use provided config without saving
      config = assistantConfig as AssistantConfig
    } else {
      return NextResponse.json({ error: 'Se requiere assistantId o assistantConfig' }, { status: 400 })
    }

    const reply = await generateAssistantReply(config, userMessage.trim())

    // Save test message if assistantId exists
    if (assistantId) {
      await supabase.from('assistant_test_messages').insert({
        assistant_id: assistantId,
        user_id: user.id,
        user_message: userMessage.trim(),
        assistant_reply: reply,
      })
    }

    return NextResponse.json({ reply })
  } catch (error) {
    console.error('[API /assistant/test]', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
