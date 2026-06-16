'use client'

import { useState, useEffect } from 'react'
import {
  Copy, CheckCircle2, Globe, Send, MessageCircle, Clock,
  ChevronRight, AlertCircle, Info, Plug, ArrowRight
} from 'lucide-react'
import { AssistantDomainsPanel } from './AssistantDomainsPanel'

interface Domain {
  id: string
  domain: string
  is_verified: boolean
  verification_status: string
  last_seen_at: string | null
}

type Platform = 'html' | 'wordpress' | 'shopify' | 'builder'

const PLATFORMS: { id: Platform; label: string; color: string }[] = [
  { id: 'html',      label: 'HTML / CSS',   color: 'text-brand-cyan' },
  { id: 'wordpress', label: 'WordPress',    color: 'text-brand-violet' },
  { id: 'shopify',   label: 'Shopify',      color: 'text-emerald-400' },
  { id: 'builder',   label: 'Constructor',  color: 'text-amber-400' },
]

export function AssistantInstallation({
  assistantId,
  planLimits,
  effectivePlanStatus
}: {
  assistantId: string
  planLimits: any
  effectivePlanStatus: string
}) {
  const [copied, setCopied] = useState(false)
  const [toastMsg, setToastMsg] = useState('')
  const [platform, setPlatform] = useState<Platform>('html')
  const [domains, setDomains] = useState<Domain[]>([])
  const [loadingDomains, setLoadingDomains] = useState(true)

  useEffect(() => {
    fetch(`/api/assistants/${assistantId}/domains`, { cache: 'no-store' })
      .then(r => r.json())
      .then((data: Domain[]) => { setDomains(data || []); setLoadingDomains(false) })
      .catch(() => setLoadingDomains(false))
  }, [assistantId])

  const hasDomain = domains.length > 0
  const hasDetected = domains.some(d => d.last_seen_at !== null && d.is_verified)

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://app.conversaai.com'
  const snippet = `<script\n  src="${origin}/widget.js"\n  data-assistant-id="${assistantId}"\n  async\n></script>`

  const showToast = (msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 3000)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(snippet)
    setCopied(true)
    showToast('Script copiado correctamente.')
    setTimeout(() => setCopied(false), 2500)
  }

  type StepStatus = 'done' | 'pending' | 'recommended'

  const steps: { num: number; title: string; desc: string; status: StepStatus }[] = [
    {
      num: 1,
      title: 'Autoriza tu dominio',
      desc: 'Agrega el dominio donde estará instalado el asistente.',
      status: hasDomain ? 'done' : 'pending',
    },
    {
      num: 2,
      title: 'Copia el script',
      desc: 'Usa el script único de este asistente.',
      status: 'done',
    },
    {
      num: 3,
      title: 'Pégalo antes de </body>',
      desc: 'Agrega el código antes de cerrar la etiqueta body de tu sitio.',
      status: hasDomain ? 'recommended' : 'pending',
    },
    {
      num: 4,
      title: 'Verifica la instalación',
      desc: 'Cuando tu página cargue el Web Chat, ConversaAI lo detectará.',
      status: hasDetected ? 'done' : hasDomain ? 'recommended' : 'pending',
    },
  ]

  const stepColors: Record<StepStatus, { ring: string; bg: string; text: string; badge: string; badgeText: string }> = {
    done:        { ring: 'border-brand-success/40', bg: 'bg-brand-success/10', text: 'text-brand-success', badge: 'bg-brand-success/20 text-brand-success border-brand-success/30', badgeText: 'Listo' },
    recommended: { ring: 'border-brand-cyan/30',   bg: 'bg-brand-cyan/10',    text: 'text-brand-cyan',    badge: 'bg-brand-cyan/20 text-brand-cyan border-brand-cyan/30',         badgeText: 'Siguiente' },
    pending:     { ring: 'border-white/10',         bg: 'bg-white/[0.03]',     text: 'text-slate-400',     badge: 'bg-white/10 text-slate-400 border-white/20',                    badgeText: 'Pendiente' },
  }

  const platformGuide: Record<Platform, { steps: string[]; note?: string }> = {
    html: {
      steps: [
        'Abre el archivo HTML principal de tu sitio (index.html o similar).',
        'Busca la etiqueta de cierre </body> al final del archivo.',
        'Pega el script justo antes de esa etiqueta.',
        'Guarda y sube el archivo a tu servidor.',
      ],
    },
    wordpress: {
      steps: [
        'Instala un plugin como "Insert Headers and Footers" o "WPCode".',
        'En el plugin, busca la sección "Footer scripts" o "Antes de </body>".',
        'Pega el script y guarda los cambios.',
        'Alternativamente, edita el archivo footer.php de tu tema activo antes de </body>.',
      ],
      note: 'Si usas un constructor visual (Elementor, Divi, etc.), busca una opción llamada "Custom Code", "Header/Footer Scripts" o "Código personalizado".',
    },
    shopify: {
      steps: [
        'En tu panel de Shopify, ve a Tienda en línea → Temas.',
        'Haz clic en "Editar código" del tema activo.',
        'En el panel izquierdo, abre el archivo theme.liquid.',
        'Busca la etiqueta </body> y pega el script justo antes.',
        'Guarda los cambios con el botón "Guardar".',
      ],
    },
    builder: {
      steps: [
        'Abre la configuración de tu constructor (Wix, Webflow, Hostinger, Framer, etc.).',
        'Busca una opción llamada "Código personalizado", "Scripts" o "Integrations".',
        'Selecciona que el código se inyecte en el "Footer" o "antes de </body>".',
        'Pega el script y publica los cambios.',
      ],
      note: 'Cada constructor tiene su forma de agregar scripts. Si no encuentras la opción, busca en la documentación: "custom code footer".',
    },
  }

  const guide = platformGuide[platform]

  return (
    <div className="space-y-8">

      {toastMsg && (
        <div className="fixed top-24 right-8 bg-brand-success/20 border border-brand-success text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2 animate-in fade-in slide-in-from-top-5">
          <CheckCircle2 className="w-4 h-4 text-brand-success shrink-0" />
          <span className="text-sm font-medium">{toastMsg}</span>
        </div>
      )}

      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <Plug className="w-6 h-6 text-brand-cyan" />
          Instala tu asistente en tu sitio web
        </h2>
        <p className="text-slate-400 mt-2 max-w-2xl">
          Copia el script, autoriza tu dominio y agrega el Web Chat a tu página para empezar a recibir conversaciones.
        </p>
        <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 shrink-0" />
          El Web Chat es el único canal disponible actualmente. Telegram y WhatsApp estarán disponibles próximamente.
        </p>
      </div>

      <div className="bg-card-bg/80 backdrop-blur-2xl border border-card-border rounded-3xl p-6 md:p-8">
        <h3 className="text-base font-semibold text-white mb-5 flex items-center gap-2">
          <ChevronRight className="w-4 h-4 text-brand-cyan" />
          Pasos para instalar el Web Chat
        </h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map(step => {
            const c = stepColors[step.status]
            return (
              <div
                key={step.num}
                className={`relative p-4 rounded-2xl border ${c.ring} ${c.bg} flex flex-col gap-3 transition-all`}
              >
                <div className="flex items-center justify-between">
                  <div className={`w-7 h-7 rounded-full border ${c.ring} flex items-center justify-center text-xs font-bold ${c.text}`}>
                    {step.status === 'done' ? <CheckCircle2 className="w-4 h-4" /> : step.num}
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${c.badge}`}>
                    {c.badgeText}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white leading-snug">{step.title}</p>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">

        <div className="bg-card-bg/80 backdrop-blur-2xl border border-card-border rounded-3xl p-6 md:p-8 flex flex-col gap-5">
          <div>
            <h3 className="text-base font-semibold text-white mb-1">Script de instalación</h3>
            <p className="text-sm text-slate-400">
              Copia este código y pégalo en tu sitio web antes de la etiqueta{' '}
              <code className="text-brand-cyan bg-brand-cyan/10 px-1 py-0.5 rounded text-xs">&lt;/body&gt;</code>.
            </p>
          </div>

          <div className="relative">
            <pre className="bg-[#050816] border border-white/10 rounded-2xl p-5 text-sm font-mono text-slate-300 overflow-x-auto leading-relaxed whitespace-pre-wrap">
{snippet}
            </pre>
            <button
              onClick={handleCopy}
              className="absolute top-3 right-3 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.07] hover:bg-white/[0.12] border border-white/[0.1] transition-all text-xs font-semibold text-white"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-brand-success" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copiar script
                </>
              )}
            </button>
          </div>

          <div className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl">
            <p className="text-xs text-slate-400 flex items-start gap-2">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-500" />
              Ver conversaciones anteriores no consume mensajes. Cada respuesta real del asistente consume 1 mensaje del plan.
            </p>
          </div>
        </div>

        <div className="bg-card-bg/80 backdrop-blur-2xl border border-card-border rounded-3xl p-6 md:p-8 flex flex-col gap-5">
          <div>
            <h3 className="text-base font-semibold text-white mb-1">¿Dónde pego el script?</h3>
            <p className="text-sm text-slate-400">Elige tu plataforma y sigue las instrucciones básicas.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map(p => (
              <button
                key={p.id}
                onClick={() => setPlatform(p.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                  platform === p.id
                    ? `${p.color} bg-white/[0.07] border-white/20`
                    : 'text-slate-400 bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05] hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex-1 space-y-3">
            {guide.steps.map((s, i) => (
              <div key={i} className="flex gap-3 items-start">
                <div className="w-5 h-5 rounded-full bg-white/[0.07] border border-white/[0.1] flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold text-slate-400">{i + 1}</span>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">{s}</p>
              </div>
            ))}
          </div>

          {guide.note && (
            <div className="p-3 bg-amber-400/5 border border-amber-400/20 rounded-xl">
              <p className="text-xs text-amber-300 leading-relaxed flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                {guide.note}
              </p>
            </div>
          )}

          {platform === 'html' && (
            <div>
              <p className="text-xs text-slate-500 mb-2 font-semibold uppercase tracking-wider">Ejemplo visual:</p>
              <pre className="bg-[#050816] border border-white/[0.07] rounded-xl p-4 text-xs font-mono text-slate-400 overflow-x-auto whitespace-pre">{`<body>\n  <!-- Tu contenido -->\n\n  <!-- Script ConversaAI -->\n  <script\n    src="${origin}/widget.js"\n    data-assistant-id="${assistantId}"\n    async\n  ></script>\n</body>`}</pre>
            </div>
          )}
        </div>
      </div>

      <AssistantDomainsPanel
        assistantId={assistantId}
        planLimits={planLimits}
        effectivePlanStatus={effectivePlanStatus}
      />

      {hasDomain && !hasDetected && (
        <div className="bg-amber-400/5 border border-amber-400/20 rounded-2xl p-5 flex items-start gap-4">
          <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-300 mb-1">Esperando detección del Web Chat</p>
            <p className="text-xs text-amber-200/70 leading-relaxed">
              Todavía no detectamos el Web Chat en tu sitio. Revisa que el script esté pegado antes de{' '}
              <code className="bg-amber-400/10 px-1 rounded">&lt;/body&gt;</code>, que el dominio autorizado sea correcto y que tu sitio esté publicado y accesible.
            </p>
          </div>
        </div>
      )}

      {hasDetected && (
        <div className="bg-brand-success/5 border border-brand-success/20 rounded-2xl p-5 flex items-start gap-4">
          <CheckCircle2 className="w-5 h-5 text-brand-success shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-brand-success mb-1">¡Web Chat detectado correctamente!</p>
            <p className="text-xs text-brand-success/70 leading-relaxed">
              ConversaAI ya detectó el script en tu sitio. Tu asistente está listo para recibir conversaciones.
            </p>
          </div>
        </div>
      )}

      {!hasDomain && !loadingDomains && (
        <div className="bg-white/[0.02] border border-white/[0.07] rounded-2xl p-5 flex items-start gap-4">
          <AlertCircle className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-slate-300 mb-1">Agrega un dominio para comenzar</p>
            <p className="text-xs text-slate-500 leading-relaxed">
              Sin un dominio autorizado, el Web Chat no se activará aunque tengas el script instalado. Agrega tu dominio en el panel de arriba.
            </p>
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <ArrowRight className="w-4 h-4" />
          Próximos canales
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-5 opacity-60 pointer-events-none flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-[#0088cc]/10 flex items-center justify-center">
                <Send className="w-5 h-5 text-[#0088cc]" />
              </div>
              <div>
                <h4 className="font-semibold text-white text-sm">Telegram</h4>
                <p className="text-xs text-slate-400 mt-0.5">Conecta un bot de Telegram con tu asistente.</p>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-[#0088cc]/10 border border-[#0088cc]/20 rounded-full text-[10px] font-bold text-[#0088cc] shrink-0">
              PRÓXIMAMENTE
            </span>
          </div>

          <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-5 opacity-60 pointer-events-none flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <h4 className="font-semibold text-white text-sm">WhatsApp</h4>
                <p className="text-xs text-slate-400 mt-0.5">Atención directa desde WhatsApp Business.</p>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] font-bold text-emerald-500 shrink-0">
              PRÓXIMAMENTE
            </span>
          </div>
        </div>
      </div>

    </div>
  )
}
