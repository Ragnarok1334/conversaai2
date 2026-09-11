import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { getPlanConfig } from '@/lib/plans';

const NEW_ACCOUNT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Debes iniciar sesión para activar la prueba.' }, { status: 401 });
    }

    const accountCreatedAt = Date.parse(user.created_at);
    if (!Number.isFinite(accountCreatedAt) || Date.now() - accountCreatedAt > NEW_ACCOUNT_WINDOW_MS) {
      return NextResponse.json({ error: 'La prueba de 7 días está disponible durante los primeros 7 días desde el registro.' }, { status: 403 });
    }

    const supabaseAdmin = createSupabaseAdmin();

    // 1. Fetch user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('trial_used')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'No se pudo obtener el perfil del usuario.' }, { status: 500 });
    }

    if (profile.trial_used) {
      return NextResponse.json({ error: 'La prueba ya ha sido utilizada.' }, { status: 400 });
    }

    // 2. Fetch current subscription
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('plan, status')
      .eq('user_id', user.id)
      .single();

    if (subscription && subscription.status === 'active' && subscription.plan !== 'trial' && subscription.plan !== 'free') {
      return NextResponse.json({ error: 'Ya tienes un plan activo. La prueba solo está disponible para cuentas nuevas sin plan.' }, { status: 400 });
    }

    const trialConfig = getPlanConfig('trial');
    const trialStart = new Date();
    const trialEnd = new Date(trialStart);
    trialEnd.setDate(trialEnd.getDate() + 7);

    // 3. Update Profile to set trial_used = true
    const { error: updateProfileError } = await supabaseAdmin
      .from('profiles')
      .update({
        trial_used: true,
        trial_started_at: trialStart.toISOString(),
        trial_ends_at: trialEnd.toISOString(),
      })
      .eq('id', user.id);

    if (updateProfileError) {
      console.error('Error updating profile trial status:', updateProfileError);
      return NextResponse.json({ error: 'No se pudo activar la prueba en tu perfil.' }, { status: 500 });
    }

    // 4. Update or Insert Subscription
    if (subscription) {
      const { error: subUpdateError } = await supabaseAdmin
        .from('subscriptions')
        .update({
          plan: 'trial',
          status: 'active',
          assistants_limit: trialConfig.limits.assistants,
          messages_limit: trialConfig.limits.messagesPerMonth,
          current_messages_used: 0,
        })
        .eq('user_id', user.id);
        
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
        });
        
      if (subInsertError) throw subInsertError;
    }

    return NextResponse.json({ success: true, message: 'Prueba de 7 días activada correctamente.' });

  } catch (error: unknown) {
    console.error('Trial Start Error:', error);
    return NextResponse.json({ error: 'Ocurrió un error al activar la prueba.' }, { status: 500 });
  }
}
