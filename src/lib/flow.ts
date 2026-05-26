import crypto from 'crypto';

function getEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Environment variable ${name} is missing.`);
  }
  return value;
}

export interface FlowPaymentParams {
  commerceOrder: string;
  subject: string;
  currency: string;
  amount: number;
  email: string;
  urlConfirmation: string;
  urlReturn: string;
}

export interface FlowPaymentResponse {
  url: string;
  token: string;
  flowOrder: number;
}

export interface FlowPaymentStatus {
  status: number;
  paymentData?: Record<string, unknown>;
  commerceOrder: string;
  amount: number;
  currency: string;
  subject: string;
  [key: string]: unknown;
}

export function createFlowSignature(params: Record<string, string>): string {
  const secretKey = getEnvVar('FLOW_SECRET_KEY');
  
  // 1. Sort keys alphabetically
  const sortedKeys = Object.keys(params).sort();
  
  // 2. Concatenate key + value
  let stringToSign = '';
  for (const key of sortedKeys) {
    stringToSign += `${key}${params[key]}`;
  }
  
  // 3. Create HMAC SHA256
  const hmac = crypto.createHmac('sha256', secretKey);
  hmac.update(stringToSign);
  return hmac.digest('hex');
}

export async function createFlowPayment(params: FlowPaymentParams): Promise<FlowPaymentResponse> {
  if (!process.env.FLOW_API_KEY || !process.env.FLOW_SECRET_KEY || !process.env.FLOW_BASE_URL) {
    throw new Error('Faltan credenciales de Flow Sandbox.');
  }

  const apiKey = getEnvVar('FLOW_API_KEY');
  const baseUrl = getEnvVar('FLOW_BASE_URL');
  
  const payload: Record<string, string> = {
    apiKey,
    commerceOrder: params.commerceOrder,
    subject: params.subject,
    currency: params.currency,
    amount: params.amount.toString(),
    email: params.email,
    urlConfirmation: params.urlConfirmation,
    urlReturn: params.urlReturn,
  };

  if (process.env.NODE_ENV === 'development') {
    console.log('Flow API Config:', {
      flowBaseUrl: process.env.FLOW_BASE_URL,
      endpoint: `${process.env.FLOW_BASE_URL}/payment/create`,
      hasApiKey: Boolean(process.env.FLOW_API_KEY),
      hasSecretKey: Boolean(process.env.FLOW_SECRET_KEY),
      appUrl: process.env.NEXT_PUBLIC_APP_URL,
      amount: params.amount,
      commerceOrder: params.commerceOrder,
      subject: params.subject,
      currency: params.currency,
      email: params.email,
      urlConfirmation: params.urlConfirmation,
      urlReturn: params.urlReturn
    });
  }
  
  const s = createFlowSignature(payload);
  payload.s = s;
  
  const bodyParams = new URLSearchParams(payload);
  
  const response = await fetch(`${baseUrl}/payment/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: bodyParams.toString()
  });
  
  const data = await response.json();
  
  if (!response.ok || data.code) {
    console.error('Flow API Error (createPayment):', data);
    throw new Error(data.message || 'Error al crear el pago en Flow');
  }
  
  return {
    url: data.url,
    token: data.token,
    flowOrder: data.flowOrder
  };
}

export async function getFlowPaymentStatus(token: string): Promise<FlowPaymentStatus> {
  const apiKey = getEnvVar('FLOW_API_KEY');
  const baseUrl = getEnvVar('FLOW_BASE_URL');
  
  const payload: Record<string, string> = {
    apiKey,
    token
  };
  
  const s = createFlowSignature(payload);
  
  // Flow getStatus is a GET request with query params
  const queryParams = new URLSearchParams({
    apiKey,
    token,
    s
  });
  
  const response = await fetch(`${baseUrl}/payment/getStatus?${queryParams.toString()}`);
  const data = await response.json();
  
  if (!response.ok || data.code) {
    console.error('Flow API Error (getStatus):', data);
    throw new Error(data.message || 'Error al obtener el estado del pago en Flow');
  }
  
  return data;
}
