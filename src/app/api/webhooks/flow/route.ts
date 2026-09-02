import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { getFlowPaymentStatus } from '@/lib/flow';
import { logAuditEvent, logSecurityEvent } from '@/lib/audit';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const token = formData.get('token');

    if (!token || typeof token !== 'string' || token.length > 512) {
      return NextResponse.json({ error: 'Token inválido.' }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const flowStatus = await getFlowPaymentStatus(token);

    const { data: payment, error: paymentError } = await supabase
      .from('billing_payments')
      .select('id, user_id, flow_order, plan, status')
      .eq('flow_token', token)
      .single();

    if (paymentError || !payment) {
      console.error('[Flow webhook] Payment not found');
      await logSecurityEvent({ eventType: 'flow_webhook_invalid', severity: 'warning', message: 'Webhook de Flow para pago no encontrado.', req });
      return NextResponse.json({ error: 'Pago no encontrado.' }, { status: 404 });
    }

    const newStatus = flowStatus.status === 2 ? 'paid' : flowStatus.status === 3 ? 'rejected' : flowStatus.status === 4 ? 'cancelled' : 'pending';

    if (newStatus === 'paid') {
      const { data: result, error: fulfillmentError } = await supabase.rpc('fulfill_flow_payment', {
        p_payment_id: payment.id,
        p_flow_status: flowStatus,
      });

      if (fulfillmentError) {
        console.error('[Flow webhook] Fulfillment error:', fulfillmentError);
        return NextResponse.json({ error: 'No se pudo confirmar el pago.' }, { status: 500 });
      }

      if (!result?.success) {
        console.error('[Flow webhook] Fulfillment rejected:', result?.code);
        return NextResponse.json({ error: 'El pago no pudo ser validado.' }, { status: 409 });
      }

      if (result.code === 'processed') {
        await logAuditEvent({ userId: payment.user_id, action: 'payment_confirmed', description: `Pago confirmado para el plan ${payment.plan}`, req });
        await logAuditEvent({ userId: payment.user_id, action: 'subscription_updated', description: `Suscripción actualizada a plan ${payment.plan}`, req });
      }
    } else {
      const { error: statusError } = await supabase
        .from('billing_payments')
        .update({ status: newStatus, raw_response: flowStatus, updated_at: new Date().toISOString() })
        .eq('id', payment.id)
        .neq('status', 'paid');

      if (statusError) {
        console.error('[Flow webhook] Status update error:', statusError);
        return NextResponse.json({ error: 'No se pudo actualizar el estado del pago.' }, { status: 500 });
      }

      if (newStatus === 'rejected' || newStatus === 'cancelled') {
        await logAuditEvent({ userId: payment.user_id, action: 'payment_failed', description: `Pago fallido o cancelado (${newStatus})`, req });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('[Flow webhook] Error:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Error procesando webhook.' }, { status: 500 });
  }
}
