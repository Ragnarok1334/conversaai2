import { NextResponse } from 'next/server';
import { FlowProvider } from '@/lib/billing/providers/flow';
import { HttpInputError } from '@/lib/http-security';
import { prepareCheckout, recordPayment } from '@/lib/billing/checkout-service';

const paymentProvider = new FlowProvider();

export async function POST(req: Request) {
  let commerceOrder = '';
  let planKey = '';
  let amount = 0;

  try {
    const flowApiKey = process.env.FLOW_API_KEY;
    const flowSecretKey = process.env.FLOW_SECRET_KEY;
    const flowBaseUrl = process.env.FLOW_BASE_URL;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://conversaai.store';

    // Valida credenciales Flow ANTES de crear el checkout (no se han extraído a service por ser provider-específicas)
    if (!flowApiKey || !flowSecretKey || !flowBaseUrl || !appUrl) {
      return NextResponse.json({ error: 'Faltan variables de entorno del servidor (Supabase Admin o Flow).' }, { status: 500 });
    }

    // ── CHECKOUT COMÚN (autenticación, email, rate limit, plan, precio, idempotency lookup) ──
    const prepared = await prepareCheckout(req, { provider: 'flow' });

    planKey = prepared.planKey;
    amount = prepared.amount;
    commerceOrder = `ord_${Date.now()}_${prepared.user.id.slice(0, 8)}`;

    // Si ya existe un pago pendiente con esta idempotency_key, devolverlo sin crear nuevo
    if (prepared.existingPayment) {
      return NextResponse.json(prepared.existingPayment);
    }

    const {
      user,
      config: _config, // disponible para uso futuro, no requerido por Flow
      idempotencyKey,
      expiresAt,
      supabaseAdmin: supabaseAdminInsert,
    } = prepared;
    void _config;

    // ── CREAR PAGO EN FLOW (provider-específico: se queda en route) ──────────────────
    const paymentResult = await paymentProvider.createPayment({
      userId: user.id,
      userEmail: user.email!,
      plan: planKey,
      amount,
      currency: 'CLP',
      orderId: commerceOrder,
      subject: `ConversaAI ${planKey}`,
      urlConfirmation: `${appUrl}/api/billing/flow/webhook`,
      urlReturn: `${appUrl}/dashboard/billing?payment=success&order=${commerceOrder}`,
    });

    const flowToken = (paymentResult.providerData.token as string) || '';
    const flowOrder = (paymentResult.providerData.flowOrder as string) || commerceOrder;

    // ── PERSISTIR (común: delega al service) ─────────────────────────────────────────
    const result = await recordPayment({
      supabaseAdmin: supabaseAdminInsert,
      userId: user.id,
      provider: 'flow',
      providerToken: flowToken,
      providerOrderId: commerceOrder,
      idempotencyKey,
      expiresAt,
      planKey,
      amount,
      currency: 'CLP',
      rawResponse: { url: paymentResult.paymentUrl, ...paymentResult.providerData },
      flowToken,
      flowOrder,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error!.message, details: result.error!.details },
        { status: 500 },
      );
    }

    // Caso 23505 carrera: otro request ganó primero → devolver el existente
    if (result.conflict) {
      return NextResponse.json(result.conflict);
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('billing_payments insert success:', {
        commerceOrder,
        hasToken: Boolean(flowToken),
        idempotencyKey,
        expiresAt,
      });
    }

    return NextResponse.json({ url: paymentResult.paymentUrl });

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
