'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { resetPassword } from '@/app/auth/actions'

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    setIsLoading(true)
    setError(null)
    const result = await resetPassword(formData)
    
    if (result?.error) {
      setError(result.error)
    } else if (result?.success) {
      setSuccessMsg(result.success)
    }
    setIsLoading(false)
  }

  if (successMsg) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-violet/20 rounded-full blur-[120px] pointer-events-none" />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-card-bg/80 backdrop-blur-2xl border border-card-border rounded-3xl p-8 shadow-2xl text-center glow-violet"
        >
          <div className="w-16 h-16 bg-brand-success/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-brand-success" />
          </div>
          <h2 className="text-2xl font-bold text-text-main mb-2">Correo enviado</h2>
          <p className="text-text-secondary mb-8">{successMsg}</p>
          <Link href="/login" className="gradient-btn w-full py-3.5 rounded-xl text-white font-semibold inline-block">
            Volver al inicio de sesión
          </Link>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-blue/20 rounded-full blur-[120px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Link href="/" className="flex items-center gap-2 mb-8 justify-center hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-lg gradient-btn flex items-center justify-center font-bold text-white shadow-[0_0_15px_rgba(124,58,237,0.5)]">
            C
          </div>
          <span className="text-2xl font-bold text-text-main tracking-tight">
            ConversaAI
          </span>
        </Link>

        <div className="bg-card-bg/80 backdrop-blur-2xl border border-card-border rounded-3xl p-8 shadow-2xl relative">
          <h1 className="text-2xl font-bold text-text-main mb-2">Recuperar contraseña</h1>
          <p className="text-text-soft mb-8">Ingresa tu correo y te enviaremos un enlace para restablecerla.</p>

          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-text-secondary" htmlFor="email">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-soft" />
                <input 
                  id="email"
                  name="email"
                  type="email" 
                  required
                  placeholder="tu@email.com"
                  className="w-full bg-dark-secondary border border-card-border rounded-xl py-3 pl-11 pr-4 text-text-main placeholder:text-text-soft/50 focus:outline-none focus:border-brand-blue/50 focus:ring-1 focus:ring-brand-blue/50 transition-all"
                />
              </div>
            </div>

            {error && (
              <motion.p 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="text-brand-pink text-sm font-medium bg-brand-pink/10 p-3 rounded-lg border border-brand-pink/20"
              >
                {error}
              </motion.p>
            )}

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full gradient-btn py-3.5 rounded-xl text-white font-semibold hover:opacity-90 transition-opacity glow-violet flex items-center justify-center gap-2 disabled:opacity-70 mt-4"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Enviar enlace"
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/login" className="inline-flex items-center gap-2 text-sm text-text-soft hover:text-text-main transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Volver al login
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
