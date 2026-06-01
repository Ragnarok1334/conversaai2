'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Lock, Loader2, CheckCircle2, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { updatePassword } from '@/app/auth/actions'
import { AuthBrandPanel } from '@/components/auth/AuthBrandPanel'
import { AuthInput } from '@/components/auth/AuthInput'
import { PasswordStrength } from '@/components/auth/PasswordStrength'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  function validate(): string | null {
    if (password.length < 8) return 'La contraseña debe tener al menos 8 caracteres.'
    if (password !== confirmPassword) return 'Las contraseñas no coinciden.'
    return null
  }

  async function handleSubmit(formData: FormData) {
    const validationError = validate()
    if (validationError) { setError(validationError); return }

    setIsLoading(true)
    setError(null)
    const result = await updatePassword(formData)
    if (result?.error) {
      setError('No pudimos actualizar la contraseña. El enlace puede haber expirado. Solicita uno nuevo.')
      setIsLoading(false)
    } else {
      setIsSuccess(true)
    }
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-[#050816] flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-success/10 rounded-full blur-[120px] pointer-events-none" />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white/[0.03] border border-white/[0.08] rounded-2xl p-8 text-center backdrop-blur-xl shadow-2xl"
        >
          <div className="w-16 h-16 bg-brand-success/15 border border-brand-success/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-8 h-8 text-brand-success" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Contraseña actualizada</h2>
          <p className="text-slate-400 text-sm mb-8">Tu contraseña fue restablecida correctamente. Ya puedes iniciar sesión.</p>
          <Link
            href="/login"
            className="gradient-btn w-full py-3.5 rounded-xl text-white font-semibold inline-flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
          >
            Iniciar sesión <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050816] flex">
      <div className="w-[45%] xl:w-[40%] flex-shrink-0">
        <AuthBrandPanel />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-brand-cyan/15 rounded-full blur-[120px] pointer-events-none lg:hidden" />

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

          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Crea tu nueva contraseña</h1>
            <p className="text-slate-400 text-sm">Elige una contraseña segura para proteger tu cuenta.</p>
          </div>

          <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
            <form action={handleSubmit} className="space-y-5">
              <div>
                <AuthInput
                  id="password"
                  name="password"
                  type="password"
                  label="Nueva contraseña"
                  placeholder="Mínimo 8 caracteres"
                  required
                  icon={<Lock className="w-4 h-4" />}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  accentColor="cyan"
                />
                <PasswordStrength password={password} />
              </div>

              <AuthInput
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                label="Confirmar contraseña"
                placeholder="••••••••"
                required
                icon={<Lock className="w-4 h-4" />}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={confirmPassword && password !== confirmPassword ? 'Las contraseñas no coinciden.' : undefined}
                autoComplete="new-password"
                accentColor="cyan"
              />

              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-brand-pink/10 border border-brand-pink/20 rounded-xl p-3 text-sm text-brand-pink"
                >
                  {error}
                  {' '}
                  <Link href="/forgot-password" className="underline hover:text-brand-pink/80">Solicitar nuevo enlace.</Link>
                </motion.div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full gradient-btn py-3.5 rounded-xl text-white font-semibold hover:opacity-90 transition-all glow-cyan flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Actualizando...</>
                ) : (
                  <>Actualizar contraseña <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
