import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/security';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Debes iniciar sesión para activar la prueba gratis.' }, { status: 401 });
    }

    const ip = (req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown').slice(0, 128);
    const allowed = await checkRateLimit(`trial-${user.id}-${ip}`, 'trial_start', 5, 3600);
    if (!allowed) {
      return NextResponse.json({ error: 'Demasiados intentos. Intenta nuevamente más tarde.' }, { status: 429 });
    }

    const { data, error } = await supabase.rpc('activate_trial', { p_user_id: user.id });

    if (error) {
      console.error('[Trial Start] RPC error:', error.message);
      return NextResponse.json({ error: 'No se pudo activar la prueba gratis.' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'La prueba gratis no está disponible para esta cuenta.' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Prueba gratis activada correctamente.' });
  } catch (error: unknown) {
    console.error('[Trial Start] Error:', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json({ error: 'Ocurrió un error al activar la prueba gratis.' }, { status: 500 });
  }
}
