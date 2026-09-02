import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { getFlowPaymentStatus } from '@/lib/flow';
import { getPlanConfig, normalizePlan } from '@/lib/plans';

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Debes iniciar sesión para verificar el pago.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token || token.length > 512) {
      return NextResponse.json({ error: 'Token inválido.' }, { status: 400 });
    }

    const supabaseAdmin = createSupabaseAdmin();
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('billing_payments')
      .select('id, user_id, flow_token, flow_order, plan, amount, currency, status, metadata')
      .eq('flow_token', token)
      .single();

    if (!payment || paymentError) {
      return NextResponse.json({ error: 'Pago no encontrado.' }, { status: 404 });
    }

    if (payment.user_id !== user.id) {
      return NextResponse.json({ error: 'No tienes acceso a este pago.' }, { status: 403 });
    }

    const flowStatus = await getFlowPaymentStatus(token);

    if (
      flowStatus.commerceOrder !== payment.flow_order ||
      Number(flowStatus.amount) !== Number(payment.amount) ||
      flowStatus.currency !== payment.currency
    ) {
      console.error('[Flow status] Payment mismatch', {
        paymentId: payment.id,
        expectedOrder: payment.flow_order,
        receivedOrder: flowStatus.commerceOrder,
        expectedAmount: payment.amount,
        receivedAmount: flowStatus.amount,
        expectedCurrency: payment.currency,
        receivedCurrency: flowStatus.currency,
      });
      return NextResponse.json({ error: 'La información del pago no coincide.' }, { status: 409 });
    }

    // 1: Pending, 2: Paid, 3: Rejected, 4: Cancelled
    let newStatus = 'pending';
    if (flowStatus.status === 2) newStatus = 'paid';
    else if (flowStatus.status === 3) newStatus = 'rejected';
    else if (flowStatus.status === 4) newStatus = 'cancelled';

    const wasAlreadyPaid = payment.status === 'paid';
    const currentMetadata = payment.metadata || {};
    const updatedMetadata = {
      ...currentMetadata,
      ...(payment.status === 'cancelled' && newStatus === 'paid'
        ? { recoveredFromCancelled: true }
        : {}),
    };

    const { error: paymentUpdateError } = await supabaseAdmin
      .from('billing_payments')
      .update({
        status: newStatus,
        metadata: updatedMetadata,
        raw_response: flowStatus,
      })
      .eq('id', payment.id);

    if (paymentUpdateError) {
      console.error('[Flow status] Payment update error:', paymentUpdateError);
      return NextResponse.json({ error: 'No se pudo actualizar el estado del pago.' }, { status: 500 });
    }

    if (newStatus === 'paid' && !wasAlreadyPaid) {
      const planKey = normalizePlan(payment.plan);
      const planConfig = getPlanConfig(planKey);

      if (planKey === 'free' || planKey === 'trial' || planKey === 'enterprise') {
        return NextResponse.json({ error: 'El plan asociado al pago no es válido.' }, { status: 409 });
      }

      const { data: subscription, error: subscriptionError } = await supabaseAdmin
        .from('subscriptions')
        .select('id')
        .eq('user_id', payment.user_id)
        .single();

      if (subscriptionError && subscriptionError.code !== 'PGRST116') {
        console.error('[Flow status] Subscription lookup error:', subscriptionError);
        return NextResponse.json({ error: 'No se pudo actualizar la suscripción.' }, { status: 500 });
      }

      const now = new Date();
      const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const graceEnd = new Date(now.getTime() + 32 * 24 * 60 * 60 * 1000);

      const subscriptionData = {
        plan: planKey,
        status: 'active',
        assistants_limit: planConfig.limits.assistants,
        messages_limit: planConfig.limits.messagesPerMonth,
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        grace_ends_at: graceEnd.toISOString(),
        cancel_at_period_end: false,
        cancelled_at: null,
        cancellation_reason: null,
      };

      let subscriptionWriteError = null;
      if (subscription) {
        const { error } = await supabaseAdmin
          .from('subscriptions')
          .update(subscriptionData)
          .eq('id', subscription.id);
        subscriptionWriteError = error;
      } else {
        const { error } = await supabaseAdmin
          .from('subscriptions')
          .insert({
            user_id: payment.user_id,
            ...subscriptionData,
            current_messages_used: 0,
          });
        subscriptionWriteError = error;
      }

      if (subscriptionWriteError) {
        console.error('[Flow status] Subscription update error:', subscriptionWriteError);
        return NextResponse.json({ error: 'El pago fue confirmado, pero no se pudo actualizar la suscripción.' }, { status: 500 });
      }
    }

    return NextResponse.json({
      status: newStatus,
      plan: payment.plan,
      amount: payment.amount,
      currency: payment.currency,
    });
  } catch (error: unknown) {
    console.error('Flow Status Check Error:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'No se pudo verificar el pago.' }, { status: 500 });
  }
}
