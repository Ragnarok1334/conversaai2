import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { getFlowPaymentStatus } from '@/lib/flow';
import { checkRateLimit } from '@/lib/security';
import { getClientIp } from '@/lib/http-security';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token || token.length > 512) {
      return NextResponse.json({ error: 'Token requerido.' }, { status: 400 });
    }

    const allowed = await checkRateLimit(`flow-status-${getClientIp(req)}`, 'flow-status', 30, 300);
    if (!allowed) return NextResponse.json({ error: 'Demasiadas consultas.' }, { status: 429 });

    const supabaseAdmin = createSupabaseAdmin();
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('billing_payments')
      .select('id,plan,status,amount,currency,flow_token')
      .eq('flow_token', token)
      .single();

    if (paymentError || !payment) {
      return NextResponse.json({ error: 'Pago no encontrado.' }, { status: 404 });
    }

    // Avoid turning this endpoint into an unrestricted proxy to Flow.
    const flowStatus = await getFlowPaymentStatus(token);

    // This endpoint is intentionally read-only. Payment fulfillment is performed
    // exclusively by the verified webhook/RPC path.
    let providerStatus = 'pending';
    if (flowStatus.status === 2) providerStatus = 'paid';
    else if (flowStatus.status === 3) providerStatus = 'rejected';
    else if (flowStatus.status === 4) providerStatus = 'cancelled';

    return NextResponse.json({
      status: providerStatus,
      plan: payment.plan,
      amount: payment.amount,
      currency: payment.currency
    });
  } catch (error: unknown) {
    console.error('Flow Status Check Error:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'No se pudo verificar el pago.' }, { status: 500 });
  }
}
