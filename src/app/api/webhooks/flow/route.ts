import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { getFlowPaymentStatus } from '@/lib/flow';
import { getPlanConfig, normalizePlan } from '@/lib/plans';

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
      return NextResponse.json({ error: 'Pago no encontrado.' }, { status: 404 });
    }

    // Map Flow status
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
            assistants_limit: planConfig.assistantsLimit,
            messages_limit: planConfig.messagesLimit,
          })
          .eq('user_id', payment.user_id);
      } else {
        await supabase
          .from('subscriptions')
          .insert({
            user_id: payment.user_id,
            plan: planKey,
            status: 'active',
            assistants_limit: planConfig.assistantsLimit,
            messages_limit: planConfig.messagesLimit,
            current_messages_used: 0
          });
      }
    }

    return NextResponse.json({ success: true });

  } catch (error: unknown) {
    console.error('Flow Webhook Error:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Error procesando webhook.' }, { status: 500 });
  }
}
