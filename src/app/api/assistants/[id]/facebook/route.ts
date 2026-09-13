import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/security'
import { HttpInputError, isUuid, readJsonBody } from '@/lib/http-security'
import { getEffectiveSubscriptionStatus } from '@/lib/billing/subscription-status'
import { getPlanConfig, normalizePlan } from '@/lib/plans'
import { encryptFacebookToken } from '@/lib/facebook/crypto'
import { inspectFacebookPage, subscribeFacebookPage } from '@/lib/facebook/client'
import { normalizeWhatsAppConfig } from '@/lib/whatsapp/config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function context(id: string, requirePlan = false) {
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'No autorizado.' }, { status: 401 }) }
  const admin = createSupabaseAdmin()
  const [{ data: assistant }, { data: subscription }, { data: profile }] = await Promise.all([
    admin.from('assistants').select('id,user_id').eq('id', id).eq('user_id', user.id).maybeSingle(),
    admin.from('subscriptions').select('*').eq('user_id', user.id).maybeSingle(),
    admin.from('profiles').select('trial_used,trial_ends_at').eq('id', user.id).maybeSingle(),
  ])
  if (!assistant) return { error: NextResponse.json({ error: 'Asistente no encontrado.' }, { status: 404 }) }
  const plan = normalizePlan(subscription?.plan || 'free')
  if (requirePlan && (!['active','past_due'].includes(getEffectiveSubscriptionStatus(subscription, profile)) || !getPlanConfig(plan).channels.facebook)) return { error: NextResponse.json({ error: 'Tu plan actual no incluye Facebook Messenger.' }, { status: 403 }) }
  return { admin, user }
}

const safeId = (value: unknown) => typeof value === 'string' && /^[0-9]{5,30}$/.test(value.trim()) ? value.trim() : null
const selection = 'id,assistant_id,page_id,page_name,status,connected_at,last_webhook_at,last_error,config,updated_at'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; if (!isUuid(id)) return NextResponse.json({ error: 'ID inválido.' }, { status: 400 })
  const owned = await context(id); if ('error' in owned) return owned.error
  const { data, error } = await owned.admin.from('facebook_channels').select(selection).eq('assistant_id', id).eq('user_id', owned.user.id).maybeSingle()
  if (error) return NextResponse.json({ error: 'No se pudo cargar Facebook Messenger.' }, { status: 500 })
  return NextResponse.json({ channel: data, webhookUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://conversaai.store'}/api/webhooks/facebook` })
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params; if (!isUuid(id)) return NextResponse.json({ error: 'ID inválido.' }, { status: 400 })
    const owned = await context(id, true); if ('error' in owned) return owned.error
    if (!await checkRateLimit(`facebook-connect-${owned.user.id}`, 'facebook-connect', 8, 600)) return NextResponse.json({ error: 'Demasiados intentos. Espera unos minutos.' }, { status: 429 })
    const body = await readJsonBody<{ pageId?: unknown; pageAccessToken?: unknown }>(request, 12_000)
    const pageId = safeId(body.pageId); const token = typeof body.pageAccessToken === 'string' ? body.pageAccessToken.trim() : ''
    if (!pageId) return NextResponse.json({ error: 'El identificador de la página no es válido.' }, { status: 400 })
    if (token.length < 40 || token.length > 4096) return NextResponse.json({ error: 'Introduce un token de acceso de página válido.' }, { status: 400 })
    const page = await inspectFacebookPage(pageId, token)
    if (page.id !== pageId) return NextResponse.json({ error: 'El token no corresponde a la página indicada.' }, { status: 400 })
    await subscribeFacebookPage(pageId, token)
    const { data, error } = await owned.admin.from('facebook_channels').upsert({ user_id: owned.user.id, assistant_id: id, page_id: pageId, page_name: page.name || null, encrypted_page_access_token: encryptFacebookToken(token), status: 'connected', connected_at: new Date().toISOString(), last_error: null, updated_at: new Date().toISOString() }, { onConflict: 'assistant_id' }).select(selection).single()
    if (error) return NextResponse.json({ error: error.code === '23505' ? 'Esta página ya está conectada a otro asistente.' : 'No se pudo guardar la conexión.' }, { status: error.code === '23505' ? 409 : 500 })
    return NextResponse.json({ channel: data, message: 'Facebook Messenger conectado y suscrito correctamente.' })
  } catch (error) {
    if (error instanceof HttpInputError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error('[POST Facebook connection]', error instanceof Error ? error.message : 'unknown')
    return NextResponse.json({ error: 'Meta no pudo validar la página o su token.' }, { status: 502 })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params; if (!isUuid(id)) return NextResponse.json({ error: 'ID inválido.' }, { status: 400 })
    const owned = await context(id, true); if ('error' in owned) return owned.error
    const body = await readJsonBody<{ config?: unknown }>(request, 10_000); const config = normalizeWhatsAppConfig(body.config)
    const { data, error } = await owned.admin.from('facebook_channels').update({ config, updated_at: new Date().toISOString() }).eq('assistant_id', id).eq('user_id', owned.user.id).eq('status', 'connected').select(selection).maybeSingle()
    if (error) return NextResponse.json({ error: 'No se pudo guardar la configuración.' }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'Conecta Facebook antes de personalizarlo.' }, { status: 409 })
    return NextResponse.json({ channel: data, message: 'Personalización guardada.' })
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Configuración inválida.' }, { status: 400 }) }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; if (!isUuid(id)) return NextResponse.json({ error: 'ID inválido.' }, { status: 400 })
  const owned = await context(id); if ('error' in owned) return owned.error
  const { error } = await owned.admin.from('facebook_channels').delete().eq('assistant_id', id).eq('user_id', owned.user.id)
  return error ? NextResponse.json({ error: 'No se pudo desconectar Facebook.' }, { status: 500 }) : NextResponse.json({ ok: true })
}
