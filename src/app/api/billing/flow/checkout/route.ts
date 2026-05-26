import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { createFlowPayment } from '@/lib/flow';

const PRICES = {
  pro: 19000,
  business: 49000
} as const;

type Plan = keyof typeof PRICES;

function isValidPlan(plan: unknown): plan is Plan {
  return typeof plan === 'string' && plan in PRICES;
}

export async function POST(req: Request) {
  let commerceOrder = '';
  let plan = '';
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

    const body = await req.json();
    plan = body.plan;

    if (!isValidPlan(plan)) {
      return NextResponse.json({ error: 'Plan inválido. Debe ser pro o business.' }, { status: 400 });
    }

    amount = PRICES[plan as Plan];
    
    // Create unique order ID
    const shortId = user.id.split('-')[0];
    const timestamp = Date.now();
    commerceOrder = `conversaai-${shortId}-${plan}-${timestamp}`;

    // 1. Call Flow Sandbox FIRST
    const flowResponse = await createFlowPayment({
      commerceOrder,
      subject: `Plan ${plan.toUpperCase()} - ConversaAI`,
      currency: 'CLP',
      amount,
      email: user.email || 'usuario@conversaai.store',
      urlConfirmation: `${appUrl}/api/webhooks/flow`,
      urlReturn: `${appUrl}/api/billing/flow/return`
    });

    if (process.env.NODE_ENV === 'development') {
      console.log("Flow payment created:", {
        hasUrl: Boolean(flowResponse.url),
        hasToken: Boolean(flowResponse.token),
        commerceOrder,
        plan,
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
        plan,
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
      
      details = 'Revisa en Flow Sandbox que tu cuenta tenga medios de pago habilitados. También confirma que FLOW_API_KEY y FLOW_SECRET_KEY sean de sandbox y que FLOW_BASE_URL sea https://sandbox.flow.cl/api.';
    } else if (errMessage.includes('Faltan credenciales')) {
      userFriendlyMessage = 'Faltan variables de entorno de Flow.';
      statusCode = 400;
    }

    if (process.env.NODE_ENV === 'development') {
      console.error('Flow Error Logs:', {
        message: errMessage,
        code: flowCode,
        endpoint: 'https://sandbox.flow.cl/api/payment/create',
        plan,
        amount,
        urlReturn: `${process.env.NEXT_PUBLIC_APP_URL || 'https://conversaai.store'}/api/billing/flow/return`,
        urlConfirmation: `${process.env.NEXT_PUBLIC_APP_URL || 'https://conversaai.store'}/api/webhooks/flow`
      });
    }

    return NextResponse.json({ 
      error: userFriendlyMessage,
      ...(flowCode ? { code: flowCode } : {}),
      ...(details ? { details } : {})
    }, { status: statusCode });
  }
}
