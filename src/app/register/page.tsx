'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, Lock, User, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { signup } from '@/app/auth/actions'

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  async function handleSubmit(formData: FormData) {
    setIsLoading(true)
    setError(null)
    const result = await signup(formData)
    
    if (result?.error) {
      setError(result.error)
      setIsLoading(false)
    } else {
      setIsSuccess(true)
    }
  }

  if (isSuccess) {
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
          <h2 className="text-2xl font-bold text-text-main mb-2">¡Registro exitoso!</h2>
          <p className="text-text-secondary mb-8">
            Si configuraste confirmación de email en Supabase, revisa tu bandeja de entrada. De lo contrario, ya puedes iniciar sesión.
          </p>
          <Link href="/login" className="gradient-btn w-full py-3.5 rounded-xl text-white font-semibold inline-block">
            Ir a Iniciar Sesión
          </Link>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-violet/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand-cyan/20 rounded-full blur-[120px] pointer-events-none" />

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

        <div className="bg-card-bg/80 backdrop-blur-2xl border border-card-border rounded-3xl p-8 shadow-2xl relative glow-cyan">
          <h1 className="text-2xl font-bold text-text-main mb-2">Crea tu cuenta</h1>
          <p className="text-text-soft mb-8">Comienza a automatizar tus ventas hoy</p>

          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-text-secondary" htmlFor="name">
                Nombre completo
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-soft" />
                <input 
                  id="name"
                  name="name"
                  type="text" 
                  required
                  placeholder="Juan Pérez"
                  className="w-full bg-dark-secondary border border-card-border rounded-xl py-3 pl-11 pr-4 text-text-main placeholder:text-text-soft/50 focus:outline-none focus:border-brand-cyan/50 focus:ring-1 focus:ring-brand-cyan/50 transition-all"
                />
              </div>
            </div>

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
                  className="w-full bg-dark-secondary border border-card-border rounded-xl py-3 pl-11 pr-4 text-text-main placeholder:text-text-soft/50 focus:outline-none focus:border-brand-cyan/50 focus:ring-1 focus:ring-brand-cyan/50 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-text-secondary" htmlFor="password">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-soft" />
                <input 
                  id="password"
                  name="password"
                  type="password" 
                  required
                  placeholder="••••••••"
                  className="w-full bg-dark-secondary border border-card-border rounded-xl py-3 pl-11 pr-4 text-text-main placeholder:text-text-soft/50 focus:outline-none focus:border-brand-cyan/50 focus:ring-1 focus:ring-brand-cyan/50 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-text-secondary" htmlFor="confirmPassword">
                Confirmar Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-soft" />
                <input 
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password" 
                  required
                  placeholder="••••••••"
                  className="w-full bg-dark-secondary border border-card-border rounded-xl py-3 pl-11 pr-4 text-text-main placeholder:text-text-soft/50 focus:outline-none focus:border-brand-cyan/50 focus:ring-1 focus:ring-brand-cyan/50 transition-all"
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
              className="w-full gradient-btn py-3.5 rounded-xl text-white font-semibold hover:opacity-90 transition-opacity glow-cyan flex items-center justify-center gap-2 disabled:opacity-70 mt-4"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Crear cuenta
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-text-soft">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="text-brand-cyan font-medium hover:text-brand-blue transition-colors">
              Inicia sesión
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
