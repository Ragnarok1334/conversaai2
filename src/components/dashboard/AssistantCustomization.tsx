'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, Palette, Type, LayoutTemplate, MessageSquare, Plus, Trash2, ShieldAlert, CheckCircle2, Smartphone, Monitor, Save, Send } from 'lucide-react'

export interface WidgetConfig {
  displayName?: string
  subtitle?: string
  welcomeMessage?: string
  primaryColor?: string
  secondaryColor?: string
  theme?: 'modern' | 'minimal' | 'premium'
  position?: 'bottom-right' | 'bottom-left'
  launcherText?: string
  launcherMode?: 'icon' | 'icon-text'
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
  launcherMode: 'icon-text',
  quickQuestions: []
}

const VISUAL_PRESETS = [
  { name: 'ConversaAI', primaryColor: '#7C3AED', secondaryColor: '#06B6D4', theme: 'premium' as const },
  { name: 'Profesional oscuro', primaryColor: '#2563EB', secondaryColor: '#38BDF8', theme: 'modern' as const },
  { name: 'Elegante', primaryColor: '#111827', secondaryColor: '#6B7280', theme: 'minimal' as const },
  { name: 'Comercial', primaryColor: '#F97316', secondaryColor: '#FACC15', theme: 'premium' as const },
  { name: 'Salud / bienestar', primaryColor: '#10B981', secondaryColor: '#22D3EE', theme: 'modern' as const }
]

const QQ_EXAMPLES = [
  "¿Qué planes tienen?",
  "¿Cómo instalo mi asistente?",
  "¿Puedo probarlo gratis?",
  "¿Cómo contacto soporte?"
]

export function AssistantCustomization({ assistantId, initialConfig, currentPlan }: Props) {
  const [config, setConfig] = useState<WidgetConfig>({ ...DEFAULT_CONFIG, ...initialConfig })
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [toast, setToast] = useState('')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [activePreset, setActivePreset] = useState<string | null>(null)
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop')

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
      setHasUnsavedChanges(false)
      setTimeout(() => { setStatus('idle'); setToast('') }, 3000)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error interno')
      setStatus('error')
    }
  }

  const handleChange = (field: keyof WidgetConfig, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }))
    setHasUnsavedChanges(true)
    if (field === 'primaryColor' || field === 'secondaryColor' || field === 'theme') {
      setActivePreset(null)
    }
  }

  const handleApplyPreset = (preset: typeof VISUAL_PRESETS[0]) => {
    if (!canUseThemeAndSecondary) return
    setConfig(prev => ({
      ...prev,
      primaryColor: preset.primaryColor,
      secondaryColor: preset.secondaryColor,
      theme: preset.theme
    }))
    setActivePreset(preset.name)
    setHasUnsavedChanges(true)
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

  const handleAddExample = (example: string) => {
    const current = config.quickQuestions || []
    if (current.length >= 4) return
    handleChange('quickQuestions', [...current, example])
  }

  return (
    <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6 lg:gap-8 items-start relative">
      
      {/* Columna Izquierda - Formulario */}
      <div className="space-y-6">
        <div className="bg-card-bg/60 backdrop-blur border border-white/10 rounded-3xl p-6 lg:p-8 shadow-xl">
          <div className="mb-8 border-b border-white/[0.06] pb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Palette className="w-5 h-5 text-brand-cyan" />
                Personalización del Web Chat
              </h2>
              <p className="text-sm text-slate-400 mt-1.5">
                Adapta el chat a la identidad de tu marca y revisa cómo se verá antes de instalarlo.
              </p>
            </div>
            {hasUnsavedChanges && (
              <span className="text-[11px] font-medium bg-amber-500/10 text-amber-500 px-2.5 py-1 rounded-full border border-amber-500/20">
                Cambios sin guardar
              </span>
            )}
          </div>

          <div className="space-y-10">
            {/* A. Identidad */}
            <section className="space-y-5">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2 border-b border-white/[0.04] pb-2">
                <Type className="w-4 h-4 text-brand-cyan" />
                A. Identidad de marca
              </h3>
              
              <div className="space-y-5 pl-1">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Nombre visible</label>
                  <input
                    type="text"
                    value={config.displayName || ''}
                    onChange={e => handleChange('displayName', e.target.value)}
                    placeholder="Ej. Soporte ConversaAI"
                    maxLength={60}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan outline-none transition-all"
                  />
                  <p className="text-[11px] text-slate-500 mt-1.5">El nombre que aparecerá en el encabezado del chat.</p>
                </div>
                
                <div className={!canUseSubtitle ? 'opacity-50 pointer-events-none relative' : ''}>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5 flex justify-between">
                    <span>Subtítulo</span>
                    {!canUseSubtitle && <span className="text-amber-500 text-[10px] font-bold px-1.5 bg-amber-500/10 rounded border border-amber-500/20">PRO</span>}
                  </label>
                  <input
                    type="text"
                    value={config.subtitle || ''}
                    onChange={e => handleChange('subtitle', e.target.value)}
                    placeholder="Ej. Normalmente responde en segundos"
                    maxLength={90}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-brand-cyan outline-none transition-all"
                  />
                  <p className="text-[11px] text-slate-500 mt-1.5">Texto pequeño debajo del nombre (ej. estado en línea).</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Mensaje de bienvenida</label>
                  <textarea
                    value={config.welcomeMessage || ''}
                    onChange={e => handleChange('welcomeMessage', e.target.value)}
                    placeholder="Hola, soy el asistente virtual. ¿En qué puedo ayudarte?"
                    maxLength={240}
                    rows={3}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-brand-cyan outline-none transition-all resize-none"
                  />
                  <p className="text-[11px] text-slate-500 mt-1.5">El primer mensaje que el visitante verá al abrir el chat.</p>
                </div>
              </div>
            </section>

            {/* B. Apariencia */}
            <section className="space-y-5">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2 border-b border-white/[0.04] pb-2">
                <LayoutTemplate className="w-4 h-4 text-brand-cyan" />
                B. Estilo visual
              </h3>

              <div className="space-y-5 pl-1">
                <div className={!canUseThemeAndSecondary ? 'opacity-50 pointer-events-none' : ''}>
                  <label className="block text-xs font-medium text-slate-300 mb-2 flex justify-between">
                    <span>Presets visuales</span>
                    {!canUseThemeAndSecondary && <span className="text-amber-500 text-[10px] font-bold px-1.5 bg-amber-500/10 rounded border border-amber-500/20">GROWTH</span>}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {VISUAL_PRESETS.map(p => (
                      <button
                        key={p.name}
                        onClick={() => handleApplyPreset(p)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${activePreset === p.name ? 'bg-brand-cyan/20 border-brand-cyan/50 text-brand-cyan' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'}`}
                      >
                        {p.name}
                      </button>
                    ))}
                    {(!activePreset && config.primaryColor) && (
                      <span className="px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-violet/20 border border-brand-violet/50 text-brand-violet">
                        Personalizado
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Color principal</label>
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
                    <label className="block text-xs font-medium text-slate-300 mb-1.5 flex justify-between">
                      <span>Color secundario (Gradiente)</span>
                      {!canUseThemeAndSecondary && <span className="text-amber-500 text-[10px] font-bold px-1.5 bg-amber-500/10 rounded border border-amber-500/20">GROWTH</span>}
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

                <div className={!canUseThemeAndSecondary ? 'opacity-50 pointer-events-none' : ''}>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5 flex justify-between">
                    <span>Tema visual</span>
                    {!canUseThemeAndSecondary && <span className="text-amber-500 text-[10px] font-bold px-1.5 bg-amber-500/10 rounded border border-amber-500/20">GROWTH</span>}
                  </label>
                  <select
                    value={config.theme || 'modern'}
                    onChange={e => handleChange('theme', e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-brand-cyan appearance-none"
                  >
                    <option value="modern">Moderno (Color sólido)</option>
                    <option value="minimal">Minimalista (Oscuro)</option>
                    <option value="premium">Premium (Gradiente vibrante)</option>
                  </select>
                </div>
              </div>
            </section>

            {/* C. Botón flotante */}
            <section className="space-y-5">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2 border-b border-white/[0.04] pb-2">
                <MessageSquare className="w-4 h-4 text-brand-cyan" />
                C. Botón flotante
              </h3>

              <div className="space-y-5 pl-1">
                <div className={!canUseSubtitle ? 'opacity-50 pointer-events-none relative' : ''}>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5 flex justify-between">
                    <span>Modo del botón</span>
                    {!canUseSubtitle && <span className="text-amber-500 text-[10px] font-bold px-1.5 bg-amber-500/10 rounded border border-amber-500/20">PRO</span>}
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                      <input 
                        type="radio" 
                        checked={config.launcherMode !== 'icon'} 
                        onChange={() => handleChange('launcherMode', 'icon-text')}
                        className="accent-brand-cyan"
                      />
                      Ícono + texto
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                      <input 
                        type="radio" 
                        checked={config.launcherMode === 'icon'} 
                        onChange={() => handleChange('launcherMode', 'icon')}
                        className="accent-brand-cyan"
                      />
                      Solo ícono
                    </label>
                  </div>
                </div>

                <div className={(!canUseSubtitle || config.launcherMode === 'icon') ? 'opacity-50 pointer-events-none relative transition-opacity' : 'transition-opacity'}>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Texto del botón</label>
                  <input
                    type="text"
                    value={config.launcherText || ''}
                    onChange={e => handleChange('launcherText', e.target.value)}
                    placeholder="Ej. ¿Necesitas ayuda?"
                    maxLength={40}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-brand-cyan outline-none transition-all"
                  />
                  <p className="text-[11px] text-slate-500 mt-1.5">Aparecerá como un globo junto al botón del chat.</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Posición</label>
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
            </section>

            {/* D. Preguntas Rápidas */}
            <section className={`space-y-5 ${!canUseQuickQuestions ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="flex items-center justify-between border-b border-white/[0.04] pb-2">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <LayoutTemplate className="w-4 h-4 text-brand-cyan" />
                  D. Preguntas rápidas
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium text-slate-400">{(config.quickQuestions || []).length} / 4</span>
                  {!canUseQuickQuestions && <span className="text-amber-500 text-[10px] font-bold px-1.5 bg-amber-500/10 rounded border border-amber-500/20">PRO</span>}
                </div>
              </div>
              
              <div className="space-y-4 pl-1">
                <p className="text-[12px] text-slate-400 mb-2">Sugiere preguntas comunes a los visitantes. Al hacer clic, se enviarán automáticamente.</p>
                
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
                      <Plus className="w-4 h-4" /> Agregar pregunta personalizada
                    </button>
                  )}
                </div>

                {((config.quickQuestions || []).length < 4) && (
                  <div className="mt-4">
                    <p className="text-[11px] text-slate-500 mb-2">O elige un ejemplo:</p>
                    <div className="flex flex-wrap gap-2">
                      {QQ_EXAMPLES.map((ex, i) => (
                        <button 
                          key={i} 
                          onClick={() => handleAddExample(ex)}
                          className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 text-[11px] rounded-lg border border-white/10 transition-colors"
                        >
                          + {ex}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Guardar */}
            <div className="pt-6 border-t border-white/[0.06]">
              {status === 'error' && (
                <div className="mb-4 p-3 rounded-xl bg-brand-pink/10 border border-brand-pink/20 text-brand-pink text-sm flex items-start gap-2">
                  <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  {errorMsg}
                </div>
              )}
              {toast && (
                <div className="mb-4 p-3 rounded-xl bg-brand-success/10 border border-brand-success/20 text-brand-success text-sm font-medium text-center flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> {toast}
                </div>
              )}
              
              <button
                onClick={handleSave}
                disabled={status === 'saving'}
                className="w-full bg-gradient-to-r from-brand-violet to-brand-cyan py-3.5 rounded-xl text-white font-bold text-base shadow-[0_0_20px_rgba(34,211,238,0.2)] hover:shadow-[0_0_30px_rgba(34,211,238,0.4)] hover:scale-[1.01] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {status === 'saving' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                Guardar personalización
              </button>
              <p className="text-center text-[11px] text-slate-500 mt-3">
                Los cambios se aplicarán inmediatamente al Web Chat instalado.
              </p>
            </div>

          </div>
        </div>
      </div>

      {/* Columna Derecha - E. Preview Local */}
      <div className="hidden lg:block lg:sticky lg:top-24">
        <div className="bg-card-bg/60 backdrop-blur border border-white/10 rounded-3xl p-6 shadow-xl min-h-[600px] flex flex-col">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Monitor className="w-4 h-4 text-brand-cyan" />
                E. Vista previa
              </h2>
              <p className="text-xs text-slate-400 mt-1">Local &middot; No consume mensajes.</p>
            </div>
            
            {/* Desktop / Mobile Toggle */}
            <div className="flex bg-black/40 rounded-xl p-1 border border-white/10">
              <button 
                onClick={() => setPreviewMode('desktop')}
                className={`p-1.5 rounded-lg transition-colors ${previewMode === 'desktop' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-white'}`}
              >
                <Monitor className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setPreviewMode('mobile')}
                className={`p-1.5 rounded-lg transition-colors ${previewMode === 'mobile' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-white'}`}
              >
                <Smartphone className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className={`flex-1 bg-[#1A1A1A] rounded-2xl border border-white/5 relative flex flex-col items-center justify-center ${previewMode === 'mobile' ? 'p-8 bg-black/20' : 'p-4 overflow-hidden'}`}>
            
            {previewMode === 'mobile' ? (
              // Mobile Mockup
              <div className="w-[320px] h-[600px] bg-[#050816] rounded-[40px] border-8 border-black shadow-2xl relative overflow-hidden flex flex-col">
                {/* Status Bar */}
                <div className="h-6 w-full flex justify-center items-center relative z-50">
                  <div className="w-24 h-4 bg-black rounded-b-2xl"></div>
                </div>
                
                {/* Mobile Header */}
                <div 
                  className="p-4 flex items-center gap-3 relative z-10"
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
                  <div className="flex-1">
                    <h3 className="text-white font-semibold text-sm m-0 leading-tight">
                      {config.displayName || 'Asistente IA'}
                    </h3>
                    <p className="text-[11px] text-slate-300 m-0 mt-0.5 truncate max-w-[200px]">
                      {config.subtitle || 'En línea'}
                    </p>
                  </div>
                  <button className="text-white/60 hover:text-white"><Plus className="w-5 h-5 rotate-45" /></button>
                </div>

                {/* Mobile Messages Area */}
                <div className="flex-1 p-4 flex flex-col gap-3 overflow-y-auto bg-[#0A0D1A] pb-24 relative z-0">
                  {/* Saludo inicial */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 rounded-tl-sm self-start max-w-[85%]">
                    <p className="text-slate-200 text-[13px] leading-relaxed">
                      {config.welcomeMessage || 'Hola, soy el asistente virtual. ¿En qué puedo ayudarte?'}
                    </p>
                  </div>
                </div>

                {/* Mobile Quick Questions Area */}
                {(config.quickQuestions || []).length > 0 && (
                  <div className="absolute bottom-16 left-0 right-0 px-3 pb-2 flex flex-col gap-2 items-end z-20">
                    {(config.quickQuestions || []).map((q, i) => (
                      <div 
                        key={i} 
                        className="bg-black/40 border border-white/20 text-white px-3 py-1.5 rounded-xl text-[12px] shadow-sm backdrop-blur max-w-[85%] text-right"
                      >
                        {q}
                      </div>
                    ))}
                  </div>
                )}

                {/* Mobile Input */}
                <div className="absolute bottom-0 left-0 right-0 p-3 bg-[#050816] border-t border-white/10 z-30">
                  <div className="bg-white/5 rounded-xl p-1.5 pr-2 flex items-center gap-2 border border-white/10">
                    <input 
                      type="text" 
                      placeholder="Escribe tu mensaje..." 
                      className="bg-transparent text-[13px] outline-none text-white w-full px-2"
                      disabled
                    />
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                      style={{
                        background: config.primaryColor || '#7C3AED'
                      }}
                    >
                      <Send className="w-4 h-4 ml-0.5" />
                    </div>
                  </div>
                </div>

              </div>
            ) : (
              // Desktop Mockup
              <div className="w-full h-full flex flex-col justify-end">
                {/* Widget Button Desktop */}
                <div className={`absolute bottom-4 ${config.position === 'bottom-left' ? 'left-4 flex-row-reverse' : 'right-4 flex-row'} flex items-center justify-end gap-3 z-10 transition-all duration-300`}>
                  {(config.launcherMode !== 'icon' && config.launcherText) && (
                    <div className="bg-white text-black px-4 py-2.5 rounded-2xl text-sm font-medium shadow-lg whitespace-nowrap relative">
                      {config.launcherText}
                      <div className={`absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-white ${config.position === 'bottom-left' ? '-left-1 rotate-45' : '-right-1 rotate-45'}`}></div>
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

                {/* Widget Panel Desktop */}
                <div className={`absolute bottom-24 ${config.position === 'bottom-left' ? 'left-4' : 'right-4'} w-[320px] h-[450px] bg-[#050816] rounded-2xl border border-white/10 shadow-2xl flex flex-col overflow-hidden z-20 transition-all duration-300`}>
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
                    
                    {/* Quick Questions Display */}
                    <div className="mt-auto flex flex-col gap-2 items-end pt-4">
                      {(config.quickQuestions || []).map((q, i) => (
                        <div 
                          key={i} 
                          className="px-3 py-2 rounded-xl text-[12px] cursor-default transition-colors border"
                          style={{
                            borderColor: config.primaryColor || '#7C3AED',
                            color: config.primaryColor || '#7C3AED',
                            background: 'transparent'
                          }}
                        >
                          {q}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Input Area */}
                  <div className="p-3 bg-white/5 border-t border-white/10 flex items-center gap-2">
                    <input 
                      type="text" 
                      placeholder="Escribe tu mensaje..." 
                      className="flex-1 bg-transparent border-none outline-none text-[13px] text-white px-2 placeholder:text-slate-500"
                      disabled
                    />
                    <button 
                      className="p-2 rounded-lg"
                      style={{ color: config.primaryColor || '#7C3AED' }}
                      disabled
                    >
                      <Send className="w-5 h-5 ml-0.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
            
          </div>
        </div>
      </div>

    </div>
  )
}
