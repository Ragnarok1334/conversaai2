import { createClient } from '@/lib/supabase/server'
import { Users, Mail, Phone, Globe, TrendingUp, Clock, CheckCircle2, AlertCircle, Star } from 'lucide-react'

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  new:       { label: 'Nuevo', color: 'text-brand-cyan bg-brand-cyan/10 border-brand-cyan/20' },
  contacted: { label: 'Contactado', color: 'text-brand-blue bg-brand-blue/10 border-brand-blue/20' },
  qualified: { label: 'Calificado', color: 'text-brand-violet bg-brand-violet/10 border-brand-violet/20' },
  converted: { label: 'Convertido', color: 'text-brand-success bg-brand-success/10 border-brand-success/20' },
  lost:      { label: 'Perdido', color: 'text-brand-pink bg-brand-pink/10 border-brand-pink/20' },
}

// Mock leads for when no real data
const MOCK_LEADS = [
  { id: 'm1', name: 'María García', email: 'maria@example.com', phone: '+52 55 1234 5678', source: 'webchat', status: 'new', created_at: new Date().toISOString() },
  { id: 'm2', name: 'Carlos Rodríguez', email: 'carlos@empresa.com', phone: '+52 55 9876 5432', source: 'whatsapp', status: 'contacted', created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: 'm3', name: 'Ana Martínez', email: 'ana.m@gmail.com', phone: '+52 55 5555 0000', source: 'telegram', status: 'qualified', created_at: new Date(Date.now() - 172800000).toISOString() },
  { id: 'm4', name: 'Luis Torres', email: 'l.torres@corp.mx', phone: '+52 33 2222 1111', source: 'webchat', status: 'converted', created_at: new Date(Date.now() - 259200000).toISOString() },
]

export default async function LeadsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: dbLeads } = await supabase
    .from('leads')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  const leads = (dbLeads && dbLeads.length > 0) ? dbLeads : MOCK_LEADS
  const isDemo = !dbLeads || dbLeads.length === 0

  const metrics = [
    { label: 'Total leads', value: leads.length, icon: Users, color: 'violet' },
    { label: 'Nuevos hoy', value: leads.filter(l => new Date(l.created_at).toDateString() === new Date().toDateString()).length, icon: TrendingUp, color: 'cyan' },
    { label: 'Convertidos', value: leads.filter(l => l.status === 'converted').length, icon: CheckCircle2, color: 'green' },
    { label: 'En proceso', value: leads.filter(l => ['contacted', 'qualified'].includes(l.status)).length, icon: Clock, color: 'blue' },
  ]

  const colorMap: Record<string, string> = {
    violet: 'text-brand-violet bg-brand-violet/10',
    cyan:   'text-brand-cyan bg-brand-cyan/10',
    green:  'text-brand-success bg-brand-success/10',
    blue:   'text-brand-blue bg-brand-blue/10',
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Leads</h1>
        <p className="text-text-soft mt-1">
          Clientes potenciales capturados por tus asistentes.
          {isDemo && <span className="ml-2 text-brand-cyan text-xs font-medium px-2 py-0.5 rounded-full bg-brand-cyan/10 border border-brand-cyan/20">Vista demo</span>}
        </p>
      </div>

      {/* Metrics */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {metrics.map((m) => (
          <div key={m.label} className="bg-card-bg/80 backdrop-blur-2xl border border-card-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-text-soft">{m.label}</span>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${colorMap[m.color]}`}>
                <m.icon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-bold">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-card-bg/80 backdrop-blur-2xl border border-card-border rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <h2 className="font-semibold">Lista de leads</h2>
          {isDemo && (
            <div className="flex items-center gap-2 text-xs text-brand-cyan">
              <AlertCircle className="w-3.5 h-3.5" />
              Datos de ejemplo — crea un asistente para captar leads reales
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                <th className="text-left px-6 py-3 text-text-soft font-medium">Nombre</th>
                <th className="text-left px-6 py-3 text-text-soft font-medium">Contacto</th>
                <th className="text-left px-6 py-3 text-text-soft font-medium">Fuente</th>
                <th className="text-left px-6 py-3 text-text-soft font-medium">Estado</th>
                <th className="text-left px-6 py-3 text-text-soft font-medium">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => {
                const status = STATUS_CONFIG[lead.status] || STATUS_CONFIG.new
                return (
                  <tr key={lead.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full gradient-btn flex items-center justify-center text-white text-xs font-bold">
                          {lead.name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <span className="font-medium">{lead.name || 'Sin nombre'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-0.5">
                        {lead.email && (
                          <div className="flex items-center gap-1.5 text-text-soft text-xs">
                            <Mail className="w-3 h-3" />
                            {lead.email}
                          </div>
                        )}
                        {lead.phone && (
                          <div className="flex items-center gap-1.5 text-text-soft text-xs">
                            <Phone className="w-3 h-3" />
                            {lead.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/[0.1] text-text-soft capitalize">
                        <Globe className="w-3 h-3" />
                        {lead.source || 'webchat'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${status.color}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-text-soft text-xs">
                      {new Date(lead.created_at).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
