import { timingSafeEqual } from 'node:crypto'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const VISITOR_ID_RE = /^vis_[a-z0-9_-]{8,80}$/i

export class HttpInputError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message)
  }
}

export async function readJsonBody<T>(request: Request, maxBytes = 32_768): Promise<T> {
  const contentType = request.headers.get('content-type')?.toLowerCase() || ''
  if (!contentType.startsWith('application/json')) {
    throw new HttpInputError('Content-Type debe ser application/json.', 415)
  }

  const declaredLength = Number(request.headers.get('content-length') || 0)
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new HttpInputError('La solicitud es demasiado grande.', 413)
  }

  if (!request.body) throw new HttpInputError('La solicitud no contiene datos.')

  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > maxBytes) {
      await reader.cancel()
      throw new HttpInputError('La solicitud es demasiado grande.', 413)
    }
    chunks.push(value)
  }

  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }

  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as T
  } catch {
    throw new HttpInputError('El cuerpo JSON no es válido.')
  }
}

export async function readUrlEncodedBody(request: Request, maxBytes = 4_096): Promise<URLSearchParams> {
  const contentType = request.headers.get('content-type')?.toLowerCase() || ''
  if (!contentType.startsWith('application/x-www-form-urlencoded')) {
    throw new HttpInputError('Content-Type debe ser application/x-www-form-urlencoded.', 415)
  }

  const declaredLength = Number(request.headers.get('content-length') || 0)
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new HttpInputError('La solicitud es demasiado grande.', 413)
  }

  const reader = request.body?.getReader()
  if (!reader) throw new HttpInputError('La solicitud no contiene datos.')

  const chunks: Uint8Array[] = []
  let total = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > maxBytes) {
      await reader.cancel()
      throw new HttpInputError('La solicitud es demasiado grande.', 413)
    }
    chunks.push(value)
  }

  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new URLSearchParams(new TextDecoder().decode(bytes))
}

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value)
}

export function isVisitorId(value: unknown): value is string {
  return typeof value === 'string' && VISITOR_ID_RE.test(value)
}

export function parseBoundedInteger(
  value: string | null,
  fallback: number,
  min: number,
  max: number
): number {
  if (!value || !/^\d+$/.test(value)) return fallback
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback
}

export function normalizeSearchTerm(value: string | null, maxLength = 100): string {
  if (!value) return ''
  return value
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}@+._\- ]/gu, '')
    .trim()
    .slice(0, maxLength)
}

export function getClientIp(request: Request): string {
  const raw = request.headers.get('x-forwarded-for')?.split(',')[0]
    || request.headers.get('x-real-ip')
    || 'unknown'
  return raw.trim().replace(/[^a-fA-F0-9:.[\]-]/g, '').slice(0, 64) || 'unknown'
}

export function safeRedirectPath(value: string | null, fallback = '/dashboard'): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback
  try {
    const decoded = decodeURIComponent(value)
    if (!decoded.startsWith('/') || decoded.startsWith('//') || decoded.includes('\\')) return fallback
    return value
  } catch {
    return fallback
  }
}

export function secretsMatch(actual: string | null, expected: string | undefined): boolean {
  if (!actual || !expected) return false
  const actualBytes = Buffer.from(actual)
  const expectedBytes = Buffer.from(expected)
  return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes)
}

export function widgetCorsHeaders(request: Request, exposeOrigin: boolean): Record<string, string> {
  const origin = request.headers.get('origin')
  return {
    ...(exposeOrigin && origin ? { 'Access-Control-Allow-Origin': origin } : {}),
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '600',
    'Vary': 'Origin',
    'Cache-Control': 'no-store',
  }
}
