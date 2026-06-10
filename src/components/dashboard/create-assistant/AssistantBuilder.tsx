'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAssistantDraft } from './useAssistantDraft'
import { BuilderProgress } from './BuilderProgress'
import { BasicInfoStep } from './BasicInfoStep'
import { TrainingStep } from './TrainingStep'
import { BehaviorStep } from './BehaviorStep'
import { ChannelsStep } from './ChannelsStep'
import { ReviewStep } from './ReviewStep'
import { AssistantLivePreview } from './AssistantLivePreview'
import { Loader2, ShoppingCart, HeadphonesIcon, Calendar, MapPin } from 'lucide-react'

interface Props {
  userId: string
  hasReachedLimit: boolean
  currentUsage: number
  planLimit: number | null
  currentPlan: string
}

export function AssistantBuilder({ userId, hasReachedLimit, currentUsage, planLimit, currentPlan }: Props) {
  const router = useRouter()
  const { form, setForm, currentStep, setCurrentStep, isLoaded, savedAt, clearDraft } = useAssistantDraft(userId)
  
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [isTestingReal, setIsTestingReal] = useState(false)

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-brand-cyan animate-spin" />
      </div>
    )
  }

  const handleSubmit = async () => {
    if (hasReachedLimit) return
    
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
      const res = await fetch('/api/assistants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al guardar')
      }
      setStatus('success')
      clearDraft()
      setTimeout(() => router.push('/dashboard/assistants'), 1200)
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
    <div className="max-w-[1400px] mx-auto space-y-8">
      {/* Header and Progress */}
      <div className="text-center space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2 text-white">Crear asistente de IA</h1>
          <p className="text-slate-400">Diseña un asistente especializado para ventas, soporte, reservas o atención al cliente.</p>
        </div>
        <BuilderProgress currentStep={currentStep} setCurrentStep={setCurrentStep} />
      </div>

      {/* Educational card — visible only on step 1 */}
      {currentStep === 1 && (
        <div className="bg-gradient-to-br from-brand-violet/5 to-brand-cyan/5 border border-brand-violet/20 rounded-2xl p-5">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-white mb-0.5">Un asistente para cada área de tu negocio</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Cada asistente funciona mejor cuando tiene una tarea clara. Puedes crear uno para ventas, otro para soporte, otro para reservas o uno por sucursal.
              Así evitas mezclar información y logras respuestas más precisas.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { icon: '🛒', title: 'Ventas', desc: 'Precios, promociones y cierre de clientes.' },
              { icon: '🎧', title: 'Soporte', desc: 'Dudas frecuentes, pedidos y seguimiento.' },
              { icon: '📅', title: 'Reservas', desc: 'Horarios, citas y datos del cliente.' },
              { icon: '📍', title: 'Sucursales', desc: 'Ubicación, horarios y atención local.' },
            ].map((item) => (
              <div key={item.title} className="bg-black/20 border border-white/[0.06] rounded-xl p-3">
                <span className="text-xl">{item.icon}</span>
                <p className="text-xs font-semibold text-white mt-1 mb-0.5">{item.title}</p>
                <p className="text-[10px] text-slate-500 leading-tight">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6 lg:gap-8 items-start relative">
        
        {/* Left Column - Form */}
        <div className="min-h-[500px]">
          {currentStep === 1 && <BasicInfoStep form={form} setForm={setForm} />}
          {currentStep === 2 && <TrainingStep form={form} setForm={setForm} />}
          {currentStep === 3 && <BehaviorStep form={form} setForm={setForm} />}
          {currentStep === 4 && <ChannelsStep form={form} setForm={setForm} currentPlan={currentPlan} />}
          {currentStep === 5 && (
            <ReviewStep 
              form={form} 
              hasReachedLimit={hasReachedLimit}
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
            <div className="mt-8 flex items-center justify-end gap-4">
              {currentStep > 1 && (
                <button
                  onClick={() => setCurrentStep(currentStep - 1)}
                  className="px-6 py-3 rounded-xl border border-white/10 text-white font-medium hover:bg-white/5 transition-all"
                >
                  Atrás
                </button>
              )}
              <button
                onClick={() => setCurrentStep(currentStep + 1)}
                className="px-6 py-3 rounded-xl gradient-btn text-white font-bold shadow-lg shadow-brand-cyan/20 hover:scale-[1.02] transition-all"
              >
                Siguiente paso
              </button>
            </div>
          )}

          {/* Autosave Indicator */}
          <div className="mt-6 flex items-center justify-between text-xs text-slate-500 px-4">
            <span>
              {savedAt ? `Borrador guardado: ${savedAt.toLocaleTimeString('es')}` : 'Sin cambios'}
            </span>
            {savedAt && (
              <button onClick={clearDraft} className="hover:text-brand-pink transition-colors">
                Limpiar borrador
              </button>
            )}
          </div>
        </div>

        {/* Right Column - Live Preview */}
        <div className="lg:sticky lg:top-24 hidden lg:block">
          <AssistantLivePreview 
            form={form} 
            onTestReal={handleTestReal} 
            isTestingReal={isTestingReal} 
          />
        </div>
      </div>
    </div>
  )
}
