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
  const apiKey = process.env.FLOW_API_KEY;
  const secretKey = process.env.FLOW_SECRET_KEY;
  let baseUrl = process.env.FLOW_API_URL || process.env.FLOW_BASE_URL;

  if (!apiKey || !secretKey || !baseUrl) {
    throw new Error('Configuración de Flow incompleta. Revisa FLOW_API_KEY, FLOW_SECRET_KEY y FLOW_API_URL.');
  }

  // Normalize baseUrl to ensure it ends with /api
  baseUrl = baseUrl.replace(/\/+$/, '');
  if (!baseUrl.endsWith('/api')) {
    baseUrl = `${baseUrl}/api`;
  }

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
  
  const contentType = response.headers.get("content-type") || "";
  const rawText = await response.text();
  let data: any = null;

  try {
    data = JSON.parse(rawText);
  } catch {
    const debugInfo = {
      flowBaseUrl: baseUrl,
      flowCreateUrl: `${baseUrl}/payment/create`,
      status: response.status,
      statusText: response.statusText,
      contentType,
      preview: rawText.slice(0, 800),
    };
    
    console.error("[Flow checkout debug]", debugInfo);

    // Throwing an object so the route handler can catch it and return it in dev
    // eslint-disable-next-line no-throw-literal
    throw {
      isFlowParseError: true,
      message: 'Flow devolvió una respuesta no válida.',
      debug: {
        flowStatus: response.status,
        contentType,
        preview: rawText.slice(0, 300)
      }
    };
  }
  
  if (!response.ok || data.code) {
    console.error('Flow API Error (createPayment):', data);
    throw new Error(data.message || data.error || 'Flow rechazó la creación del pago.');
  }
  
  return {
    url: data.url,
    token: data.token,
    flowOrder: data.flowOrder
  };
}

export async function getFlowPaymentStatus(token: string): Promise<FlowPaymentStatus> {
  const apiKey = getEnvVar('FLOW_API_KEY');
  let baseUrl = getEnvVar('FLOW_BASE_URL');

  // Normalize baseUrl to ensure it ends with /api
  baseUrl = baseUrl.replace(/\/+$/, '');
  if (!baseUrl.endsWith('/api')) {
    baseUrl = `${baseUrl}/api`;
  }
  
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
  const contentType = response.headers.get("content-type") || "";
  const rawText = await response.text();
  let data: any = null;

  try {
    data = JSON.parse(rawText);
  } catch {
    console.error("[Flow status] Non JSON response:", {
      status: response.status,
      contentType,
      preview: rawText.slice(0, 500),
    });
    throw new Error('Flow devolvió una respuesta inválida al consultar el estado.');
  }
  
  if (!response.ok || data.code) {
    console.error('Flow API Error (getStatus):', data);
    throw new Error(data.message || data.error || 'Error al obtener el estado del pago en Flow');
  }
  
  return data;
}
