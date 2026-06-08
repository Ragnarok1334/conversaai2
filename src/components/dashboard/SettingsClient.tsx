'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  User, Mail, Shield, LogOut, Bell, Key, MessageCircle,
  ExternalLink, Copy, Check, Zap, Bot, Globe2, Layers,
  BarChart3, Loader2, AlertCircle, CheckCircle2, X,
  Wifi, WifiOff, ChevronRight, Sparkles, Crown, Briefcase,
  Building, MessageSquare, Phone, MapPin
} from 'lucide-react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { CONTACT_INFO } from '@/lib/contact'
import { signOut } from '@/app/auth/actions'
import { useProfile } from '@/providers/ProfileProvider'
import { getPlanLimits, normalizePlan, PlanKey, PlanConfig } from '@/lib/plans'
import { CustomSelect } from '@/components/ui/CustomSelect'

// ─── Types ─────────────────────────────────────────────────────────────────

interface UserSettings {
  weekly_summary: boolean
  lead_alerts: boolean
  conversation_alerts: boolean
  usage_limit_alerts: boolean
  billing_alerts: boolean
  security_alerts: boolean
  product_updates: boolean
  email_notifications: boolean
  dashboard_notifications: boolean
  telegram_notifications: boolean
  dashboard_density: 'comfortable' | 'compact'
  default_dashboard_page: string
}

interface SubscriptionData {
  subscription: { plan: string; status: string }
  planConfig: { label: string; assistantsLimit: number | null; messagesLimit: number | null; channels: string[]; features: string[] }
  usage: { assistantsUsed: number; messagesUsed: number }
}

interface AuditLog {
  id: string
  action: string
  description: string
  created_at: string
  ip_address: string | null
  user_agent: string | null
}

interface Props {
  userName: string
  email: string
  joinDate: string
  assistantCount: number
}

// ─── Small helpers ──────────────────────────────────────────────────────────

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500)
    return () => clearTimeout(t)
  }, [onClose])
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10 }}
      className={`fixed bottom-6 right-6 z-[9999] flex items-center gap-3 px-5 py-3.5 rounded-2xl border shadow-2xl text-sm font-medium backdrop-blur-xl
        ${type === 'success'
          ? 'bg-brand-success/10 border-brand-success/30 text-brand-success'
          : 'bg-brand-pink/10 border-brand-pink/30 text-brand-pink'
        }`}
    >
      {type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
      {message}
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100 transition-opacity"><X className="w-3.5 h-3.5" /></button>
    </motion.div>
  )
}

function SectionCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-card-bg/80 backdrop-blur-2xl border border-card-border rounded-2xl p-6 space-y-5 ${className}`}>
      {children}
    </div>
  )
}

function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex items-start gap-3 pb-1">
      <div className="mt-0.5 p-2 rounded-xl bg-white/[0.04] border border-white/[0.06]">{icon}</div>
      <div>
        <h2 className="font-semibold text-base text-white">{title}</h2>
        {subtitle && <p className="text-xs text-text-soft mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}

function SettingSwitch({
  label, description, checked, loading, onChange, disabled, badge
}: {
  label: string; description: string; checked: boolean; loading: boolean; onChange: (v: boolean) => void; disabled?: boolean; badge?: string
}) {
  return (
    <div className={`flex items-center justify-between py-3 border-b border-white/[0.05] last:border-0 ${disabled ? 'opacity-60 grayscale' : ''}`}>
      <div className="flex-1 min-w-0 pr-4">
        <p className="text-sm font-medium text-white flex items-center gap-2">
          {label}
          {badge && <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.1] text-text-soft uppercase tracking-wider">{badge}</span>}
        </p>
        <p className="text-xs text-text-soft mt-0.5">{description}</p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => !loading && !disabled && onChange(!checked)}
        disabled={loading || disabled}
        className={`relative w-11 h-6 rounded-full transition-all duration-300 border focus:outline-none focus:ring-2 focus:ring-brand-violet/50 shrink-0
          ${checked && !disabled
            ? 'bg-brand-violet/30 border-brand-violet/50'
            : 'bg-white/[0.06] border-white/[0.1]'
          } ${(loading || disabled) ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      >
        {loading ? (
          <Loader2 className="w-3 h-3 animate-spin text-text-soft absolute top-1.5 left-4" />
        ) : (
          <div className={`absolute top-1 w-4 h-4 rounded-full shadow transition-all duration-300
            ${checked ? 'left-6 bg-brand-violet' : 'left-1 bg-white/30'}`}
          />
        )}
      </button>
    </div>
  )
}

function PlanIcon({ plan }: { plan: string }) {
  switch (plan) {
    case 'pro': return <Crown className="w-3.5 h-3.5" />
    case 'business': return <Briefcase className="w-3.5 h-3.5" />
    case 'enterprise': return <Building className="w-3.5 h-3.5" />
    default: return <Sparkles className="w-3.5 h-3.5" />
  }
}

function UsageBar({ used, limit, color }: { used: number; limit: number | null; color: string }) {
  const pct = limit === null ? 0 : Math.min(100, (used / limit) * 100)
  const isHigh = pct > 85
  return (
    <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className={`h-full rounded-full ${isHigh ? 'bg-brand-pink' : color}`}
      />
    </div>
  )
}

function LogoutModal({ open, onCancel }: { open: boolean; onCancel: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="logout-backdrop"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9998] flex items-center justify-center p-4"
          style={{ background: 'rgba(5,8,22,0.75)', backdropFilter: 'blur(8px)' }}
          onClick={onCancel}
        >
          <motion.div
            key="logout-panel"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="relative bg-[#080f28]/95 border border-white/10 rounded-2xl p-7 max-w-sm w-full shadow-2xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-brand-pink/10 border border-brand-pink/20">
                <LogOut className="w-5 h-5 text-brand-pink" />
              </div>
              <h3 className="font-semibold text-white text-base">¿Cerrar sesión?</h3>
            </div>
            <p className="text-sm text-text-soft mb-6">
              Se cerrará tu sesión en este dispositivo. Podrás volver a ingresar cuando quieras.
            </p>
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-sm font-medium text-text-soft hover:text-white hover:border-white/20 transition-all"
              >
                Cancelar
              </button>
              <form action={signOut} className="flex-1">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-brand-pink/10 border border-brand-pink/30 text-brand-pink text-sm font-semibold hover:bg-brand-pink/20 transition-all"
                >
                  Cerrar sesión
                </button>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function EditProfileModal({
  open, initialValues, onClose, onSave,
}: {
  open: boolean
  initialValues: { full_name: string }
  onClose: () => void
  onSave: (values: Partial<typeof initialValues>) => Promise<void>
}) {
  const [values, setValues] = useState({ full_name: initialValues.full_name })
  const [saving, setSaving] = useState(false)

  useEffect(() => { setValues({ full_name: initialValues.full_name }) }, [initialValues])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await onSave(values)
    setSaving(false)
    onClose()
  }

  const field = (label: string, key: keyof typeof values, placeholder: string) => (
    <div>
      <label className="block text-xs text-text-soft mb-1.5 font-medium">{label}</label>
      <input
        type="text"
        value={values[key]}
        onChange={(e) => setValues(v => ({ ...v, [key]: e.target.value }))}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-sm text-white placeholder-text-soft focus:outline-none focus:border-brand-violet/50 focus:ring-1 focus:ring-brand-violet/30 transition-all"
      />
    </div>
  )

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9997] flex items-center justify-center p-4"
          style={{ background: 'rgba(5,8,22,0.75)', backdropFilter: 'blur(8px)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#080f28]/95 border border-white/10 rounded-2xl p-7 max-w-md w-full shadow-2xl"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-white text-base">Editar información</h3>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-text-soft hover:text-white transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {field('Nombre visible', 'full_name', 'Tu nombre')}
              <div className="pt-1 rounded-xl bg-white/[0.02] border border-white/[0.06] px-3 py-2.5">
                <p className="text-xs text-text-soft">
                  <Mail className="w-3 h-3 inline mr-1 mb-0.5" />
                  Para cambiar tu correo, escríbenos a{' '}
                  <span className="text-brand-cyan">contacto@conversaai.store</span>
                </p>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-sm font-medium text-text-soft hover:text-white transition-all">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-brand-violet to-brand-blue text-white text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-60">
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando…</> : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function EditCompanyModal({
  open, initialValues, onClose, onSave,
}: {
  open: boolean
  initialValues: { 
    company_name: string; country: string; phone: string; 
    business_type: string; preferred_channel: string; onboarding_goal: string;
    city: string; website: string; support_email: string; address: string; business_hours: string;
  }
  onClose: () => void
  onSave: (values: Partial<typeof initialValues>) => Promise<void>
}) {
  const [values, setValues] = useState({ 
    company_name: initialValues.company_name, country: initialValues.country, phone: initialValues.phone, 
    business_type: initialValues.business_type, preferred_channel: initialValues.preferred_channel, onboarding_goal: initialValues.onboarding_goal,
    city: initialValues.city || '', website: initialValues.website || '', support_email: initialValues.support_email || '', address: initialValues.address || '', business_hours: initialValues.business_hours || '',
    showCustomCity: false
  })
  const [customCity, setCustomCity] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [saving, setSaving] = useState(false)

  // Opciones de configuración
  const countryOptions = [
    'Chile', 'México', 'Colombia', 'Argentina', 'Perú', 'Ecuador', 'Bolivia', 'Paraguay', 'Uruguay', 
    'Brasil', 'Costa Rica', 'Cuba', 'El Salvador', 'Guatemala', 'Honduras', 'Nicaragua', 'Panamá', 
    'Puerto Rico', 'República Dominicana', 'España', 'Estados Unidos', 'Otro'
  ].map(c => ({ value: c, label: c }))

  const cityOptionsByCountry: Record<string, string[]> = {
    'Chile': ['Santiago', 'Valparaíso', 'Viña del Mar', 'Concepción', 'La Serena', 'Antofagasta', 'Temuco', 'Puerto Montt', 'Otra ciudad / región'],
    'México': ['Ciudad de México', 'Guadalajara', 'Monterrey', 'Puebla', 'Querétaro', 'Tijuana', 'Mérida', 'Cancún', 'Otra ciudad / región'],
    'Colombia': ['Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Cartagena', 'Bucaramanga', 'Otra ciudad / región'],
    'Argentina': ['Buenos Aires', 'Córdoba', 'Rosario', 'Mendoza', 'La Plata', 'Otra ciudad / región'],
    'Perú': ['Lima', 'Arequipa', 'Trujillo', 'Cusco', 'Piura', 'Otra ciudad / región'],
    'España': ['Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Málaga', 'Otra ciudad / región'],
    'Estados Unidos': ['Miami', 'Los Angeles', 'New York', 'Houston', 'Chicago', 'Otra ciudad / región']
  }

  const getCityOptions = (country: string) => {
    if (!country) return []
    const cities = cityOptionsByCountry[country]
    if (cities) return cities.map(c => ({ value: c, label: c }))
    return [
      { value: 'Capital / ciudad principal', label: 'Capital / ciudad principal' },
      { value: 'Otra ciudad / región', label: 'Otra ciudad / región' }
    ]
  }

  const channelOptions = [
    { value: 'webchat', label: 'Web Chat en mi sitio' },
    { value: 'telegram', label: 'Telegram', disabled: true, badge: 'Próximamente' },
    { value: 'whatsapp', label: 'WhatsApp', disabled: true, badge: 'Próximamente' }
  ]

  const goalOptions = [
    { value: 'captar_leads', label: 'Captar y calificar leads', description: 'Solicita datos y detecta intención de compra.' },
    { value: 'soporte', label: 'Dar soporte y responder FAQs', description: 'Responde dudas frecuentes y seguimiento.' },
    { value: 'agendar', label: 'Agendar citas / reuniones', description: 'Conecta con tu calendario para agendar.' },
    { value: 'vender', label: 'Aumentar ventas directas', description: 'Orienta hacia productos, precios y cierre.' },
    { value: 'guiar', label: 'Guiar al cliente a comprar', description: 'Asistencia en el proceso de compra.' },
    { value: 'reservas', label: 'Atender reservas', description: 'Gestión de reservas para restaurantes/hoteles.' },
    { value: 'derivar', label: 'Derivar a un asesor humano', description: 'Filtra y asigna conversaciones al equipo.' }
  ]

  useEffect(() => { 
    const c = initialValues.city || ''
    const currentCountryCities = getCityOptions(initialValues.country).map(opt => opt.value)
    const isCustomCity = Boolean(c && !currentCountryCities.includes(c))

    setValues({ 
      company_name: initialValues.company_name, country: initialValues.country, phone: initialValues.phone, 
      business_type: initialValues.business_type, preferred_channel: initialValues.preferred_channel, onboarding_goal: initialValues.onboarding_goal,
      city: isCustomCity ? 'Otra ciudad / región' : c, 
      website: initialValues.website || '', support_email: initialValues.support_email || '', address: initialValues.address || '', business_hours: initialValues.business_hours || '',
      showCustomCity: isCustomCity
    })
  }, [initialValues])

  useEffect(() => {
    if (initialValues.city && initialValues.city !== 'Otra ciudad / región') {
      const currentCountryCities = getCityOptions(initialValues.country).map(opt => opt.value)
      if (!currentCountryCities.includes(initialValues.city)) {
        setCustomCity(initialValues.city)
      } else {
        setCustomCity('')
      }
    } else {
      setCustomCity('')
    }
  }, [initialValues.city, initialValues.country])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg('')

    let finalCity = values.city
    if (values.showCustomCity || values.city === 'Otra ciudad / región') {
      const trimmed = customCity.trim()
      if (!trimmed) {
        setErrorMsg('Por favor especifica tu ciudad.')
        return
      }
      finalCity = trimmed
    }

    setSaving(true)
    try {
      const { showCustomCity, ...restValues } = values
      await onSave({ ...restValues, city: finalCity })
      onClose()
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar los datos.')
    } finally {
      setSaving(false)
    }
  }

  const field = (label: string, key: keyof typeof values, placeholder: string) => (
    <div>
      <label className="block text-xs text-text-soft mb-1.5 font-medium">{label}</label>
      <input
        type="text"
        value={(values[key] as string) || ''}
        onChange={(e) => setValues(v => ({ ...v, [key]: e.target.value }))}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-sm text-white placeholder-text-soft focus:outline-none focus:border-brand-blue/50 focus:ring-1 focus:ring-brand-blue/30 transition-all"
      />
    </div>
  )

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9997] flex items-center justify-center p-4"
          style={{ background: 'rgba(5,8,22,0.75)', backdropFilter: 'blur(8px)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#080f28]/95 border border-white/10 rounded-2xl p-7 max-w-md w-full shadow-2xl"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-white text-base">Perfil del negocio</h3>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-text-soft hover:text-white transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
            {errorMsg && (
              <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-xl">
                {errorMsg}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
              
              {/* Sección 1: Datos del negocio */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2 border-b border-white/[0.05] pb-2">
                  <Building className="w-4 h-4 text-brand-blue" />
                  Datos principales
                </h4>
                {field('Nombre comercial *', 'company_name', 'Ej. Tienda Fashion')}
                {field('Tipo de negocio *', 'business_type', 'Ej. E-commerce, Clínica, etc.')}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-text-soft mb-1.5 font-medium">País *</label>
                    <CustomSelect
                      options={countryOptions}
                      value={values.country}
                      onChange={(v) => {
                        setValues(prev => ({ ...prev, country: v, city: '', showCustomCity: false }))
                      }}
                      placeholder="Seleccionar país"
                      searchable={true}
                    />
                  </div>
                  {field('Teléfono / WhatsApp *', 'phone', 'Ej. +52 55 1234')}
                </div>
              </div>
              
              {/* Sección 2: Configuración inicial */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2 border-b border-white/[0.05] pb-2">
                  <MessageCircle className="w-4 h-4 text-brand-cyan" />
                  Configuración inicial
                </h4>
                <div>
                  <label className="block text-xs text-text-soft mb-1.5 font-medium">Canal principal de contacto *</label>
                  <CustomSelect
                    options={channelOptions}
                    value={values.preferred_channel}
                    onChange={(v) => setValues(prev => ({ ...prev, preferred_channel: v }))}
                    placeholder="Seleccionar canal"
                  />
                </div>

                <div>
                  <label className="block text-xs text-text-soft mb-1.5 font-medium">Objetivo principal del asistente *</label>
                  <CustomSelect
                    options={goalOptions}
                    value={values.onboarding_goal}
                    onChange={(v) => setValues(prev => ({ ...prev, onboarding_goal: v }))}
                    placeholder="Seleccionar un objetivo"
                  />
                </div>
              </div>

              {/* Sección 3: Datos adicionales */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2 border-b border-white/[0.05] pb-2">
                  <Globe2 className="w-4 h-4 text-brand-violet" />
                  Datos adicionales (Opcional)
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-text-soft mb-1.5 font-medium">Ciudad / Región</label>
                    <CustomSelect
                      options={getCityOptions(values.country)}
                      value={values.city}
                      onChange={(v) => {
                        setValues(prev => ({ ...prev, city: v, showCustomCity: v === 'Otra ciudad / región' }))
                      }}
                      placeholder="Seleccionar ciudad"
                      disabled={!values.country}
                      searchable={true}
                    />
                  </div>
                  {values.showCustomCity ? (
                    <div>
                      <label className="block text-xs text-text-soft mb-1.5 font-medium">Especificar ciudad</label>
                      <input
                        id="custom_city"
                        type="text"
                        value={customCity || ''}
                        onChange={(e) => setCustomCity(e.target.value)}
                        placeholder="Escribe tu ciudad o región"
                        className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-sm text-white focus:outline-none focus:border-brand-blue/50 focus:ring-1 focus:ring-brand-blue/30 transition-all"
                      />
                    </div>
                  ) : (
                    field('Sitio web', 'website', 'Ej. www.mitienda.com')
                  )}
                </div>
                {values.showCustomCity && field('Sitio web', 'website', 'Ej. www.mitienda.com')}
                {field('Correo de atención', 'support_email', 'Ej. ayuda@mitienda.com')}
                {field('Dirección física', 'address', 'Ej. Av. Principal 123')}
                {field('Horario general', 'business_hours', 'Ej. Lunes a Viernes 9:00 - 18:00')}
              </div>

              <div className="flex gap-3 pt-4 sticky bottom-0 bg-[#080f28] pb-2">
                <button type="button" onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-sm font-medium text-text-soft hover:text-white transition-all">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-brand-blue/20 text-brand-blue border border-brand-blue/30 text-sm font-semibold hover:bg-brand-blue/30 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando…</> : 'Guardar perfil'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────
export function SettingsClient({ userName, email, joinDate, assistantCount }: Props) {
  const { refreshProfile } = useProfile()

  const [activeTab, setActiveTab] = useState<'profile' | 'company' | 'security' | 'notifications' | 'channels' | 'billing'>('profile')

  // ── Toast state ────────────────────────────────────────────────────────────
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' })
  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type })
  }, [])

  // ── Modal states ───────────────────────────────────────────────────────────
  const [showLogout, setShowLogout] = useState(false)
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [showEditCompany, setShowEditCompany] = useState(false)

  // ── Subscription data ──────────────────────────────────────────────────────
  const [subData, setSubData] = useState<SubscriptionData | null>(null)
  const [subLoading, setSubLoading] = useState(true)

  // ── Settings data ──────────────────────────────────────────────────────────
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [settingsLoading, setSettingsLoading] = useState(true)

  // ── Audit logs ─────────────────────────────────────────────────────────────
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [loadingLogs, setLoadingLogs] = useState(true)

  // ── Notification toggles loading ────────────────────────────────────────────
  const [togglingKey, setTogglingKey] = useState<string | null>(null)

  // ── Security state ─────────────────────────────────────────────────────────
  const [pwStatus, setPwStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [pwMessage, setPwMessage] = useState('')

  // ── Copied state ───────────────────────────────────────────────────────────
  const [copied, setCopied] = useState(false)

  // ── Profile edit initial values ─────────────────────────────────────────────
  const [profileValues, setProfileValues] = useState({ 
    full_name: userName, company_name: '', phone: '', country: '', 
    business_type: '', preferred_channel: '', onboarding_goal: '',
    city: '', website: '', support_email: '', address: '', business_hours: ''
  })
  const [profileLoading, setProfileLoading] = useState(true)

  // ── Initial Fetching ───────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchInitialData() {
      try {
        const [subRes, profileRes, settingsRes] = await Promise.all([
          fetch('/api/subscription'),
          fetch('/api/profile'),
          fetch('/api/settings')
        ])
        const [sub, prof, sett] = await Promise.all([subRes.json(), profileRes.json(), settingsRes.json()])
        
        if (!sub.error) setSubData(sub)
        if (!prof.error) {
          setProfileValues({
            full_name: prof.full_name || userName,
            company_name: prof.company_name || '',
            phone: prof.phone || '',
            country: prof.country || '',
            business_type: prof.business_type || '',
            preferred_channel: prof.preferred_channel || '',
            onboarding_goal: prof.onboarding_goal || '',
            city: prof.city || '',
            website: prof.website || '',
            support_email: prof.support_email || '',
            address: prof.address || '',
            business_hours: prof.business_hours || '',
          })
        }
        if (!sett.error) setSettings(sett)
      } catch (err) {
        console.error('Error fetching settings/sub:', err)
      } finally {
        setSubLoading(false)
        setSettingsLoading(false)
        setProfileLoading(false)
      }
    }

    async function fetchAuditLogs() {
      try {
        const res = await fetch('/api/audit-logs')
        const data = await res.json()
        if (res.ok && data.logs) {
          setAuditLogs(data.logs)
        }
      } catch (err) {
        console.error('Error fetching audit logs:', err)
      } finally {
        setLoadingLogs(false)
      }
    }

    fetchInitialData()
    fetchAuditLogs()
  }, [userName])

  // ── Toggle notification setting ────────────────────────────────────────────
  async function toggleSetting(key: keyof UserSettings, value: boolean) {
    if (!settings) return
    setTogglingKey(key)
    const optimistic = { ...settings, [key]: value }
    setSettings(optimistic)
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      })
      if (!res.ok) {
        setSettings(settings) // rollback
        showToast('No se pudo guardar el cambio', 'error')
      } else {
        showToast('Preferencia guardada')
      }
    } catch {
      setSettings(settings)
      showToast('Error de conexión', 'error')
    } finally {
      setTogglingKey(null)
    }
  }

  // ── Save profile ───────────────────────────────────────────────────────────
  async function handleSaveProfile(values: Partial<typeof profileValues>) {
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setProfileValues(prev => ({ ...prev, ...values }))
        showToast('Información actualizada correctamente')
        refreshProfile()
      } else {
        const errMsg = data.error || 'No se pudo guardar la información'
        showToast(errMsg, 'error')
        console.error('[handleSaveProfile]', data)
      }
    } catch (err) {
      showToast('Error de conexión', 'error')
      console.error('[handleSaveProfile] network error', err)
    }
  }

  // ── Reset password ─────────────────────────────────────────────────────────
  async function handleResetPassword() {
    setPwStatus('loading')
    try {
      const res = await fetch('/api/auth/reset-password', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setPwStatus('success')
        setPwMessage(data.message || 'Revisa tu correo.')
      } else {
        setPwStatus('error')
        setPwMessage(data.error || 'No se pudo enviar el enlace.')
      }
    } catch {
      setPwStatus('error')
      setPwMessage('Error de conexión.')
    }
  }

  // ── Copy telegram link ─────────────────────────────────────────────────────
  function handleCopy() {
    navigator.clipboard.writeText(CONTACT_INFO.telegram).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  // ── Plan info helpers ──────────────────────────────────────────────────────
  const plan = normalizePlan(subData?.subscription?.plan ?? 'trial')
  const planConfig = subData?.planConfig as PlanConfig | undefined
  const usage = subData?.usage
  const planLimits = getPlanLimits(plan)
  const isPremium = plan !== 'trial' && plan !== 'starter' // Define premium appropriately
  const displayName = profileValues.full_name || userName
  const hasAssistant = assistantCount > 0

  // ── Channel statuses ───────────────────────────────────────────────────────
  const channelStatus = {
    webchat: {
      available: true,
      configured: hasAssistant,
      label: 'Web Chat',
      description: hasAssistant ? 'Instalable en tu sitio web' : 'Crea un asistente para instalarlo',
      icon: <Globe2 className="w-4 h-4" />,
      color: 'text-brand-cyan',
      actionLabel: hasAssistant ? 'Ver instalación' : 'Crear asistente',
      actionHref: hasAssistant ? '/dashboard/assistants' : '/dashboard/create-assistant',
    },
    telegram: {
      available: planConfig?.channels.telegram || false,
      configured: false,
      label: 'Telegram',
      description: planConfig?.channels.telegram ? 'Conecta tu bot de Telegram' : 'Disponible en planes avanzados',
      icon: <MessageCircle className="w-4 h-4" />,
      color: 'text-[#0088cc]',
      actionLabel: planConfig?.channels.telegram ? 'Configurar' : 'Mejorar plan',
      actionHref: planConfig?.channels.telegram ? '/dashboard/assistants' : '/dashboard/billing',
    },
    whatsapp: {
      available: false,
      configured: false,
      label: 'WhatsApp',
      description: 'Próximamente disponible',
      icon: <MessageSquare className="w-4 h-4" />,
      color: 'text-brand-success',
      actionLabel: 'Próximamente',
      actionHref: '/dashboard/billing',
    },
  }

  const TABS = [
    { id: 'profile', label: 'Perfil', icon: <User className="w-4 h-4" /> },
    { id: 'company', label: 'Empresa', icon: <Building className="w-4 h-4" /> },
    { id: 'security', label: 'Seguridad', icon: <Shield className="w-4 h-4" /> },
    { id: 'notifications', label: 'Notificaciones', icon: <Bell className="w-4 h-4" /> },
    { id: 'channels', label: 'Canales', icon: <Layers className="w-4 h-4" /> },
    { id: 'billing', label: 'Facturación', icon: <Zap className="w-4 h-4" /> },
  ] as const

  return (
    <>
      <AnimatePresence>
        {toast.show && (
          <Toast key="toast" message={toast.message} type={toast.type} onClose={() => setToast(prev => ({ ...prev, show: false }))} />
        )}
      </AnimatePresence>

      <LogoutModal open={showLogout} onCancel={() => setShowLogout(false)} />
      <EditProfileModal
        open={showEditProfile}
        initialValues={profileValues}
        onClose={() => setShowEditProfile(false)}
        onSave={handleSaveProfile}
      />
      <EditCompanyModal
        open={showEditCompany}
        initialValues={profileValues}
        onClose={() => setShowEditCompany(false)}
        onSave={handleSaveProfile}
      />

      <div className="max-w-6xl mx-auto pb-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
          <p className="text-text-soft mt-1 text-sm">
            Controla tu cuenta, seguridad, notificaciones e integraciones desde un solo lugar.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-8 items-start">
          
          {/* Sidebar Menu */}
          <div className="w-full md:w-64 shrink-0 space-y-1 bg-card-bg/50 p-2 rounded-2xl border border-card-border backdrop-blur-xl">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-brand-violet/10 text-brand-violet border border-brand-violet/20 shadow-[0_0_15px_rgba(124,58,237,0.1)]'
                    : 'text-text-soft hover:text-white hover:bg-white/[0.04] border border-transparent'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content Area */}
          <div className="flex-1 w-full min-w-0 space-y-6">
            
            {/* ── PERFIL ──────────────────────────────────────────────────────── */}
            {activeTab === 'profile' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <SectionCard>
                  <SectionHeader
                    icon={<User className="w-4.5 h-4.5 text-brand-violet" />}
                    title="Información personal"
                    subtitle="Tus datos básicos de contacto e identificación."
                  />
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                    <div className="relative shrink-0">
                      <div className="w-16 h-16 rounded-2xl gradient-btn flex items-center justify-center text-white font-bold text-2xl shadow-[0_0_30px_rgba(124,58,237,0.3)]">
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-lg text-white mb-0.5">{displayName}</p>
                      <p className="text-text-soft text-sm flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5" /> {email}
                      </p>
                      {profileValues.phone && (
                        <p className="text-text-soft text-sm mt-1 flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5" /> {profileValues.phone}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => setShowEditProfile(true)}
                      className="shrink-0 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-sm font-medium text-text-soft hover:text-white hover:border-brand-violet/40 transition-all"
                    >
                      Editar perfil
                    </button>
                  </div>
                </SectionCard>

                <SectionCard>
                  <SectionHeader
                    icon={<Bot className="w-4.5 h-4.5 text-brand-cyan" />}
                    title="Resumen de cuenta"
                    subtitle="Datos rápidos sobre tu cuenta en ConversaAI."
                  />
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                      <div className="shrink-0"><Shield className="w-4 h-4 text-brand-success" /></div>
                      <div>
                        <p className="text-xs text-text-soft">Estado de la cuenta</p>
                        <p className="text-sm font-medium text-brand-success">Verificado</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                      <div className="shrink-0"><Bot className="w-4 h-4 text-text-soft" /></div>
                      <div>
                        <p className="text-xs text-text-soft">Asistentes creados</p>
                        <p className="text-sm font-medium text-white">{assistantCount}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                      <div className="shrink-0"><Mail className="w-4 h-4 text-text-soft" /></div>
                      <div>
                        <p className="text-xs text-text-soft">Miembro desde</p>
                        <p className="text-sm font-medium text-white">{joinDate}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                      <div className="shrink-0"><PlanIcon plan={plan} /></div>
                      <div>
                        <p className="text-xs text-text-soft">Plan actual</p>
                        <p className="text-sm font-medium text-white">
                          {planConfig?.label ?? 'Free'}
                          {isPremium && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-brand-violet/20 text-brand-purple uppercase tracking-wider">Activo</span>}
                        </p>
                      </div>
                    </div>
                  </div>
                </SectionCard>
              </motion.div>
            )}

            {/* ── EMPRESA ─────────────────────────────────────────────────────── */}
            {activeTab === 'company' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                
                {/* A. Tarjeta Datos comerciales */}
                <SectionCard>
                  <div className="flex sm:items-center justify-between gap-4 mb-6 flex-col sm:flex-row">
                    <SectionHeader
                      icon={<Building className="w-4.5 h-4.5 text-brand-blue" />}
                      title="Datos comerciales"
                      subtitle="Información principal de tu negocio en ConversaAI."
                    />
                    <button
                      onClick={() => setShowEditCompany(true)}
                      className="shrink-0 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-sm font-medium text-text-soft hover:text-white hover:border-brand-blue/40 transition-all flex items-center gap-2"
                    >
                      Editar perfil del negocio
                    </button>
                  </div>
                  
                  <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                      <p className="text-xs text-text-soft mb-1">Nombre comercial</p>
                      <p className="text-sm font-medium text-white flex items-center gap-2">
                        <Building className="w-4 h-4 text-text-soft shrink-0" />
                        <span className="truncate">{profileValues.company_name || <span className="text-brand-pink/80 text-xs font-normal">Pendiente de completar</span>}</span>
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                      <p className="text-xs text-text-soft mb-1">Tipo de negocio</p>
                      <p className="text-sm font-medium text-white flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-text-soft shrink-0" />
                        <span className="truncate capitalize">{profileValues.business_type || <span className="text-brand-pink/80 text-xs font-normal">Pendiente de completar</span>}</span>
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                      <p className="text-xs text-text-soft mb-1">País</p>
                      <p className="text-sm font-medium text-white flex items-center gap-2">
                        <Globe2 className="w-4 h-4 text-text-soft shrink-0" />
                        <span className="truncate">{profileValues.country || <span className="text-brand-pink/80 text-xs font-normal">Pendiente de completar</span>}</span>
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                      <p className="text-xs text-text-soft mb-1">Teléfono / WhatsApp</p>
                      <p className="text-sm font-medium text-white flex items-center gap-2">
                        <Phone className="w-4 h-4 text-text-soft shrink-0" />
                        <span className="truncate">{profileValues.phone || <span className="text-brand-pink/80 text-xs font-normal">Pendiente de completar</span>}</span>
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                      <p className="text-xs text-text-soft mb-1">Canal preferido</p>
                      <p className="text-sm font-medium text-white flex items-center gap-2">
                        <MessageCircle className="w-4 h-4 text-text-soft shrink-0" />
                        <span className="truncate capitalize">{profileValues.preferred_channel || <span className="text-brand-pink/80 text-xs font-normal">Pendiente de completar</span>}</span>
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                      <p className="text-xs text-text-soft mb-1">Objetivo principal</p>
                      <p className="text-sm font-medium text-white flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-text-soft shrink-0" />
                        <span className="truncate capitalize">{profileValues.onboarding_goal?.replace('_', ' ') || <span className="text-brand-pink/80 text-xs font-normal">Pendiente de completar</span>}</span>
                      </p>
                    </div>
                  </div>

                  {(profileValues.city || profileValues.website || profileValues.support_email || profileValues.address || profileValues.business_hours) && (
                    <>
                      <h4 className="text-sm font-medium text-white mt-6 mb-3 flex items-center gap-2">
                        <Globe2 className="w-4 h-4 text-text-soft" /> Datos adicionales
                      </h4>
                      <div className="grid sm:grid-cols-2 gap-4">
                        {profileValues.city && (
                          <div className="p-3 rounded-xl bg-white/[0.01] border border-white/[0.05] flex justify-between items-center">
                            <span className="text-xs text-text-soft">Ciudad</span>
                            <span className="text-sm font-medium text-white truncate max-w-[60%]">{profileValues.city}</span>
                          </div>
                        )}
                        {profileValues.website && (
                          <div className="p-3 rounded-xl bg-white/[0.01] border border-white/[0.05] flex justify-between items-center">
                            <span className="text-xs text-text-soft">Sitio web</span>
                            <span className="text-sm font-medium text-brand-cyan truncate max-w-[60%]">{profileValues.website}</span>
                          </div>
                        )}
                        {profileValues.support_email && (
                          <div className="p-3 rounded-xl bg-white/[0.01] border border-white/[0.05] flex justify-between items-center">
                            <span className="text-xs text-text-soft">Correo</span>
                            <span className="text-sm font-medium text-white truncate max-w-[60%]">{profileValues.support_email}</span>
                          </div>
                        )}
                        {profileValues.business_hours && (
                          <div className="p-3 rounded-xl bg-white/[0.01] border border-white/[0.05] flex justify-between items-center">
                            <span className="text-xs text-text-soft">Horario</span>
                            <span className="text-sm font-medium text-white truncate max-w-[60%]">{profileValues.business_hours}</span>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </SectionCard>

                {/* B. Tarjeta Preparación del perfil */}
                <SectionCard>
                  <SectionHeader
                    icon={<CheckCircle2 className="w-4.5 h-4.5 text-brand-success" />}
                    title="Preparación del perfil"
                    subtitle="Progreso de tu configuración comercial inicial."
                  />
                  <div className="grid sm:grid-cols-2 gap-3 mt-4">
                    {[
                      { label: 'Nombre comercial configurado', done: !!profileValues.company_name },
                      { label: 'Tipo de negocio configurado', done: !!profileValues.business_type },
                      { label: 'País configurado', done: !!profileValues.country },
                      { label: 'Ciudad / región configurada', done: !!profileValues.city },
                      { label: 'Teléfono agregado', done: !!profileValues.phone },
                      { label: 'Canal preferido configurado', done: !!profileValues.preferred_channel },
                      { label: 'Objetivo principal configurado', done: !!profileValues.onboarding_goal },
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center border shrink-0 ${item.done ? 'bg-brand-success/20 border-brand-success/50' : 'bg-white/[0.04] border-white/[0.1]'}`}>
                          {item.done && <Check className="w-3.5 h-3.5 text-brand-success" />}
                        </div>
                        <span className={`text-sm truncate ${item.done ? 'text-white' : 'text-text-soft'}`}>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </SectionCard>

                {/* C. Tarjeta Cómo se usa esta información */}
                <SectionCard>
                  <SectionHeader
                    icon={<Bot className="w-4.5 h-4.5 text-brand-violet" />}
                    title="Cómo se usa esta información"
                    subtitle="El impacto de tu perfil en la plataforma"
                  />
                  <div className="p-4 rounded-xl bg-brand-violet/5 border border-brand-violet/10 text-sm text-text-soft leading-relaxed">
                    Estos datos ayudan a crear plantillas, sugerir configuraciones y preparar asistentes más precisos para tu tipo de negocio. <strong className="text-white font-medium">No reemplazan la información específica que agregas en cada asistente individual.</strong>
                  </div>
                </SectionCard>
              </motion.div>
            )}

            {/* ── SEGURIDAD ───────────────────────────────────────────────────── */}
            {activeTab === 'security' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <SectionCard>
                  <SectionHeader
                    icon={<Key className="w-4.5 h-4.5 text-brand-violet" />}
                    title="Contraseña y acceso"
                    subtitle="Actualiza tus credenciales para mantener tu cuenta segura."
                  />
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <div>
                      <p className="text-sm font-medium text-white">Cambiar contraseña</p>
                      <p className="text-xs text-text-soft mt-0.5">
                        Te enviaremos un enlace seguro a <span className="text-brand-cyan">{email}</span>
                      </p>
                    </div>
                    <div className="shrink-0">
                      {pwStatus === 'idle' && (
                        <button
                          onClick={handleResetPassword}
                          className="px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-sm font-medium text-text-soft hover:text-white hover:border-brand-violet/30 transition-all"
                        >
                          Enviar enlace
                        </button>
                      )}
                      {pwStatus === 'loading' && (
                        <div className="flex items-center gap-2 text-text-soft text-sm px-4 py-2.5">
                          <Loader2 className="w-4 h-4 animate-spin" /> Enviando…
                        </div>
                      )}
                      {pwStatus === 'success' && (
                        <div className="flex items-center gap-2 text-brand-success text-sm px-4 py-2.5">
                          <CheckCircle2 className="w-4 h-4" /> {pwMessage}
                        </div>
                      )}
                      {pwStatus === 'error' && (
                        <div className="flex flex-col gap-1 items-end">
                          <div className="flex items-center gap-2 text-brand-pink text-sm">
                            <AlertCircle className="w-4 h-4" /> {pwMessage}
                          </div>
                          <button onClick={() => setPwStatus('idle')} className="text-xs text-text-soft hover:text-white">
                            Intentar de nuevo
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-brand-violet/5 border border-brand-violet/10 flex items-start gap-3">
                    <Shield className="w-4 h-4 text-brand-violet shrink-0 mt-0.5" />
                    <p className="text-xs text-text-soft leading-relaxed">
                      Recomendamos usar una contraseña larga y única para ConversaAI. No compartas tu contraseña con nadie.
                    </p>
                  </div>
                </SectionCard>

                <SectionCard>
                  <SectionHeader
                    icon={<Shield className="w-4.5 h-4.5 text-brand-purple" />}
                    title="Actividad de Seguridad"
                    subtitle="Tus registros de actividad reciente (inicios de sesión, cambios, etc.)."
                  />
                  <div className="mt-4">
                    {loadingLogs ? (
                      <div className="flex items-center gap-2 text-text-soft text-sm">
                        <Loader2 className="w-4 h-4 animate-spin" /> Cargando actividad...
                      </div>
                    ) : auditLogs.length === 0 ? (
                      <p className="text-sm text-text-soft">No hay actividad registrada aún.</p>
                    ) : (
                      <div className="space-y-3">
                        {auditLogs.map(log => (
                          <div key={log.id} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                            <div className="mt-0.5"><Shield className="w-4 h-4 text-brand-cyan/60" /></div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white">{log.action}</p>
                              <p className="text-xs text-text-soft mt-0.5">{log.description}</p>
                              <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-text-soft/60">
                                <span>{new Date(log.created_at).toLocaleString('es-ES')}</span>
                                {log.ip_address && <span>• IP: {log.ip_address}</span>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </SectionCard>

                <div className="bg-brand-pink/5 border border-brand-pink/20 rounded-2xl p-6 space-y-4">
                  <SectionHeader
                    icon={<LogOut className="w-4.5 h-4.5 text-brand-pink" />}
                    title="Cerrar Sesión"
                    subtitle="Finaliza tu sesión en este dispositivo."
                  />
                  <button
                    onClick={() => setShowLogout(true)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-pink/10 border border-brand-pink/30 text-brand-pink font-semibold text-sm hover:bg-brand-pink/20 transition-all"
                  >
                    <LogOut className="w-4 h-4" />
                    Cerrar sesión
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── NOTIFICACIONES ──────────────────────────────────────────────── */}
            {activeTab === 'notifications' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                
                {settingsLoading ? (
                  <SectionCard>
                    <div className="flex items-center gap-2 text-text-soft text-sm py-4 justify-center">
                      <Loader2 className="w-5 h-5 animate-spin" /> Cargando preferencias…
                    </div>
                  </SectionCard>
                ) : settings ? (
                  <>
                    <SectionCard>
                      <SectionHeader
                        icon={<MessageSquare className="w-4.5 h-4.5 text-brand-cyan" />}
                        title="Actividad comercial"
                        subtitle="Avisos sobre la interacción con tus clientes"
                      />
                      <SettingSwitch
                        label="Alertas de leads"
                        description="Notificación cuando se captura un nuevo lead con datos"
                        checked={!!settings.lead_alerts}
                        loading={togglingKey === 'lead_alerts'}
                        onChange={(v) => toggleSetting('lead_alerts', v)}
                      />
                      <SettingSwitch
                        label="Nuevas conversaciones"
                        description="Aviso cuando tu asistente inicia una nueva conversación"
                        checked={!!settings.conversation_alerts}
                        loading={togglingKey === 'conversation_alerts'}
                        onChange={(v) => toggleSetting('conversation_alerts', v)}
                      />
                    </SectionCard>

                    <SectionCard>
                      <SectionHeader
                        icon={<Shield className="w-4.5 h-4.5 text-brand-violet" />}
                        title="Uso, cuenta y seguridad"
                        subtitle="Alertas sobre límites, facturación y accesos"
                      />
                      <SettingSwitch
                        label="Límite de mensajes"
                        description="Alerta cuando alcances el 80%, 90% y límite de tu plan"
                        checked={!!settings.usage_limit_alerts}
                        loading={togglingKey === 'usage_limit_alerts'}
                        onChange={(v) => toggleSetting('usage_limit_alerts', v)}
                      />
                      <SettingSwitch
                        label="Pagos y suscripción"
                        description="Confirmaciones de pago y actualizaciones de tu plan"
                        checked={!!settings.billing_alerts}
                        loading={togglingKey === 'billing_alerts'}
                        onChange={(v) => toggleSetting('billing_alerts', v)}
                      />
                      <SettingSwitch
                        label="Alertas de seguridad"
                        description="Inicios de sesión y cambios importantes en tu cuenta"
                        checked={!!settings.security_alerts}
                        loading={togglingKey === 'security_alerts'}
                        onChange={(v) => toggleSetting('security_alerts', v)}
                      />
                    </SectionCard>

                    <SectionCard>
                      <SectionHeader
                        icon={<BarChart3 className="w-4.5 h-4.5 text-brand-blue" />}
                        title="Resúmenes y Novedades"
                        subtitle="Mantente al día con métricas y actualizaciones"
                      />
                      <SettingSwitch
                        label="Resumen semanal"
                        description="Recibe un reporte de tu rendimiento cada semana"
                        checked={!!settings.weekly_summary}
                        loading={togglingKey === 'weekly_summary'}
                        onChange={(v) => toggleSetting('weekly_summary', v)}
                      />
                      <SettingSwitch
                        label="Actualizaciones de producto"
                        description="Nuevas funciones y mejoras en ConversaAI"
                        checked={!!settings.product_updates}
                        loading={togglingKey === 'product_updates'}
                        onChange={(v) => toggleSetting('product_updates', v)}
                      />
                    </SectionCard>

                    <SectionCard>
                      <SectionHeader
                        icon={<Bell className="w-4.5 h-4.5 text-text-soft" />}
                        title="Canales de notificación"
                        subtitle="Dónde quieres recibir estas alertas"
                      />
                      <SettingSwitch
                        label="Dashboard"
                        description="Alertas integradas dentro de la plataforma"
                        checked={!!settings.dashboard_notifications}
                        loading={togglingKey === 'dashboard_notifications'}
                        onChange={(v) => toggleSetting('dashboard_notifications', v)}
                      />
                      <SettingSwitch
                        label="Correo electrónico"
                        description="Próximamente disponible"
                        checked={false}
                        loading={false}
                        onChange={() => {}}
                        disabled={true}
                        badge="Próximamente"
                      />
                      <SettingSwitch
                        label="Telegram"
                        description="Próximamente disponible"
                        checked={false}
                        loading={false}
                        onChange={() => {}}
                        disabled={true}
                        badge="Próximamente"
                      />
                    </SectionCard>
                  </>
                ) : (
                  <SectionCard>
                    <p className="text-sm text-text-soft text-center py-4">No se pudieron cargar las preferencias.</p>
                  </SectionCard>
                )}
              </motion.div>
            )}

            {/* ── CANALES ─────────────────────────────────────────────────────── */}
            {activeTab === 'channels' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <SectionCard>
                  <SectionHeader
                    icon={<Layers className="w-4.5 h-4.5 text-brand-violet" />}
                    title="Integraciones rápidas"
                    subtitle="Conecta los canales donde tus clientes ya te escriben."
                  />
                  <div className="space-y-3">
                    {(Object.entries(channelStatus) as [keyof typeof channelStatus, (typeof channelStatus)[keyof typeof channelStatus]][]).map(([key, ch]) => (
                      <div key={key} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`${ch.color} shrink-0`}>{ch.icon}</div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white">{ch.label}</p>
                            <p className={`text-xs mt-0.5 flex items-center gap-1 truncate ${
                              ch.available ? 'text-brand-success' : 'text-text-soft'
                            }`}>
                              {ch.available ? <Wifi className="w-3 h-3 shrink-0" /> : <WifiOff className="w-3 h-3 shrink-0" />}
                              {ch.description}
                            </p>
                          </div>
                        </div>
                        <Link
                          href={ch.actionHref}
                          className={`shrink-0 text-xs px-3 py-1.5 rounded-lg border transition-all ${
                            ch.available
                              ? 'bg-white/[0.04] border-white/[0.1] text-text-soft hover:text-white hover:border-white/20'
                              : key === 'whatsapp'
                                ? 'bg-white/[0.02] border-white/[0.06] text-text-soft cursor-default pointer-events-none'
                                : 'bg-brand-violet/10 border-brand-violet/20 text-brand-purple hover:bg-brand-violet/20'
                          }`}
                        >
                          {ch.actionLabel}
                        </Link>
                      </div>
                    ))}
                  </div>
                </SectionCard>

                <SectionCard>
                  <SectionHeader
                    icon={<MessageCircle className="w-4.5 h-4.5 text-[#0088cc]" />}
                    title="Bot oficial de Telegram"
                    subtitle='Usa el bot oficial para probar ConversaAI, recibir ayuda rápida y validar cómo respondería tu asistente en Telegram.'
                  />
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-white/[0.03] border border-[#0088cc]/20">
                    <MessageCircle className="w-4 h-4 text-[#0088cc] shrink-0" />
                    <span className="text-sm font-mono text-brand-cyan flex-1 truncate">{CONTACT_INFO.telegram}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[#0088cc]/10 border border-[#0088cc]/20 text-[#0088cc] hidden sm:inline-block">
                      Para pruebas
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <a
                      href={CONTACT_INFO.telegram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0088cc]/10 border border-[#0088cc]/30 text-[#0088cc] font-semibold text-sm hover:bg-[#0088cc]/20 transition-all"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Abrir bot
                    </a>
                    <button
                      onClick={handleCopy}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-sm font-medium text-text-soft hover:text-white hover:border-white/20 transition-all"
                    >
                      {copied ? <><Check className="w-4 h-4 text-brand-success" /> Copiado</> : <><Copy className="w-4 h-4" /> Copiar enlace</>}
                    </button>
                  </div>
                </SectionCard>
              </motion.div>
            )}

            {/* ── FACTURACIÓN ─────────────────────────────────────────────────── */}
            {activeTab === 'billing' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <SectionCard>
                  <SectionHeader
                    icon={<Zap className="w-4.5 h-4.5 text-brand-cyan" />}
                    title="Uso de tu plan y límites"
                    subtitle="Seguimiento de tus recursos activos y límites de cuota mensual."
                  />
                  {subLoading ? (
                    <div className="flex items-center gap-2 text-text-soft text-sm py-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Cargando plan…
                    </div>
                  ) : (
                    <>
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold
                        ${isPremium
                          ? 'bg-gradient-to-r from-brand-violet to-brand-blue text-white shadow-[0_0_12px_rgba(124,58,237,0.4)]'
                          : 'bg-white/[0.06] border border-white/[0.1] text-text-secondary'
                        }`}>
                        <PlanIcon plan={plan} />
                        Plan {planConfig?.label ?? 'Free'}
                        {isPremium && <span className="opacity-70">· Activo</span>}
                      </div>

                      <div className="space-y-5 mt-4">
                        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-white flex items-center gap-2 font-medium">
                              <Bot className="w-4 h-4 text-brand-violet" /> Asistentes
                            </span>
                            <span className="text-sm font-semibold text-white">
                              {usage?.assistantsUsed ?? 0}
                              <span className="text-text-soft font-normal">
                                {' '}/ {planLimits.assistants === null ? 'Ilimitado' : planLimits.assistants}
                              </span>
                            </span>
                          </div>
                          <UsageBar
                            used={usage?.assistantsUsed ?? 0}
                            limit={planLimits.assistants}
                            color="bg-gradient-to-r from-brand-violet to-brand-blue"
                          />
                          <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
                            Tener más asistentes te permite automatizar más áreas (ventas, soporte, reservas) sin mezclar información. No es necesario poner todo en uno solo.
                          </p>
                        </div>

                        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-white flex items-center gap-2 font-medium">
                              <MessageSquare className="w-4 h-4 text-brand-cyan" /> Mensajes del mes
                            </span>
                            <span className="text-sm font-semibold text-white">
                              {(usage?.messagesUsed ?? 0).toLocaleString()}
                              <span className="text-text-soft font-normal">
                                {' '}/ {planLimits.messagesPerMonth === null ? 'Ilimitado' : planLimits.messagesPerMonth.toLocaleString()}
                              </span>
                            </span>
                          </div>
                          <UsageBar
                            used={usage?.messagesUsed ?? 0}
                            limit={planLimits.messagesPerMonth}
                            color="bg-gradient-to-r from-brand-cyan to-brand-blue"
                          />
                        </div>
                      </div>

                      <div className="pt-4">
                        <div className="bg-gradient-to-r from-brand-violet/5 to-brand-cyan/5 border border-brand-violet/20 rounded-xl p-4 flex flex-col sm:flex-row items-center gap-4 justify-between">
                          <div>
                            <h4 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-brand-violet" /> Recomendación para ti
                            </h4>
                            <p className="text-xs text-text-soft">
                              {plan === 'trial' && (usage?.messagesUsed ?? 0) > 80 ? 'Estás cerca del límite. Mejora tu plan para más asistentes y mensajes.' :
                               plan === 'trial' ? 'El plan Trial es perfecto para empezar. Mejora a Starter o superior cuando necesites más mensajes y canales.' :
                               plan === 'pro' && (usage?.messagesUsed ?? 0) > 4000 ? 'Tu volumen está creciendo rápido. Considera el plan Business.' :
                               plan === 'business' ? 'Tu plan está preparado para mayor volumen. ¡Excelente trabajo!' :
                               'Plan personalizado y adaptado a tus necesidades.'}
                            </p>
                          </div>
                          {plan !== 'enterprise' && plan !== 'business' && (
                            <Link
                              href="/dashboard/billing"
                              className="shrink-0 px-4 py-2 rounded-lg bg-brand-violet text-white text-xs font-semibold hover:bg-brand-violet/90 transition-all"
                            >
                              Mejorar plan
                            </Link>
                          )}
                        </div>
                      </div>

                      <div className="pt-4 mt-4 border-t border-white/[0.05]">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-sm font-semibold text-white">Qué incluye tu plan {planConfig?.label}</h4>
                          <Link href="/dashboard/billing" className="text-xs font-medium text-brand-violet hover:text-brand-purple">
                            Ver detalles
                          </Link>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-3">
                           {planConfig?.features.map((feat, i) => (
                             <div key={i} className="flex items-center gap-2 text-xs text-text-soft">
                               <CheckCircle2 className="w-3.5 h-3.5 text-brand-success" />
                               {feat}
                             </div>
                           ))}
                        </div>
                      </div>


                    </>
                  )}
                </SectionCard>
              </motion.div>
            )}

          </div>
        </div>
      </div>
    </>
  )
}
