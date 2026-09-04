import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { capturePayPalOrder, getPayPalOrder, verifyPayPalWebhook } from '@/lib/paypal';
import { logAuditEvent, logSecurityEvent } from '@/lib/audit';

const MAX_BODY_BYTES = 128 * 1024;
const MAX_HEADER_LENGTH = 4096;
const MAX_WEBHOOK_AGE_MS = 10 * 60 * 1000;
const SUPPORTED_EVENTS = new Set(['CHECKOUT.ORDER.APPROVED', 'PAYMENT.CAPTURE.COMPLETED', 'PAYMENT.CAPTURE.DENIED', 'CHECKOUT.PAYMENT-APPROVAL.REVERSED']);
function header(req: Request, name: string): string | null { const value = req.headers.get(name); return value && value.length <= MAX_HEADER_LENGTH ? value : null; }
function getOrderId(event: Record<string, unknown>): string | null {
  const resource = event.resource;
  if (!resource || typeof resource !== 'object' || Array.isArray(resource)) return null;
  const r = resource as Record<string, unknown>;
  if (typeof r.id === 'string' && event.event_type === 'CHECKOUT.ORDER.APPROVED') return r.id;
  const supplementary = r.supplementary_data;
  if (supplementary && typeof supplementary === 'object' && !Array.isArray(supplementary)) {
    const ids = (supplementary as Record<string, unknown>).related_ids;
    if (ids && typeof ids === 'object' && !Array.isArray(ids) && typeof (ids as Record<string, unknown>).order_id === 'string') return (ids as Record<string, unknown>).order_id as string;
  }
  return null;
}
export async function POST(req: Request) {
  try {
    const webhookId = process.env.PAYPAL_WEBHOOK_ID;
    if (!webhookId) return NextResponse.json({ error: 'Webhook PayPal no configurado.' }, { status: 500 });
    if (!(req.headers.get('content-type') || '').toLowerCase().startsWith('application/json')) return NextResponse.json({ error: 'Content-Type no soportado.' }, { status: 415 });
    const length = req.headers.get('content-length');
    if (length && (!Number.isFinite(Number(length)) || Number(length) > MAX_BODY_BYTES)) return NextResponse.json({ error: 'Solicitud demasiado grande.' }, { status: 413 });
    const rawBody = await req.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) return NextResponse.json({ error: 'Solicitud demasiado grande.' }, { status: 413 });
    const transmissionId = header(req, 'paypal-transmission-id');
    const transmissionTime = header(req, 'paypal-transmission-time');
    const certUrl = header(req, 'paypal-cert-url');
    const authAlgo = header(req, 'paypal-auth-algo');
    const transmissionSig = header(req, 'paypal-transmission-sig');
    if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) return NextResponse.json({ error: 'Firma PayPal incompleta.' }, { status: 400 });
    const transmissionMs = Date.parse(transmissionTime);
    if (!Number.isFinite(transmissionMs) || Math.abs(Date.now() - transmissionMs) > MAX_WEBHOOK_AGE_MS) return NextResponse.json({ error: 'Webhook PayPal fuera de ventana.' }, { status: 400 });
    if (!await verifyPayPalWebhook({ rawBody, transmissionId, transmissionTime, certUrl, authAlgo, transmissionSig, webhookId })) {
      await logSecurityEvent({ eventType: 'paypal_webhook_invalid', severity: 'warning', message: 'Firma de webhook PayPal inválida.', req });
      return NextResponse.json({ error: 'Webhook no autorizado.' }, { status: 400 });
    }
    let event: unknown;
    try { event = JSON.parse(rawBody); } catch { return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 }); }
    if (!event || typeof event !== 'object' || Array.isArray(event)) return NextResponse.json({ error: 'Webhook inválido.' }, { status: 400 });
    const webhookEvent = event as Record<string, unknown>;
    const eventId = typeof webhookEvent.id === 'string' ? webhookEvent.id : null;
    const eventType = typeof webhookEvent.event_type === 'string' ? webhookEvent.event_type : null;
    if (!eventId || eventId.length > 128 || !eventType || eventType.length > 128) return NextResponse.json({ error: 'Webhook inválido.' }, { status: 400 });
    if (!SUPPORTED_EVENTS.has(eventType)) return NextResponse.json({ success: true });
    const orderId = getOrderId(webhookEvent);
    if (!orderId || !/^[A-Z0-9-]{8,64}$/i.test(orderId)) return NextResponse.json({ error: 'Orden PayPal inválida.' }, { status: 400 });
    const admin = createSupabaseAdmin();
    const { data: payment, error: paymentError } = await admin.from('billing_payments').select('id, user_id, paypal_order_id, plan, status').eq('provider', 'paypal').eq('paypal_order_id', orderId).maybeSingle();
    if (paymentError || !payment) { await logSecurityEvent({ eventType: 'paypal_webhook_unknown_order', severity: 'warning', message: 'Webhook PayPal para orden desconocida.', req }); return NextResponse.json({ error: 'Orden no encontrada.' }, { status: 404 }); }
    if (eventType === 'CHECKOUT.PAYMENT-APPROVAL.REVERSED' || eventType === 'PAYMENT.CAPTURE.DENIED') {
      if (payment.status !== 'paid') await admin.from('billing_payments').update({ status: 'failed', raw_response: webhookEvent, updated_at: new Date().toISOString() }).eq('id', payment.id).eq('status', 'pending');
    } else {
      let order = await getPayPalOrder(orderId);
      if (eventType === 'CHECKOUT.ORDER.APPROVED' && order.status === 'PAYER_ACTION_REQUIRED') order = await capturePayPalOrder(orderId);
      if (order.status !== 'COMPLETED') return NextResponse.json({ success: true });
      const { data: result, error: fulfillmentError } = await admin.rpc('fulfill_paypal_payment', { p_payment_id: payment.id, p_order: order });
      if (fulfillmentError || !result?.success) { console.error('[PayPal webhook] Fulfillment rejected:', fulfillmentError?.message || result?.code || 'unknown'); return NextResponse.json({ error: 'No se pudo confirmar el pago.' }, { status: 500 }); }
      if (result.code === 'processed') {
        await logAuditEvent({ userId: payment.user_id, action: 'payment_confirmed', description: `Pago PayPal confirmado para el plan ${payment.plan}`, req });
        await logAuditEvent({ userId: payment.user_id, action: 'subscription_updated', description: `Suscripción actualizada a plan ${payment.plan}`, req });
      }
    }
    const { error: eventError } = await admin.from('paypal_webhook_events').insert({ event_id: eventId, event_type: eventType });
    if (eventError && eventError.code !== '23505') console.error('[PayPal webhook] Event audit error:', eventError.message);
    return NextResponse.json({ success: true });
  } catch (error: unknown) { console.error('[PayPal webhook] Error:', error instanceof Error ? error.message : 'Unknown error'); return NextResponse.json({ error: 'Error procesando webhook.' }, { status: 500 }); }
}
