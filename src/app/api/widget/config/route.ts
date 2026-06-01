import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { extractDomain } from '@/lib/security'

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

    // Domain validation
    const origin = request.headers.get('origin')
    const referer = request.headers.get('referer')
    const extractedDomain = extractDomain(origin || referer)
    
    const isDev = process.env.NODE_ENV === 'development'
    const isLocalhost = extractedDomain === 'localhost' || extractedDomain === '127.0.0.1'
    
    if (!(isDev && isLocalhost) && !assistant.allow_all_domains) {
      if (!extractedDomain) {
        return NextResponse.json({ error: 'No se pudo verificar el origen.' }, { status: 403, headers: corsHeaders })
      }
      
      const { data: domainRec } = await supabaseAdmin
        .from('assistant_domains')
        .select('id')
        .eq('assistant_id', assistantId)
        .eq('domain', extractedDomain)
        .eq('is_active', true)
        .single()
        
      if (!domainRec) {
        return NextResponse.json({ error: 'Este dominio no está autorizado para usar este asistente.' }, { status: 403, headers: corsHeaders })
      }
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
