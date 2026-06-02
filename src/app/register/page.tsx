'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mail, Lock, User, Building2, Phone, MapPin,
  Globe, Send, MessageCircle, ArrowRight, ArrowLeft,
  Loader2, CheckCircle2, Target, Zap,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signup } from '@/app/auth/actions'
import { AuthBrandPanel } from '@/components/auth/AuthBrandPanel'
import { AuthInput } from '@/components/auth/AuthInput'
import { PasswordStrength } from '@/components/auth/PasswordStrength'
import { BusinessTypeSelect } from '@/components/auth/BusinessTypeSelect'
import { CountrySelect } from '@/components/auth/CountrySelect'



const CHANNELS = [
  { key: 'webchat', label: 'Web Chat', icon: Globe, available: true },
  { key: 'telegram', label: 'Telegram', icon: Send, available: true },
  { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, available: false, badge: 'Próximamente' },
]

const GOALS = [
  { key: 'leads', label: 'Captar leads', icon: Target },
  { key: 'faq', label: 'Responder preguntas', icon: MessageCircle },
  { key: 'sales', label: 'Vender productos', icon: Zap },
  { key: 'appointments', label: 'Agendar citas', icon: CheckCircle2 },
  { key: 'support', label: 'Dar soporte', icon: User },
]

const STEPS = [
  { number: 1, label: 'Datos de acceso' },
  { number: 2, label: 'Tu negocio' },
  { number: 3, label: 'Objetivo inicial' },
]

// ─── Chip selector ────────────────────────────────────────────────────────────
function ChipSelector<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string; icon?: React.ElementType; available?: boolean; badge?: string }[]
  value: T | ''
  onChange: (v: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(({ key, label, icon: Icon, available = true, badge }) => (
        <button
          key={key}
          type="button"
          disabled={!available}
          onClick={() => available && onChange(key)}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all relative ${
            !available
              ? 'opacity-40 cursor-not-allowed border-white/10 bg-white/[0.02] text-slate-500'
              : value === key
              ? 'border-brand-violet/60 bg-brand-violet/15 text-white shadow-[0_0_12px_rgba(124,58,237,0.2)]'
              : 'border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-slate-200'
          }`}
        >
          {Icon && <Icon className="w-3.5 h-3.5" />}
          {label}
          {badge && (
            <span className="ml-1 px-1.5 py-0.5 rounded-md bg-white/10 text-[9px] font-semibold text-slate-500">{badge}</span>
          )}
        </button>
      ))}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  // Step 1 fields
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [step1Errors, setStep1Errors] = useState<Record<string, string>>({})

  // Step 2 fields
  const [companyName, setCompanyName] = useState('')
  const [businessType, setBusinessType] = useState('')
  const [country, setCountry] = useState('')
  const [phone, setPhone] = useState('')
  const [step2Errors, setStep2Errors] = useState<Record<string, string>>({})

  // Step 3 fields
  const [channel, setChannel] = useState<string>('')
  const [goal, setGoal] = useState<string>('')
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [marketingOptIn, setMarketingOptIn] = useState(false)
  const [step3Errors, setStep3Errors] = useState<Record<string, string>>({})

  function handleCountryChange(newCountry: string, newDialCode: string) {
    setCountry(newCountry)
    if (!newDialCode) return

    setPhone(prevPhone => {
      const trimmed = prevPhone.trim()
      if (!trimmed) return newDialCode + ' '
      
      if (/^\+\d+/.test(trimmed)) {
        return trimmed.replace(/^\+\d+/, newDialCode)
      }
      
      return newDialCode + ' ' + trimmed
    })
  }

  // ── Validation ──
  function validateStep1() {
    const errs: Record<string, string> = {}
    if (!name.trim() || name.trim().length < 2) errs.name = 'Ingresa tu nombre completo.'
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Ingresa un correo válido.'
    if (password.length < 8) errs.password = 'Mínimo 8 caracteres.'
    if (password !== confirmPassword) errs.confirmPassword = 'Las contraseñas no coinciden.'
    setStep1Errors(errs)
    return Object.keys(errs).length === 0
  }

  function validateStep2() {
    const errs: Record<string, string> = {}
    if (!companyName.trim()) errs.companyName = 'Ingresa el nombre de tu negocio.'
    if (!businessType) errs.businessType = 'Selecciona el tipo de negocio.'
    if (!country) errs.country = 'Selecciona tu país.'
    setStep2Errors(errs)
    return Object.keys(errs).length === 0
  }

  function validateStep3() {
    const errs: Record<string, string> = {}
    if (!acceptTerms) errs.terms = 'Debes aceptar los términos para continuar.'
    setStep3Errors(errs)
    return Object.keys(errs).length === 0
  }

  function handleNext() {
    if (step === 1 && validateStep1()) setStep(2)
    else if (step === 2 && validateStep2()) setStep(3)
  }

  async function handleSubmit() {
    if (!validateStep3()) return
    setIsLoading(true)
    setError(null)

    const formData = new FormData()
    formData.set('name', name)
    formData.set('email', email)
    formData.set('password', password)
    formData.set('confirmPassword', confirmPassword)
    formData.set('company_name', companyName)
    formData.set('business_type', businessType)
    formData.set('country', country)
    formData.set('phone', phone)
    formData.set('preferred_channel', channel)
    formData.set('onboarding_goal', goal)
    formData.set('marketing_opt_in', String(marketingOptIn))
    formData.set('terms_accepted', String(acceptTerms))

    const result = await signup(formData)
    if (result?.error) {
      setError(result.error)
      setIsLoading(false)
    } else if (result?.success) {
      // Si requiere confirmación (Supabase lo indica sin devolver sesión)
      if (result.requiresEmailConfirmation) {
        setIsSuccess(true)
        setIsLoading(false)
      } else {
        // Si no requiere confirmación, hay sesión activa, vamos al dashboard
        router.push('/dashboard/create-assistant')
      }
    }
  }

  // ── Success screen ──
  if (isSuccess) {
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
          <h2 className="text-2xl font-bold text-white mb-2">¡Cuenta creada!</h2>
          <p className="text-slate-400 text-sm mb-8">
            Si configuraste confirmación de email en Supabase, revisa tu bandeja de entrada. De lo contrario, ya puedes acceder a tu panel.
          </p>
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
      {/* Left brand panel */}
      <div className="w-[45%] xl:w-[40%] flex-shrink-0">
        <AuthBrandPanel />
      </div>

      {/* Right form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 overflow-y-auto relative">
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-brand-cyan/10 rounded-full blur-[100px] pointer-events-none lg:hidden" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md relative z-10 py-8"
        >
          {/* Mobile logo */}
          <Link href="/" className="flex items-center gap-2.5 mb-8 lg:hidden">
            <img src="/logo.png" alt="ConversaAI" className="w-9 h-9 rounded-xl shadow-[0_0_15px_rgba(124,58,237,0.5)]" />
            <span className="text-xl font-bold text-white tracking-tight">ConversaAI</span>
          </Link>

          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1.5">Crea tu cuenta en ConversaAI</h1>
            <p className="text-slate-400 text-sm">
              Comienza a automatizar tu atención, captar leads y responder clientes desde un solo lugar.
            </p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-7">
            {STEPS.map((s, i) => (
              <div key={s.number} className="flex items-center gap-2 flex-1">
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step === s.number
                      ? 'gradient-btn text-white shadow-[0_0_12px_rgba(124,58,237,0.4)]'
                      : step > s.number
                      ? 'bg-brand-success/20 text-brand-success border border-brand-success/30'
                      : 'bg-white/[0.05] text-slate-500 border border-white/[0.08]'
                  }`}>
                    {step > s.number ? <CheckCircle2 className="w-3.5 h-3.5" /> : s.number}
                  </div>
                  <span className={`text-xs font-medium hidden sm:block ${step >= s.number ? 'text-slate-300' : 'text-slate-600'}`}>
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-px mx-2 transition-colors ${step > s.number ? 'bg-brand-violet/40' : 'bg-white/[0.06]'}`} />
                )}
              </div>
            ))}
          </div>

          {/* Form card */}
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 shadow-2xl backdrop-blur-xl">
            <AnimatePresence mode="wait">

              {/* ── STEP 1 ── */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-4"
                >
                  <p className="text-xs font-semibold text-brand-cyan uppercase tracking-wider mb-4">Paso 1 · Datos de acceso</p>

                  <AuthInput
                    id="name"
                    name="name"
                    label="Nombre completo"
                    placeholder="Juan Pérez"
                    required
                    icon={<User className="w-4 h-4" />}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    error={step1Errors.name}
                    autoComplete="name"
                  />
                  <AuthInput
                    id="email"
                    name="email"
                    type="email"
                    label="Correo electrónico"
                    placeholder="tu@email.com"
                    required
                    icon={<Mail className="w-4 h-4" />}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    error={step1Errors.email}
                    autoComplete="email"
                  />
                  <div>
                    <AuthInput
                      id="password"
                      name="password"
                      type="password"
                      label="Contraseña"
                      placeholder="Mínimo 8 caracteres"
                      required
                      icon={<Lock className="w-4 h-4" />}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      error={step1Errors.password}
                      autoComplete="new-password"
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
                    error={step1Errors.confirmPassword}
                    autoComplete="new-password"
                  />

                  <button
                    type="button"
                    onClick={handleNext}
                    className="w-full gradient-btn py-3.5 rounded-xl text-white font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-2 mt-2"
                  >
                    Continuar <ArrowRight className="w-4 h-4" />
                  </button>
                </motion.div>
              )}

              {/* ── STEP 2 ── */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-4"
                >
                  <p className="text-xs font-semibold text-brand-cyan uppercase tracking-wider mb-4">Paso 2 · Información del negocio</p>

                  <AuthInput
                    id="company_name"
                    name="company_name"
                    label="Nombre del negocio"
                    placeholder="Mi empresa S.A."
                    required
                    icon={<Building2 className="w-4 h-4" />}
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    error={step2Errors.companyName}
                  />

                  {/* Business type select */}
                  <div className="space-y-1.5 relative z-20">
                    <label className="text-sm font-medium text-slate-300">
                      Tipo de negocio <span className="text-brand-pink">*</span>
                    </label>
                    <BusinessTypeSelect 
                      value={businessType} 
                      onChange={setBusinessType} 
                      error={step2Errors.businessType}
                    />
                    {step2Errors.businessType && <p className="text-xs text-brand-pink">{step2Errors.businessType}</p>}
                  </div>

                  {/* Country select */}
                  <div className="space-y-1.5 relative z-10">
                    <label className="text-sm font-medium text-slate-300">
                      País <span className="text-brand-pink">*</span>
                    </label>
                    <CountrySelect 
                      value={country} 
                      onChange={handleCountryChange} 
                      error={step2Errors.country}
                    />
                    {step2Errors.country && <p className="text-xs text-brand-pink">{step2Errors.country}</p>}
                  </div>

                  <AuthInput
                    id="phone"
                    name="phone"
                    type="tel"
                    label="Teléfono / WhatsApp (opcional)"
                    placeholder="+54 9 11 0000 0000"
                    icon={<Phone className="w-4 h-4" />}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    autoComplete="tel"
                  />

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="flex-1 py-3.5 rounded-xl border border-white/10 text-slate-400 text-sm font-medium hover:bg-white/[0.04] transition-colors flex items-center justify-center gap-2"
                    >
                      <ArrowLeft className="w-4 h-4" /> Anterior
                    </button>
                    <button
                      type="button"
                      onClick={handleNext}
                      className="flex-1 gradient-btn py-3.5 rounded-xl text-white font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-2"
                    >
                      Continuar <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── STEP 3 ── */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-5"
                >
                  <p className="text-xs font-semibold text-brand-cyan uppercase tracking-wider mb-4">Paso 3 · Objetivo inicial</p>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Canal que quieres usar primero</label>
                    <ChipSelector
                      options={CHANNELS.map(c => ({ key: c.key, label: c.label, icon: c.icon, available: c.available, badge: c.badge }))}
                      value={channel}
                      onChange={(v) => setChannel(v)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Objetivo principal</label>
                    <ChipSelector
                      options={GOALS.map(g => ({ key: g.key, label: g.label, icon: g.icon }))}
                      value={goal}
                      onChange={(v) => setGoal(v)}
                    />
                  </div>

                  {/* Terms */}
                  <div className="space-y-3 pt-1">
                    <label className={`flex items-start gap-3 cursor-pointer group ${step3Errors.terms ? 'opacity-100' : ''}`}>
                      <div
                        onClick={() => setAcceptTerms(!acceptTerms)}
                        className={`w-5 h-5 mt-0.5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                          acceptTerms ? 'bg-brand-violet border-brand-violet' : step3Errors.terms ? 'border-brand-pink' : 'border-white/20 bg-white/[0.03]'
                        }`}
                      >
                        {acceptTerms && <CheckCircle2 className="w-3 h-3 text-white" />}
                      </div>
                      <span className="text-xs text-slate-400 leading-relaxed">
                        Acepto los{' '}
                        <Link href="/terminos" className="text-brand-cyan hover:underline">términos y condiciones</Link>
                        {' '}y la{' '}
                        <Link href="/privacidad" className="text-brand-cyan hover:underline">política de privacidad</Link>.{' '}
                        <span className="text-brand-pink">*</span>
                      </span>
                    </label>
                    {step3Errors.terms && <p className="text-xs text-brand-pink pl-8">{step3Errors.terms}</p>}

                    <label className="flex items-start gap-3 cursor-pointer">
                      <div
                        onClick={() => setMarketingOptIn(!marketingOptIn)}
                        className={`w-5 h-5 mt-0.5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                          marketingOptIn ? 'bg-brand-violet border-brand-violet' : 'border-white/20 bg-white/[0.03]'
                        }`}
                      >
                        {marketingOptIn && <CheckCircle2 className="w-3 h-3 text-white" />}
                      </div>
                      <span className="text-xs text-slate-500 leading-relaxed">
                        Quiero recibir novedades y consejos para automatizar mi atención.
                      </span>
                    </label>
                  </div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="bg-brand-pink/10 border border-brand-pink/20 rounded-xl p-3 text-sm text-brand-pink"
                    >
                      {error}
                    </motion.div>
                  )}

                  <div className="flex gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="flex-1 py-3.5 rounded-xl border border-white/10 text-slate-400 text-sm font-medium hover:bg-white/[0.04] transition-colors flex items-center justify-center gap-2"
                    >
                      <ArrowLeft className="w-4 h-4" /> Anterior
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={isLoading}
                      className="flex-1 gradient-btn py-3.5 rounded-xl text-white font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Creando cuenta...</>
                      ) : (
                        <>Crear cuenta <ArrowRight className="w-4 h-4" /></>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <p className="mt-6 text-center text-sm text-slate-500">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="text-brand-cyan font-medium hover:text-brand-cyan/80 transition-colors">
              Inicia sesión
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
