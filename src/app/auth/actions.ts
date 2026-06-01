'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  
  if (!email || !password) {
    return { error: 'Por favor completa todos los campos' }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

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

  if (!email || !password || !confirmPassword || !name) {
    return { error: 'Por favor completa todos los campos obligatorios.' }
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
    return { error: signUpError.message }
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

  const supabase = await createClient()

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback?next=/reset-password`,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: 'Te enviamos un enlace para restablecer tu contraseña.' }
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

  const { error } = await supabase.auth.updateUser({
    password: password
  })

  if (error) {
    return { error: error.message }
  }

  redirect('/login')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  
  revalidatePath('/', 'layout')
  redirect('/login')
}
