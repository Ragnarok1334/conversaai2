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

  const sortedKeys = Object.keys(params).sort();
  let stringToSign = '';
  for (const key of sortedKeys) {
    stringToSign += `${key}${params[key]}`;
  }

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

  const contentType = response.headers.get('content-type') || '';
  const rawText = await response.text();
  let data: unknown = null;

  try {
    data = JSON.parse(rawText);
  } catch {
    const debugInfo = {
      status: response.status,
      statusText: response.statusText,
      contentType,
    };

    console.error('[Flow checkout] Non-JSON response:', debugInfo);

    // Keep diagnostics server-side without persisting provider response bodies,
    // which may contain payment tokens or other sensitive information.
    throw {
      isFlowParseError: true,
      message: 'Flow devolvió una respuesta no válida.',
      debug: {
        flowStatus: response.status,
        contentType,
      }
    };
  }

  if (!response.ok || (typeof data === 'object' && data !== null && 'code' in data && data.code)) {
    const errorCode = typeof data === 'object' && data !== null && 'code' in data ? String(data.code) : undefined;
    console.error('[Flow checkout] Provider rejected request:', {
      status: response.status,
      code: errorCode,
    });
    throw new Error('Flow rechazó la creación del pago.');
  }

  if (typeof data !== 'object' || data === null) {
    throw new Error('Flow devolvió una respuesta de pago inválida.');
  }

  const paymentData = data as Record<string, unknown>;
  if (typeof paymentData.url !== 'string' || typeof paymentData.token !== 'string' || !Number.isFinite(Number(paymentData.flowOrder))) {
    throw new Error('Flow devolvió una respuesta de pago incompleta.');
  }

  return {
    url: paymentData.url,
    token: paymentData.token,
    flowOrder: Number(paymentData.flowOrder)
  };
}

export async function getFlowPaymentStatus(token: string): Promise<FlowPaymentStatus> {
  const apiKey = getEnvVar('FLOW_API_KEY');
  let baseUrl = getEnvVar('FLOW_BASE_URL');

  baseUrl = baseUrl.replace(/\/+$/, '');
  if (!baseUrl.endsWith('/api')) {
    baseUrl = `${baseUrl}/api`;
  }

  const payload: Record<string, string> = {
    apiKey,
    token
  };

  const s = createFlowSignature(payload);
  const queryParams = new URLSearchParams({
    apiKey,
    token,
    s
  });

  const response = await fetch(`${baseUrl}/payment/getStatus?${queryParams.toString()}`);
  const contentType = response.headers.get('content-type') || '';
  const rawText = await response.text();
  let data: unknown = null;

  try {
    data = JSON.parse(rawText);
  } catch {
    console.error('[Flow status] Non-JSON response:', {
      status: response.status,
      contentType,
    });
    throw new Error('Flow devolvió una respuesta inválida al consultar el estado.');
  }

  if (!response.ok || (typeof data === 'object' && data !== null && 'code' in data && data.code)) {
    const errorCode = typeof data === 'object' && data !== null && 'code' in data ? String(data.code) : undefined;
    console.error('[Flow status] Provider rejected request:', {
      status: response.status,
      code: errorCode,
    });
    throw new Error('Error al obtener el estado del pago en Flow.');
  }

  if (typeof data !== 'object' || data === null) {
    throw new Error('Flow devolvió un estado de pago inválido.');
  }

  const statusData = data as Record<string, unknown>;
  if (
    typeof statusData.status !== 'number' ||
    typeof statusData.commerceOrder !== 'string' ||
    typeof statusData.amount !== 'number' ||
    typeof statusData.currency !== 'string' ||
    typeof statusData.subject !== 'string'
  ) {
    throw new Error('Flow devolvió un estado de pago inválido.');
  }

  return statusData as FlowPaymentStatus;
}
