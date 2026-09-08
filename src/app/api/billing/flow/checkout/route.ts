import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { createFlowPayment } from '@/lib/flow';
import { getPlanConfig, normalizePlan } from '@/lib/plans';
import { getClientIp, HttpInputError, readJsonBody } from '@/lib/http-security';
import { checkRateLimit } from '@/lib/security';

export async function POST(req: Request) {
  let commerceOrder = '';
  let planKey = '';
  let amount = 0;

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const flowApiKey = process.env.FLOW_API_KEY;
    const flowSecretKey = process.env.FLOW_SECRET_KEY;
    const flowBaseUrl = process.env.FLOW_BASE_URL;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://conversaai.store';

    if (!supabaseUrl || !serviceRoleKey || !flowApiKey || !flowSecretKey || !flowBaseUrl || !appUrl) {
      return NextResponse.json({ error: 'Faltan variables de entorno del servidor (Supabase Admin o Flow).' }, { status: 500 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Debes iniciar sesión para activar un plan.' }, { status: 401 });
    }

    if (!user.email || !user.email_confirmed_at) {
      return NextResponse.json({ error: 'Debes verificar tu correo antes de pagar.' }, { status: 403 });
    }

    const ip = getClientIp(req);
    const [userAllowed, ipAllowed] = await Promise.all([
      checkRateLimit(`flow-checkout-user-${user.id}`, 'flow-checkout-user', 5, 3600),
      checkRateLimit(`flow-checkout-ip-${ip}`, 'flow-checkout-ip', 10, 3600),
    ]);
    if (!userAllowed || !ipAllowed) {
      return NextResponse.json({ error: 'Demasiados intentos de pago. Intenta nuevamente más tarde.' }, { status: 429 });
    }

    const body = await readJsonBody<{ plan?: unknown }>(req, 2_048);
    if (typeof body.plan !== 'string' || body.plan.length > 32) {
      return NextResponse.json({ error: 'Plan no válido.' }, { status: 400 });
    }
    planKey = normalizePlan(body.plan);

    if (planKey === 'trial' || body.plan === 'free') {
      return NextResponse.json({ error: 'La prueba gratis no requiere pago.' }, { status: 400 });
    }

    if (planKey === 'enterprise') {
      return NextResponse.json({ error: 'Enterprise requiere contacto comercial.' }, { status: 400 });
    }

    const allowedPlans = ['starter', 'pro', 'growth', 'business'];
    if (!allowedPlans.includes(planKey)) {
      return NextResponse.json({ error: 'Plan no válido para checkout automático.' }, { status: 400 });
    }

    const config = getPlanConfig(planKey);
    if (!config.priceCLP || config.priceCLP <= 0) {
      return NextResponse.json({ error: 'Precio del plan no configurado.' }, { status: 500 });
    }

    amount = config.priceCLP;
    
    // Create unique order ID
    const shortId = user.id.split('-')[0];
    const timestamp = Date.now();
    commerceOrder = `conversaai-${shortId}-${planKey}-${timestamp}`;

    // 1. Call Flow Sandbox FIRST
    const flowResponse = await createFlowPayment({
      commerceOrder,
      subject: `ConversaAI ${config.label} - Suscripción mensual`,
      currency: 'CLP',
      amount,
      email: user.email,
      urlConfirmation: `${appUrl}/api/webhooks/flow`,
      urlReturn: `${appUrl}/api/billing/flow/return`
    });

    if (process.env.NODE_ENV === 'development') {
      console.log("Flow payment created:", {
        hasUrl: Boolean(flowResponse.url),
        hasToken: Boolean(flowResponse.token),
        commerceOrder,
        plan: planKey,
        amount,
      });
    }

    // 2. ONLY if successful, insert into billing_payments using admin client
    const supabaseAdmin = createSupabaseAdmin();
    const { error: paymentInsertError } = await supabaseAdmin
      .from("billing_payments")
      .insert({
        user_id: user.id,
        provider: "flow",
        flow_token: flowResponse.token,
        flow_order: commerceOrder,
        plan: planKey,
        amount,
        currency: "CLP",
        status: "pending",
        raw_response: flowResponse,
      });

    if (paymentInsertError) {
      console.error("billing_payments insert error:", paymentInsertError);
      return NextResponse.json(
        {
          error: "Flow creó el pago, pero no se pudo guardar en el sistema.",
          details:
            process.env.NODE_ENV === "development"
              ? paymentInsertError.message
              : undefined,
        },
        { status: 500 }
      );
    }

    if (process.env.NODE_ENV === 'development') {
      console.log("billing_payments insert success:", {
        commerceOrder,
        hasToken: Boolean(flowResponse.token),
      });
    }

    return NextResponse.json({
      url: `${flowResponse.url}?token=${flowResponse.token}`
    });

  } catch (error: unknown) {
    if (error instanceof HttpInputError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error && typeof error === 'object' && 'isFlowParseError' in error) {
      const flowError = error as { message?: string; debug?: unknown };
      return NextResponse.json({
        error: flowError.message || 'Flow devolvió una respuesta no válida.',
        debug: process.env.NODE_ENV === 'development' ? flowError.debug : undefined
      }, { status: 500 });
    }

    const errMessage = error instanceof Error ? error.message : String(error);
    console.error('Flow Checkout Error:', errMessage);
    
    let userFriendlyMessage = 'Ocurrió un error al procesar el pago con Flow.';
    let details: string | undefined = undefined;
    let statusCode = 500;
    let flowCode: number | undefined = undefined;

    if (errMessage.includes('No services available') || errMessage.includes('105')) {
      userFriendlyMessage = 'No hay medios de pago disponibles en tu cuenta Flow Sandbox.';
      statusCode = 400;
      flowCode = 105;
      
      details = 'Revisa en Flow Sandbox que tu cuenta tenga medios de pago habilitados.';
    } else if (errMessage.includes('Faltan credenciales')) {
      userFriendlyMessage = 'Faltan variables de entorno de Flow.';
      statusCode = 400;
    }

    if (process.env.NODE_ENV === 'development') {
      console.error('Flow Error Logs:', {
        message: errMessage,
        code: flowCode,
        plan: planKey,
        amount,
      });
    }

    return NextResponse.json({ 
      error: userFriendlyMessage,
      ...(flowCode ? { code: flowCode } : {}),
      ...(details ? { details } : {})
    }, { status: statusCode });
  }
}
