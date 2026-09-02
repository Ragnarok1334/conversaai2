import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Debes iniciar sesión para activar la prueba gratis.' }, { status: 401 });
    }

    const supabaseAdmin = createSupabaseAdmin();
    const { data, error } = await supabaseAdmin.rpc('activate_trial', { p_user_id: user.id });

    if (error) {
      console.error('[Trial Start] RPC error:', error);
      return NextResponse.json({ error: 'No se pudo activar la prueba gratis.' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'La prueba gratis no está disponible para esta cuenta.' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Prueba gratis activada correctamente.' });
  } catch (error: unknown) {
    console.error('[Trial Start] Error:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Ocurrió un error al activar la prueba gratis.' }, { status: 500 });
  }
}
