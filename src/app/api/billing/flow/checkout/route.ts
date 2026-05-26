import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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
  // Declare supabase outside so we can use it in catch block for cleanup
  const supabase = await createClient();

  try {
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

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://conversaai.store';

    // Create billing_payments pending record
    const { error: insertError } = await supabase
      .from('billing_payments')
      .insert({
        user_id: user.id,
        provider: 'flow',
        flow_order: commerceOrder,
        plan: plan,
        amount: amount,
        currency: 'CLP',
        status: 'pending'
      });

    if (insertError) {
      console.error('Error insertando en billing_payments:', insertError);
    }

    // Call Flow Sandbox
    const flowResponse = await createFlowPayment({
      commerceOrder,
      subject: `Plan ${plan.toUpperCase()} - ConversaAI`,
      currency: 'CLP',
      amount,
      email: user.email || 'usuario@conversaai.store',
      urlConfirmation: `${appUrl}/api/webhooks/flow`,
      urlReturn: `${appUrl}/api/billing/flow/return`
    });

    // Update token
    await supabase
      .from('billing_payments')
      .update({ flow_token: flowResponse.token })
      .eq('flow_order', commerceOrder);

    return NextResponse.json({
      url: `${flowResponse.url}?token=${flowResponse.token}`
    });

  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : String(error);
    console.error('Flow Checkout Error:', errMessage);
    
    // Cleanup pending payment if we failed
    if (commerceOrder) {
      await supabase
        .from('billing_payments')
        .update({ 
          status: 'failed', 
          raw_response: { error: errMessage } 
        })
        .eq('flow_order', commerceOrder);
    }
    
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
