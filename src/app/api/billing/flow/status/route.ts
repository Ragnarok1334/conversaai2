import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { getFlowPaymentStatus } from '@/lib/flow';
import { checkRateLimit } from '@/lib/security';

const MAX_TOKEN_LENGTH = 512;
const STATUS_REQUESTS_PER_MINUTE = 12;

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Debes iniciar sesión para verificar el pago.' }, { status: 401 });
    }

    if (!await checkRateLimit(`flow-status-user-${user.id}`, 'flow-status-user-minute', STATUS_REQUESTS_PER_MINUTE, 60)) {
      return NextResponse.json({ error: 'Demasiadas verificaciones de pago. Intenta nuevamente en unos minutos.' }, { status: 429 });
    }

    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');
    if (!token || token.length > MAX_TOKEN_LENGTH) {
      return NextResponse.json({ error: 'Token inválido.' }, { status: 400 });
    }

    const supabaseAdmin = createSupabaseAdmin();
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('billing_payments')
      .select('id, user_id, plan, amount, currency, status')
      .eq('flow_token', token)
      .maybeSingle();

    if (paymentError || !payment) {
      return NextResponse.json({ error: 'Pago no encontrado.' }, { status: 404 });
    }
    if (payment.user_id !== user.id) {
      return NextResponse.json({ error: 'No tienes acceso a este pago.' }, { status: 403 });
    }

    const flowStatus = await getFlowPaymentStatus(token);
    const newStatus = flowStatus.status === 2
      ? 'paid'
      : flowStatus.status === 3
        ? 'failed'
        : flowStatus.status === 4
          ? 'cancelled'
          : 'pending';

    if (newStatus === 'paid') {
      const { data: result, error: fulfillmentError } = await supabaseAdmin.rpc('fulfill_flow_payment', {
        p_payment_id: payment.id,
        p_flow_status: flowStatus,
      });

      if (fulfillmentError) {
        console.error('[Flow status] Fulfillment error:', fulfillmentError.message);
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
        .eq('user_id', user.id)
        .neq('status', 'paid');
      if (statusError) {
        console.error('[Flow status] Status update error:', statusError.message);
        return NextResponse.json({ error: 'No se pudo actualizar el estado del pago.' }, { status: 500 });
      }
    }

    return NextResponse.json({ status: newStatus, plan: payment.plan, amount: payment.amount, currency: payment.currency });
  } catch (error: unknown) {
    console.error('[Flow status] Error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'No se pudo verificar el pago.' }, { status: 500 });
  }
}
