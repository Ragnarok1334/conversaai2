import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getFlowPaymentStatus } from '@/lib/flow';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token requerido.' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // 1. Verify token in Flow
    const flowStatus = await getFlowPaymentStatus(token);

    // 2. Fetch billing_payment record
    const { data: payment, error: paymentError } = await supabase
      .from('billing_payments')
      .select('*')
      .eq('flow_token', token)
      .single();

    if (!payment || paymentError) {
      return NextResponse.json({ error: 'Pago no encontrado.' }, { status: 404 });
    }

    // Optional: if user is logged in, verify it belongs to them
    if (user && payment.user_id !== user.id) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 403 });
    }



    // Map Flow status to our DB status
    // 1: Pending, 2: Paid, 3: Rejected, 4: Cancelled
    let newStatus = 'pending';
    if (flowStatus.status === 2) newStatus = 'paid';
    else if (flowStatus.status === 3) newStatus = 'rejected';
    else if (flowStatus.status === 4) newStatus = 'cancelled';

    // 3. Update billing_payments
    await supabase
      .from('billing_payments')
      .update({
        status: newStatus,
        raw_response: flowStatus
      })
      .eq('id', payment.id);

    // 4. If paid, update subscription
    if (newStatus === 'paid') {
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', payment.user_id)
        .single();

      if (subscription) {
        await supabase
          .from('subscriptions')
          .update({
            plan: payment.plan,
            status: 'active'
          })
          .eq('user_id', payment.user_id);
      } else {
        // Create if missing
        await supabase
          .from('subscriptions')
          .insert({
            user_id: payment.user_id,
            plan: payment.plan,
            status: 'active',
            assistants_limit: payment.plan === 'business' ? 20 : 5,
            messages_limit: payment.plan === 'business' ? 50000 : 5000,
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
