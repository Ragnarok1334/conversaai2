import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/security'
import { HttpInputError, isUuid, readJsonBody } from '@/lib/http-security'
import { getEffectiveSubscriptionStatus } from '@/lib/billing/subscription-status'
import { getPlanConfig, normalizePlan } from '@/lib/plans'
import { encryptWhatsAppToken } from '@/lib/whatsapp/crypto'
import { inspectWhatsAppNumber, subscribeWhatsAppApp } from '@/lib/whatsapp/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type ConnectBody = {
  phoneNumberId?: unknown
  businessAccountId?: unknown
  accessToken?: unknown
}

function providerId(value: unknown): string | null {
  return typeof value === 'string' && /^[0-9]{5,30}$/.test(value.trim()) ? value.trim() : null
}

async function ownedContext(id: string, requireWhatsAppPlan = false) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'No autorizado.' }, { status: 401 }) }

  const admin = createSupabaseAdmin()
  const [{ data: assistant }, { data: subscription }, { data: profile }] = await Promise.all([
    admin.from('assistants').select('id, user_id, assistant_name').eq('id', id).eq('user_id', user.id).maybeSingle(),
    admin.from('subscriptions').select('plan,status,current_period_end,grace_ends_at,cancel_at_period_end').eq('user_id', user.id).maybeSingle(),
    admin.from('profiles').select('trial_used,trial_ends_at').eq('id', user.id).maybeSingle(),
  ])
  if (!assistant) return { error: NextResponse.json({ error: 'Asistente no encontrado.' }, { status: 404 }) }
  const effectiveStatus = getEffectiveSubscriptionStatus(subscription, profile)
  const plan = normalizePlan(subscription?.plan || 'free')
  if (requireWhatsAppPlan && (!['active', 'past_due'].includes(effectiveStatus) || !getPlanConfig(plan).channels.whatsapp)) {
    return { error: NextResponse.json({ error: 'Tu plan actual no incluye el canal WhatsApp.' }, { status: 403 }) }
  }
  return { admin, assistant, user, plan }
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!isUuid(id)) return NextResponse.json({ error: 'ID inválido.' }, { status: 400 })
  const context = await ownedContext(id)
  if ('error' in context) return context.error
  const { data, error } = await context.admin.from('whatsapp_channels')
    .select('id,assistant_id,business_account_id,phone_number_id,display_phone_number,verified_name,status,connected_at,last_webhook_at,last_error,config,updated_at')
    .eq('assistant_id', id).eq('user_id', context.user.id).maybeSingle()
  if (error) return NextResponse.json({ error: 'No se pudo cargar el canal.' }, { status: 500 })
  return NextResponse.json({ channel: data, webhookUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://conversaai.store'}/api/webhooks/whatsapp` })
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    if (!isUuid(id)) return NextResponse.json({ error: 'ID inválido.' }, { status: 400 })
    const context = await ownedContext(id, true)
    if ('error' in context) return context.error
    if (!await checkRateLimit(`whatsapp-connect-${context.user.id}`, 'whatsapp-connect', 8, 600)) {
      return NextResponse.json({ error: 'Demasiados intentos. Espera unos minutos.' }, { status: 429 })
    }

    const body = await readJsonBody<ConnectBody>(request, 12_000)
    const phoneNumberId = providerId(body.phoneNumberId)
    const businessAccountId = providerId(body.businessAccountId)
    const suppliedToken = typeof body.accessToken === 'string' ? body.accessToken.trim() : ''
    const accessToken = suppliedToken || process.env.WHATSAPP_ACCESS_TOKEN?.trim() || ''
    if (!phoneNumberId || !businessAccountId) {
      return NextResponse.json({ error: 'Los identificadores de Meta no son válidos.' }, { status: 400 })
    }
    if (!accessToken || accessToken.length < 40 || accessToken.length > 4096) {
      return NextResponse.json({ error: 'Configura WHATSAPP_ACCESS_TOKEN o introduce un token válido.' }, { status: 400 })
    }

    const number = await inspectWhatsAppNumber(phoneNumberId, accessToken)
    if (number.id !== phoneNumberId) return NextResponse.json({ error: 'El token no corresponde al número indicado.' }, { status: 400 })
    await subscribeWhatsAppApp(businessAccountId, accessToken)

    const row = {
      user_id: context.user.id,
      assistant_id: id,
      business_account_id: businessAccountId,
      phone_number_id: phoneNumberId,
      display_phone_number: number.display_phone_number || null,
      verified_name: number.verified_name || null,
      encrypted_access_token: suppliedToken ? encryptWhatsAppToken(suppliedToken) : null,
      status: 'connected',
      connected_at: new Date().toISOString(),
      last_error: null,
      updated_at: new Date().toISOString(),
    }
    const { data, error } = await context.admin.from('whatsapp_channels').upsert(row, { onConflict: 'assistant_id' })
      .select('id,assistant_id,business_account_id,phone_number_id,display_phone_number,verified_name,status,connected_at,last_webhook_at,last_error,config,updated_at').single()
    if (error) {
      const conflict = error.code === '23505'
      return NextResponse.json({ error: conflict ? 'Ese número ya está conectado a otro asistente.' : 'No se pudo guardar la conexión.' }, { status: conflict ? 409 : 500 })
    }
    return NextResponse.json({ channel: data, message: 'WhatsApp conectado y suscrito correctamente.' })
  } catch (error) {
    if (error instanceof HttpInputError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error('[POST WhatsApp connection]', error instanceof Error ? error.message : 'unknown')
    return NextResponse.json({ error: error instanceof Error && error.message.startsWith('Meta ') ? error.message : 'No se pudo validar la conexión con Meta.' }, { status: 502 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!isUuid(id)) return NextResponse.json({ error: 'ID inválido.' }, { status: 400 })
  const context = await ownedContext(id)
  if ('error' in context) return context.error
  const { error } = await context.admin.from('whatsapp_channels').delete().eq('assistant_id', id).eq('user_id', context.user.id)
  if (error) return NextResponse.json({ error: 'No se pudo desconectar WhatsApp.' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
