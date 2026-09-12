'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import { AlertCircle, Check, CheckCircle2, Copy, ExternalLink, Loader2, MessageCircle, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react'

type Channel = {
  id: string
  business_account_id: string
  phone_number_id: string
  display_phone_number: string | null
  verified_name: string | null
  status: 'pending' | 'connected' | 'error' | 'disabled'
  connected_at: string | null
  last_webhook_at: string | null
  last_error: string | null
}

export function AssistantWhatsAppTab({ assistantId }: { assistantId: string }) {
  const [channel, setChannel] = useState<Channel | null>(null)
  const [webhookUrl, setWebhookUrl] = useState('https://conversaai.store/api/webhooks/whatsapp')
  const [phoneNumberId, setPhoneNumberId] = useState('')
  const [businessAccountId, setBusinessAccountId] = useState('')
  const [accessToken, setAccessToken] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setMessage('')
    try {
      const response = await fetch(`/api/assistants/${assistantId}/whatsapp`, { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No se pudo cargar WhatsApp.')
      setChannel(data.channel || null)
      setWebhookUrl(data.webhookUrl || 'https://conversaai.store/api/webhooks/whatsapp')
      if (data.channel) {
        setPhoneNumberId(data.channel.phone_number_id)
        setBusinessAccountId(data.channel.business_account_id)
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo cargar WhatsApp.') }
    finally { setLoading(false) }
  }, [assistantId])

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(timer)
  }, [load])

  const connect = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setMessage('')
    try {
      const response = await fetch(`/api/assistants/${assistantId}/whatsapp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumberId, businessAccountId, accessToken: accessToken || undefined }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No se pudo conectar WhatsApp.')
      setChannel(data.channel); setAccessToken(''); setMessage(data.message)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo conectar WhatsApp.') }
    finally { setSaving(false) }
  }

  const disconnect = async () => {
    if (!window.confirm('¿Desconectar este número? El historial y los leads se conservarán.')) return
    setSaving(true); setMessage('')
    const response = await fetch(`/api/assistants/${assistantId}/whatsapp`, { method: 'DELETE' })
    const data = await response.json().catch(() => ({}))
    if (response.ok) { setChannel(null); setPhoneNumberId(''); setBusinessAccountId(''); setMessage('WhatsApp fue desconectado.') }
    else setMessage(data.error || 'No se pudo desconectar.')
    setSaving(false)
  }

  const copyWebhook = async () => {
    await navigator.clipboard.writeText(webhookUrl); setCopied(true); window.setTimeout(() => setCopied(false), 1800)
  }

  if (loading) return <div className="flex min-h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-brand-violet" /></div>

  const connected = channel?.status === 'connected'
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <section className="overflow-hidden rounded-3xl border border-card-border bg-card-bg shadow-sm">
        <div className="flex flex-col gap-4 border-b border-card-border p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500"><MessageCircle className="h-6 w-6" /></span>
            <div><div className="flex items-center gap-2"><h2 className="dashboard-strong text-xl font-bold">WhatsApp Business</h2><span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${connected ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-500' : 'border-amber-500/25 bg-amber-500/10 text-amber-500'}`}>{connected ? 'CONECTADO' : 'PENDIENTE'}</span></div><p className="dashboard-muted mt-1 text-sm">Atiende, captura leads y responde como humano desde el mismo inbox.</p></div>
          </div>
          <button type="button" onClick={() => void load()} className="dashboard-icon-button flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-card-border" aria-label="Actualizar estado"><RefreshCw className="h-4 w-4" /></button>
        </div>

        {connected && channel ? (
          <div className="grid gap-5 p-6 lg:grid-cols-[1.2fr_.8fr]">
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
              <div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-500" /><div><strong className="dashboard-strong block">{channel.verified_name || 'Número verificado por Meta'}</strong><span className="dashboard-muted text-sm">{channel.display_phone_number || `ID ${channel.phone_number_id}`}</span></div></div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-card-border bg-card-bg p-3"><small className="dashboard-muted block">Phone Number ID</small><strong className="dashboard-strong text-sm">{channel.phone_number_id}</strong></div><div className="rounded-xl border border-card-border bg-card-bg p-3"><small className="dashboard-muted block">Último webhook</small><strong className="dashboard-strong text-sm">{channel.last_webhook_at ? new Date(channel.last_webhook_at).toLocaleString('es') : 'Esperando primer mensaje'}</strong></div></div>
            </div>
            <div className="flex flex-col justify-between rounded-2xl border border-card-border p-5"><div><ShieldCheck className="mb-3 h-6 w-6 text-brand-violet" /><strong className="dashboard-strong block">Conexión protegida</strong><p className="dashboard-muted mt-1 text-sm">El webhook valida la firma de Meta y el token nunca vuelve al navegador.</p></div><button type="button" onClick={() => void disconnect()} disabled={saving} className="mt-5 inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-red-500/25 px-4 py-2.5 text-sm font-semibold text-red-500 hover:bg-red-500/5"><Trash2 className="h-4 w-4" /> Desconectar</button></div>
          </div>
        ) : (
          <form onSubmit={connect} className="grid gap-6 p-6 lg:grid-cols-[1fr_.9fr]">
            <div className="space-y-4">
              <div><label className="dashboard-strong mb-1.5 block text-sm font-semibold">Phone Number ID</label><input value={phoneNumberId} onChange={event => setPhoneNumberId(event.target.value.replace(/\D/g, ''))} required inputMode="numeric" maxLength={30} placeholder="Ej. 123456789012345" className="dashboard-input w-full rounded-xl border border-card-border bg-transparent px-4 py-3 outline-none focus:border-brand-violet" /></div>
              <div><label className="dashboard-strong mb-1.5 block text-sm font-semibold">WhatsApp Business Account ID</label><input value={businessAccountId} onChange={event => setBusinessAccountId(event.target.value.replace(/\D/g, ''))} required inputMode="numeric" maxLength={30} placeholder="Ej. 123456789012345" className="dashboard-input w-full rounded-xl border border-card-border bg-transparent px-4 py-3 outline-none focus:border-brand-violet" /></div>
              <div><label className="dashboard-strong mb-1.5 block text-sm font-semibold">Token de acceso <span className="dashboard-muted font-normal">(opcional)</span></label><input type="password" value={accessToken} onChange={event => setAccessToken(event.target.value)} autoComplete="new-password" maxLength={4096} placeholder="Déjalo vacío si usarás WHATSAPP_ACCESS_TOKEN" className="dashboard-input w-full rounded-xl border border-card-border bg-transparent px-4 py-3 outline-none focus:border-brand-violet" /><p className="dashboard-muted mt-1.5 text-xs">Si lo introduces aquí se cifra antes de guardarse. También puedes administrarlo solo desde Vercel.</p></div>
              <button type="submit" disabled={saving} className="gradient-btn inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-5 py-3 font-semibold text-white disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Validar y conectar</button>
            </div>
            <div className="rounded-2xl border border-card-border bg-black/[0.025] p-5">
              <h3 className="dashboard-strong font-bold">Antes de conectar</h3>
              <ol className="dashboard-muted mt-4 space-y-3 text-sm"><li><strong className="dashboard-strong">1.</strong> Añade las variables privadas en Vercel.</li><li><strong className="dashboard-strong">2.</strong> En Meta, configura el webhook y suscribe el campo <code>messages</code>.</li><li><strong className="dashboard-strong">3.</strong> Copia los dos identificadores desde WhatsApp &gt; Configuración de la API.</li></ol>
              <div className="mt-5 rounded-xl border border-card-border bg-card-bg p-3"><small className="dashboard-muted block">URL de devolución</small><div className="mt-1 flex items-center gap-2"><code className="dashboard-strong min-w-0 flex-1 truncate text-xs">{webhookUrl}</code><button type="button" onClick={() => void copyWebhook()} className="cursor-pointer p-1.5 text-brand-violet" aria-label="Copiar webhook">{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</button></div></div>
              <a href="https://developers.facebook.com/apps/" target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-cyan">Abrir Meta for Developers <ExternalLink className="h-3.5 w-3.5" /></a>
            </div>
          </form>
        )}
        {message && <div className={`mx-6 mb-6 flex items-start gap-2 rounded-xl border p-3 text-sm ${message.toLowerCase().includes('conect') && !message.toLowerCase().includes('no ') ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-600' : 'border-amber-500/20 bg-amber-500/5 text-amber-600'}`}><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{message}</div>}
      </section>
      <p className="dashboard-muted px-2 text-xs">La personalización específica de WhatsApp —saludo, horarios, plantillas y automatizaciones— se añadirá en la siguiente etapa.</p>
    </div>
  )
}
