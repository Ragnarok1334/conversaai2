/**
 * Payment Provider Abstraction
 * 
 * Interfaz mínima común para proveedores de pago.
 * NO agrega funcionalidad nueva — solo envuelve la lógica existente.
 */

export interface PaymentCreationParams {
  userId: string;
  userEmail: string;
  plan: string;
  amount: number;
  currency: string;
  orderId: string;
  subject: string;
  urlConfirmation: string;
  urlReturn: string;
}

export interface PaymentCreationResult {
  paymentUrl: string;
  providerData: Record<string, unknown>;
}

export interface PaymentVerificationParams {
  token: string;
}

export interface PaymentVerificationResult {
  status: 'paid' | 'pending' | 'rejected' | 'cancelled';
  amount: number;
  currency: string;
  orderId: string;
  rawData: Record<string, unknown>;
}

/**
 * PaymentProvider interface
 * 
 * Métodos mínimos iniciales:
 * - createPayment: Crea un pago en el proveedor externo
 * - verifyPayment: Verifica el estado de un pago
 */
export interface PaymentProvider {
  readonly name: string;
  
  createPayment(params: PaymentCreationParams): Promise<PaymentCreationResult>;
  
  verifyPayment(params: PaymentVerificationParams): Promise<PaymentVerificationResult>;
}
