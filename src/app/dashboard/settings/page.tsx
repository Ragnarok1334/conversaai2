import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/app/auth/actions'
import { User, Mail, Shield, LogOut, Bell, Globe, Key, MessageCircle, ExternalLink, Copy } from 'lucide-react'
import { CONTACT_INFO } from '@/lib/contact'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { count: assistantCount } = await supabase
    .from('assistants')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user!.id)

  const userName = user!.user_metadata?.name || user!.email?.split('@')[0] || 'Usuario'
  const joinDate = new Date(user!.created_at).toLocaleDateString('es', { day: '2-digit', month: 'long', year: 'numeric' })

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
        <p className="text-text-soft mt-1">Gestiona tu cuenta y preferencias.</p>
      </div>

      {/* Profile */}
      <div className="bg-card-bg/80 backdrop-blur-2xl border border-card-border rounded-2xl p-6 space-y-6">
        <div className="flex items-center gap-2 mb-2">
          <User className="w-5 h-5 text-brand-violet" />
          <h2 className="font-semibold text-lg">Perfil de cuenta</h2>
        </div>

        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl gradient-btn flex items-center justify-center text-white font-bold text-2xl shadow-[0_0_30px_rgba(124,58,237,0.3)]">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-lg">{userName}</p>
            <p className="text-text-soft text-sm flex items-center gap-2">
              <Mail className="w-3.5 h-3.5" />
              {user!.email}
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t border-white/[0.06]">
          <InfoItem icon={<Shield className="w-4 h-4 text-brand-cyan" />} label="Estado" value="Verificado" green />
          <InfoItem icon={<Globe className="w-4 h-4 text-text-soft" />} label="Plan actual" value="Básico" />
          <InfoItem icon={<User className="w-4 h-4 text-text-soft" />} label="Asistentes" value={`${assistantCount ?? 0} creados`} />
          <InfoItem icon={<Mail className="w-4 h-4 text-text-soft" />} label="Miembro desde" value={joinDate} />
        </div>
      </div>

      {/* Security */}
      <div className="bg-card-bg/80 backdrop-blur-2xl border border-card-border rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Key className="w-5 h-5 text-brand-violet" />
          <h2 className="font-semibold text-lg">Seguridad</h2>
        </div>
        <p className="text-sm text-text-soft">Gestiona tu contraseña y seguridad de la cuenta.</p>
        <div className="flex flex-wrap gap-3">
          <a
            href="/forgot-password"
            className="px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-sm font-medium text-text-soft hover:text-text-main hover:border-brand-violet/30 transition-all"
          >
            Cambiar contraseña
          </a>
        </div>
      </div>

      {/* Notifications placeholder */}
      <div className="bg-card-bg/80 backdrop-blur-2xl border border-card-border rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Bell className="w-5 h-5 text-brand-violet" />
          <h2 className="font-semibold text-lg">Notificaciones</h2>
        </div>
        <p className="text-sm text-text-soft">Configura cómo y cuándo recibirás notificaciones.</p>
        <div className="flex items-center justify-between py-3 border-b border-white/[0.06]">
          <div>
            <p className="text-sm font-medium">Resumen semanal</p>
            <p className="text-xs text-text-soft">Recibe un resumen de tu actividad cada semana</p>
          </div>
          <div className="w-11 h-6 rounded-full bg-brand-violet/30 border border-brand-violet/40 flex items-center px-1">
            <div className="w-4 h-4 rounded-full bg-brand-violet shadow" />
          </div>
        </div>
        <div className="flex items-center justify-between py-3">
          <div>
            <p className="text-sm font-medium">Alertas de leads</p>
            <p className="text-xs text-text-soft">Notificación cuando un nuevo lead es captado</p>
          </div>
          <div className="w-11 h-6 rounded-full bg-white/10 border border-white/10 flex items-center px-1">
            <div className="w-4 h-4 rounded-full bg-white/30 shadow" />
          </div>
        </div>
      </div>

      {/* Telegram Bot Card */}
      <div className="bg-card-bg/80 backdrop-blur-2xl border border-card-border rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <MessageCircle className="w-5 h-5 text-[#0088cc]" />
          <h2 className="font-semibold text-lg">Bot oficial de Telegram</h2>
        </div>
        <p className="text-sm text-text-soft">
          Usa este bot para probar ConversaAI, hacer preguntas rápidas o contactarnos directamente desde Telegram.
        </p>
        <div className="flex items-center gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm font-mono text-brand-cyan">
          {CONTACT_INFO.telegram}
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
        </div>
      </div>

      {/* Danger zone */}
      <div className="bg-brand-pink/5 border border-brand-pink/20 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <LogOut className="w-5 h-5 text-brand-pink" />
          <h2 className="font-semibold text-lg text-brand-pink">Cerrar sesión</h2>
        </div>
        <p className="text-sm text-text-soft">Cierra tu sesión de ConversaAI en este dispositivo.</p>
        <form action={signOut}>
          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-brand-pink/10 border border-brand-pink/30 text-brand-pink font-semibold text-sm hover:bg-brand-pink/20 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </form>
      </div>
    </div>
  )
}

function InfoItem({ icon, label, value, green }: { icon: React.ReactNode; label: string; value: string; green?: boolean }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
      <div className="mt-0.5">{icon}</div>
      <div>
        <p className="text-xs text-text-soft">{label}</p>
        <p className={`text-sm font-medium ${green ? 'text-brand-success' : 'text-text-main'}`}>{value}</p>
      </div>
    </div>
  )
}
