/**
 * Flow Payment Provider
 * 
 * Wrapper sobre la lógica Flow existente.
 * NO cambia comportamiento — solo adapta a la interfaz PaymentProvider.
 */

import { createFlowPayment, getFlowPaymentStatus } from '@/lib/flow';
import type {
  PaymentProvider,
  PaymentCreationParams,
  PaymentCreationResult,
  PaymentVerificationParams,
  PaymentVerificationResult,
} from '../payment-provider';

export class FlowProvider implements PaymentProvider {
  readonly name = 'flow';

  async createPayment(params: PaymentCreationParams): Promise<PaymentCreationResult> {
    // Llama a la lógica Flow existente sin modificarla
    const flowResponse = await createFlowPayment({
      commerceOrder: params.orderId,
      subject: params.subject,
      currency: params.currency,
      amount: params.amount,
      email: params.userEmail,
      urlConfirmation: params.urlConfirmation,
      urlReturn: params.urlReturn,
    });

    return {
      paymentUrl: `${flowResponse.url}?token=${flowResponse.token}`,
      providerData: {
        token: flowResponse.token,
        flowOrder: flowResponse.flowOrder,
        url: flowResponse.url,
      },
    };
  }

  async verifyPayment(params: PaymentVerificationParams): Promise<PaymentVerificationResult> {
    // Llama a la lógica Flow existente sin modificarla
    const flowStatus = await getFlowPaymentStatus(params.token);

    // Mapea estados Flow (2=paid, 3=rejected, 4=cancelled) a estados comunes
    let status: 'paid' | 'pending' | 'rejected' | 'cancelled' = 'pending';
    if (flowStatus.status === 2) status = 'paid';
    else if (flowStatus.status === 3) status = 'rejected';
    else if (flowStatus.status === 4) status = 'cancelled';

    return {
      status,
      amount: flowStatus.amount,
      currency: flowStatus.currency,
      orderId: flowStatus.commerceOrder,
      rawData: flowStatus as Record<string, unknown>,
    };
  }
}
