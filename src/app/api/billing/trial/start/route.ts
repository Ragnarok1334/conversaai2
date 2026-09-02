import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { getPlanConfig } from '@/lib/plans';

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Debes iniciar sesión para activar la prueba gratis.' }, { status: 401 });
    }

    const supabaseAdmin = createSupabaseAdmin();
    const trialConfig = getPlanConfig('trial');
    const trialStart = new Date();
    const trialEnd = new Date(trialStart);
    trialEnd.setDate(trialEnd.getDate() + 7);

    // Claim the trial atomically. Two concurrent requests cannot both activate it.
    const { data: claimedProfile, error: claimError } = await supabaseAdmin
      .from('profiles')
      .update({
        trial_used: true,
        trial_started_at: trialStart.toISOString(),
        trial_ends_at: trialEnd.toISOString(),
      })
      .eq('id', user.id)
      .eq('trial_used', false)
      .select('id')
      .maybeSingle();

    if (claimError) {
      console.error('Error claiming trial:', claimError);
      return NextResponse.json({ error: 'No se pudo activar la prueba gratis.' }, { status: 500 });
    }

    if (!claimedProfile) {
      return NextResponse.json({ error: 'La prueba gratis ya ha sido utilizada.' }, { status: 400 });
    }

    // Re-check the current subscription after atomically claiming the trial.
    const { data: subscription, error: subscriptionError } = await supabaseAdmin
      .from('subscriptions')
      .select('id, plan, status')
      .eq('user_id', user.id)
      .single();

    if (subscriptionError && subscriptionError.code !== 'PGRST116') {
      console.error('Error fetching subscription:', subscriptionError);
      return NextResponse.json({ error: 'No se pudo verificar tu suscripción.' }, { status: 500 });
    }

    if (subscription && subscription.status === 'active' && subscription.plan !== 'trial' && subscription.plan !== 'free') {
      // Roll back the claim because the user already has a paid/active plan.
      await supabaseAdmin
        .from('profiles')
        .update({
          trial_used: false,
          trial_started_at: null,
          trial_ends_at: null,
        })
        .eq('id', user.id)
        .eq('trial_used', true);

      return NextResponse.json({ error: 'Ya tienes un plan activo. La prueba gratis solo está disponible para nuevos usuarios sin plan.' }, { status: 400 });
    }

    if (subscription) {
      const { error: subUpdateError } = await supabaseAdmin
        .from('subscriptions')
        .update({
          plan: 'trial',
          status: 'active',
          assistants_limit: trialConfig.limits.assistants,
          messages_limit: trialConfig.limits.messagesPerMonth,
          current_messages_used: 0,
          current_period_start: trialStart.toISOString(),
          current_period_end: trialEnd.toISOString(),
          cancel_at_period_end: false,
          cancelled_at: null,
          cancellation_reason: null,
        })
        .eq('id', subscription.id);

      if (subUpdateError) throw subUpdateError;
    } else {
      const { error: subInsertError } = await supabaseAdmin
        .from('subscriptions')
        .insert({
          user_id: user.id,
          plan: 'trial',
          status: 'active',
          assistants_limit: trialConfig.limits.assistants,
          messages_limit: trialConfig.limits.messagesPerMonth,
          current_messages_used: 0,
          current_period_start: trialStart.toISOString(),
          current_period_end: trialEnd.toISOString(),
          cancel_at_period_end: false,
          cancelled_at: null,
          cancellation_reason: null,
        });

      if (subInsertError) throw subInsertError;
    }

    return NextResponse.json({ success: true, message: 'Prueba gratis activada correctamente.' });
  } catch (error: unknown) {
    console.error('Trial Start Error:', error);
    return NextResponse.json({ error: 'Ocurrió un error al activar la prueba gratis.' }, { status: 500 });
  }
}
