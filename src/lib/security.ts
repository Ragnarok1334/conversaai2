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
 * Quita protocolo, path, slash final, www y lo pasa a minúsculas.
 * Ej: "https://www.midominio.com/path" -> "midominio.com"
 */
export function extractDomain(urlStr: string | null): string | null {
  if (!urlStr) return null
  let normalized = urlStr.toLowerCase().trim()
  normalized = normalized.replace(/^https?:\/\//, '') // Quita protocolo
  normalized = normalized.replace(/^www\./, '')       // Quita www.
  normalized = normalized.split('/')[0]               // Quita path y slash final
  normalized = normalized.split('?')[0]               // Quita query params
  normalized = normalized.split(':')[0]               // Quita puerto
  
  return normalized || null
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
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}
