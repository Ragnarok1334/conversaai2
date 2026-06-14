import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getEffectiveSubscriptionStatus } from '@/lib/billing/subscription-status';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Debes iniciar sesión para cancelar.' }, { status: 401 });
    }

    // Usamos admin client para hacer bypass RLS si fuera necesario y ser confiables
    const supabaseAdmin = createSupabaseAdmin();

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('trial_used, trial_ends_at')
      .eq('id', user.id)
      .single();

    const { data: subscription, error } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error || !subscription) {
      return NextResponse.json({ error: 'Suscripción no encontrada.' }, { status: 404 });
    }

    if (subscription.plan === 'free') {
      return NextResponse.json({ error: 'No puedes cancelar un plan gratuito.' }, { status: 400 });
    }
    
    if (subscription.plan === 'trial') {
      return NextResponse.json({ error: 'La prueba gratuita caduca automáticamente.' }, { status: 400 });
    }

    const effectiveStatus = getEffectiveSubscriptionStatus(subscription, profile);

    if (!['active', 'past_due'].includes(effectiveStatus)) {
      return NextResponse.json({ error: 'No se puede cancelar una suscripción en este estado.' }, { status: 400 });
    }

    const { error: updateError } = await supabaseAdmin
      .from('subscriptions')
      .update({
        cancel_at_period_end: true,
        cancelled_at: new Date().toISOString(),
        cancellation_reason: 'user_requested'
      })
      .eq('id', subscription.id);

    if (updateError) {
      console.error('Error actualizando suscripción:', updateError);
      return NextResponse.json({ error: 'Error al cancelar la suscripción.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Suscripción cancelada correctamente.' });

  } catch (error: unknown) {
    console.error('Cancel subscription error:', error);
    return NextResponse.json({ error: 'Error procesando solicitud.' }, { status: 500 });
  }
}
