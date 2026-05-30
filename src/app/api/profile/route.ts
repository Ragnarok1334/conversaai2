import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'

/**
 * GET /api/profile
 * Returns the current user's profile from public.profiles.
 * Falls back to user_metadata if no profile row exists yet.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseAdmin = createSupabaseAdmin()
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!profile) {
      // Return defaults from auth metadata
      return NextResponse.json({
        id: user.id,
        full_name: user.user_metadata?.name ?? null,
        company_name: null,
        phone: null,
        country: null,
        avatar_url: user.user_metadata?.avatar_url ?? null,
      })
    }

    return NextResponse.json(profile)
  } catch (err) {
    console.error('[GET /api/profile]', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

/**
 * PATCH /api/profile
 * Upserts the user's profile. Never trusts user_id from the request body.
 * Allowed fields: full_name, company_name, phone, country.
 */
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    // Whitelist — never accept id or user_id from body
    const allowedFields = ['full_name', 'company_name', 'phone', 'country']
    const patch: Record<string, string | null> = {}
    for (const field of allowedFields) {
      if (field in body) {
        const raw = body[field]
        // Normalize: empty string → null, otherwise trim
        patch[field] = typeof raw === 'string' && raw.trim() !== '' ? raw.trim() : null
      }
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const supabaseAdmin = createSupabaseAdmin()
    const { data: profile, error: upsertError } = await supabaseAdmin
      .from('profiles')
      .upsert(
        {
          id: user.id,  // PK — always from server, never from body
          ...patch,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )
      .select()
      .single()

    if (upsertError) {
      console.error('[PATCH /api/profile] upsert error:', upsertError)
      return NextResponse.json(
        { error: 'No se pudo guardar el perfil.', details: upsertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, profile })
  } catch (err) {
    console.error('[PATCH /api/profile]', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
