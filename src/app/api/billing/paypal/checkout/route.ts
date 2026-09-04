import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { createPayPalOrder } from '@/lib/paypal';
import { getPlanConfig, normalizePlan } from '@/lib/plans';
import { checkRateLimit } from '@/lib/security';

const MAX_BODY_BYTES = 8 * 1024;
const PENDING_WINDOW_MS = 10 * 60 * 1000;
const PAYPAL_HOSTS = new Set(['www.paypal.com', 'www.sandbox.paypal.com']);
const APP_URL = 'https://conversaai.store';
function isPlainObject(v: unknown): v is Record<string, unknown> { return typeof v === 'object' && v !== null && !Array.isArray(v); }
function validAppUrl(v: string): boolean { try { const u = new URL(v); return u.protocol === 'https:' && u.origin === APP_URL; } catch { return false; } }
function validPayPalUrl(v: string): boolean { try { const u = new URL(v); return u.protocol === 'https:' && PAYPAL_HOSTS.has(u.hostname); } catch { return false; } }

export async function POST(req: Request) {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl || !validAppUrl(appUrl)) return NextResponse.json({ error: 'Configuración de URL de aplicación inválida.' }, { status: 500 });
    if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) return NextResponse.json({ error: 'PayPal no está configurado en el servidor.' }, { status: 500 });
    const length = req.headers.get('content-length');
    if (length && (!Number.isFinite(Number(length)) || Number(length) > MAX_BODY_BYTES)) return NextResponse.json({ error: 'Solicitud demasiado grande.' }, { status: 413 });
    const raw = await req.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return NextResponse.json({ error: 'Solicitud demasiado grande.' }, { status: 413 });
    let body: unknown;
    try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 }); }
    if (!isPlainObject(body) || typeof body.plan !== 'string' || body.plan.length < 1 || body.plan.length > 32) return NextResponse.json({ error: 'Plan no válido.' }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Debes iniciar sesión para activar un plan.' }, { status: 401 });
    if (!await checkRateLimit(`paypal-checkout-${user.id}`, 'paypal-checkout-user', 10, 600)) return NextResponse.json({ error: 'Demasiados intentos de pago. Espera unos minutos.' }, { status: 429 });

    const planKey = normalizePlan(body.plan);
    if (!['starter', 'pro', 'growth', 'business'].includes(planKey)) return NextResponse.json({ error: 'Plan no válido para checkout automático.' }, { status: 400 });
    const amountCents = getPlanConfig(planKey).prices.USD;
    if (!amountCents || amountCents <= 0) return NextResponse.json({ error: 'Precio USD del plan no configurado.' }, { status: 500 });

    const admin = createSupabaseAdmin();
    const pendingSince = new Date(Date.now() - PENDING_WINDOW_MS).toISOString();
    const { data: existing, error: existingError } = await admin.from('billing_payments').select('paypal_order_id, metadata').eq('user_id', user.id).eq('provider', 'paypal').eq('plan', planKey).eq('status', 'pending').gte('created_at', pendingSince).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (existingError) return NextResponse.json({ error: 'No se pudo validar pagos pendientes.' }, { status: 500 });
    if (existing?.paypal_order_id && isPlainObject(existing.metadata) && typeof existing.metadata.approval_url === 'string' && validPayPalUrl(existing.metadata.approval_url)) return NextResponse.json({ url: existing.metadata.approval_url });

    const { data: payment, error: insertError } = await admin.from('billing_payments').insert({ user_id: user.id, provider: 'paypal', plan: planKey, amount: amountCents, currency: 'USD', status: 'pending', raw_response: {}, metadata: {} }).select('id').single();
    if (insertError || !payment) return NextResponse.json({ error: 'No se pudo reservar el pago.' }, { status: 500 });

    const order = await createPayPalOrder({ amountCents, plan: planKey, referenceId: payment.id, returnUrl: `${APP_URL}/api/billing/paypal/return`, cancelUrl: `${APP_URL}/dashboard/billing?paypal=cancelled` });
    const approval = order.links?.find((link) => link.rel === 'approve' || link.rel === 'payer-action');
    if (!approval?.href || !validPayPalUrl(approval.href)) {
      await admin.from('billing_payments').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('id', payment.id).eq('status', 'pending');
      return NextResponse.json({ error: 'PayPal devolvió un checkout inválido.' }, { status: 502 });
    }
    const { error: updateError } = await admin.from('billing_payments').update({ paypal_order_id: order.id, raw_response: order, metadata: { approval_url: approval.href }, updated_at: new Date().toISOString() }).eq('id', payment.id).eq('status', 'pending');
    if (updateError) return NextResponse.json({ error: 'No se pudo guardar la orden PayPal.' }, { status: 500 });
    return NextResponse.json({ url: approval.href });
  } catch (error: unknown) {
    console.error('[PayPal checkout] Error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Ocurrió un error al iniciar el pago con PayPal.' }, { status: 500 });
  }
}
