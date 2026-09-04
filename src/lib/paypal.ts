const PAYPAL_TIMEOUT_MS = 10_000;
const SANDBOX_API = 'https://api-m.sandbox.paypal.com';
const LIVE_API = 'https://api-m.paypal.com';

type PayPalMode = 'sandbox' | 'live';

function getMode(): PayPalMode { return process.env.PAYPAL_MODE === 'live' ? 'live' : 'sandbox'; }
function getApiBase(): string { return getMode() === 'live' ? LIVE_API : SANDBOX_API; }
function getCredentials() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('Faltan credenciales de PayPal.');
  return { clientId, clientSecret };
}
async function paypalFetch(path: string, init: RequestInit = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PAYPAL_TIMEOUT_MS);
  try { return await fetch(`${getApiBase()}${path}`, { ...init, signal: controller.signal }); }
  finally { clearTimeout(timeout); }
}
async function getAccessToken(): Promise<string> {
  const { clientId, clientSecret } = getCredentials();
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const response = await paypalFetch('/v1/oauth2/token', { method: 'POST', headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' }, body: 'grant_type=client_credentials' });
  if (!response.ok) throw new Error(`PayPal OAuth HTTP ${response.status}`);
  const data: unknown = await response.json();
  if (!data || typeof data !== 'object' || typeof (data as { access_token?: unknown }).access_token !== 'string') throw new Error('PayPal no devolvió un access token válido.');
  return (data as { access_token: string }).access_token;
}
async function authorizedFetch(path: string, init: RequestInit = {}) {
  const token = await getAccessToken();
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  headers.set('Accept', 'application/json');
  return paypalFetch(path, { ...init, headers });
}
export interface PayPalOrderResult { id: string; status: string; links?: Array<{ href: string; rel: string; method?: string }>; purchase_units?: unknown[]; }
async function parsePayPalJson(response: Response): Promise<unknown> {
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`PayPal API HTTP ${response.status}`);
  return data;
}
export async function createPayPalOrder(input: { amountCents: number; plan: string; referenceId: string; returnUrl: string; cancelUrl: string }): Promise<PayPalOrderResult> {
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) throw new Error('Monto PayPal inválido.');
  if (!/^[a-z0-9_-]{1,32}$/i.test(input.plan)) throw new Error('Plan PayPal inválido.');
  if (input.referenceId.length < 1 || input.referenceId.length > 108) throw new Error('Referencia PayPal inválida.');
  const response = await authorizedFetch('/v2/checkout/orders', { method: 'POST', headers: { 'Content-Type': 'application/json', 'PayPal-Request-Id': input.referenceId }, body: JSON.stringify({ intent: 'CAPTURE', purchase_units: [{ reference_id: input.plan, description: `ConversaAI ${input.plan} - Suscripción mensual`, amount: { currency_code: 'USD', value: (input.amountCents / 100).toFixed(2) } }], application_context: { brand_name: 'ConversaAI', user_action: 'PAY_NOW', shipping_preference: 'NO_SHIPPING', return_url: input.returnUrl, cancel_url: input.cancelUrl } }) });
  const data = await parsePayPalJson(response);
  if (!data || typeof data !== 'object') throw new Error('Respuesta PayPal inválida.');
  const order = data as PayPalOrderResult;
  if (typeof order.id !== 'string' || typeof order.status !== 'string') throw new Error('PayPal devolvió una orden incompleta.');
  return order;
}
export async function getPayPalOrder(orderId: string): Promise<PayPalOrderResult> {
  if (!/^[A-Z0-9-]{8,64}$/i.test(orderId)) throw new Error('ID de orden PayPal inválido.');
  const response = await authorizedFetch(`/v2/checkout/orders/${encodeURIComponent(orderId)}`);
  const data = await parsePayPalJson(response);
  if (!data || typeof data !== 'object') throw new Error('Respuesta PayPal inválida.');
  const order = data as PayPalOrderResult;
  if (typeof order.id !== 'string' || typeof order.status !== 'string') throw new Error('PayPal devolvió una orden incompleta.');
  return order;
}
export async function capturePayPalOrder(orderId: string): Promise<PayPalOrderResult> {
  if (!/^[A-Z0-9-]{8,64}$/i.test(orderId)) throw new Error('ID de orden PayPal inválido.');
  const response = await authorizedFetch(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'PayPal-Request-Id': orderId }, body: '{}' });
  try {
    const data = await parsePayPalJson(response);
    if (!data || typeof data !== 'object') throw new Error('Respuesta PayPal inválida.');
    const order = data as PayPalOrderResult;
    if (typeof order.id !== 'string' || typeof order.status !== 'string') throw new Error('PayPal devolvió una captura incompleta.');
    return order;
  } catch (error) {
    // PayPal documents that a simultaneous duplicate request with the same
    // idempotency key may fail. Reconcile with its authoritative order state
    // before treating the capture as failed.
    const current = await getPayPalOrder(orderId).catch(() => null);
    if (current?.status === 'COMPLETED') return current;
    throw error;
  }
}
export async function verifyPayPalWebhook(input: { rawBody: string; transmissionId: string; transmissionTime: string; certUrl: string; authAlgo: string; transmissionSig: string; webhookId: string }): Promise<boolean> {
  const fields = [input.transmissionId, input.transmissionTime, input.certUrl, input.authAlgo, input.transmissionSig, input.webhookId];
  if (fields.some((value) => !value || value.length > 4096)) return false;
  try { JSON.parse(input.rawBody); } catch { return false; }
  const verificationBody = `{"auth_algo":${JSON.stringify(input.authAlgo)},"cert_url":${JSON.stringify(input.certUrl)},"transmission_id":${JSON.stringify(input.transmissionId)},"transmission_sig":${JSON.stringify(input.transmissionSig)},"transmission_time":${JSON.stringify(input.transmissionTime)},"webhook_id":${JSON.stringify(input.webhookId)},"webhook_event":${input.rawBody}}`;
  const response = await authorizedFetch('/v1/notifications/verify-webhook-signature', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: verificationBody });
  const data: unknown = await response.json().catch(() => null);
  return response.ok && !!data && typeof data === 'object' && (data as { verification_status?: unknown }).verification_status === 'SUCCESS';
}
