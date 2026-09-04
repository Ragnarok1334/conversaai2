import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/security'
import { logAuditEvent } from '@/lib/audit'

const MAX_BODY_BYTES = 8 * 1024
const MAX_LENGTHS: Record<string, number> = {
  full_name: 120,
  company_name: 160,
  phone: 40,
  country: 80,
  business_type: 100,
  preferred_channel: 32,
  onboarding_goal: 500,
  city: 100,
  website: 2048,
  support_email: 180,
  address: 300,
  business_hours: 500,
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

/**
 * GET /api/profile
 * Returns only profile fields needed by the dashboard/settings UI.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const allowed = await checkRateLimit(`profile:get:${user.id}`, 'profile:get', 120, 60)
    if (!allowed) {
      return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta nuevamente en unos segundos.' }, { status: 429 })
    }

    const supabaseAdmin = createSupabaseAdmin()
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, company_name, phone, country, avatar_url, business_type, preferred_channel, onboarding_goal, city, website, support_email, address, business_hours, marketing_opt_in')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) {
      console.error('[GET /api/profile] profile query failed:', profileError.message)
      return NextResponse.json({ error: 'No se pudo cargar el perfil.' }, { status: 500 })
    }

    if (!profile) {
      return NextResponse.json({
        id: user.id,
        full_name: user.user_metadata?.name ?? user.user_metadata?.full_name ?? null,
        company_name: null,
        phone: null,
        country: null,
        avatar_url: user.user_metadata?.avatar_url ?? null,
        business_type: null,
        preferred_channel: null,
        onboarding_goal: null,
        city: null,
        website: null,
        support_email: null,
        address: null,
        business_hours: null,
        marketing_opt_in: false,
      })
    }

    return NextResponse.json(profile)
  } catch (err) {
    console.error('[GET /api/profile] unexpected error:', err instanceof Error ? err.message : 'unknown error')
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

/**
 * PATCH /api/profile
 * Upserts the user's profile. Never trusts user_id/id from the request body.
 */
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const allowed = await checkRateLimit(`profile:patch:${user.id}`, 'profile:patch', 20, 600)
    if (!allowed) {
      return NextResponse.json({ error: 'Demasiadas actualizaciones. Intenta nuevamente más tarde.' }, { status: 429 })
    }

    const contentLength = req.headers.get('content-length')
    if (contentLength) {
      const parsedLength = Number(contentLength)
      if (!Number.isFinite(parsedLength) || parsedLength < 0 || parsedLength > MAX_BODY_BYTES) {
        return NextResponse.json({ error: 'Request body too large' }, { status: 413 })
      }
    }

    let rawBody: unknown
    try {
      rawBody = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    if (!isPlainObject(rawBody)) {
      return NextResponse.json({ error: 'Request body must be a JSON object' }, { status: 400 })
    }

    const encodedSize = new TextEncoder().encode(JSON.stringify(rawBody)).byteLength
    if (encodedSize > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Request body too large' }, { status: 413 })
    }

    const allowedFields = Object.keys(MAX_LENGTHS)
    const unknownFields = Object.keys(rawBody).filter((field) => !allowedFields.includes(field))
    if (unknownFields.length > 0) {
      return NextResponse.json({ error: 'Payload contains unsupported fields' }, { status: 400 })
    }

    const patch: Record<string, string | null> = {}
    for (const field of allowedFields) {
      if (!(field in rawBody)) continue
      const raw = rawBody[field]
      if (raw !== null && typeof raw !== 'string') {
        return NextResponse.json({ error: `Invalid value for ${field}` }, { status: 400 })
      }
      const normalized = typeof raw === 'string' ? raw.trim() : ''
      if (normalized.length > MAX_LENGTHS[field]) {
        return NextResponse.json({ error: `Field ${field} exceeds its maximum length` }, { status: 400 })
      }
      patch[field] = normalized === '' ? null : normalized
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const supabaseAdmin = createSupabaseAdmin()
    const { error: upsertError } = await supabaseAdmin
      .from('profiles')
      .upsert(
        {
          id: user.id,
          ...patch,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )

    if (upsertError) {
      console.error('[PATCH /api/profile] upsert failed:', upsertError.message)
      return NextResponse.json({ error: 'No se pudo guardar el perfil.' }, { status: 500 })
    }

    await logAuditEvent({
      userId: user.id,
      action: 'profile_updated',
      entityType: 'profile',
      entityId: user.id,
      description: 'Perfil de usuario actualizado',
      metadata: { updates: Object.keys(patch) },
      req,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[PATCH /api/profile] unexpected error:', err instanceof Error ? err.message : 'unknown error')
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}