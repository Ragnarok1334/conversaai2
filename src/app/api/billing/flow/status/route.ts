import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { getFlowPaymentStatus } from '@/lib/flow';

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
      .select('id, user_id, plan, amount, currency, status')
      .eq('flow_token', token)
      .single();

    if (paymentError || !payment) {
      return NextResponse.json({ error: 'Pago no encontrado.' }, { status: 404 });
    }
    if (payment.user_id !== user.id) {
      return NextResponse.json({ error: 'No tienes acceso a este pago.' }, { status: 403 });
    }

    const flowStatus = await getFlowPaymentStatus(token);
    if (
      flowStatus.commerceOrder !== undefined &&
      flowStatus.amount !== undefined &&
      flowStatus.currency !== undefined
    ) {
      // The database RPC performs the authoritative order/amount/currency validation.
    }

    const newStatus = flowStatus.status === 2 ? 'paid' : flowStatus.status === 3 ? 'rejected' : flowStatus.status === 4 ? 'cancelled' : 'pending';

    if (newStatus === 'paid') {
      const { data: result, error: fulfillmentError } = await supabaseAdmin.rpc('fulfill_flow_payment', {
        p_payment_id: payment.id,
        p_flow_status: flowStatus,
      });

      if (fulfillmentError) {
        console.error('[Flow status] Fulfillment error:', fulfillmentError);
        return NextResponse.json({ error: 'No se pudo confirmar el pago.' }, { status: 500 });
      }
      if (!result?.success) {
        console.error('[Flow status] Fulfillment rejected:', result?.code);
        return NextResponse.json({ error: 'El pago no pudo ser validado.' }, { status: 409 });
      }
    } else {
      const { error: statusError } = await supabaseAdmin
        .from('billing_payments')
        .update({ status: newStatus, raw_response: flowStatus, updated_at: new Date().toISOString() })
        .eq('id', payment.id)
        .neq('status', 'paid');
      if (statusError) {
        console.error('[Flow status] Status update error:', statusError);
        return NextResponse.json({ error: 'No se pudo actualizar el estado del pago.' }, { status: 500 });
      }
    }

    return NextResponse.json({ status: newStatus, plan: payment.plan, amount: payment.amount, currency: payment.currency });
  } catch (error: unknown) {
    console.error('[Flow status] Error:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'No se pudo verificar el pago.' }, { status: 500 });
  }
}
