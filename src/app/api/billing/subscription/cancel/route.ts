import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getEffectiveSubscriptionStatus } from '@/lib/billing/subscription-status';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { UserSubscription } from '@/lib/plans';

const SUBSCRIPTION_FIELDS = [
  'id',
  'user_id',
  'plan',
  'status',
  'current_period_start',
  'current_period_end',
  'grace_ends_at',
  'cancel_at_period_end',
  'cancelled_at',
  'cancellation_reason',
].join(',');

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Debes iniciar sesión para cancelar.' }, { status: 401 });
    }

    const supabaseAdmin = createSupabaseAdmin();

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('trial_used, trial_ends_at')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('Error obteniendo perfil para cancelación:', profileError.message);
      return NextResponse.json({ error: 'No se pudo validar la suscripción.' }, { status: 500 });
    }

    const { data: subscriptionData, error } = await supabaseAdmin
      .from('subscriptions')
      .select(SUBSCRIPTION_FIELDS)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error obteniendo suscripción:', error.message);
      return NextResponse.json({ error: 'No se pudo cargar la suscripción.' }, { status: 500 });
    }

    const subscription = subscriptionData as unknown as UserSubscription | null;

    if (!subscription) {
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

    const now = new Date().toISOString();
    const { error: updateError } = await supabaseAdmin
      .from('subscriptions')
      .update({
        cancel_at_period_end: true,
        cancelled_at: now,
        cancellation_reason: 'user_requested',
      })
      .eq('id', subscription.id)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error actualizando suscripción:', updateError.message);
      return NextResponse.json({ error: 'Error al cancelar la suscripción.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Suscripción cancelada correctamente.' });
  } catch (error: unknown) {
    console.error(
      'Cancel subscription error:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    return NextResponse.json({ error: 'Error procesando solicitud.' }, { status: 500 });
  }
}