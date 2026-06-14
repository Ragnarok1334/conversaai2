'use client'

import { motion } from 'framer-motion'
import { CheckCircle2, Lock, Loader2, AlertCircle } from 'lucide-react'
import { BuilderFormData } from './types'
import { useRouter } from 'next/navigation'

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

export function ReviewStep({ form, hasReachedLimit, currentUsage, planLimit, currentPlan, onSubmit, status, errorMsg, mode = 'create' }: Props) {
  const router = useRouter()

  const blocks = form.knowledgeBlocks || []
  
  const getBlockState = (text: string) => {
    const chars = text?.trim().length || 0
    if (chars >= 80) return 'Completo'
    if (chars > 0) return 'Parcial'
    return 'Pendiente'
  }

  const activeAndCompleted = blocks.filter(b => b.is_active && getBlockState(b.content) === 'Completo')
  const completedCount = activeAndCompleted.length
  
  const hasServices = activeAndCompleted.some(b => b.type === 'services')
  const hasPricing = activeAndCompleted.some(b => b.type === 'pricing')
  const hasHours = activeAndCompleted.some(b => b.type === 'hours')
  const hasLocation = activeAndCompleted.some(b => b.type === 'location')
  
  const missingEssentials = []
  if (!hasServices) missingEssentials.push('Servicios')
  if (!hasPricing) missingEssentials.push('Precios')
  if (!hasHours) missingEssentials.push('Horarios')
  if (!hasLocation) missingEssentials.push('Ubicación')

  let qualityLevel = 'Básico'
  let qualityColor = 'text-amber-500 bg-amber-500/10 border-amber-500/20'
  
  if (completedCount >= 6 && missingEssentials.length === 0) {
    qualityLevel = 'Completo'
    qualityColor = 'text-brand-success bg-brand-success/10 border-brand-success/20'
  } else if (completedCount >= 3) {
    qualityLevel = 'Bueno'
    qualityColor = 'text-brand-cyan bg-brand-cyan/10 border-brand-cyan/20'
  }

  const checklist = [
    { label: 'Plan activo o en prueba', done: true },
    { label: 'Información básica completa', done: form.assistant_name.trim() !== '' && form.business_name.trim() !== '' },
    { label: 'Entrenamiento agregado', done: form.instructions.trim().length >= 80 || blocks.some(b => b.content.trim().length >= 80) },
    { label: 'Canal seleccionado', done: form.channels.webchat.enabled },
  ]

  const allReady = checklist.every(i => i.done)

  const rulesMap = [
    { key: 'askName', label: 'Pedir nombre del cliente' },
    { key: 'askContact', label: 'Pedir teléfono o correo' },
    { key: 'offerPricesWhenAsked', label: 'Ofrecer precios' },
    { key: 'suggestAppointment', label: 'Sugerir agendar cita' },
    { key: 'escalateIfUnknown', label: 'Derivar a humano si no sabe' },
    { key: 'doNotInvent', label: 'No inventar información' },
    { key: 'alwaysSpanish', label: 'Responder en español' },
  ] as const

  const activeRules = rulesMap.filter(r => form.behavior.rules[r.key as keyof typeof form.behavior.rules])
  const inactiveRules = rulesMap.filter(r => !form.behavior.rules[r.key as keyof typeof form.behavior.rules])

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="bg-card-bg/60 backdrop-blur border border-white/10 rounded-3xl p-6 lg:p-8 space-y-6 shadow-xl">
        <div className="border-b border-white/[0.06] pb-4">
          <h2 className="font-semibold text-xl mb-1 text-white">Revisión final</h2>
          <p className="text-sm text-slate-400">Confirma que tu asistente tiene la información mínima para responder correctamente.</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white">Resumen</h3>
            <ul className="space-y-2 text-sm text-slate-300">
              <li><span className="text-slate-500">Nombre:</span> {form.assistant_name || '-'}</li>
              <li><span className="text-slate-500">Negocio:</span> {form.business_name || '-'}</li>
              <li><span className="text-slate-500">Tono:</span> <span className="capitalize">{form.behavior.tone}</span></li>
              <li><span className="text-slate-500">Objetivo:</span> <span className="capitalize">{form.behavior.goal}</span></li>
              <li><span className="text-slate-500">Nivel comercial:</span> <span className="capitalize">{form.behavior.salesLevel}</span></li>
              <li>
                <span className="text-slate-500">Canales:</span>{' '}
                {[
                  form.channels.webchat.enabled && 'Web Chat',
                  form.channels.telegram.enabled && 'Telegram'
                ].filter(Boolean).join(', ') || '-'}
              </li>
            </ul>

            <div className="mt-4">
              <h4 className="text-xs font-semibold text-white mb-2 flex items-center gap-2">
                Conocimiento:
                <span className={`px-2 py-0.5 rounded-full border ${qualityColor}`}>
                  {qualityLevel}
                </span>
              </h4>
              <ul className="space-y-2 text-xs text-slate-300">
                {blocks.filter(b => b.type !== 'custom').map(b => {
                  const state = getBlockState(b.content)
                  return (
                    <li key={b.type} className="flex items-center justify-between">
                      <span className="capitalize">{b.title}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                        state === 'Completo' ? 'text-brand-success bg-brand-success/10 border-brand-success/20' : 
                        state === 'Parcial' ? 'text-amber-500 bg-amber-500/10 border-amber-500/20' : 
                        'text-slate-500 bg-white/5 border-white/10'
                      }`}>
                        {state}
                      </span>
                    </li>
                  )
                })}
                {form.instructions.trim().length > 0 && (
                  <li className="flex items-center justify-between">
                    <span>Texto libre (Legacy)</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                      getBlockState(form.instructions) === 'Completo' ? 'text-brand-success bg-brand-success/10 border-brand-success/20' : 'text-amber-500 bg-amber-500/10 border-amber-500/20'
                    }`}>
                      {getBlockState(form.instructions)}
                    </span>
                  </li>
                )}
              </ul>
            </div>

            <div className="mt-4">
              <h4 className="text-xs font-semibold text-white mb-2">Reglas activas:</h4>
              <ul className="space-y-1 text-xs text-slate-300">
                {activeRules.map(r => (
                  <li key={r.key} className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-brand-success" /> {r.label}</li>
                ))}
              </ul>
            </div>
            {inactiveRules.length > 0 && (
              <div className="mt-4">
                <h4 className="text-xs font-semibold text-slate-400 mb-2">Reglas desactivadas:</h4>
                <ul className="space-y-1 text-xs text-slate-500">
                  {inactiveRules.map(r => (
                    <li key={r.key} className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full border border-slate-600" /> {r.label}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white">Lista de verificación</h3>
            <ul className="space-y-3 mb-4">
              {checklist.map((item, i) => (
                <li key={i} className={`flex items-center gap-2 text-sm ${item.done ? 'text-brand-success' : 'text-slate-500'}`}>
                  {item.done ? <CheckCircle2 className="w-4 h-4" /> : <div className="w-4 h-4 rounded-full border-2 border-slate-700" />}
                  {item.label}
                </li>
              ))}
            </ul>
            <p className="text-xs text-slate-400">Después de guardar, podrás instalar el Web Chat, probar respuestas y revisar conversaciones desde el panel.</p>
          </div>
        </div>

        {/* Límite del plan */}
        <div className="pt-6 border-t border-white/[0.06]">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-slate-300">Uso de tu plan (<span className="capitalize">{currentPlan}</span>)</span>
            <span className="text-sm text-slate-400">{currentUsage} / {planLimit === null ? 'Ilimitado' : planLimit} asistentes</span>
          </div>

          {hasReachedLimit ? (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col gap-3">
              <div className="flex items-start gap-2">
                <Lock className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-200">
                  Alcanzaste el límite de asistentes de tu plan actual.
                </p>
              </div>
              <button
                type="button"
                onClick={() => router.push('/dashboard/billing')}
                className="w-full bg-gradient-to-r from-violet-500 to-cyan-500 py-3 rounded-xl text-white font-bold shadow-[0_0_15px_rgba(34,211,238,0.2)] hover:shadow-[0_0_25px_rgba(34,211,238,0.4)] transition-all"
              >
                Mejorar plan para guardar
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {status === 'error' && (
                <div className="p-3 rounded-xl bg-brand-pink/10 border border-brand-pink/20 text-brand-pink text-sm flex gap-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  {errorMsg}
                </div>
              )}
              <button
                type="button"
                onClick={onSubmit}
                disabled={!allReady || status === 'saving' || status === 'success'}
                className="w-full bg-gradient-to-r from-brand-violet to-brand-cyan py-4 rounded-xl text-white font-bold text-lg shadow-[0_0_20px_rgba(34,211,238,0.2)] hover:shadow-[0_0_30px_rgba(34,211,238,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {status === 'saving' && <Loader2 className="w-5 h-5 animate-spin" />}
                {status === 'success' && <CheckCircle2 className="w-5 h-5" />}
                {status === 'saving' ? (mode === 'edit' ? 'Guardando cambios...' : 'Creando asistente...') : 
                 status === 'success' ? (mode === 'edit' ? 'Cambios guardados correctamente' : 'Asistente creado correctamente') : 
                 (mode === 'edit' ? 'Guardar cambios' : 'Crear asistente')}
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
