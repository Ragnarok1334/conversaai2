import { timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { logAuditEvent, logSecurityEvent } from '@/lib/audit';
import { HttpInputError, readUrlEncodedBody } from '@/lib/http-security';
import { FlowProvider } from '@/lib/billing/providers/flow';

export async function POST(req: Request) {
  try {
    const formData = await readUrlEncodedBody(req, 4_096);
    const token = formData.get('token');

    if (!token || typeof token !== 'string' || token.length > 512) {
      return NextResponse.json({ error: 'Token no proporcionado.' }, { status: 400 });
    }

    // ── Webhook signature verification (Flow HMAC SHA256) ──────────────────
    // Flow sends field `s` containing an HMAC of all other fields signed with
    // the merchant secret key. We MUST verify this BEFORE any DB query or
    // external API call to prevent replay / forged-webhook attacks.
    const receivedSignature = formData.get('s');
    if (!receivedSignature || typeof receivedSignature !== 'string') {
      await logSecurityEvent({
        eventType: 'flow_webhook_missing_signature',
        severity: 'critical',
        message: 'Webhook Flow recibido sin campo de firma (s).',
        req
      });
      return NextResponse.json({ error: 'Firma requerida.' }, { status: 401 });
    }

    // Build the parameter map EXCLUDING the signature field itself, then
    // recompute the HMAC exactly as Flow does.
    const flowProvider = new FlowProvider();
    const paramsForVerification = flowProvider.prepareWebhookParams(formData);
    const expectedSignature = flowProvider.computeWebhookSignature(paramsForVerification);

    // Constant-time comparison to prevent timing side-channel attacks.
    // Note: timingSafeEqual throws if lengths differ, so we handle that case
    // by using a fixed-length comparison that doesn't leak length info.
    const receivedBuf = Buffer.from(receivedSignature, 'utf8');
    const expectedBuf = Buffer.from(expectedSignature, 'utf8');
    if (receivedBuf.length !== expectedBuf.length) {
      // Different length → invalid, but still do a constant-time walk
      // to avoid leaking the length difference via timing.
      const maxLen = Math.max(receivedBuf.length, expectedBuf.length);
      const paddedA = Buffer.alloc(maxLen, 0);
      const paddedB = Buffer.alloc(maxLen, 0);
      receivedBuf.copy(paddedA);
      expectedBuf.copy(paddedB);
      timingSafeEqual(paddedA, paddedB); // always false, but constant-time
      await logSecurityEvent({
        eventType: 'flow_webhook_signature_invalid',
        severity: 'critical',
        message: 'Webhook Flow con firma HMAC inválida — posible intento de falsificación.',
        req
      });
      return NextResponse.json({ error: 'Firma inválida.' }, { status: 401 });
    }
    if (!timingSafeEqual(receivedBuf, expectedBuf)) {
      await logSecurityEvent({
        eventType: 'flow_webhook_signature_invalid',
        severity: 'critical',
        message: 'Webhook Flow con firma HMAC inválida — posible intento de falsificación.',
        req
      });
      return NextResponse.json({ error: 'Firma inválida.' }, { status: 401 });
    }
    // ── End signature verification ─────────────────────────────────────────

    const supabase = createSupabaseAdmin();
    const { data: payment, error: paymentError } = await supabase
      .from('billing_payments')
      .select('id,user_id,plan,status,flow_token')
      .eq('flow_token', token)
      .single();

    if (paymentError || !payment) {
      console.error('Webhook Flow: Pago no encontrado.');
      await logSecurityEvent({
        eventType: 'flow_webhook_invalid',
        severity: 'warning',
        message: 'Webhook de Flow para token no encontrado.',
        req
      });
      return NextResponse.json({ error: 'Pago no encontrado.' }, { status: 404 });
    }

    // Consult Flow only for tokens that were issued and stored by this application.
    // FlowProvider.verifyPayment() handles the Flow API call and status mapping.
    const verification = await flowProvider.verifyPayment({ token });
    const newStatus = verification.status;
    const flowStatus = verification.rawData;

    // Paid fulfillment is handled by a locked, atomic, idempotent SECURITY DEFINER RPC.
    if (newStatus === 'paid') {
      const { data: result, error: fulfillmentError } = await supabase.rpc('fulfill_flow_payment', {
        p_payment_id: payment.id,
        p_flow_status: flowStatus
      });

      if (fulfillmentError) {
        console.error('Flow fulfillment RPC error:', fulfillmentError.message);
        return NextResponse.json({ error: 'No se pudo procesar el pago.' }, { status: 500 });
      }

      if (!result?.success) {
        const code = result?.code;
        if (code === 'already_processed') {
          return NextResponse.json({ success: true });
        }
        console.error('Flow fulfillment rejected:', code || 'unknown');
        return NextResponse.json({ error: 'No se pudo validar el pago.' }, { status: 409 });
      }

      if (result.code === 'processed') {
        await logAuditEvent({
          userId: payment.user_id,
          action: 'payment_confirmed',
          description: `Pago confirmado para el plan ${payment.plan}`,
          req
        });
        await logAuditEvent({
          userId: payment.user_id,
          action: 'subscription_updated',
          description: `Suscripción actualizada a plan ${payment.plan}`,
          req
        });
      }

      return NextResponse.json({ success: true });
    }

    // Non-paid states do not grant access. They can be recorded without touching subscriptions.
    if (newStatus !== payment.status) {
      const { error: updateError } = await supabase
        .from('billing_payments')
        .update({ status: newStatus, raw_response: flowStatus })
        .eq('id', payment.id)
        .eq('status', payment.status);

      if (updateError) {
        console.error('Flow payment status update error:', updateError.message);
        return NextResponse.json({ error: 'No se pudo actualizar el pago.' }, { status: 500 });
      }

      if (newStatus === 'rejected' || newStatus === 'cancelled') {
        await logAuditEvent({
          userId: payment.user_id,
          action: 'payment_failed',
          description: `Pago fallido o cancelado (${newStatus})`,
          req
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof HttpInputError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Flow Webhook Error:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Error procesando webhook.' }, { status: 500 });
  }
}
