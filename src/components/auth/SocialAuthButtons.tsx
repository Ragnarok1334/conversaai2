'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Loader2, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface SocialAuthButtonsProps {
  mode: 'login' | 'register'
  disabled?: boolean
}

export function SocialAuthButtons({ mode, disabled }: SocialAuthButtonsProps) {
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'facebook' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleOAuth = async (provider: 'google' | 'facebook') => {
    if (disabled || loadingProvider) return
    
    setLoadingProvider(provider)
    setError(null)

    const supabase = createClient()
    
    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (authError) {
        throw authError
      }
      
      // La redirección sucede automáticamente, por lo que no quitamos el loader
      // a menos que haya un error.
    } catch (err: any) {
      setLoadingProvider(null)
      const providerName = provider === 'google' ? 'Google' : 'Facebook'
      setError(`No se pudo iniciar sesión con ${providerName}. Intenta nuevamente.`)
    }
  }

  return (
    <div className="w-full space-y-4">
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-brand-pink/10 border border-brand-pink/20 rounded-xl p-3 text-sm text-brand-pink flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </motion.div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        {/* Google Button */}
        <button
          type="button"
          onClick={() => handleOAuth('google')}
          disabled={disabled || loadingProvider !== null}
          className="flex-1 relative flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] hover:border-brand-violet/40 hover:shadow-[0_0_15px_rgba(124,58,237,0.15)] transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
        >
          {loadingProvider === 'google' ? (
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
          )}
          <span className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">
            Continuar con Google
          </span>
        </button>

        {/* Facebook Button */}
        <button
          type="button"
          onClick={() => handleOAuth('facebook')}
          disabled={disabled || loadingProvider !== null}
          className="flex-1 relative flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] hover:border-brand-cyan/40 hover:shadow-[0_0_15px_rgba(14,165,233,0.15)] transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
        >
          {loadingProvider === 'facebook' ? (
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          ) : (
            <svg className="w-5 h-5 text-[#1877F2]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          )}
          <span className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">
            Continuar con Facebook
          </span>
        </button>
      </div>

      <div className="relative flex items-center py-2">
        <div className="flex-grow border-t border-white/[0.08]"></div>
        <span className="flex-shrink-0 mx-4 text-xs text-slate-500 font-medium">o continúa con correo</span>
        <div className="flex-grow border-t border-white/[0.08]"></div>
      </div>
    </div>
  )
}
