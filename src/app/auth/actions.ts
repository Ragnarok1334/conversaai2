'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/security'
import { logAuditEvent, logSecurityEvent } from '@/lib/audit'

const MAX_EMAIL_LENGTH = 254
const MAX_PASSWORD_LENGTH = 256
const MAX_NAME_LENGTH = 120
const MAX_PROFILE_FIELD_LENGTHS: Record<string, number> = {
  company_name: 160,
  phone: 40,
  country: 80,
  business_type: 100,
  preferred_channel: 32,
  onboarding_goal: 500,
  business_website: 2048,
}

function getConfiguredAppUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL
  if (!raw) return null
  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:' || !url.hostname) return null
    return url.origin
  } catch {
    return null
  }
}

function isValidEmail(value: string): boolean {
  return value.length <= MAX_EMAIL_LENGTH && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

async function getIpFromHeaders(): Promise<string> {
  const headersList = await headers()
  return headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
         headersList.get('x-real-ip')?.trim() ||
         'unknown-ip'
}

export async function login(formData: FormData) {
  const email = String(formData.get('email') || '').trim().toLowerCase()
  const password = String(formData.get('password') || '')
  const captchaToken = String(formData.get('captchaToken') || '')

  if (!email || !password) return { error: 'Por favor completa todos los campos' }
  if (!isValidEmail(email) || password.length > MAX_PASSWORD_LENGTH) return { error: 'Correo o contraseña incorrectos.' }

  const ip = await getIpFromHeaders()
  const rlKey = `login-${ip}-${email}`
  const isAllowed = await checkRateLimit(rlKey, 'login', 5, 600)
  if (!isAllowed) {
    await logSecurityEvent({ eventType: 'login_rate_limited', severity: 'warning', message: 'Rate limit de inicio de sesión excedido', ip_address: ip })
    return { error: 'Demasiados intentos. Intenta nuevamente en unos minutos.' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
    options: { captchaToken: captchaToken || undefined }
  })

  if (error) {
    await logSecurityEvent({ eventType: 'login_failed', severity: 'info', message: 'Credenciales inválidas', ip_address: ip })
    return { error: 'Correo o contraseña incorrectos.' }
  }

  await logAuditEvent({ userId: data.user.id, action: 'login_success', description: 'Inicio de sesión exitoso', ip_address: ip })
  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signup(formData: FormData) {
  const email = String(formData.get('email') || '').trim().toLowerCase()
  const password = String(formData.get('password') || '')
  const confirmPassword = String(formData.get('confirmPassword') || '')
  const name = String(formData.get('name') || '').trim()
  const captchaToken = String(formData.get('captchaToken') || '')

  const rawFields: Record<string, string | null> = {
    company_name: String(formData.get('company_name') || '').trim() || null,
    phone: String(formData.get('phone') || '').trim() || null,
    country: String(formData.get('country') || '').trim() || null,
    business_type: String(formData.get('business_type') || '').trim() || null,
    preferred_channel: String(formData.get('preferred_channel') || '').trim() || null,
    onboarding_goal: String(formData.get('onboarding_goal') || '').trim() || null,
    business_website: String(formData.get('business_website') || '').trim() || null,
  }
  const marketing_opt_in = formData.get('marketing_opt_in') === 'true'
  const terms_accepted = formData.get('terms_accepted') === 'true'
  const website_honeypot = String(formData.get('website') || '')

  const ip = await getIpFromHeaders()
  if (website_honeypot) {
    await logSecurityEvent({ eventType: 'suspicious_input', severity: 'critical', message: 'Honeypot llenado en registro', ip_address: ip })
    return { success: true, requiresEmailConfirmation: true }
  }

  if (!email || !password || !confirmPassword || !name) return { error: 'Por favor completa todos los campos de acceso.' }
  if (!isValidEmail(email)) return { error: 'Ingresa un correo electrónico válido.' }
  if (name.length > MAX_NAME_LENGTH) return { error: 'El nombre es demasiado largo.' }
  if (password.length > MAX_PASSWORD_LENGTH) return { error: 'La contraseña es demasiado larga.' }
  if (!terms_accepted) return { error: 'Debes aceptar los términos y condiciones.' }
  if (!rawFields.company_name || !rawFields.business_type || !rawFields.country || !rawFields.preferred_channel || !rawFields.onboarding_goal) {
    return { error: 'Por favor completa todos los datos del negocio y objetivos.' }
  }
  for (const [field, value] of Object.entries(rawFields)) {
    if (value && value.length > MAX_PROFILE_FIELD_LENGTHS[field]) return { error: `El campo ${field} es demasiado largo.` }
  }
  if (password !== confirmPassword) return { error: 'Las contraseñas no coinciden.' }
  if (password.length < 8) return { error: 'La contraseña debe tener al menos 8 caracteres.' }

  const rlKeyIp = `signup-${ip}`
  const rlKeyEmail = `signup-${email}`
  const [isAllowedIp, isAllowedEmail] = await Promise.all([
    checkRateLimit(rlKeyIp, 'signup-ip', 5, 3600),
    checkRateLimit(rlKeyEmail, 'signup-email', 3, 3600),
  ])
  if (!isAllowedIp || !isAllowedEmail) {
    await logSecurityEvent({ eventType: 'signup_rate_limited', severity: 'warning', message: 'Rate limit de registro IP/email excedido', ip_address: ip })
    return { error: 'Demasiados intentos. Intenta nuevamente en unos minutos.' }
  }

  const appUrl = getConfiguredAppUrl()
  if (!appUrl) {
    console.error('[signup] authentication app URL is not configured correctly')
    return { error: 'El registro no está disponible temporalmente.' }
  }

  const supabase = await createClient()
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      captchaToken: captchaToken || undefined,
      data: { name },
      emailRedirectTo: `${appUrl}/auth/callback`,
    },
  })

  if (signUpError) {
    await logSecurityEvent({ eventType: 'signup_failed', severity: 'info', message: 'Fallo al registrar usuario en Supabase', ip_address: ip })
    return { error: 'No pudimos crear la cuenta. Revisa los datos o intenta iniciar sesión.' }
  }

  const userId = signUpData?.user?.id
  if (userId) {
    try {
      const { createSupabaseAdmin } = await import('@/lib/supabase/admin')
      const admin = createSupabaseAdmin()
      await admin.from('profiles').upsert({
        id: userId,
        full_name: name,
        email,
        company_name: rawFields.company_name,
        phone: rawFields.phone,
        country: rawFields.country,
        business_type: rawFields.business_type,
        preferred_channel: rawFields.preferred_channel,
        onboarding_goal: rawFields.onboarding_goal,
        marketing_opt_in,
        website: rawFields.business_website,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' })

      const { data: existingSub } = await admin.from('subscriptions').select('id').eq('user_id', userId).maybeSingle()
      if (!existingSub) {
        await admin.from('subscriptions').insert({ user_id: userId, plan: 'free', status: 'active', current_messages_used: 0 })
      }
    } catch (dbErr) {
      console.error('[signup] profile/subscription error:', dbErr instanceof Error ? dbErr.message : 'unknown error')
    }
    await logAuditEvent({ userId, action: 'signup_success', description: 'Registro de cuenta exitoso', ip_address: ip })
  }

  return { success: true, requiresEmailConfirmation: !signUpData?.session }
}

export async function resetPassword(formData: FormData) {
  const email = String(formData.get('email') || '').trim().toLowerCase()
  if (!email || !isValidEmail(email)) return { error: 'Por favor ingresa un correo válido' }

  const ip = await getIpFromHeaders()
  const rlKey = `reset-${ip}-${email}`
  const isAllowed = await checkRateLimit(rlKey, 'reset-password', 3, 900)
  if (!isAllowed) {
    await logSecurityEvent({ eventType: 'forgot_password_rate_limited', severity: 'warning', message: 'Rate limit de restablecimiento excedido', ip_address: ip })
    return { success: 'Si existe una cuenta con ese correo, recibirás un enlace.' }
  }

  const appUrl = getConfiguredAppUrl()
  if (!appUrl) {
    console.error('[resetPassword] authentication app URL is not configured correctly')
    return { success: 'Si existe una cuenta con ese correo, recibirás un enlace.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/auth/callback?next=/reset-password`,
  })

  if (error) {
    await logSecurityEvent({ eventType: 'forgot_password_failed', severity: 'info', message: 'Fallo al solicitar restablecimiento', ip_address: ip })
    return { success: 'Si existe una cuenta con ese correo, recibirás un enlace.' }
  }

  await logAuditEvent({ action: 'password_reset_requested', description: 'Solicitud de restablecimiento de contraseña', ip_address: ip })
  return { success: 'Si existe una cuenta con ese correo, recibirás un enlace.' }
}

export async function updatePassword(formData: FormData) {
  const password = String(formData.get('password') || '')
  const confirmPassword = String(formData.get('confirmPassword') || '')
  if (!password || !confirmPassword) return { error: 'Por favor completa todos los campos' }
  if (password !== confirmPassword) return { error: 'Las contraseñas no coinciden' }
  if (password.length < 8) return { error: 'La contraseña debe tener al menos 8 caracteres.' }
  if (password.length > MAX_PASSWORD_LENGTH) return { error: 'La contraseña es demasiado larga.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Tu sesión de restablecimiento ha expirado. Solicita un nuevo enlace.' }

  const { data, error } = await supabase.auth.updateUser({ password })
  if (error) {
    console.error('[updatePassword] password update failed:', error.message)
    return { error: 'No se pudo actualizar la contraseña. Solicita un nuevo enlace e inténtalo nuevamente.' }
  }

  const ip = await getIpFromHeaders()
  await logAuditEvent({ userId: data.user?.id || user.id, action: 'password_updated', description: 'Contraseña actualizada exitosamente', ip_address: ip })
  redirect('/login')
}

export async function signOut() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  if (data.user) {
    const ip = await getIpFromHeaders()
    await logAuditEvent({ userId: data.user.id, action: 'logout', description: 'Cierre de sesión', ip_address: ip })
  }
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
