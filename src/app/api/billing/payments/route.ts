import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Debes iniciar sesión.' }, { status: 401 });
    }

    const admin = createSupabaseAdmin();
    const { data: payments, error } = await admin
      .from('billing_payments')
      .select('id, plan, amount, currency, status, provider, flow_order, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching billing_payments:', error.message);
      return NextResponse.json({ payments: [] });
    }

    return NextResponse.json({ payments });
  } catch (error: unknown) {
    console.error('Payments API Error:', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json({ error: 'Error al obtener pagos.' }, { status: 500 });
  }
}
