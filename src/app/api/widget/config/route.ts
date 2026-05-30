import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const assistantId = searchParams.get('assistantId')

    if (!assistantId) {
      return NextResponse.json({ error: 'Missing assistantId' }, { status: 400, headers: corsHeaders })
    }

    // Usar admin porque esta llamada es pública y RLS bloquea select anónimo si no hay policy pública.
    // Solo devolvemos datos seguros.
    const supabaseAdmin = createSupabaseAdmin()

    const { data: assistant, error } = await supabaseAdmin
      .from('assistants')
      .select('*')
      .eq('id', assistantId)
      .single()

    if (error || !assistant) {
      return NextResponse.json({ error: 'Asistente no encontrado' }, { status: 404, headers: corsHeaders })
    }

    if (assistant.status !== 'active') {
      return NextResponse.json({ error: 'El asistente no está activo' }, { status: 403, headers: corsHeaders })
    }

    return NextResponse.json({
      id: assistant.id,
      name: assistant.assistant_name || '',
      businessName: assistant.business_name || '',
      welcomeMessage: assistant.welcome_message || '',
      status: 'online',
    }, { headers: corsHeaders })

  } catch (error) {
    console.error('[GET /api/widget/config]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers: corsHeaders })
  }
}
