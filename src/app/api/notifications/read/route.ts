import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/security'

const MAX_BODY_BYTES = 4 * 1024
const MAX_ID_LENGTH = 128

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getContentLength(req: NextRequest): number | null {
  const raw = req.headers.get('content-length')
  if (!raw) return null
  const value = Number(raw)
  return Number.isSafeInteger(value) && value >= 0 ? value : null
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const allowed = await checkRateLimit(`user:${user.id}`, 'notifications-read', 60, 60)
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const contentLength = getContentLength(req)
    if (contentLength !== null && contentLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Request body too large' }, { status: 413 })
    }

    let rawBody: unknown
    try {
      rawBody = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const actualBodySize = new TextEncoder().encode(JSON.stringify(rawBody)).byteLength
    if (actualBodySize > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Request body too large' }, { status: 413 })
    }

    if (!isPlainObject(rawBody)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const keys = Object.keys(rawBody)
    if (keys.length === 0 || keys.some((key) => key !== 'id' && key !== 'all')) {
      return NextResponse.json({ error: 'Invalid request fields' }, { status: 400 })
    }

    const idValue = rawBody.id
    const allValue = rawBody.all

    if (idValue !== undefined && (typeof idValue !== 'string' || idValue.trim().length === 0 || idValue.length > MAX_ID_LENGTH)) {
      return NextResponse.json({ error: 'Invalid notification id' }, { status: 400 })
    }

    if (allValue !== undefined && typeof allValue !== 'boolean') {
      return NextResponse.json({ error: 'Invalid all parameter' }, { status: 400 })
    }

    const hasId = typeof idValue === 'string'
    const markAll = allValue === true

    if (hasId === markAll) {
      return NextResponse.json({ error: 'Provide either id or all=true' }, { status: 400 })
    }

    const supabaseAdmin = createSupabaseAdmin()

    if (hasId) {
      const { error } = await supabaseAdmin
        .from('notifications')
        .update({ is_read: true })
        .eq('id', idValue)
        .eq('user_id', user.id)

      if (error) {
        console.error('[PATCH /api/notifications/read] error:', error.message)
        return NextResponse.json({ error: 'Could not update notification' }, { status: 500 })
      }
      return NextResponse.json({ success: true })
    }

    const { error } = await supabaseAdmin
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false)

    if (error) {
      console.error('[PATCH /api/notifications/read] error:', error.message)
      return NextResponse.json({ error: 'Could not update notifications' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[PATCH /api/notifications/read] exception:', message)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}