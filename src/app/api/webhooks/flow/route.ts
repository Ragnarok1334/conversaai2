import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { getFlowPaymentStatus } from '@/lib/flow';
import { getPlanConfig, normalizePlan } from '@/lib/plans';
import { logAuditEvent, logSecurityEvent } from '@/lib/audit';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const token = formData.get('token');

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Token no proporcionado.' }, { status: 400 });
    }

    // Usamos el rol de servicio porque el webhook de Flow no tiene sesión de usuario.
    const supabase = createSupabaseAdmin();

    // 1. Check real status in Flow
    const flowStatus = await getFlowPaymentStatus(token);

    // 2. Fetch billing_payments record
    const { data: payment } = await supabase
      .from('billing_payments')
      .select('*')
      .eq('flow_token', token)
      .single();

    if (!payment) {
      console.error('Webhook Flow: Pago no encontrado:', token);
      await logSecurityEvent({ eventType: 'flow_webhook_invalid', severity: 'warning', message: `Webhook de Flow para token no encontrado: ${token}`, req })
      return NextResponse.json({ error: 'Pago no encontrado.' }, { status: 404 });
    }

    // Map Flow status
    let newStatus = 'pending';
    if (flowStatus.status === 2) newStatus = 'paid';
    else if (flowStatus.status === 3) newStatus = 'rejected';
    else if (flowStatus.status === 4) newStatus = 'cancelled';

    const currentMetadata = payment.metadata || {}
    let updatedMetadata = { ...currentMetadata }
    if (payment.status === 'cancelled' && newStatus === 'paid') {
      updatedMetadata.recoveredFromCancelled = true
    }

    await supabase
      .from('billing_payments')
      .update({
        status: newStatus,
        metadata: updatedMetadata,
        raw_response: flowStatus
      })
      .eq('id', payment.id);

    // Auditar cambios de pago (independiente de si es el primer webhook de success o no, para mantener historial)
    if (newStatus !== payment.status) {
      if (newStatus === 'paid') {
        await logAuditEvent({ userId: payment.user_id, action: 'payment_confirmed', description: `Pago confirmado para el plan ${payment.plan}`, req })
      } else if (newStatus === 'rejected' || newStatus === 'cancelled') {
        await logAuditEvent({ userId: payment.user_id, action: 'payment_failed', description: `Pago fallido o cancelado (${newStatus})`, req })
      }
    }

    // 4. Update subscription if paid (avoid double-processing)
    if (newStatus === 'paid' && payment.status !== 'paid') {
      const planKey = normalizePlan(payment.plan)
      const planConfig = getPlanConfig(planKey)

      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', payment.user_id)
        .single();

      if (subscription) {
        await supabase
          .from('subscriptions')
          .update({
            plan: planKey,
            status: 'active',
            assistants_limit: planConfig.limits.assistants,
            messages_limit: planConfig.limits.messagesPerMonth,
            current_messages_used: 0,
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            grace_ends_at: new Date(Date.now() + 32 * 24 * 60 * 60 * 1000).toISOString()
          })
          .eq('user_id', payment.user_id);
      } else {
        await supabase
          .from('subscriptions')
          .insert({
            user_id: payment.user_id,
            plan: planKey,
            status: 'active',
            assistants_limit: planConfig.limits.assistants,
            messages_limit: planConfig.limits.messagesPerMonth,
            current_messages_used: 0,
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            grace_ends_at: new Date(Date.now() + 32 * 24 * 60 * 60 * 1000).toISOString()
          });
      }

      await logAuditEvent({ userId: payment.user_id, action: 'subscription_updated', description: `Suscripción actualizada a plan ${planKey}`, req })
    }

    return NextResponse.json({ success: true });

  } catch (error: unknown) {
    console.error('Flow Webhook Error:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Error procesando webhook.' }, { status: 500 });
  }
}
