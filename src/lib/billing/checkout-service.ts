/**
 * FASE 5.7 — Checkout Service
 * Lógica común de checkout para todos los payment providers.
 * NO implementa provider específico — solo validaciones y persistencia compartida.
 */
import { createHash } from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { getPlanConfig, normalizePlan } from '@/lib/plans';
import { getClientIp, HttpInputError, readJsonBody } from '@/lib/http-security';
import { checkRateLimit } from '@/lib/security';
import type { User } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

// ─── IDEMPOTENCY ──────────────────────────────────────────────────
const IDEMPOTENCY_WINDOW_MS = 15 * 60 * 1000;
const IDEMPOTENCY_TTL_SECONDS = 900;
const IDEMPOTENCY_HEADER_RE = /^[a-zA-Z0-9\-_]{8,64}$/;

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
  const windowBucket = Math.floor(Date.now() / IDEMPOTENCY_WINDOW_MS);
  const hash = createHash('sha256').update(`${userId}:${planKey}:${amount}:${windowBucket}`).digest('hex').slice(0, 32);
  return `chk_${hash}`;
}

// ─── TYPES ────────────────────────────────────────────────────────
export interface PreparedCheckout {
  user: User;
  planKey: string;
  config: ReturnType<typeof getPlanConfig>;
  amount: number;
  idempotencyKey: string;
  expiresAt: string;
  supabaseAdmin: SupabaseClient;
  existingPayment?: { url: string; existing: boolean; payment_id: string };
}

export interface PrepareCheckoutOptions {
  provider: string;
}

export interface RecordPaymentParams {
  supabaseAdmin: SupabaseClient;
  userId: string;
  provider: string;
  providerToken: string;
  providerOrderId: string;
  idempotencyKey: string;
  expiresAt: string;
  planKey: string;
  amount: number;
  currency: string;
  rawResponse: Record<string, unknown>;
  flowToken?: string;
  flowOrder?: string;
}

export interface RecordPaymentResult {
  success: boolean;
  paymentId?: string;
  conflict?: { url: string; existing: boolean; payment_id: string };
  error?: { message: string; details?: string };
}
// ─── PREPARE CHECKOUT ─────────────────────────────────────────────
export async function prepareCheckout(
  req: Request,
  options?: PrepareCheckoutOptions,
): Promise<PreparedCheckout> {
  const provider = options?.provider ?? 'flow';
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new HttpInputError('Faltan variables de entorno del servidor (Supabase Admin).', 500);
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new HttpInputError('Debes iniciar sesión para activar un plan.', 401);
  if (!user.email || !user.email_confirmed_at) throw new HttpInputError('Debes verificar tu correo antes de pagar.', 403);
  const ip = getClientIp(req);
  const [userAllowed, ipAllowed] = await Promise.all([
    checkRateLimit(`checkout-${provider}-user-${user.id}`, `checkout-${provider}-user`, 5, 3600),
    checkRateLimit(`checkout-${provider}-ip-${ip}`, `checkout-${provider}-ip`, 10, 3600),
  ]);
  if (!userAllowed || !ipAllowed) throw new HttpInputError('Demasiados intentos de pago. Intenta nuevamente más tarde.', 429);
  const body = await readJsonBody<{ plan?: unknown }>(req, 2_048);
  if (typeof body.plan !== 'string' || body.plan.length > 32) throw new HttpInputError('Plan no válido.', 400);
  const planKey = normalizePlan(body.plan);
  if (planKey === 'trial' || body.plan === 'free') throw new HttpInputError('La prueba gratis no requiere pago.', 400);
  if (planKey === 'enterprise') throw new HttpInputError('Enterprise requiere contacto comercial.', 400);
  const allowedPlans = ['starter', 'pro', 'growth', 'business'];
  if (!allowedPlans.includes(planKey)) throw new HttpInputError('Plan no válido para checkout automático.', 400);
  const config = getPlanConfig(planKey);
  if (!config.priceCLP || config.priceCLP <= 0) throw new HttpInputError('Precio del plan no configurado.', 500);
  const amount = config.priceCLP;
  const rawClientKey = req.headers.get('idempotency-key');
  const idempotencyKey = computeIdempotencyKey(user.id, planKey, amount, rawClientKey);
  const expiresAt = new Date(Date.now() + IDEMPOTENCY_TTL_SECONDS * 1000).toISOString();
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
    throw new HttpInputError('Error al verificar checkout existente.', 500);
  }
  if (existingPayment?.flow_token) {
    const rawUrl = (existingPayment.raw_response as Record<string, unknown> | null)?.url as string | undefined;
    const existingPaymentUrl = rawUrl || `https://web.flow.cl/pay/${existingPayment.flow_token}`;
    if (process.env.NODE_ENV === 'development') {
      console.log('idempotency: returning existing checkout', {
        paymentId: existingPayment.id, status: existingPayment.status, expiresAt: existingPayment.expires_at,
      });
    }
    return { user, planKey, config, amount, idempotencyKey, expiresAt, supabaseAdmin,
      existingPayment: { url: existingPaymentUrl, existing: true, payment_id: existingPayment.id } };
  }
  return { user, planKey, config, amount, idempotencyKey, expiresAt, supabaseAdmin };
}

// ─── RECORD PAYMENT ───────────────────────────────────────────────
/**
 * Inserta billing_payment con campos comunes.
 * Maneja conflicto 23505 (unique constraint idempotency_key).
 * Para Flow: pasar flowToken y flowOrder.
 * Para otros providers: usar solo providerToken / providerOrderId.
 */
export async function recordPayment(params: RecordPaymentParams): Promise<RecordPaymentResult> {
  const {
    supabaseAdmin, userId, provider,
    providerToken, providerOrderId,
    idempotencyKey, expiresAt,
    planKey, amount, currency, rawResponse,
    flowToken, flowOrder,
  } = params;

  const insertPayload: Record<string, unknown> = {
    user_id: userId,
    provider,
    provider_token: providerToken,
    provider_order_id: providerOrderId,
    idempotency_key: idempotencyKey,
    expires_at: expiresAt,
    plan: planKey,
    amount,
    currency,
    status: 'pending',
    raw_response: rawResponse,
  };
  if (flowToken) insertPayload.flow_token = flowToken;
  if (flowOrder) insertPayload.flow_order = flowOrder;

  const { data: insertedPayment, error: paymentInsertError } = await supabaseAdmin
    .from('billing_payments')
    .insert(insertPayload)
    .select('id')
    .maybeSingle();

  if (paymentInsertError) {
    const pgCode = (paymentInsertError as { code?: string }).code;
    if (pgCode === '23505') {
      const { data: conflictRow } = await supabaseAdmin
        .from('billing_payments')
        .select('id, flow_token, flow_order, status, expires_at, raw_response')
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle();
      if (conflictRow?.flow_token) {
        const conflictPaymentUrl =
          (conflictRow.raw_response as Record<string, unknown>)?.url as string ||
          `https://web.flow.cl/pay/${conflictRow.flow_token}`;
        if (process.env.NODE_ENV === 'development') {
          console.log('idempotency: 23505 conflict resolved', {
            paymentId: conflictRow.id, status: conflictRow.status,
          });
        }
        return {
          success: true,
          conflict: { url: conflictPaymentUrl, existing: true, payment_id: conflictRow.id },
        };
      }
    }
    console.error('billing_payments insert error:', paymentInsertError);
    return {
      success: false,
      error: {
        message: 'Flow creó el pago, pero no se pudo guardar en el sistema.',
        details: process.env.NODE_ENV === 'development' ? paymentInsertError.message : undefined,
      },
    };
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('billing_payments insert success:', {
      paymentId: insertedPayment?.id, provider, idempotencyKey, expiresAt,
    });
  }
  return { success: true, paymentId: insertedPayment?.id };
}

