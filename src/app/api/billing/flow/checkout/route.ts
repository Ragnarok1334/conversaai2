import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { createFlowPayment } from '@/lib/flow';
import { getPlanConfig, normalizePlan } from '@/lib/plans';

const MAX_BODY_BYTES = 8 * 1024;
const MAX_PLAN_LENGTH = 32;
const PENDING_PAYMENT_WINDOW_MS = 10 * 60 * 1000;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidPlanInput(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= MAX_PLAN_LENGTH;
}

function getStoredFlowToken(value: unknown): string | null {
  if (!isPlainObject(value)) return null;
  const token = value.token;
  return typeof token === 'string' && token.length > 0 && token.length <= 512 ? token : null;
}

function getStoredFlowUrl(value: unknown): string | null {
  if (!isPlainObject(value)) return null;
  const url = value.url;
  return typeof url === 'string' && url.length > 0 && url.length <= 2048 ? url : null;
}

export async function POST(req: Request) {
  let commerceOrder = '';
  let planKey = '';
  let amount = 0;

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const flowApiKey = process.env.FLOW_API_KEY;
    const flowSecretKey = process.env.FLOW_SECRET_KEY;
    const flowBaseUrl = process.env.FLOW_BASE_URL;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://conversaai.store';

    if (!supabaseUrl || !serviceRoleKey || !flowApiKey || !flowSecretKey || !flowBaseUrl || !appUrl) {
      return NextResponse.json({ error: 'Faltan variables de entorno del servidor (Supabase Admin o Flow).' }, { status: 500 });
    }

    const contentLength = req.headers.get('content-length');
    if (contentLength && Number.isFinite(Number(contentLength)) && Number(contentLength) > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Solicitud demasiado grande.' }, { status: 413 });
    }

    const rawBody = await req.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Solicitud demasiado grande.' }, { status: 413 });
    }

    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
    }

    if (!isPlainObject(body) || !isValidPlanInput(body.plan)) {
      return NextResponse.json({ error: 'Plan no válido.' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Debes iniciar sesión para activar un plan.' }, { status: 401 });
    }

    planKey = normalizePlan(body.plan);

    if (planKey === 'trial' || body.plan === 'free') {
      return NextResponse.json({ error: 'La prueba gratis no requiere pago.' }, { status: 400 });
    }

    if (planKey === 'enterprise') {
      return NextResponse.json({ error: 'Enterprise requiere contacto comercial.' }, { status: 400 });
    }

    const allowedPlans = ['starter', 'pro', 'growth', 'business'];
    if (!allowedPlans.includes(planKey)) {
      return NextResponse.json({ error: 'Plan no válido para checkout automático.' }, { status: 400 });
    }

    const config = getPlanConfig(planKey);
    if (!config.priceCLP || config.priceCLP <= 0) {
      return NextResponse.json({ error: 'Precio del plan no configurado.' }, { status: 500 });
    }

    amount = config.priceCLP;

    const supabaseAdmin = createSupabaseAdmin();

    // Reuse a recent pending payment instead of creating another external Flow payment
    // when the client retries the checkout request.
    const pendingSince = new Date(Date.now() - PENDING_PAYMENT_WINDOW_MS).toISOString();
    const { data: existingPayment, error: existingPaymentError } = await supabaseAdmin
      .from('billing_payments')
      .select('flow_token, raw_response')
      .eq('user_id', user.id)
      .eq('provider', 'flow')
      .eq('plan', planKey)
      .eq('status', 'pending')
      .gte('created_at', pendingSince)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingPaymentError) {
      console.error('[Flow checkout] Existing payment lookup error:', existingPaymentError.message);
      return NextResponse.json({ error: 'No se pudo validar un pago pendiente.' }, { status: 500 });
    }

    if (existingPayment) {
      const existingToken = getStoredFlowToken(existingPayment.raw_response);
      const existingUrl = getStoredFlowUrl(existingPayment.raw_response);
      if (existingToken && existingUrl) {
        return NextResponse.json({ url: `${existingUrl}?token=${encodeURIComponent(existingToken)}` });
      }
    }

    const shortId = user.id.split('-')[0];
    const timestamp = Date.now();
    commerceOrder = `conversaai-${shortId}-${planKey}-${timestamp}`;

    const flowResponse = await createFlowPayment({
      commerceOrder,
      subject: `ConversaAI ${config.label} - Suscripción mensual`,
      currency: 'CLP',
      amount,
      email: user.email || 'usuario@conversaai.store',
      urlConfirmation: `${appUrl}/api/webhooks/flow`,
      urlReturn: `${appUrl}/api/billing/flow/return`
    });

    if (!flowResponse.token || !flowResponse.url || !Number.isFinite(flowResponse.flowOrder)) {
      return NextResponse.json({ error: 'Flow devolvió una respuesta de pago incompleta.' }, { status: 502 });
    }

    const { error: paymentInsertError } = await supabaseAdmin
      .from('billing_payments')
      .insert({
        user_id: user.id,
        provider: 'flow',
        flow_token: flowResponse.token,
        flow_order: commerceOrder,
        plan: planKey,
        amount,
        currency: 'CLP',
        status: 'pending',
        raw_response: flowResponse,
      });

    if (paymentInsertError) {
      console.error('[Flow checkout] Payment insert error:', paymentInsertError.message);
      return NextResponse.json(
        { error: 'Flow creó el pago, pero no se pudo guardar en el sistema.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      url: `${flowResponse.url}?token=${encodeURIComponent(flowResponse.token)}`
    });
  } catch (error: unknown) {
    if (isPlainObject(error) && error.isFlowParseError === true) {
      const message = typeof error.message === 'string' ? error.message : 'Flow devolvió una respuesta no válida.';
      return NextResponse.json({
        error: message,
        debug: process.env.NODE_ENV === 'development' && isPlainObject(error.debug) ? error.debug : undefined
      }, { status: 502 });
    }

    const errMessage = error instanceof Error ? error.message : String(error);
    console.error('[Flow checkout] Error:', errMessage);

    let userFriendlyMessage = 'Ocurrió un error al procesar el pago con Flow.';
    let details: string | undefined;
    let statusCode = 500;
    let flowCode: number | undefined;

    if (errMessage.includes('No services available') || errMessage.includes('105')) {
      userFriendlyMessage = 'No hay medios de pago disponibles en tu cuenta Flow Sandbox.';
      statusCode = 400;
      flowCode = 105;
      details = 'Revisa en Flow Sandbox que tu cuenta tenga medios de pago habilitados.';
    } else if (errMessage.includes('Faltan credenciales')) {
      userFriendlyMessage = 'Faltan variables de entorno de Flow.';
      statusCode = 400;
    }

    return NextResponse.json({
      error: userFriendlyMessage,
      ...(flowCode ? { code: flowCode } : {}),
      ...(details ? { details } : {})
    }, { status: statusCode });
  }
}
