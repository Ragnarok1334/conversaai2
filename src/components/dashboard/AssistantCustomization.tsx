'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Loader2, Save, Palette, Type, LayoutTemplate, MessageSquare, Plus, Trash2, ShieldAlert, Send } from 'lucide-react'

export interface WidgetConfig {
  displayName?: string
  subtitle?: string
  welcomeMessage?: string
  primaryColor?: string
  secondaryColor?: string
  theme?: 'modern' | 'minimal' | 'premium'
  position?: 'bottom-right' | 'bottom-left'
  launcherText?: string
  quickQuestions?: string[]
}

interface Props {
  assistantId: string
  initialConfig: WidgetConfig
  currentPlan: string
}

const DEFAULT_CONFIG: WidgetConfig = {
  displayName: '',
  subtitle: '',
  welcomeMessage: '',
  primaryColor: '#7C3AED',
  secondaryColor: '#06B6D4',
  theme: 'modern',
  position: 'bottom-right',
  launcherText: '',
  quickQuestions: []
}

export function AssistantCustomization({ assistantId, initialConfig, currentPlan }: Props) {
  const [config, setConfig] = useState<WidgetConfig>({ ...DEFAULT_CONFIG, ...initialConfig })
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [toast, setToast] = useState('')

  // Plan logic
  const isStarter = currentPlan === 'starter' || currentPlan === 'free'
  const isPro = currentPlan === 'pro'
  const isGrowthOrAbove = currentPlan === 'growth' || currentPlan === 'business' || currentPlan === 'enterprise'

  const canUseQuickQuestions = isPro || isGrowthOrAbove
  const canUseThemeAndSecondary = isGrowthOrAbove
  const canUseSubtitle = isPro || isGrowthOrAbove

  const handleSave = async () => {
    setStatus('saving')
    setErrorMsg('')
    setToast('')
    
    try {
      const res = await fetch(`/api/assistants/${assistantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ widget_config: config }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al guardar')
      
      setStatus('success')
      setToast('Personalización guardada correctamente.')
      setTimeout(() => { setStatus('idle'); setToast('') }, 3000)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error interno')
      setStatus('error')
    }
  }

  const handleChange = (field: keyof WidgetConfig, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }))
  }

  const handleAddQuestion = () => {
    if ((config.quickQuestions || []).length >= 4) return
    handleChange('quickQuestions', [...(config.quickQuestions || []), ''])
  }

  const handleUpdateQuestion = (index: number, val: string) => {
    const arr = [...(config.quickQuestions || [])]
    arr[index] = val
    handleChange('quickQuestions', arr)
  }

  const handleRemoveQuestion = (index: number) => {
    const arr = [...(config.quickQuestions || [])]
    arr.splice(index, 1)
    handleChange('quickQuestions', arr)
  }

  return (
    <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6 lg:gap-8 items-start relative">
      
      {/* Columna Izquierda - Formulario */}
      <div className="space-y-6">
        <div className="bg-card-bg/60 backdrop-blur border border-white/10 rounded-3xl p-6 lg:p-8 shadow-xl">
          <div className="mb-6 border-b border-white/[0.06] pb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Palette className="w-5 h-5 text-brand-cyan" />
              Apariencia del Web Chat
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Personaliza cómo se ve y se siente el asistente instalado en tu sitio web.
            </p>
          </div>

          <div className="space-y-8">
            {/* A. Identidad */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Type className="w-4 h-4 text-slate-400" />
                Textos principales
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 ml-1">Nombre visible del asistente</label>
                  <input
                    type="text"
                    value={config.displayName || ''}
                    onChange={e => handleChange('displayName', e.target.value)}
                    placeholder="Ej. Soporte ConversaAI"
                    maxLength={60}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan outline-none transition-all"
                  />
                </div>
                
                <div className={!canUseSubtitle ? 'opacity-50 pointer-events-none relative' : ''}>
                  <label className="block text-xs text-slate-400 mb-1.5 ml-1 flex justify-between">
                    <span>Subtítulo corto</span>
                    {!canUseSubtitle && <span className="text-amber-500 text-[10px] font-bold">PRO</span>}
                  </label>
                  <input
                    type="text"
                    value={config.subtitle || ''}
                    onChange={e => handleChange('subtitle', e.target.value)}
                    placeholder="Ej. Normalmente responde en segundos"
                    maxLength={90}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-brand-cyan outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 ml-1">Mensaje de bienvenida</label>
                  <textarea
                    value={config.welcomeMessage || ''}
                    onChange={e => handleChange('welcomeMessage', e.target.value)}
                    placeholder="Hola, soy el asistente virtual. ¿En qué puedo ayudarte?"
                    maxLength={240}
                    rows={3}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-brand-cyan outline-none transition-all resize-none"
                  />
                </div>

                <div className={!canUseSubtitle ? 'opacity-50 pointer-events-none relative' : ''}>
                  <label className="block text-xs text-slate-400 mb-1.5 ml-1 flex justify-between">
                    <span>Texto del botón (Launcher)</span>
                    {!canUseSubtitle && <span className="text-amber-500 text-[10px] font-bold">PRO</span>}
                  </label>
                  <input
                    type="text"
                    value={config.launcherText || ''}
                    onChange={e => handleChange('launcherText', e.target.value)}
                    placeholder="Ej. ¿Necesitas ayuda?"
                    maxLength={40}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-brand-cyan outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            {/* B. Apariencia */}
            <div className="space-y-4 pt-4 border-t border-white/[0.06]">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <LayoutTemplate className="w-4 h-4 text-slate-400" />
                Diseño visual
              </h3>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 ml-1">Color principal (Hex)</label>
                  <div className="flex items-center gap-3 bg-black/20 border border-white/10 rounded-xl p-2 focus-within:border-brand-cyan transition-all">
                    <input 
                      type="color" 
                      value={config.primaryColor || '#7C3AED'} 
                      onChange={e => handleChange('primaryColor', e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent"
                    />
                    <input 
                      type="text" 
                      value={config.primaryColor || ''}
                      onChange={e => handleChange('primaryColor', e.target.value)}
                      placeholder="#7C3AED"
                      maxLength={7}
                      className="bg-transparent border-none outline-none text-sm text-white w-full uppercase"
                    />
                  </div>
                </div>

                <div className={!canUseThemeAndSecondary ? 'opacity-50 pointer-events-none relative' : ''}>
                  <label className="block text-xs text-slate-400 mb-1.5 ml-1 flex justify-between">
                    <span>Color secundario (Gradiente)</span>
                    {!canUseThemeAndSecondary && <span className="text-amber-500 text-[10px] font-bold">GROWTH</span>}
                  </label>
                  <div className="flex items-center gap-3 bg-black/20 border border-white/10 rounded-xl p-2">
                    <input 
                      type="color" 
                      value={config.secondaryColor || '#06B6D4'} 
                      onChange={e => handleChange('secondaryColor', e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent"
                    />
                    <input 
                      type="text" 
                      value={config.secondaryColor || ''}
                      onChange={e => handleChange('secondaryColor', e.target.value)}
                      placeholder="#06B6D4"
                      maxLength={7}
                      className="bg-transparent border-none outline-none text-sm text-white w-full uppercase"
                    />
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 mt-4">
                <div className={!canUseThemeAndSecondary ? 'opacity-50 pointer-events-none' : ''}>
                  <label className="block text-xs text-slate-400 mb-1.5 ml-1 flex justify-between">
                    <span>Tema visual</span>
                    {!canUseThemeAndSecondary && <span className="text-amber-500 text-[10px] font-bold">GROWTH</span>}
                  </label>
                  <select
                    value={config.theme || 'modern'}
                    onChange={e => handleChange('theme', e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-brand-cyan appearance-none"
                  >
                    <option value="modern">Moderno</option>
                    <option value="minimal">Minimalista</option>
                    <option value="premium">Premium</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 ml-1">Posición en pantalla</label>
                  <select
                    value={config.position || 'bottom-right'}
                    onChange={e => handleChange('position', e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-brand-cyan appearance-none"
                  >
                    <option value="bottom-right">Abajo a la derecha</option>
                    <option value="bottom-left">Abajo a la izquierda</option>
                  </select>
                </div>
              </div>
            </div>

            {/* C. Preguntas Rápidas */}
            <div className={`space-y-4 pt-4 border-t border-white/[0.06] ${!canUseQuickQuestions ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-slate-400" />
                  Preguntas rápidas (Max 4)
                </h3>
                {!canUseQuickQuestions && <span className="text-amber-500 text-[10px] font-bold">PRO</span>}
              </div>
              
              <div className="space-y-3">
                {(config.quickQuestions || []).map((q, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      value={q}
                      onChange={e => handleUpdateQuestion(i, e.target.value)}
                      placeholder={`Pregunta ${i + 1}`}
                      maxLength={80}
                      className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-brand-cyan transition-all"
                    />
                    <button 
                      onClick={() => handleRemoveQuestion(i)}
                      className="p-2.5 rounded-xl bg-white/5 hover:bg-brand-pink/20 hover:text-brand-pink border border-white/10 hover:border-brand-pink/30 text-slate-400 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {(config.quickQuestions || []).length < 4 && (
                  <button 
                    onClick={handleAddQuestion}
                    className="w-full py-3 rounded-xl border border-dashed border-white/20 text-slate-400 text-sm font-medium hover:text-white hover:border-white/40 hover:bg-white/5 transition-all flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Agregar pregunta rápida
                  </button>
                )}
              </div>
            </div>

            {/* Guardar */}
            <div className="pt-6 border-t border-white/[0.06]">
              {status === 'error' && (
                <div className="mb-4 p-3 rounded-xl bg-brand-pink/10 border border-brand-pink/20 text-brand-pink text-sm flex items-start gap-2">
                  <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  {errorMsg}
                </div>
              )}
              {toast && (
                <div className="mb-4 p-3 rounded-xl bg-brand-success/10 border border-brand-success/20 text-brand-success text-sm font-medium text-center">
                  {toast}
                </div>
              )}
              
              <button
                onClick={handleSave}
                disabled={status === 'saving'}
                className="w-full bg-gradient-to-r from-brand-violet to-brand-cyan py-3.5 rounded-xl text-white font-bold text-base shadow-[0_0_20px_rgba(34,211,238,0.2)] hover:shadow-[0_0_30px_rgba(34,211,238,0.4)] hover:scale-[1.01] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {status === 'saving' && <Loader2 className="w-5 h-5 animate-spin" />}
                Guardar personalización
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* Columna Derecha - Preview Local */}
      <div className="hidden lg:block lg:sticky lg:top-24">
        <div className="bg-card-bg/60 backdrop-blur border border-white/10 rounded-3xl p-6 shadow-xl min-h-[600px] flex flex-col">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-white">Vista previa del Web Chat</h2>
            <p className="text-xs text-slate-400 mt-1">Vista previa local &middot; No consume mensajes.</p>
          </div>
          
          <div className="flex-1 bg-[#1A1A1A] rounded-2xl border border-white/5 relative overflow-hidden flex flex-col justify-end p-4">
            {/* Widget Button */}
            <div 
              className={`absolute bottom-4 ${config.position === 'bottom-left' ? 'left-4' : 'right-4'} flex items-center gap-3 z-10 transition-all duration-300`}
            >
              {config.launcherText && (
                <div className="bg-white text-black px-4 py-2.5 rounded-2xl text-sm font-medium shadow-lg whitespace-nowrap">
                  {config.launcherText}
                </div>
              )}
              <div 
                className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
                style={{
                  background: config.theme === 'premium' && config.secondaryColor 
                    ? `linear-gradient(135deg, ${config.primaryColor || '#7C3AED'}, ${config.secondaryColor})`
                    : (config.primaryColor || '#7C3AED')
                }}
              >
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
            </div>

            {/* Widget Panel */}
            <div 
              className={`absolute bottom-24 ${config.position === 'bottom-left' ? 'left-4' : 'right-4'} w-[320px] h-[450px] bg-[#050816] rounded-2xl border border-white/10 shadow-2xl flex flex-col overflow-hidden z-20 transition-all duration-300`}
            >
              {/* Header */}
              <div 
                className="p-4 flex items-center gap-3"
                style={{
                  background: config.theme === 'premium' && config.secondaryColor
                    ? `linear-gradient(90deg, ${config.primaryColor || '#7C3AED'}33 0%, ${config.secondaryColor}33 100%)`
                    : `${config.primaryColor || '#7C3AED'}33`,
                  borderBottom: `1px solid ${config.primaryColor || '#7C3AED'}40`
                }}
              >
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-md"
                  style={{
                    background: config.theme === 'premium' && config.secondaryColor 
                      ? `linear-gradient(135deg, ${config.primaryColor || '#7C3AED'}, ${config.secondaryColor})`
                      : (config.primaryColor || '#7C3AED')
                  }}
                >
                  {(config.displayName || 'Asistente').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm m-0 leading-tight">
                    {config.displayName || 'Asistente IA'}
                  </h3>
                  <p className="text-[11px] text-slate-300 m-0 mt-0.5 truncate max-w-[200px]">
                    {config.subtitle || 'En línea'}
                  </p>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 p-4 flex flex-col gap-3 overflow-y-auto bg-[#0A0D1A]">
                {/* Saludo inicial */}
                <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 rounded-tl-sm self-start max-w-[85%]">
                  <p className="text-slate-200 text-[13px] leading-relaxed">
                    {config.welcomeMessage || 'Hola, soy el asistente virtual. ¿En qué puedo ayudarte?'}
                  </p>
                </div>

                {/* Quick Questions */}
                {(config.quickQuestions || []).filter(q => q.trim() !== '').length > 0 && (
                  <div className="flex flex-col gap-2 mt-2 items-end">
                    {(config.quickQuestions || []).filter(q => q.trim() !== '').map((q, i) => (
                      <div 
                        key={i} 
                        className="px-3 py-2 rounded-xl text-[12px] font-medium border self-end cursor-pointer transition-colors"
                        style={{
                          borderColor: `${config.primaryColor || '#7C3AED'}60`,
                          color: config.primaryColor || '#7C3AED',
                          backgroundColor: `${config.primaryColor || '#7C3AED'}15`
                        }}
                      >
                        {q}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Input Area */}
              <div className="p-3 border-t border-white/10 bg-[#050816] flex items-center gap-2">
                <input 
                  type="text" 
                  disabled
                  placeholder="Escribe tu mensaje..." 
                  className="flex-1 bg-transparent border-none text-[13px] text-white outline-none px-2"
                />
                <button 
                  disabled
                  className="w-9 h-9 rounded-lg flex items-center justify-center opacity-50"
                  style={{
                    background: config.theme === 'premium' && config.secondaryColor 
                      ? `linear-gradient(135deg, ${config.primaryColor || '#7C3AED'}, ${config.secondaryColor})`
                      : (config.primaryColor || '#7C3AED')
                  }}
                >
                  <Send className="w-4 h-4 text-white ml-0.5" />
                </button>
              </div>
            </div>
            
          </div>
        </div>
      </div>

    </div>
  )
}
