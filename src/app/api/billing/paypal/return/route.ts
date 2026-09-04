import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { capturePayPalOrder, getPayPalOrder } from '@/lib/paypal';
import { logAuditEvent, logSecurityEvent } from '@/lib/audit';

const APP_URL = 'https://conversaai.store';
const MAX_ORDER_ID = 64;

export async function GET(req: Request) {
  const redirect = (path: string) => NextResponse.redirect(new URL(path, APP_URL), { status: 303 });
  try {
    const configured = process.env.NEXT_PUBLIC_APP_URL;
    if (!configured || new URL(configured).origin !== APP_URL || !process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) return redirect('/dashboard/billing?paypal=error');

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return redirect('/login?next=%2Fdashboard%2Fbilling');

    const orderId = new URL(req.url).searchParams.get('token');
    if (!orderId || orderId.length > MAX_ORDER_ID || !/^[A-Z0-9-]{8,64}$/i.test(orderId)) return redirect('/dashboard/billing?paypal=invalid');

    const admin = createSupabaseAdmin();
    const { data: payment, error: paymentError } = await admin.from('billing_payments').select('id, user_id, paypal_order_id, plan, status').eq('provider', 'paypal').eq('user_id', user.id).eq('paypal_order_id', orderId).maybeSingle();
    if (paymentError || !payment) {
      await logSecurityEvent({ eventType: 'paypal_return_invalid', severity: 'warning', message: 'Retorno de PayPal para orden no encontrada.', req });
      return redirect('/dashboard/billing?paypal=not_found');
    }
    if (payment.status === 'paid') return redirect('/dashboard/billing?paypal=success');
    if (payment.status !== 'pending') return redirect('/dashboard/billing?paypal=unavailable');

    let order = await getPayPalOrder(orderId);
    if (order.status === 'APPROVED') order = await capturePayPalOrder(orderId);
    if (order.status !== 'COMPLETED') return redirect('/dashboard/billing?paypal=pending');

    const { data: result, error: fulfillmentError } = await admin.rpc('fulfill_paypal_payment', { p_payment_id: payment.id, p_order: order });
    if (fulfillmentError || !result?.success) {
      console.error('[PayPal return] Fulfillment rejected:', fulfillmentError?.message || result?.code || 'unknown');
      return redirect('/dashboard/billing?paypal=verification_error');
    }
    if (result.code === 'processed') {
      await logAuditEvent({ userId: payment.user_id, action: 'payment_confirmed', description: `Pago PayPal confirmado para el plan ${payment.plan}`, req });
      await logAuditEvent({ userId: payment.user_id, action: 'subscription_updated', description: `Suscripción actualizada a plan ${payment.plan}`, req });
    }
    return redirect('/dashboard/billing?paypal=success');
  } catch (error: unknown) {
    console.error('[PayPal return] Error:', error instanceof Error ? error.message : 'Unknown error');
    return redirect('/dashboard/billing?paypal=error');
  }
}
