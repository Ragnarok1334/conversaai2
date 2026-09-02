import { createSupabaseAdmin } from '@/lib/supabase/admin'

/**
 * Incrementa el uso de mensajes de forma atómica usando la RPC segura.
 * Solo puede ser ejecutada desde backend mediante el cliente admin (service_role).
 */
export async function consumeMessageCredit(userId: string, limit: number | null): Promise<boolean> {
  try {
    const supabaseAdmin = createSupabaseAdmin()
    
    const { data, error } = await supabaseAdmin.rpc('increment_message_usage', {
      p_user_id: userId,
      p_limit: limit,
    })

    if (error) {
      console.error('[consumeMessageCredit] RPC Error:', error)
      return false
    }

    // Devuelve true si se incrementó, false si ya había llegado al límite o no existe
    return !!data
  } catch (error) {
    console.error('[consumeMessageCredit] Error:', error)
    return false
  }
}

/**
 * Devuelve un crédito reservado cuando una operación de IA falla antes de completarse.
 */
export async function refundMessageCredit(userId: string, amount = 1): Promise<boolean> {
  try {
    const supabaseAdmin = createSupabaseAdmin()
    const { data, error } = await supabaseAdmin.rpc('decrement_message_usage', {
      p_user_id: userId,
      p_amount: amount,
    })

    if (error) {
      console.error('[refundMessageCredit] RPC Error:', error)
      return false
    }

    return !!data
  } catch (error) {
    console.error('[refundMessageCredit] Error:', error)
    return false
  }
}

/**
 * Valida un rate limit usando la RPC segura en base de datos.
 */
export async function checkRateLimit(key: string, route: string, limit: number, windowSeconds: number): Promise<boolean> {
  try {
    const supabaseAdmin = createSupabaseAdmin()
    
    const { data, error } = await supabaseAdmin.rpc('check_rate_limit', {
      p_key: key,
      p_route: route,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    })

    if (error) {
      console.error('[checkRateLimit] RPC Error:', error)
      // Si falla la DB de rate limit, por seguridad bloqueamos o registramos. 
      // Según requerimiento: "debe bloquear o devolver error controlado, no permitir por defecto"
      return false
    }

    return !!data
  } catch (error) {
    console.error('[checkRateLimit] Error:', error)
    return false 
  }
}

/**
 * Extrae y normaliza el dominio a partir de un string (Origin, Referer, o input manual).
 * Usa URL.hostname para eliminar el puerto correctamente.
 * Quita www y pasa a minúsculas.
 * Ej: "https://www.midominio.com/path" -> "midominio.com"
 * Ej: "http://localhost:3000/test" -> "localhost"
 * Ej: "http://127.0.0.1:3000/path" -> "127.0.0.1"
 */
export function extractDomain(urlStr: string | null): string | null {
  if (!urlStr) return null
  const trimmed = urlStr.trim()
  // Añadir protocolo si falta para que URL() lo parsee correctamente
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const hostname = new URL(withProtocol).hostname.toLowerCase()
    // Quitar www.
    return hostname.replace(/^www\./, '') || null
  } catch {
    // Fallback: strip manual
    let normalized = trimmed.toLowerCase()
    normalized = normalized.replace(/^https?:\/\//, '')
    normalized = normalized.replace(/^www\./, '')
    normalized = normalized.split('/')[0]
    normalized = normalized.split('?')[0]
    normalized = normalized.split(':')[0]
    return normalized || null
  }
}

/**
 * Alias semántico para usar al guardar dominios en la base de datos.
 */
export const normalizeDomainForStorage = extractDomain

/**
 * Escapa entidades HTML básicas para evitar XSS simple.
 */
export function escapeHtml(unsafe: string): string {
  if (!unsafe) return ''
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

/**
 * Valida un dominio consultando assistant_domains.
 * Retorna true si es localhost (en dev), si allow_all_domains está activo o si el dominio está registrado.
 * Siempre intenta devolver dbDomainId cuando el dominio tiene registro en la base de datos,
 * incluso para localhost en modo desarrollo.
 */
export async function validateWidgetDomain(params: {
  assistantId: string
  req: Request | any // NextRequest or Request
  pageUrl?: string
}): Promise<{ isValid: boolean; normalizedDomain: string | null; dbDomainId?: string; isAllowAll?: boolean; isLocalhost?: boolean; isMissingDomain?: boolean }> {
  const { assistantId, req, pageUrl } = params
  
  // Fuente de verdad: Origin primero, Referer como fallback, pageUrl solo de apoyo
  const origin = req.headers.get('origin')
  const referer = req.headers.get('referer')
  
  const rawDomain = origin || referer || pageUrl || ''
  const normalizedDomain = extractDomain(rawDomain)
  
  if (!normalizedDomain) {
    return { isValid: false, normalizedDomain: null, isMissingDomain: true }
  }

  const isLocalhost = normalizedDomain === 'localhost' || normalizedDomain === '127.0.0.1'

  // Siempre consultar Supabase para obtener el dbDomainId real
  const admin = createSupabaseAdmin()

  // Verificar allow_all_domains (solo para no-localhost o si la fila existe igual)
  if (!isLocalhost) {
    const { data: assistant } = await admin
      .from('assistants')
      .select('allow_all_domains')
      .eq('id', assistantId)
      .single()

    if (assistant?.allow_all_domains) {
      return { isValid: true, normalizedDomain, isAllowAll: true }
    }
  }

  // Buscar fila en assistant_domains (funciona para localhost y dominios reales)
  const { data: domainRows } = await admin
    .from('assistant_domains')
    .select('id, verification_status')
    .eq('assistant_id', assistantId)
    .eq('domain', normalizedDomain)
    .eq('is_active', true)
    .limit(1)

  const domainRow = domainRows?.[0] ?? null

  if (domainRow) {
    // Bloquear si está bloqueado
    if (domainRow.verification_status === 'blocked') {
      return { isValid: false, normalizedDomain, isMissingDomain: false }
    }
    return { isValid: true, normalizedDomain, dbDomainId: domainRow.id, isLocalhost }
  }

  // En desarrollo, si es localhost y no hay fila en DB: permitir carga del widget pero sin actualizar DB
  if (process.env.NODE_ENV === 'development' && isLocalhost) {
    return { isValid: true, normalizedDomain, isLocalhost: true }
  }

  return { isValid: false, normalizedDomain, isMissingDomain: false }
}
