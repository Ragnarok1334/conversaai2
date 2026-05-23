'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, Lock, ArrowRight, Loader2 } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { login } from '@/app/auth/actions'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setIsLoading(true)
    setError(null)
    const result = await login(formData)
    
    if (result?.error) {
      setError(result.error)
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-violet/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand-cyan/20 rounded-full blur-[120px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Link href="/" className="flex items-center gap-2.5 mb-8 justify-center hover:opacity-80 transition-opacity">
          <Image src="/logo.png" alt="ConversaAI logo" width={38} height={38} className="rounded-lg shadow-[0_0_15px_rgba(124,58,237,0.5)]" priority />
          <span className="text-2xl font-bold text-text-main tracking-tight">
            ConversaAI
          </span>
        </Link>

        <div className="bg-card-bg/80 backdrop-blur-2xl border border-card-border rounded-3xl p-8 shadow-2xl relative glow-violet">
          <h1 className="text-2xl font-bold text-text-main mb-2">Bienvenido de nuevo</h1>
          <p className="text-text-soft mb-8">Ingresa a tu panel de control</p>

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
                  className="w-full bg-dark-secondary border border-card-border rounded-xl py-3 pl-11 pr-4 text-text-main placeholder:text-text-soft/50 focus:outline-none focus:border-brand-violet/50 focus:ring-1 focus:ring-brand-violet/50 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-text-secondary" htmlFor="password">
                  Contraseña
                </label>
                <Link href="/forgot-password" className="text-xs text-brand-cyan hover:text-brand-cyan/80 transition-colors">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-soft" />
                <input 
                  id="password"
                  name="password"
                  type="password" 
                  required
                  placeholder="••••••••"
                  className="w-full bg-dark-secondary border border-card-border rounded-xl py-3 pl-11 pr-4 text-text-main placeholder:text-text-soft/50 focus:outline-none focus:border-brand-violet/50 focus:ring-1 focus:ring-brand-violet/50 transition-all"
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
                <>
                  Iniciar sesión
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-text-soft">
            ¿No tienes cuenta?{' '}
            <Link href="/register" className="text-brand-violet font-medium hover:text-brand-purple transition-colors">
              Regístrate aquí
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
