import { createHash } from 'crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { FlowProvider } from '@/lib/billing/providers/flow';
import { getPlanConfig, normalizePlan } from '@/lib/plans';
import { getClientIp, HttpInputError, readJsonBody } from '@/lib/http-security';
import { checkRateLimit } from '@/lib/security';

const paymentProvider = new FlowProvider();

// ─── IDEMPOTENCY ──────────────────────────────────────────────────────────────
// Ventana de 15 min: todo click/retry dentro de esta ventana usa la misma key.
// Fuera de la ventana se permite un nuevo intento genuino.

const IDEMPOTENCY_WINDOW_MS = 15 * 60 * 1000; // 15 minutos
const IDEMPOTENCY_TTL_SECONDS = 900;           // 15 min en segundos (para expires_at)
const IDEMPOTENCY_HEADER_RE = /^[a-zA-Z0-9\-_]{8,64}$/;

/**
 * Genera idempotency_key estable. NUNCA almacena el header raw:
 * siempre se normaliza y hashea con SHA256.
 *
 *   idempotency_key = chk_ + sha256( userId:planKey:amount:windowBucket ).slice(0,32)
 *
 * Si el cliente envía header Idempotency-Key válido, se ingresa al hash
 * en lugar del windowBucket para que la misma key cliente = misma key final.
 */
function computeIdempotencyKey(
  userId: string,
  planKey: string,
  amount: number,
  clientHeader: string | null,
): string {
  if (clientHeader) {
    const trimmed = clientHeader.trim();
    if (IDEMPOTENCY_HEADER_RE.test(trimmed)) {
      const hash = createHash('sha256').update(`${userId}:${planKey}:${amount}:${trimmed}`).digest('hex').slice(0, 32);
      return `chk_${hash}`;
    }
  }
  // Sin header válido → bucket temporal
  const windowBucket = Math.floor(Date.now() / IDEMPOTENCY_WINDOW_MS);
  const hash = createHash('sha256').update(`${userId}:${planKey}:${amount}:${windowBucket}`).digest('hex').slice(0, 32);
  return `chk_${hash}`;
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

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Debes iniciar sesión para activar un plan.' }, { status: 401 });
    }

    if (!user.email || !user.email_confirmed_at) {
      return NextResponse.json({ error: 'Debes verificar tu correo antes de pagar.' }, { status: 403 });
    }

    const ip = getClientIp(req);
    const [userAllowed, ipAllowed] = await Promise.all([
      checkRateLimit(`flow-checkout-user-${user.id}`, 'flow-checkout-user', 5, 3600),
      checkRateLimit(`flow-checkout-ip-${ip}`, 'flow-checkout-ip', 10, 3600),
    ]);
    if (!userAllowed || !ipAllowed) {
      return NextResponse.json({ error: 'Demasiados intentos de pago. Intenta nuevamente más tarde.' }, { status: 429 });
    }

    const body = await readJsonBody<{ plan?: unknown }>(req, 2_048);
    if (typeof body.plan !== 'string' || body.plan.length > 32) {
      return NextResponse.json({ error: 'Plan no válido.' }, { status: 400 });
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

    // ── IDEMPOTENCY KEY ──────────────────────────────────────────────────────
    // Nunca se almacena el header raw: siempre se hashea.
    // Siempre se genera antes de llamar a Flow para poder hacer lookup previo.
    const rawClientKey = req.headers.get('idempotency-key');
    const idempotencyKey = computeIdempotencyKey(user.id, planKey, amount, rawClientKey);
    const expiresAt = new Date(Date.now() + IDEMPOTENCY_TTL_SECONDS * 1000).toISOString();

    // ── CHECK IDEMPOTENTE ─────────────────────────────────────────────────────
    // Si ya existe un pago con esta key que no expiró, retornar el existente.
    // NO crear nuevo pago en Flow.
    const supabaseAdmin = createSupabaseAdmin();
    const { data: existingPayment, error: existingError } = await supabaseAdmin
      .from('billing_payments')
      .select('id, flow_token, flow_order, status, expires_at, raw_response')
      .eq('idempotency_key', idempotencyKey)
      .in('status', ['pending', 'processing'])
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (existingError) {
      console.error('idempotency lookup error:', existingError);
      return NextResponse.json(
        { error: 'Error al verificar checkout existente.' },
        { status: 500 }
      );
    }

    // Si ya existe pago activo, retornar checkout existente (NO crear otro)
    if (existingPayment?.flow_token) {
      const existingPaymentUrl = existingPayment.raw_response?.url || `https://web.flow.cl/pay/${existingPayment.flow_token}`;
      if (process.env.NODE_ENV === 'development') {
        console.log('idempotency: returning existing checkout', {
          paymentId: existingPayment.id,
          status: existingPayment.status,
          expiresAt: existingPayment.expires_at,
        });
      }
      return NextResponse.json({
        url: existingPaymentUrl,
        existing: true,
        payment_id: existingPayment.id,
      });
    }

    // Create unique order ID
    const shortId = user.id.split('-')[0];
    const timestamp = Date.now();
    commerceOrder = `conversaai-${shortId}-${planKey}-${timestamp}`;

    // 1. Call payment provider FIRST
    const paymentResult = await paymentProvider.createPayment({
      userId: user.id,
      userEmail: user.email,
      plan: planKey,
      amount,
      currency: 'CLP',
      orderId: commerceOrder,
      subject: `ConversaAI ${config.label} - Suscripción mensual`,
      urlConfirmation: `${appUrl}/api/webhooks/flow`,
      urlReturn: `${appUrl}/api/billing/flow/return`
    });

    const flowToken = paymentResult.providerData.token as string;

    if (process.env.NODE_ENV === 'development') {
      console.log("Flow payment created:", {
        hasUrl: Boolean(paymentResult.paymentUrl),
        hasToken: Boolean(flowToken),
        commerceOrder,
        plan: planKey,
        amount,
      });
    }

    // 2. ONLY if successful, insert into billing_payments using admin client
    //    Con campos de FASE 5.1: idempotency_key, expires_at, provider_token, provider_order_id
    //    Manejo de conflicto 23505 (unique constraint) contra carrera simultánea.
    const supabaseAdminInsert = supabaseAdmin; // reuse instance from idempotency check above
    const { data: insertedPayment, error: paymentInsertError } = await supabaseAdminInsert
      .from("billing_payments")
      .insert({
        user_id: user.id,
        provider: "flow",
        flow_token: flowToken,
        flow_order: commerceOrder,
        provider_token: flowToken,        // campo agnóstico FASE 5.1
        provider_order_id: commerceOrder,  // campo agnóstico FASE 5.1
        idempotency_key: idempotencyKey,   // deduplicación checkout
        expires_at: expiresAt,             // expiración pending
        plan: planKey,
        amount,
        currency: "CLP",
        status: "pending",
        raw_response: paymentResult.providerData,
      })
      .select('id')
      .maybeSingle();

    if (paymentInsertError) {
      // ── CONFLICTO 23505: carrera entre 2 requests simultáneos ──────────────
      // Si otro request ya insertó con la misma idempotency_key, recuperar ese.
      // No creamos un segundo pago en Flow → devolver el existente.
      const pgCode = (paymentInsertError as { code?: string }).code;
      if (pgCode === '23505') {
        const { data: conflictRow } = await supabaseAdminInsert
          .from('billing_payments')
          .select('id, flow_token, flow_order, status, expires_at, raw_response')
          .eq('idempotency_key', idempotencyKey)
          .maybeSingle();

        if (conflictRow?.flow_token) {
          const conflictPaymentUrl = conflictRow.raw_response?.url || `https://web.flow.cl/pay/${conflictRow.flow_token}`;
          if (process.env.NODE_ENV === 'development') {
            console.log('idempotency: 23505 conflict resolved', {
              paymentId: conflictRow.id,
              status: conflictRow.status,
            });
          }
          return NextResponse.json({
            url: conflictPaymentUrl,
            existing: true,
            payment_id: conflictRow.id,
          });
        }
      }

      console.error("billing_payments insert error:", paymentInsertError);
      return NextResponse.json(
        {
          error: "Flow creó el pago, pero no se pudo guardar en el sistema.",
          details:
            process.env.NODE_ENV === "development"
              ? paymentInsertError.message
              : undefined,
        },
        { status: 500 }
      );
    }

    if (process.env.NODE_ENV === 'development') {
      console.log("billing_payments insert success:", {
        commerceOrder,
        hasToken: Boolean(flowToken),
        idempotencyKey,
        expiresAt,
      });
    }

    return NextResponse.json({
      url: paymentResult.paymentUrl
    });

  } catch (error: unknown) {
    if (error instanceof HttpInputError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error && typeof error === 'object' && 'isFlowParseError' in error) {
      const flowError = error as { message?: string; debug?: unknown };
      return NextResponse.json({
        error: flowError.message || 'Flow devolvió una respuesta no válida.',
        debug: process.env.NODE_ENV === 'development' ? flowError.debug : undefined
      }, { status: 500 });
    }

    const errMessage = error instanceof Error ? error.message : String(error);
    console.error('Flow Checkout Error:', errMessage);
    
    let userFriendlyMessage = 'Ocurrió un error al procesar el pago con Flow.';
    let details: string | undefined = undefined;
    let statusCode = 500;
    let flowCode: number | undefined = undefined;

    if (errMessage.includes('No services available') || errMessage.includes('105')) {
      userFriendlyMessage = 'No hay medios de pago disponibles en tu cuenta Flow Sandbox.';
      statusCode = 400;
      flowCode = 105;
      
      details = 'Revisa en Flow Sandbox que tu cuenta tenga medios de pago habilitados.';
    } else if (errMessage.includes('Faltan credenciales')) {
      userFriendlyMessage = 'Faltan variables de entorno de Flow.';
      statusCode = 400;
    }

    if (process.env.NODE_ENV === 'development') {
      console.error('Flow Error Logs:', {
        message: errMessage,
        code: flowCode,
        plan: planKey,
        amount,
      });
    }

    return NextResponse.json({ 
      error: userFriendlyMessage,
      ...(flowCode ? { code: flowCode } : {}),
      ...(details ? { details } : {})
    }, { status: statusCode });
  }
}
