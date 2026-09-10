'use client'

import { motion } from 'framer-motion'
import { AlertCircle, Bot, Check, CheckCircle2, Loader2, Lock, MessageSquareText } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { BuilderFormData } from './types'

interface Props {
  form: BuilderFormData
  hasReachedLimit: boolean
  currentUsage: number
  planLimit: number | null
  currentPlan: string
  onSubmit: () => void
  status: 'idle' | 'saving' | 'success' | 'error'
  errorMsg: string
  mode?: 'create' | 'edit'
}

const channelLabels: Record<keyof BuilderFormData['channels'], string> = {
  webchat: 'Webchat',
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  facebook: 'Facebook',
  telegram: 'Telegram',
}

export function ReviewStep({
  form,
  hasReachedLimit,
  currentUsage,
  planLimit,
  currentPlan,
  onSubmit,
  status,
  errorMsg,
  mode = 'create',
}: Props) {
  const router = useRouter()
  const knowledgeReady = form.instructions.trim().length >= 60
    || form.knowledgeBlocks.some(block => block.is_active && block.content.trim().length >= 60)
  const enabledChannels = (Object.keys(form.channels) as Array<keyof BuilderFormData['channels']>)
    .filter(channel => form.channels[channel].enabled)

  const checklist = [
    { label: 'Identidad del asistente', done: Boolean(form.assistant_name.trim() && form.business_name.trim() && form.business_type.trim()) },
    { label: 'Información del negocio', done: knowledgeReady },
    { label: 'Comportamiento y reglas', done: Boolean(form.behavior.tone && form.behavior.goal) },
    { label: 'Al menos un canal activo', done: enabledChannels.length > 0 },
  ]
  const allReady = checklist.every(item => item.done)

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card-bg/60 backdrop-blur border border-white/10 rounded-3xl p-6 lg:p-8 shadow-xl"
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-5 border-b border-white/[0.06]">
        <div>
          <h2 className="font-semibold text-xl text-white">Todo listo para publicar</h2>
          <p className="text-sm text-slate-400 mt-1">Revisa lo esencial. Podrás modificar cualquier dato después.</p>
        </div>
        <span className="self-start rounded-full border border-brand-violet/20 bg-brand-violet/10 px-3 py-1 text-xs font-semibold text-brand-violet capitalize">
          Plan {currentPlan}
        </span>
      </div>

      <div className="grid md:grid-cols-[1.15fr_.85fr] gap-5 py-6">
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl gradient-btn text-white flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-white truncate">{form.assistant_name || 'Asistente sin nombre'}</p>
              <p className="text-xs text-slate-400 truncate">{form.business_name || 'Negocio sin configurar'}</p>
            </div>
          </div>
          <dl className="grid sm:grid-cols-2 gap-3 text-sm">
            <div><dt className="text-xs text-slate-500">Objetivo</dt><dd className="text-white capitalize mt-0.5">{form.behavior.goal}</dd></div>
            <div><dt className="text-xs text-slate-500">Tono</dt><dd className="text-white capitalize mt-0.5">{form.behavior.tone}</dd></div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-slate-500 mb-2">Canales seleccionados</dt>
              <dd className="flex flex-wrap gap-2">
                {enabledChannels.length > 0 ? enabledChannels.map(channel => (
                  <span key={channel} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-cyan/10 border border-brand-cyan/20 px-2.5 py-1 text-xs text-brand-cyan">
                    <MessageSquareText className="w-3 h-3" /> {channelLabels[channel]}
                  </span>
                )) : <span className="text-xs text-brand-pink">Selecciona al menos un canal.</span>}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
          <p className="text-sm font-semibold text-white mb-4">Comprobación</p>
          <ul className="space-y-3">
            {checklist.map(item => (
              <li key={item.label} className="flex items-center gap-2.5 text-sm">
                <span className={`w-5 h-5 rounded-full border flex items-center justify-center ${item.done ? 'bg-brand-success/15 border-brand-success/40' : 'border-white/15'}`}>
                  {item.done && <Check className="w-3 h-3 text-brand-success" />}
                </span>
                <span className={item.done ? 'text-white' : 'text-slate-500'}>{item.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="pt-5 border-t border-white/[0.06]">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
          <span>Asistentes utilizados</span>
          <span>{currentUsage} / {planLimit === null ? 'Ilimitados' : planLimit}</span>
        </div>

        {hasReachedLimit ? (
          <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4">
            <p className="flex items-center gap-2 text-sm text-amber-600">
              <Lock className="w-4 h-4" /> Alcanzaste el límite de asistentes de tu plan.
            </p>
            <button type="button" onClick={() => router.push('/dashboard/billing')} className="mt-3 w-full py-3 rounded-xl gradient-btn text-white font-semibold">
              Ver opciones de plan
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {status === 'error' && (
              <div className="p-3 rounded-xl bg-brand-pink/10 border border-brand-pink/20 text-brand-pink text-sm flex gap-2">
                <AlertCircle className="w-5 h-5 shrink-0" /> {errorMsg}
              </div>
            )}
            {!allReady && (
              <p className="text-xs text-amber-600">Completa los puntos pendientes para continuar.</p>
            )}
            <button
              type="button"
              onClick={onSubmit}
              disabled={!allReady || status === 'saving' || status === 'success'}
              className="w-full py-3.5 rounded-xl gradient-btn text-white font-bold shadow-lg shadow-brand-cyan/15 transition-all hover:scale-[1.01] disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {status === 'saving' && <Loader2 className="w-5 h-5 animate-spin" />}
              {status === 'success' && <CheckCircle2 className="w-5 h-5" />}
              {status === 'saving'
                ? 'Guardando…'
                : status === 'success'
                  ? 'Guardado correctamente'
                  : mode === 'edit'
                    ? 'Guardar cambios'
                    : 'Crear y publicar asistente'}
            </button>
            <p className="text-center text-[11px] text-slate-500">Crear el asistente no envía mensajes ni consume créditos por sí solo.</p>
          </div>
        )}
      </div>
    </motion.section>
  )
}
