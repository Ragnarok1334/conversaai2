'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, Lock, ArrowRight, Loader2, MessageSquare, Users } from 'lucide-react'
import Link from 'next/link'
import { login } from '@/app/auth/actions'
import { AuthBrandPanel } from '@/components/auth/AuthBrandPanel'
import { AuthInput } from '@/components/auth/AuthInput'
import { SocialAuthButtons } from '@/components/auth/SocialAuthButtons'
import { TurnstileWidget } from '@/components/auth/TurnstileWidget'

const FRIENDLY_ERRORS: Record<string, string> = {
  'Invalid login credentials': 'Correo o contraseña incorrectos.',
  'Email not confirmed': 'Debes confirmar tu correo antes de iniciar sesión. Revisa tu bandeja de entrada.',
  'Too many requests': 'Demasiados intentos. Espera unos minutos e intenta nuevamente.',
}

function friendlyError(msg: string): string {
  for (const [key, value] of Object.entries(FRIENDLY_ERRORS)) {
    if (msg.includes(key)) return value
  }
  return 'No pudimos iniciar sesión. Intenta de nuevo.'
}

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !captchaToken) {
      setError('Completa la verificación de seguridad para continuar.')
      return
    }

    setIsLoading(true)
    setError(null)
    
    if (captchaToken) {
      formData.append('captchaToken', captchaToken)
    }

    const result = await login(formData)
    if (result?.error) {
      setError(friendlyError(result.error))
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#050816] flex">
      {/* Left brand panel — desktop only */}
      <div className="w-[45%] xl:w-[40%] flex-shrink-0">
        <AuthBrandPanel />
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 relative overflow-hidden">
        {/* Background glow for mobile */}
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-brand-violet/15 rounded-full blur-[120px] pointer-events-none lg:hidden" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-brand-cyan/15 rounded-full blur-[100px] pointer-events-none lg:hidden" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md relative z-10"
        >
          {/* Mobile logo */}
          <Link href="/" className="flex items-center gap-2.5 mb-8 lg:hidden">
            <img src="/logo.png" alt="ConversaAI" className="w-9 h-9 rounded-xl shadow-[0_0_15px_rgba(124,58,237,0.5)]" />
            <span className="text-xl font-bold text-white tracking-tight">ConversaAI</span>
          </Link>

          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Bienvenido de nuevo</h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              Gestiona tus asistentes, conversaciones y leads desde un solo panel.
            </p>
          </div>

          {/* Decorative Mock Metrics */}
          <div className="flex gap-3 mb-6">
            <div className="flex-1 bg-white/[0.02] border border-white/[0.05] rounded-xl p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-brand-cyan/10 flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-4 h-4 text-brand-cyan" />
              </div>
              <div>
                <p className="text-white text-xs font-semibold">3 nuevas</p>
                <p className="text-slate-500 text-[10px] uppercase tracking-wider">Conversaciones</p>
              </div>
            </div>
            <div className="flex-1 bg-white/[0.02] border border-white/[0.05] rounded-xl p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-brand-violet/10 flex items-center justify-center flex-shrink-0">
                <Users className="w-4 h-4 text-brand-violet" />
              </div>
              <div>
                <p className="text-white text-xs font-semibold">1 capturado</p>
                <p className="text-slate-500 text-[10px] uppercase tracking-wider">Lead reciente</p>
              </div>
            </div>
          </div>

          <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
            <div className="mb-5 text-center">
              <p className="text-slate-400 text-sm">Accede rápido con tu cuenta social.</p>
            </div>
            
            <SocialAuthButtons mode="login" disabled={isLoading} />

            <form action={handleSubmit} className="space-y-5">
              <AuthInput
                id="email"
                name="email"
                type="email"
                label="Correo electrónico"
                placeholder="tu@email.com"
                required
                icon={<Mail className="w-4 h-4" />}
                autoComplete="email"
                accentColor="violet"
              />

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-300" htmlFor="password">
                    Contraseña <span className="text-brand-pink">*</span>
                  </label>
                  <Link href="/forgot-password" className="text-xs text-brand-cyan hover:text-brand-cyan/80 transition-colors">
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
                <AuthInput
                  id="password"
                  name="password"
                  type="password"
                  label=""
                  placeholder="••••••••"
                  required
                  icon={<Lock className="w-4 h-4" />}
                  autoComplete="current-password"
                  accentColor="violet"
                />
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-brand-pink/10 border border-brand-pink/20 rounded-xl p-3 text-sm text-brand-pink"
                >
                  {error}
                </motion.div>
              )}

              <TurnstileWidget
                onVerify={(token) => {
                  setCaptchaToken(token);
                  setError(null);
                }}
                onError={() => setError('No se pudo validar la verificación de seguridad.')}
                onExpire={() => {
                  setCaptchaToken(null);
                  setError('La verificación expiró. Inténtalo nuevamente.');
                }}
              />

              <button
                type="submit"
                disabled={isLoading}
                className="w-full gradient-btn py-3.5 rounded-xl text-white font-semibold hover:opacity-90 transition-all glow-violet flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              >
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Iniciando sesión...</>
                ) : (
                  <>Iniciar sesión <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-sm text-slate-500">
            ¿Aún no tienes cuenta?{' '}
            <Link href="/register" className="text-brand-violet font-medium hover:text-brand-violet/80 transition-colors">
              Crea una gratis
            </Link>
          </p>

          <p className="mt-8 text-center text-[11px] text-slate-500 leading-relaxed px-4">
            Al continuar, aceptas nuestros{' '}
            <Link href="/terminos" target="_blank" className="underline hover:text-slate-300 transition-colors">
              Términos
            </Link>
            {' '}y nuestra{' '}
            <Link href="/privacidad" target="_blank" className="underline hover:text-slate-300 transition-colors">
              Política de Privacidad
            </Link>.
          </p>
        </motion.div>
      </div>
    </div>
  )
}
