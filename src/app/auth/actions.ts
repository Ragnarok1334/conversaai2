'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/security'
import { logAuditEvent, logSecurityEvent } from '@/lib/audit'

async function getIpFromHeaders(): Promise<string> {
  const headersList = await headers()
  return headersList.get('x-forwarded-for')?.split(',')[0] || 
         headersList.get('x-real-ip') || 
         'unknown-ip'
}

export async function login(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  
  if (!email || !password) {
    return { error: 'Por favor completa todos los campos' }
  }

  const ip = await getIpFromHeaders()
  
  // Rate limit: 5 intentos por 10 minutos por IP + email
  const rlKey = `login-${ip}-${email}`
  const isAllowed = await checkRateLimit(rlKey, 'login', 5, 600)
  if (!isAllowed) {
    await logSecurityEvent({ eventType: 'login_rate_limited', severity: 'warning', message: `Rate limit excedido para: ${email}`, ip_address: ip })
    return { error: 'Demasiados intentos. Intenta nuevamente en unos minutos.' }
  }

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    await logSecurityEvent({ eventType: 'login_failed', severity: 'info', message: 'Credenciales inválidas', ip_address: ip })
    return { error: 'Correo o contraseña incorrectos.' } // Mensaje genérico profesional
  }

  await logAuditEvent({ userId: data.user.id, action: 'login_success', description: 'Inicio de sesión exitoso', ip_address: ip })

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signup(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string
  const name = (formData.get('name') as string)?.trim()

  // Extended profile fields from step 2 & 3
  const company_name = (formData.get('company_name') as string)?.trim() || null
  const phone = (formData.get('phone') as string)?.trim() || null
  const country = (formData.get('country') as string)?.trim() || null
  const business_type = (formData.get('business_type') as string)?.trim() || null
  const preferred_channel = (formData.get('preferred_channel') as string)?.trim() || null
  const onboarding_goal = (formData.get('onboarding_goal') as string)?.trim() || null
  const marketing_opt_in = formData.get('marketing_opt_in') === 'true'
  const terms_accepted = formData.get('terms_accepted') === 'true'
  const website_honeypot = (formData.get('website') as string) || ''

  const ip = await getIpFromHeaders()

  if (website_honeypot) {
    await logSecurityEvent({ eventType: 'suspicious_input', severity: 'critical', message: 'Honeypot llenado en registro', ip_address: ip })
    // Return fake success
    return { success: true, requiresEmailConfirmation: true }
  }

  // Rate limit: 5 registros por hora por IP
  const rlKeyIp = `signup-${ip}`
  // Rate limit: 3 registros por hora por email
  const rlKeyEmail = `signup-${email}`

  const isAllowedIp = await checkRateLimit(rlKeyIp, 'signup-ip', 5, 3600)
  const isAllowedEmail = await checkRateLimit(rlKeyEmail, 'signup-email', 3, 3600)

  if (!isAllowedIp || !isAllowedEmail) {
    await logSecurityEvent({ eventType: 'signup_rate_limited', severity: 'warning', message: `Rate limit excedido para registro IP/Email`, ip_address: ip })
    return { error: 'Demasiados intentos. Intenta nuevamente en unos minutos.' }
  }

  if (!email || !password || !confirmPassword || !name) {
    return { error: 'Por favor completa todos los campos de acceso.' }
  }

  if (!terms_accepted) {
    return { error: 'Debes aceptar los términos y condiciones.' }
  }

  if (!company_name || !business_type || !country || !preferred_channel || !onboarding_goal) {
    return { error: 'Por favor completa todos los datos del negocio y objetivos.' }
  }

  if (password !== confirmPassword) {
    return { error: 'Las contraseñas no coinciden.' }
  }

  if (password.length < 8) {
    return { error: 'La contraseña debe tener al menos 8 caracteres.' }
  }

  const supabase = await createClient()

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`,
    },
  })

  if (signUpError) {
    await logSecurityEvent({ eventType: 'signup_failed', severity: 'info', message: 'Fallo al registrar usuario en Supabase', ip_address: ip })
    return { error: 'No pudimos crear la cuenta. Revisa los datos o intenta iniciar sesión.' }
  }

  // Save profile using the user.id returned by signUp (works even without email confirmation)
  // Use admin client to bypass RLS — user_id comes from Supabase response, never from frontend body
  const userId = signUpData?.user?.id
  if (userId) {
    try {
      const { createSupabaseAdmin } = await import('@/lib/supabase/admin')
      const admin = createSupabaseAdmin()

      // 1. Create/Update Profile
      await admin.from('profiles').upsert(
        {
          id: userId,
          full_name: name,
          email,
          company_name,
          phone,
          country,
          business_type,
          preferred_channel,
          onboarding_goal,
          marketing_opt_in,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )

      // 2. Create Free Subscription if it doesn't exist
      // First check if user already has a subscription
      const { data: existingSub } = await admin
        .from('subscriptions')
        .select('id')
        .eq('user_id', userId)
        .single()

      if (!existingSub) {
        await admin.from('subscriptions').insert({
          user_id: userId,
          plan: 'free',
          status: 'active',
          current_messages_used: 0
        })
      }
    } catch (dbErr) {
      // Profile/Subscription save failure is non-fatal for returning success (user was created in auth)
      console.error('[signup] profile/subscription error:', dbErr)
    }

    await logAuditEvent({ userId, action: 'signup_success', description: 'Registro de cuenta exitoso', ip_address: ip })
  }

  // If there is no session returned, email confirmation is required.
  const requiresEmailConfirmation = !signUpData?.session

  // Return success to the frontend instead of directly redirecting
  // The frontend will handle the redirection or show the success screen
  return { success: true, requiresEmailConfirmation }
}

export async function resetPassword(formData: FormData) {
  const email = formData.get('email') as string

  if (!email) {
    return { error: 'Por favor ingresa tu correo' }
  }

  const ip = await getIpFromHeaders()
  
  // Rate limit: 3 intentos por 15 minutos por IP + email
  const rlKey = `reset-${ip}-${email}`
  const isAllowed = await checkRateLimit(rlKey, 'reset-password', 3, 900)
  if (!isAllowed) {
    await logSecurityEvent({ eventType: 'forgot_password_rate_limited', severity: 'warning', message: `Rate limit excedido para: ${email}`, ip_address: ip })
    // Return neutral message
    return { success: 'Si existe una cuenta con ese correo, recibirás un enlace.' }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback?next=/reset-password`,
  })

  if (error) {
    // Logueamos pero devolvemos mensaje neutro
    await logSecurityEvent({ eventType: 'forgot_password_failed', severity: 'info', message: 'Fallo al resetear password', ip_address: ip })
    return { success: 'Si existe una cuenta con ese correo, recibirás un enlace.' }
  }

  await logAuditEvent({ action: 'password_reset_requested', description: `Solicitud de restablecimiento para: ${email}`, ip_address: ip })

  return { success: 'Si existe una cuenta con ese correo, recibirás un enlace.' }
}

export async function updatePassword(formData: FormData) {
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (!password || !confirmPassword) {
    return { error: 'Por favor completa todos los campos' }
  }

  if (password !== confirmPassword) {
    return { error: 'Las contraseñas no coinciden' }
  }

  const supabase = await createClient()

  const { data, error } = await supabase.auth.updateUser({
    password: password
  })

  if (error) {
    return { error: error.message }
  }

  const ip = await getIpFromHeaders()
  await logAuditEvent({ userId: data.user?.id, action: 'password_updated', description: 'Contraseña actualizada exitosamente', ip_address: ip })

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
