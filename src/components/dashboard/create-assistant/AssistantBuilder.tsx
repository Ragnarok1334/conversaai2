'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAssistantDraft } from './useAssistantDraft'
import { BuilderProgress } from './BuilderProgress'
import { BasicInfoStep } from './BasicInfoStep'
import { TrainingStep } from './TrainingStep'
import { BehaviorStep } from './BehaviorStep'
import { ChannelsStep } from './ChannelsStep'
import { ReviewStep } from './ReviewStep'
import { AssistantLivePreview } from './AssistantLivePreview'
import { Loader2, AlertCircle, X, ChevronRight, Save, LayoutDashboard, Smartphone } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

interface Props {
  mode?: 'create' | 'edit'
  assistantId?: string
  initialData?: any // We use any to avoid importing BuilderFormData everywhere, or import it
  userId: string
  hasReachedLimit: boolean
  currentUsage: number
  planLimit: number | null
  currentPlan: string
}

export function AssistantBuilder({ mode = 'create', assistantId, initialData, userId, hasReachedLimit, currentUsage, planLimit, currentPlan }: Props) {
  const router = useRouter()
  const { form, setForm, currentStep, setCurrentStep, isLoaded, savedAt, clearDraft, hasUnsavedChanges, discardDraftAndLoadDB, setHasUnsavedChanges } = useAssistantDraft(userId, mode, assistantId, initialData)
  
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [isTestingReal, setIsTestingReal] = useState(false)
  const [showClearModal, setShowClearModal] = useState(false)
  const [showMobilePreview, setShowMobilePreview] = useState(false)
  
  // Validation State
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({})

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-brand-cyan animate-spin" />
      </div>
    )
  }

  const validateStep = (step: number): boolean => {
    const errors: Record<string, string> = {}
    let isValid = true

    if (step === 1) {
      if (!form.assistant_name.trim()) {
        errors.assistant_name = 'El nombre del asistente es obligatorio'
        isValid = false
      }
      if (!form.business_name.trim()) {
        errors.business_name = 'El nombre del negocio es obligatorio'
        isValid = false
      }
      if (!form.business_type.trim()) {
        errors.business_type = 'Selecciona el tipo de negocio'
        isValid = false
      }
    } else if (step === 2) {
      const hasLegacyContent = form.instructions.trim().length >= 80
      const hasBlockContent = form.knowledgeBlocks?.some(b => b.is_active && b.content.trim().length >= 80)
      if (!hasLegacyContent && !hasBlockContent) {
        errors.knowledge = 'Agrega al menos una sección de conocimiento con información real del negocio para que el asistente pueda responder correctamente.'
        isValid = false
      }
    }

    setStepErrors(errors)
    return isValid
  }

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleSubmit = async () => {
    if (mode === 'create' && hasReachedLimit) return
    
    setStatus('saving')
    setErrorMsg('')
    
    const payload = {
      ...form,
      channel: form.behavior.initialChannel,
      tone: form.behavior.tone,
      main_goal: form.behavior.goal,
      knowledge_blocks: form.knowledgeBlocks?.filter(b => b.is_active && b.content.trim()) || null
    }

    try {
      const url = mode === 'edit' ? `/api/assistants/${assistantId}` : '/api/assistants'
      const method = mode === 'edit' ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Error al guardar')
      }
      setStatus('success')
      clearDraft()
      const newId = data.assistant?.id || assistantId
      setTimeout(() => router.push(mode === 'edit' ? `/dashboard/assistants/${assistantId}` : `/dashboard/assistants/${newId}?tab=install`), 1200)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al guardar el asistente')
      setStatus('error')
    }
  }

  const handleTestReal = async (userMessage: string): Promise<string> => {
    setIsTestingReal(true)
    try {
      const res = await fetch('/api/assistant/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assistantConfig: {
            assistantName: form.assistant_name,
            businessName: form.business_name,
            businessType: form.business_type,
            channel: form.behavior.initialChannel,
            tone: form.behavior.tone,
            mainGoal: form.behavior.goal,
            instructions: form.instructions,
            faqs: form.faqs,
            services: form.services,
            schedule: form.schedule,
            fallbackMessage: form.fallback_message,
            language: form.language,
            knowledge_blocks: form.knowledgeBlocks?.filter(b => b.is_active && b.content.trim()) || null
          },
          userMessage,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al procesar')
      return data.reply
    } finally {
      setIsTestingReal(false)
    }
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 pb-20 lg:pb-8">
      {/* Header and Progress */}
      <div className="text-center space-y-6">
        <div className="flex flex-col items-center gap-4">
          <Link 
            href="/dashboard/assistants"
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <LayoutDashboard className="w-4 h-4" />
            Volver a mis asistentes
          </Link>
          
          <div className="flex flex-wrap items-center justify-center gap-2 mb-2">
            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-slate-300">
              Plan <span className="capitalize text-brand-cyan">{currentPlan}</span>
            </span>
            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-slate-300">
              {currentUsage} / {planLimit === null ? 'Ilimitado' : planLimit} asistentes
            </span>
            {savedAt && (
              <span className="px-3 py-1 rounded-full bg-brand-violet/10 border border-brand-violet/20 text-xs font-medium text-brand-violet flex items-center gap-1.5">
                <Save className="w-3.5 h-3.5" />
                Borrador guardado {savedAt.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
          
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2 text-white">
              {mode === 'edit' ? 'Editar asistente IA' : 'Constructor de asistente IA'}
            </h1>
            <p className="text-slate-400">
              {mode === 'edit' 
                ? 'Actualiza la información, conocimiento, comportamiento y canales de este asistente.' 
                : 'Diseña un asistente especializado para ventas, soporte, reservas o atención al cliente.'}
            </p>
          </div>
        </div>
        <BuilderProgress currentStep={currentStep} setCurrentStep={setCurrentStep} />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6 lg:gap-8 items-start relative">
        
        {/* Left Column - Form */}
        <div className="min-h-[500px]">
          {currentStep === 1 && <BasicInfoStep form={form} setForm={setForm} errors={stepErrors} />}
          {currentStep === 2 && <TrainingStep form={form} setForm={setForm} errors={stepErrors} />}
          {currentStep === 3 && <BehaviorStep form={form} setForm={setForm} />}
          {currentStep === 4 && <ChannelsStep form={form} setForm={setForm} currentPlan={currentPlan} />}
          {currentStep === 5 && (
            <ReviewStep 
              form={form} 
              mode={mode}
              hasReachedLimit={mode === 'create' ? hasReachedLimit : false}
              currentUsage={currentUsage}
              planLimit={planLimit}
              currentPlan={currentPlan}
              status={status}
              errorMsg={errorMsg}
              onSubmit={handleSubmit}
            />
          )}

          {/* Navigation Controls */}
          {currentStep < 5 && (
            <div className="mt-8 flex items-center justify-between gap-4">
              {currentStep > 1 ? (
                <button
                  onClick={() => setCurrentStep(currentStep - 1)}
                  className="px-6 py-3 rounded-xl border border-white/10 text-white font-medium hover:bg-white/5 transition-all"
                >
                  Atrás
                </button>
              ) : (
                <div />
              )}
              <button
                onClick={handleNextStep}
                className="px-6 py-3 rounded-xl gradient-btn text-white font-bold shadow-lg shadow-brand-cyan/20 hover:scale-[1.02] transition-all flex items-center gap-2"
              >
                Siguiente paso
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Clear Draft Trigger */}
          {savedAt && (
            <div className="mt-8 text-center">
              <button onClick={() => setShowClearModal(true)} className="text-xs text-slate-500 hover:text-brand-pink transition-colors underline underline-offset-2">
                Descartar borrador y empezar de nuevo
              </button>
            </div>
          )}
        </div>

        {/* Right Column - Live Preview */}
        <div className="hidden lg:block lg:sticky lg:top-24">
          <AssistantLivePreview 
            form={form} 
            onTestReal={handleTestReal} 
            isTestingReal={isTestingReal} 
          />
        </div>
      </div>

      {/* Mobile Preview FAB */}
      <div className="lg:hidden fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setShowMobilePreview(true)}
          className="w-14 h-14 rounded-full gradient-btn flex items-center justify-center shadow-[0_0_20px_rgba(34,211,238,0.4)] text-white"
        >
          <Smartphone className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile Preview Modal */}
      <AnimatePresence>
        {showMobilePreview && (
          <motion.div 
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-50 bg-slate-950 flex flex-col lg:hidden"
          >
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-card-bg">
              <h3 className="font-bold text-white">Vista Previa</h3>
              <button onClick={() => setShowMobilePreview(false)} className="p-2 bg-white/5 rounded-full text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <AssistantLivePreview 
                form={form} 
                onTestReal={handleTestReal} 
                isTestingReal={isTestingReal} 
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Clear Draft Modal */}
      <AnimatePresence>
        {showClearModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-slate-900 border border-white/10 p-6 rounded-2xl max-w-sm w-full shadow-2xl"
            >
              <div className="flex gap-3 mb-4 text-brand-pink">
                <AlertCircle className="w-6 h-6 flex-shrink-0" />
                <h3 className="font-bold text-lg text-white">¿Descartar borrador?</h3>
              </div>
              <p className="text-sm text-slate-300 mb-6">
                Perderás todo el progreso no guardado del asistente actual. Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowClearModal(false)}
                  className="px-4 py-2 rounded-xl border border-white/10 text-white font-medium hover:bg-white/5 transition-all text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    clearDraft()
                    setShowClearModal(false)
                  }}
                  className="px-4 py-2 rounded-xl bg-brand-pink text-white font-bold hover:bg-brand-pink/90 transition-all text-sm shadow-[0_0_15px_rgba(244,63,94,0.3)]"
                >
                  Descartar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Unsaved Changes Modal */}
      <AnimatePresence>
        {hasUnsavedChanges && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-slate-900 border border-white/10 p-6 rounded-2xl max-w-sm w-full shadow-2xl"
            >
              <div className="flex gap-3 mb-4 text-brand-cyan">
                <AlertCircle className="w-6 h-6 flex-shrink-0" />
                <h3 className="font-bold text-lg text-white">Borrador detectado</h3>
              </div>
              <p className="text-sm text-slate-300 mb-6">
                Tienes cambios sin guardar en este dispositivo.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => setHasUnsavedChanges(false)}
                  className="px-4 py-2.5 rounded-xl bg-brand-cyan text-black font-bold hover:bg-cyan-400 transition-all text-sm w-full shadow-[0_0_15px_rgba(34,211,238,0.3)]"
                >
                  Continuar editando borrador
                </button>
                <button
                  onClick={() => discardDraftAndLoadDB()}
                  className="px-4 py-2.5 rounded-xl border border-white/10 text-white font-medium hover:bg-white/5 transition-all text-sm w-full"
                >
                  Descartar borrador y cargar datos guardados
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}
