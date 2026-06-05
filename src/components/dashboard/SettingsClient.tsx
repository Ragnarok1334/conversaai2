'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  User, Mail, Shield, LogOut, Bell, Key, MessageCircle,
  ExternalLink, Copy, Check, Zap, Bot, Globe2, Layers,
  BarChart3, Loader2, AlertCircle, CheckCircle2, X,
  Wifi, WifiOff, ChevronRight, Sparkles, Crown, Briefcase,
  Building, MessageSquare,
} from 'lucide-react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { CONTACT_INFO } from '@/lib/contact'
import { signOut } from '@/app/auth/actions'
import { useProfile } from '@/providers/ProfileProvider'
import type { PlanKey } from '@/lib/plans'
import { PLAN_LIMITS } from '@/lib/plans'

// ─── Types ─────────────────────────────────────────────────────────────────

interface UserSettings {
  weekly_summary: boolean
  lead_alerts: boolean
  conversation_alerts: boolean
  message_limit_alerts: boolean
  payment_alerts: boolean
  dashboard_density: 'comfortable' | 'compact'
  default_dashboard_page: string
}

interface SubscriptionData {
  subscription: { plan: string; status: string }
  planConfig: { label: string; assistantsLimit: number | null; messagesLimit: number | null; channels: string[] }
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

/** Toggle switch with loading state */
function SettingSwitch({
  label, description, checked, loading, onChange,
}: {
  label: string; description: string; checked: boolean; loading: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-white/[0.05] last:border-0">
      <div className="flex-1 min-w-0 pr-4">
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="text-xs text-text-soft mt-0.5">{description}</p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => !loading && onChange(!checked)}
        disabled={loading}
        className={`relative w-11 h-6 rounded-full transition-all duration-300 border focus:outline-none focus:ring-2 focus:ring-brand-violet/50 shrink-0
          ${checked
            ? 'bg-brand-violet/30 border-brand-violet/50'
            : 'bg-white/[0.06] border-white/[0.1]'
          } ${loading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
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

// ─── Plan badge ─────────────────────────────────────────────────────────────

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

// ─── Logout confirmation modal ───────────────────────────────────────────────

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

// ─── Edit profile modal ──────────────────────────────────────────────────────

function EditProfileModal({
  open, initialValues, onClose, onSave,
}: {
  open: boolean
  initialValues: { full_name: string; company_name: string; phone: string; country: string }
  onClose: () => void
  onSave: (values: typeof initialValues) => Promise<void>
}) {
  const [values, setValues] = useState(initialValues)
  const [saving, setSaving] = useState(false)

  useEffect(() => { setValues(initialValues) }, [initialValues])

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
              <h3 className="font-semibold text-white text-base">Editar perfil</h3>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-text-soft hover:text-white transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {field('Nombre visible', 'full_name', 'Tu nombre')}
              {field('Empresa (opcional)', 'company_name', 'Nombre de tu empresa')}
              {field('Teléfono (opcional)', 'phone', '+56 9 1234 5678')}
              {field('País (opcional)', 'country', 'Chile')}
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

// ─── Main component ──────────────────────────────────────────────────────────
export function SettingsClient({ userName, email, joinDate, assistantCount }: Props) {
  const { refreshProfile } = useProfile()

  // ── Toast state ────────────────────────────────────────────────────────────
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' })
  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type })
  }, [])

  // ── Modal states ───────────────────────────────────────────────────────────
  const [showLogout, setShowLogout] = useState(false)
  const [showEditProfile, setShowEditProfile] = useState(false)

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
  const [profileValues, setProfileValues] = useState({ full_name: userName, company_name: '', phone: '', country: '' })
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
  async function handleSaveProfile(values: typeof profileValues) {
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: values.full_name,
          company_name: values.company_name,
          phone: values.phone,
          country: values.country,
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setProfileValues(values)
        showToast('Perfil actualizado correctamente')
        refreshProfile()
      } else {
        const errMsg = data.error || 'No se pudo guardar el perfil'
        showToast(errMsg, 'error')
        console.error('[handleSaveProfile]', data)
      }
    } catch (err) {
      showToast('Error de conexión al guardar perfil', 'error')
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
  const plan = (subData?.subscription?.plan ?? 'free') as PlanKey
  const planConfig = subData?.planConfig
  const usage = subData?.usage
  const planLimits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free
  const isPremium = plan !== 'free'
  const displayName = profileValues.full_name || userName
  const hasAssistant = assistantCount > 0

  // ── Channel statuses ───────────────────────────────────────────────────────
  // Web Chat: always available per plan; actionable only if user has an assistant
  // Telegram: requires plan that includes telegram
  // WhatsApp: always 'coming soon' as backend is not yet implemented
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
      available: planLimits.channels.telegram,
      configured: false,
      label: 'Telegram',
      description: planLimits.channels.telegram ? 'Conecta tu bot de Telegram' : 'Disponible desde el plan Pro',
      icon: <MessageCircle className="w-4 h-4" />,
      color: 'text-[#0088cc]',
      actionLabel: planLimits.channels.telegram ? 'Configurar' : 'Mejorar plan',
      actionHref: planLimits.channels.telegram ? '/dashboard/assistants' : '/dashboard/billing',
    },
    whatsapp: {
      available: false, // Not yet implemented — always show as coming soon
      configured: false,
      label: 'WhatsApp',
      description: 'Próximamente disponible',
      icon: <MessageSquare className="w-4 h-4" />,
      color: 'text-brand-success',
      actionLabel: 'Próximamente',
      actionHref: '/dashboard/billing',
    },
  }

  return (
    <>
      {/* Toast */}
      <AnimatePresence>
        {toast.show && (
          <Toast key="toast" message={toast.message} type={toast.type} onClose={() => setToast(prev => ({ ...prev, show: false }))} />
        )}
      </AnimatePresence>

      {/* Modals */}
      <LogoutModal open={showLogout} onCancel={() => setShowLogout(false)} />
      <EditProfileModal
        open={showEditProfile}
        initialValues={profileValues}
        onClose={() => setShowEditProfile(false)}
        onSave={handleSaveProfile}
      />

      <div className="max-w-3xl mx-auto space-y-6">

        {/* ── Page header ─────────────────────────────────────────────────── */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
          <p className="text-text-soft mt-1 text-sm">
            Controla tu cuenta, seguridad, notificaciones e integraciones desde un solo lugar.
          </p>
        </div>

        {/* ── 1. Perfil y cuenta ──────────────────────────────────────────── */}
        <SectionCard>
          <SectionHeader
            icon={<User className="w-4.5 h-4.5 text-brand-violet" />}
            title="Perfil y cuenta"
            subtitle="Información principal de tu cuenta y estado de uso."
          />

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-16 h-16 rounded-2xl gradient-btn flex items-center justify-center text-white font-bold text-2xl shadow-[0_0_30px_rgba(124,58,237,0.3)]">
                {displayName.charAt(0).toUpperCase()}
              </div>
              {isPremium && (
                <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gradient-to-r from-brand-violet to-brand-blue flex items-center justify-center">
                  <PlanIcon plan={plan} />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                <p className="font-semibold text-lg text-white">{displayName}</p>
                {profileValues.company_name && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-text-soft">
                    {profileValues.company_name}
                  </span>
                )}
              </div>
              <p className="text-text-soft text-sm flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" /> {email}
              </p>
              {profileValues.phone && (
                <p className="text-text-soft text-xs mt-0.5">{profileValues.phone}</p>
              )}
            </div>

            {/* Edit button */}
            <button
              onClick={() => setShowEditProfile(true)}
              className="shrink-0 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-sm font-medium text-text-soft hover:text-white hover:border-brand-violet/40 transition-all"
            >
              Editar perfil
            </button>
          </div>

          {/* Meta grid */}
          <div className="grid sm:grid-cols-2 gap-3 pt-2">
            {[
              { icon: <Shield className="w-4 h-4 text-brand-success" />, label: 'Estado', value: 'Verificado', green: true },
              { icon: <Bot className="w-4 h-4 text-text-soft" />, label: 'Asistentes', value: `${assistantCount} creados` },
              { icon: <Mail className="w-4 h-4 text-text-soft" />, label: 'Miembro desde', value: joinDate },
              {
                icon: <PlanIcon plan={plan} />,
                label: 'Plan actual',
                value: planConfig?.label ?? 'Free',
                badge: isPremium,
              },
            ].map(({ icon, label, value, green, badge }) => (
              <div key={label} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <div className="shrink-0">{icon}</div>
                <div className="min-w-0">
                  <p className="text-xs text-text-soft">{label}</p>
                  <p className={`text-sm font-medium truncate ${green ? 'text-brand-success' : 'text-white'}`}>
                    {value}
                    {badge && <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full bg-brand-violet/20 text-brand-purple">activo</span>}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* ── 2. Plan y límites ────────────────────────────────────────────── */}
        <SectionCard>
          <SectionHeader
            icon={<Zap className="w-4.5 h-4.5 text-brand-cyan" />}
            title="Uso de tu plan"
            subtitle="Seguimiento de tus recursos y límites activos."
          />

          {subLoading ? (
            <div className="flex items-center gap-2 text-text-soft text-sm py-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Cargando plan…
            </div>
          ) : (
            <>
              {/* Plan badge */}
              <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold
                ${isPremium
                  ? 'bg-gradient-to-r from-brand-violet to-brand-blue text-white shadow-[0_0_12px_rgba(124,58,237,0.4)]'
                  : 'bg-white/[0.06] border border-white/[0.1] text-text-secondary'
                }`}>
                <PlanIcon plan={plan} />
                Plan {planConfig?.label ?? 'Free'}
                {isPremium && <span className="opacity-70">· Activo</span>}
              </div>

              {/* Usage bars */}
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs text-text-soft flex items-center gap-1.5">
                      <Bot className="w-3.5 h-3.5" /> Asistentes
                    </span>
                    <span className="text-xs font-semibold text-white">
                      {usage?.assistantsUsed ?? 0}
                      <span className="text-text-soft font-normal">
                        {' '}/ {planLimits.assistants === Infinity ? '∞' : planLimits.assistants}
                      </span>
                    </span>
                  </div>
                  <UsageBar
                    used={usage?.assistantsUsed ?? 0}
                    limit={planLimits.assistants === Infinity ? null : planLimits.assistants}
                    color="bg-gradient-to-r from-brand-violet to-brand-blue"
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs text-text-soft flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5" /> Mensajes del mes
                    </span>
                    <span className="text-xs font-semibold text-white">
                      {(usage?.messagesUsed ?? 0).toLocaleString()}
                      <span className="text-text-soft font-normal">
                        / {planLimits.messagesPerMonth === null ? '∞' : planLimits.messagesPerMonth.toLocaleString()}
                      </span>
                    </span>
                  </div>
                  <UsageBar
                    used={usage?.messagesUsed ?? 0}
                    limit={planLimits.messagesPerMonth === Infinity ? null : planLimits.messagesPerMonth}
                    color="bg-gradient-to-r from-brand-cyan to-brand-blue"
                  />
                </div>
              </div>

              {/* CTA */}
              {plan !== 'enterprise' && (
                <div className="pt-1">
                  <Link
                    href="/dashboard/billing"
                    className="inline-flex items-center gap-2 text-sm font-medium text-brand-violet hover:text-brand-purple transition-colors"
                  >
                    {plan === 'free' ? 'Mejorar mi plan' : 'Ver facturación'}
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </>
          )}
        </SectionCard>

        {/* ── 3. Seguridad ────────────────────────────────────────────────── */}
        <SectionCard>
          <SectionHeader
            icon={<Key className="w-4.5 h-4.5 text-brand-violet" />}
            title="Seguridad"
            subtitle="Mantén protegida tu cuenta y actualiza tus accesos cuando lo necesites."
          />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <div>
              <p className="text-sm font-medium text-white">Contraseña de acceso</p>
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
                  Cambiar contraseña
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
                <div className="flex flex-col gap-1">
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
              Recomendamos usar una contraseña larga y única para ConversaAI.
              No compartas tu contraseña con nadie.
            </p>
          </div>
        </SectionCard>

        {/* ── 4. Notificaciones ────────────────────────────────────────────── */}
        <SectionCard>
          <SectionHeader
            icon={<Bell className="w-4.5 h-4.5 text-brand-violet" />}
            title="Notificaciones"
            subtitle="Elige qué avisos quieres recibir para no perder leads ni conversaciones importantes."
          />

          {settingsLoading ? (
            <div className="flex items-center gap-2 text-text-soft text-sm py-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Cargando preferencias…
            </div>
          ) : settings ? (
            <>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] mb-1">
                <p className="text-xs text-text-soft">
                  Estas preferencias se usarán para tus avisos dentro del dashboard y futuras notificaciones por correo.
                </p>
              </div>
              {([
                { key: 'weekly_summary', label: 'Resumen semanal', desc: 'Recibe un resumen de tu actividad cada semana' },
                { key: 'lead_alerts', label: 'Alertas de leads', desc: 'Notificación cuando un nuevo lead es captado' },
                { key: 'conversation_alerts', label: 'Nuevas conversaciones', desc: 'Aviso cuando tu asistente inicia una nueva conversación' },
                { key: 'message_limit_alerts', label: 'Límite de mensajes', desc: 'Alerta cuando alcances el 80% de tu cuota mensual' },
                { key: 'payment_alerts', label: 'Pagos y suscripción', desc: 'Confirmaciones de pago y cambios en tu plan' },
              ] as { key: keyof UserSettings; label: string; desc: string }[]).map(({ key, label, desc }) => (
                <SettingSwitch
                  key={key}
                  label={label}
                  description={desc}
                  checked={!!settings[key]}
                  loading={togglingKey === key}
                  onChange={(v) => toggleSetting(key, v)}
                />
              ))}
            </>
          ) : (
            <p className="text-sm text-text-soft">No se pudieron cargar las preferencias.</p>
          )}
        </SectionCard>

        {/* ── 5. Integraciones rápidas ─────────────────────────────────────── */}
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

        {/* ── 6. Bot de Telegram ──────────────────────────────────────────── */}
        <SectionCard>
          <SectionHeader
            icon={<MessageCircle className="w-4.5 h-4.5 text-[#0088cc]" />}
            title="Bot oficial de Telegram"
            subtitle='Usa el bot oficial para probar ConversaAI, recibir ayuda rápida y validar cómo respondería tu asistente en Telegram.'
          />

          <div className="flex items-center gap-2 p-3 rounded-xl bg-white/[0.03] border border-[#0088cc]/20">
            <MessageCircle className="w-4 h-4 text-[#0088cc] shrink-0" />
            <span className="text-sm font-mono text-brand-cyan flex-1 truncate">{CONTACT_INFO.telegram}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#0088cc]/10 border border-[#0088cc]/20 text-[#0088cc]">
              Recomendado para pruebas
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

        {/* ── 6.5 Actividad de Seguridad ────────────────────────────────────── */}
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

        {/* ── 7. Sesión ────────────────────────────────────────────────────── */}
        <div className="bg-brand-pink/5 border border-brand-pink/20 rounded-2xl p-6 space-y-4">
          <SectionHeader
            icon={<LogOut className="w-4.5 h-4.5 text-brand-pink" />}
            title="Sesión"
            subtitle="Cierra tu sesión en este dispositivo de forma segura."
          />
          <button
            onClick={() => setShowLogout(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-brand-pink/10 border border-brand-pink/30 text-brand-pink font-semibold text-sm hover:bg-brand-pink/20 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </div>

      </div>
    </>
  )
}
