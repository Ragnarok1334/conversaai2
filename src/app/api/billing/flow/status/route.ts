import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { getFlowPaymentStatus } from '@/lib/flow';
import { getPlanConfig, normalizePlan } from '@/lib/plans';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token requerido.' }, { status: 400 });
    }

    const supabaseAdmin = createSupabaseAdmin();

    // 1. Verify token in Flow
    const flowStatus = await getFlowPaymentStatus(token);

    // 2. Fetch billing_payment record
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('billing_payments')
      .select('*')
      .eq('flow_token', token)
      .single();

    if (!payment || paymentError) {
      return NextResponse.json({ error: 'Pago no encontrado.' }, { status: 404 });
    }

    // Map Flow status to our DB status
    // 1: Pending, 2: Paid, 3: Rejected, 4: Cancelled
    let newStatus = 'pending';
    if (flowStatus.status === 2) newStatus = 'paid';
    else if (flowStatus.status === 3) newStatus = 'rejected';
    else if (flowStatus.status === 4) newStatus = 'cancelled';

    // 3. Update billing_payments
    const currentMetadata = payment.metadata || {}
    let updatedMetadata = { ...currentMetadata }
    if (payment.status === 'cancelled' && newStatus === 'paid') {
      updatedMetadata.recoveredFromCancelled = true
    }

    await supabaseAdmin
      .from('billing_payments')
      .update({
        status: newStatus,
        metadata: updatedMetadata,
        raw_response: flowStatus
      })
      .eq('id', payment.id);

    // 4. If paid, update subscription with correct limits from plans config
    if (newStatus === 'paid') {
      const planKey = normalizePlan(payment.plan)
      const planConfig = getPlanConfig(planKey)

      const { data: subscription } = await supabaseAdmin
        .from('subscriptions')
        .select('*')
        .eq('user_id', payment.user_id)
        .single();

      if (subscription) {
        await supabaseAdmin
          .from('subscriptions')
          .update({
            plan: planKey,
            status: 'active',
            assistants_limit: planConfig.limits.assistants,
            messages_limit: planConfig.limits.messagesPerMonth,
          })
          .eq('user_id', payment.user_id);
      } else {
        // Create if missing
        await supabaseAdmin
          .from('subscriptions')
          .insert({
            user_id: payment.user_id,
            plan: planKey,
            status: 'active',
            assistants_limit: planConfig.limits.assistants,
            messages_limit: planConfig.limits.messagesPerMonth,
            current_messages_used: 0
          });
      }
    }

    return NextResponse.json({
      status: newStatus,
      plan: payment.plan,
      amount: payment.amount,
      currency: payment.currency
    });

  } catch (error: unknown) {
    console.error('Flow Status Check Error:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'No se pudo verificar el pago.' }, { status: 500 });
  }
}
