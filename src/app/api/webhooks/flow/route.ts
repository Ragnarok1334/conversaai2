import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getFlowPaymentStatus } from '@/lib/flow';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const token = formData.get('token');

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Token no proporcionado.' }, { status: 400 });
    }

    // Usamos el rol de servicio porque el webhook de Flow no tiene sesión de usuario.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Webhook Flow: Missing SUPABASE config');
      return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

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

    // 4. Update subscription if paid
    if (newStatus === 'paid' && payment.status !== 'paid') {
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

    return NextResponse.json({ success: true });

  } catch (error: unknown) {
    console.error('Flow Webhook Error:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Error procesando webhook.' }, { status: 500 });
  }
}
