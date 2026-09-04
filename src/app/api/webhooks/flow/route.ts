import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { getFlowPaymentStatus } from '@/lib/flow';
import { logAuditEvent, logSecurityEvent } from '@/lib/audit';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const token = formData.get('token');

    if (!token || typeof token !== 'string' || token.length > 512) {
      return NextResponse.json({ error: 'Token no proporcionado.' }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const flowStatus = await getFlowPaymentStatus(token);

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

    let newStatus = 'pending';
    if (flowStatus.status === 2) newStatus = 'paid';
    else if (flowStatus.status === 3) newStatus = 'rejected';
    else if (flowStatus.status === 4) newStatus = 'cancelled';

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
    console.error('Flow Webhook Error:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Error procesando webhook.' }, { status: 500 });
  }
}
