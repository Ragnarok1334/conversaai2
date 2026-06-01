'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, ArrowLeft, Loader2, CheckCircle2, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { resetPassword } from '@/app/auth/actions'
import { AuthBrandPanel } from '@/components/auth/AuthBrandPanel'
import { AuthInput } from '@/components/auth/AuthInput'

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    setIsLoading(true)
    setError(null)
    const result = await resetPassword(formData)
    if (result?.error) {
      setError('No pudimos procesar tu solicitud. Verifica el correo e intenta nuevamente.')
    } else if (result?.success) {
      setSuccessMsg('Revisa tu correo. Si existe una cuenta con ese email, recibirás un enlace para restablecer tu contraseña en breve.')
    }
    setIsLoading(false)
  }

  if (successMsg) {
    return (
      <div className="min-h-screen bg-[#050816] flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-violet/20 rounded-full blur-[120px] pointer-events-none" />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white/[0.03] border border-white/[0.08] rounded-2xl p-8 text-center backdrop-blur-xl shadow-2xl"
        >
          <div className="w-16 h-16 bg-brand-success/15 border border-brand-success/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-8 h-8 text-brand-success" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Correo enviado</h2>
          <p className="text-slate-400 text-sm mb-8 leading-relaxed">{successMsg}</p>
          <Link
            href="/login"
            className="gradient-btn w-full py-3.5 rounded-xl text-white font-semibold inline-flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
          >
            Volver al inicio de sesión
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
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-brand-violet/15 rounded-full blur-[120px] pointer-events-none lg:hidden" />

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
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-brand-violet/10 border border-brand-violet/20 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-brand-violet" />
              </div>
              <h1 className="text-2xl font-bold text-white">Recupera tu acceso</h1>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed">
              Te enviaremos un enlace seguro para restablecer tu contraseña.
            </p>
          </div>

          <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
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

              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-brand-pink/10 border border-brand-pink/20 rounded-xl p-3 text-sm text-brand-pink"
                >
                  {error}
                </motion.div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full gradient-btn py-3.5 rounded-xl text-white font-semibold hover:opacity-90 transition-all glow-violet flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
                ) : (
                  'Enviar enlace seguro'
                )}
              </button>
            </form>
          </div>

          <div className="mt-6 text-center">
            <Link href="/login" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Volver al inicio de sesión
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
