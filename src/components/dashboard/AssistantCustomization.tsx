'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, Save, Palette, Type, LayoutTemplate, MessageSquare, Plus, Trash2, ShieldAlert, CheckCircle2, Smartphone, Monitor, RotateCcw, X, Lock, Send, Info } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

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
  { name: 'ConversaAI', desc: 'Morado/cian · recomendado para SaaS y tecnología', primaryColor: '#7C3AED', secondaryColor: '#06B6D4', theme: 'premium' as const },
  { name: 'Profesional oscuro', desc: 'Azul serio · ideal para servicios profesionales', primaryColor: '#2563EB', secondaryColor: '#38BDF8', theme: 'modern' as const },
  { name: 'Elegante', desc: 'Negro/gris · sobrio y minimalista', primaryColor: '#111827', secondaryColor: '#6B7280', theme: 'minimal' as const },
  { name: 'Comercial', desc: 'Naranja/amarillo · más llamativo para ventas', primaryColor: '#F97316', secondaryColor: '#FACC15', theme: 'premium' as const },
  { name: 'Salud / bienestar', desc: 'Verde/cian · ideal para clínicas, estética y bienestar', primaryColor: '#10B981', secondaryColor: '#22D3EE', theme: 'modern' as const }
]

const QQ_EXAMPLES = [
  "¿Qué planes tienen?",
  "¿Cómo instalo mi asistente?",
  "¿Puedo probarlo gratis?",
  "¿Cómo contacto soporte?"
]

const HEX_REGEX = /^#[0-9A-Fa-f]{6}$/i

export function AssistantCustomization({ assistantId, initialConfig, currentPlan }: Props) {
  const router = useRouter()
  const [config, setConfig] = useState<WidgetConfig>({ ...DEFAULT_CONFIG, ...initialConfig })
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [toast, setToast] = useState('')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [activePreset, setActivePreset] = useState<string | null>(null)
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop')
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(new Date())

  // Resolve initial preset
  useEffect(() => {
    const matched = VISUAL_PRESETS.find(p => p.primaryColor === config.primaryColor && p.secondaryColor === config.secondaryColor && p.theme === config.theme)
    if (matched) setActivePreset(matched.name)
    else setActivePreset('Personalizado')
  }, [])

  // Plan logic
  const isStarter = currentPlan === 'starter' || currentPlan === 'free'
  const isPro = currentPlan === 'pro'
  const isGrowthOrAbove = currentPlan === 'growth' || currentPlan === 'business' || currentPlan === 'enterprise'

  const canUseQuickQuestions = isPro || isGrowthOrAbove
  const canUseThemeAndSecondary = isGrowthOrAbove
  const canUseSubtitle = isPro || isGrowthOrAbove

  const isPrimaryValid = HEX_REGEX.test(config.primaryColor || '')
  const isSecondaryValid = HEX_REGEX.test(config.secondaryColor || '')
  const isValid = isPrimaryValid && (canUseThemeAndSecondary ? isSecondaryValid : true)
  const canSave = hasUnsavedChanges && isValid && status !== 'saving'

  const handleSave = async () => {
    if (!canSave) return
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
      setLastSaved(new Date())
      router.refresh()
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
      setActivePreset('Personalizado')
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

  const handleRestore = () => {
    setConfig(DEFAULT_CONFIG)
    setHasUnsavedChanges(true)
    setActivePreset('ConversaAI')
    setIsRestoreModalOpen(false)
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

  const PlanLockOverlay = ({ title, requirement, children }: { title: string, requirement: string, children: React.ReactNode }) => {
    return (
      <div className="relative group overflow-hidden rounded-2xl border border-white/5">
        <div className="opacity-30 pointer-events-none select-none blur-[2px] transition-all duration-300 group-hover:blur-[3px] bg-black/40">
          {children}
        </div>
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/20">
          <div className="bg-[#111]/90 border border-white/10 rounded-2xl p-5 shadow-2xl flex flex-col items-center max-w-[280px] text-center backdrop-blur-xl">
            <div className="w-10 h-10 bg-brand-cyan/10 text-brand-cyan rounded-full flex items-center justify-center mb-3">
              <Lock className="w-5 h-5" />
            </div>
            <h4 className="text-white text-sm font-bold mb-1">Función Premium</h4>
            <p className="text-[12px] text-slate-400 mb-4">{title} está disponible en el plan <span className="text-brand-cyan font-bold">{requirement}</span>.</p>
            <Link href="/dashboard/billing" className="text-xs font-bold bg-white text-black px-5 py-2.5 rounded-xl hover:scale-105 transition-transform shadow-[0_0_15px_rgba(255,255,255,0.3)]">
              Mejorar plan
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 lg:space-y-8 relative">
      
      {/* Top Summary Bar */}
      <div className="bg-card-bg/80 border border-white/10 rounded-3xl p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col">
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <Palette className="w-5 h-5 text-brand-cyan" />
            Personalización del Web Chat
          </h1>
          <div className="flex items-center gap-2 mt-1 text-xs">
            {hasUnsavedChanges ? (
              <span className="flex items-center gap-1 text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full font-medium border border-amber-400/20">
                <ShieldAlert className="w-3 h-3" />
                Cambios sin guardar
              </span>
            ) : (
              <span className="flex items-center gap-1 text-slate-400 px-2 py-0.5">
                <CheckCircle2 className="w-3 h-3 text-brand-cyan" />
                Actualizado {lastSaved?.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <span className="text-slate-600 hidden sm:inline">&bull;</span>
            <span className="text-slate-400 hidden sm:inline">Recarga tu sitio si el chat ya está abierto para ver los cambios.</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setIsRestoreModalOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-xs font-medium hover:bg-white/10 hover:text-white transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Restaurar</span>
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-gradient-to-r from-brand-violet to-brand-cyan px-4 py-2 rounded-xl text-white font-bold text-xs shadow-[0_0_20px_rgba(34,211,238,0.2)] hover:shadow-[0_0_30px_rgba(34,211,238,0.4)] transition-all disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
          >
            {status === 'saving' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Guardar
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6 lg:gap-8 items-start relative">
        
        {/* Columna Izquierda - Formulario */}
        <div className="space-y-6">
          
          {/* A. Identidad */}
          <div className="bg-card-bg/60 border border-white/10 rounded-3xl p-6 shadow-xl">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-5">
              <Type className="w-4 h-4 text-brand-cyan" />
              A. Identidad de marca
            </h3>
            
            <div className="space-y-5">
              <div>
                <label className="flex items-center justify-between text-xs font-medium text-slate-300 mb-1.5">
                  <span>Nombre visible</span>
                  <span className="text-slate-500 font-mono">{(config.displayName || '').length} / 60</span>
                </label>
                <input
                  type="text"
                  value={config.displayName || ''}
                  onChange={e => handleChange('displayName', e.target.value)}
                  placeholder="Ej. Soporte ConversaAI"
                  maxLength={60}
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-brand-cyan outline-none transition-all"
                />
                <p className="text-[11px] text-slate-500 mt-1.5">Usa un nombre corto y fácil de reconocer.</p>
              </div>
              
              {!canUseSubtitle ? (
                <PlanLockOverlay title="Subtítulo del chat" requirement="PRO">
                  <div className="p-4 bg-black/20 rounded-2xl">
                    <div className="h-4 w-24 bg-white/10 rounded mb-3"></div>
                    <div className="h-10 w-full bg-white/5 rounded-xl"></div>
                  </div>
                </PlanLockOverlay>
              ) : (
                <div>
                  <label className="flex items-center justify-between text-xs font-medium text-slate-300 mb-1.5">
                    <span>Subtítulo</span>
                    <span className="text-slate-500 font-mono">{(config.subtitle || '').length} / 90</span>
                  </label>
                  <input
                    type="text"
                    value={config.subtitle || ''}
                    onChange={e => handleChange('subtitle', e.target.value)}
                    placeholder="Ej. Normalmente responde en segundos"
                    maxLength={90}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-brand-cyan outline-none transition-all"
                  />
                </div>
              )}

              <div>
                <label className="flex items-center justify-between text-xs font-medium text-slate-300 mb-1.5">
                  <span>Mensaje de bienvenida</span>
                  <span className="text-slate-500 font-mono">{(config.welcomeMessage || '').length} / 240</span>
                </label>
                <textarea
                  value={config.welcomeMessage || ''}
                  onChange={e => handleChange('welcomeMessage', e.target.value)}
                  placeholder="Hola, soy el asistente virtual. ¿En qué puedo ayudarte?"
                  maxLength={240}
                  rows={3}
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-brand-cyan outline-none transition-all resize-none"
                />
                <p className="text-[11px] text-slate-500 mt-1.5">Evita mensajes demasiado largos.</p>
              </div>
            </div>
          </div>

          {/* B. Marca y colores */}
          <div className="bg-card-bg/60 border border-white/10 rounded-3xl p-6 shadow-xl relative">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-5">
              <LayoutTemplate className="w-4 h-4 text-brand-cyan" />
              B. Marca y colores
            </h3>

            {!canUseThemeAndSecondary ? (
              <PlanLockOverlay title="Personalización Visual Premium" requirement="GROWTH">
                <div className="p-4 bg-black/20 rounded-2xl min-h-[250px] flex flex-col gap-4">
                   <div className="h-20 w-full bg-white/5 rounded-xl"></div>
                   <div className="h-10 w-full bg-white/5 rounded-xl"></div>
                   <div className="h-10 w-full bg-white/5 rounded-xl"></div>
                </div>
              </PlanLockOverlay>
            ) : (
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-3">Presets visuales</label>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {VISUAL_PRESETS.map(p => {
                      const isSelected = activePreset === p.name
                      return (
                        <div
                          key={p.name}
                          onClick={() => handleApplyPreset(p)}
                          className={`p-3 rounded-xl border cursor-pointer transition-all ${isSelected ? 'bg-brand-cyan/10 border-brand-cyan shadow-[0_0_15px_rgba(34,211,238,0.15)]' : 'bg-black/30 border-white/10 hover:border-white/30'}`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <div className="flex -space-x-2">
                                <div className="w-5 h-5 rounded-full shadow-sm border border-white/20" style={{ background: p.primaryColor }}></div>
                                <div className="w-5 h-5 rounded-full shadow-sm border border-white/20" style={{ background: p.secondaryColor }}></div>
                              </div>
                              <span className={`text-sm font-bold ${isSelected ? 'text-brand-cyan' : 'text-white'}`}>{p.name}</span>
                            </div>
                            {isSelected && <CheckCircle2 className="w-4 h-4 text-brand-cyan" />}
                          </div>
                          <p className="text-[11px] text-slate-400 leading-tight">{p.desc}</p>
                        </div>
                      )
                    })}
                    {activePreset === 'Personalizado' && (
                      <div className="p-3 rounded-xl border bg-brand-violet/10 border-brand-violet shadow-[0_0_15px_rgba(124,58,237,0.15)] flex flex-col justify-center">
                        <div className="flex items-center justify-between mb-2">
                           <span className="text-sm font-bold text-brand-violet flex items-center gap-2">
                             <Palette className="w-4 h-4" /> Personalizado
                           </span>
                           <CheckCircle2 className="w-4 h-4 text-brand-violet" />
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">Has ajustado los colores o el tema manualmente.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-5 pt-2 border-t border-white/[0.04]">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Color principal (HEX)</label>
                    <div className={`flex items-center gap-3 bg-black/30 border ${isPrimaryValid ? 'border-white/10 focus-within:border-brand-cyan' : 'border-red-500/50'} rounded-xl p-2 transition-all`}>
                      <input 
                        type="color" 
                        value={isPrimaryValid ? config.primaryColor : '#000000'} 
                        onChange={e => handleChange('primaryColor', e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent"
                      />
                      <input 
                        type="text" 
                        value={config.primaryColor || ''}
                        onChange={e => handleChange('primaryColor', e.target.value)}
                        placeholder="#7C3AED"
                        maxLength={7}
                        className={`bg-transparent border-none outline-none text-sm w-full uppercase ${!isPrimaryValid ? 'text-red-400' : 'text-white'}`}
                      />
                    </div>
                    {!isPrimaryValid && <span className="text-[10px] text-red-400 mt-1 block">Formato HEX inválido. (Ej. #7C3AED)</span>}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Color secundario (Gradiente)</label>
                    <div className={`flex items-center gap-3 bg-black/30 border ${isSecondaryValid ? 'border-white/10' : 'border-red-500/50 focus-within:border-red-500/80'} rounded-xl p-2 transition-all`}>
                      <input 
                        type="color" 
                        value={isSecondaryValid ? config.secondaryColor : '#000000'} 
                        onChange={e => handleChange('secondaryColor', e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent"
                      />
                      <input 
                        type="text" 
                        value={config.secondaryColor || ''}
                        onChange={e => handleChange('secondaryColor', e.target.value)}
                        placeholder="#06B6D4"
                        maxLength={7}
                        className={`bg-transparent border-none outline-none text-sm w-full uppercase ${!isSecondaryValid ? 'text-red-400' : 'text-white'}`}
                      />
                    </div>
                    {!isSecondaryValid && <span className="text-[10px] text-red-400 mt-1 block">Formato HEX inválido. (Ej. #06B6D4)</span>}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Tema visual de ventanas</label>
                  <select
                    value={config.theme || 'modern'}
                    onChange={e => handleChange('theme', e.target.value)}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-brand-cyan appearance-none"
                  >
                    <option value="modern">Moderno (Color sólido y sombras suaves)</option>
                    <option value="minimal">Minimalista (Oscuro y sobrio)</option>
                    <option value="premium">Premium (Gradientes y cristal)</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* C. Botón flotante */}
          <div className="bg-card-bg/60 border border-white/10 rounded-3xl p-6 shadow-xl">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-5">
              <MessageSquare className="w-4 h-4 text-brand-cyan" />
              C. Botón flotante
            </h3>

            <div className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-2">Modo del botón</label>
                  <div className="flex gap-4 p-3 bg-black/30 border border-white/10 rounded-xl">
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
                
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-2">Posición en el sitio</label>
                  <select
                    value={config.position || 'bottom-right'}
                    onChange={e => handleChange('position', e.target.value)}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-brand-cyan appearance-none"
                  >
                    <option value="bottom-right">Abajo a la derecha</option>
                    <option value="bottom-left">Abajo a la izquierda</option>
                  </select>
                </div>
              </div>

              {!canUseSubtitle ? (
                <PlanLockOverlay title="Texto del botón" requirement="PRO">
                  <div className="p-4 bg-black/20 rounded-2xl mt-4">
                    <div className="h-4 w-32 bg-white/10 rounded mb-3"></div>
                    <div className="h-10 w-full bg-white/5 rounded-xl"></div>
                  </div>
                </PlanLockOverlay>
              ) : (
                <div className={`transition-opacity duration-300 ${(config.launcherMode === 'icon') ? 'opacity-30 pointer-events-none' : ''}`}>
                  <label className="flex items-center justify-between text-xs font-medium text-slate-300 mb-1.5">
                    <span>Texto del globo flotante</span>
                    <span className="text-slate-500 font-mono">{(config.launcherText || '').length} / 40</span>
                  </label>
                  <input
                    type="text"
                    value={config.launcherText || ''}
                    onChange={e => handleChange('launcherText', e.target.value)}
                    placeholder="Ej. ¿Necesitas ayuda?"
                    maxLength={40}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-brand-cyan outline-none transition-all"
                  />
                  {config.launcherMode === 'icon' && <p className="text-[10px] text-amber-500 mt-1.5">El globo de texto está desactivado por el "Modo del botón".</p>}
                </div>
              )}
            </div>
          </div>

          {/* D. Preguntas Rápidas */}
          <div className="bg-card-bg/60 border border-white/10 rounded-3xl p-6 shadow-xl relative">
            <h3 className="text-sm font-semibold text-white flex items-center justify-between gap-2 mb-5">
              <span className="flex items-center gap-2">
                <LayoutTemplate className="w-4 h-4 text-brand-cyan" />
                D. Preguntas rápidas
              </span>
              <span className="text-[11px] font-mono bg-white/10 px-2 py-1 rounded text-slate-300">{(config.quickQuestions || []).length} / 4</span>
            </h3>

            {!canUseQuickQuestions ? (
              <PlanLockOverlay title="Preguntas Rápidas" requirement="PRO">
                 <div className="p-4 bg-black/20 rounded-2xl flex flex-col gap-3 min-h-[150px]">
                   <div className="h-10 w-full bg-white/5 rounded-xl"></div>
                   <div className="h-10 w-full bg-white/5 rounded-xl"></div>
                 </div>
              </PlanLockOverlay>
            ) : (
              <div className="space-y-4">
                <p className="text-[12px] text-slate-400">Las preguntas rápidas ayudan a iniciar conversaciones. Sugiere opciones para romper el hielo.</p>
                
                <div className="space-y-3">
                  <AnimatePresence>
                    {(config.quickQuestions || []).map((q, i) => (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        key={i} 
                        className="flex gap-2"
                      >
                        <div className="relative w-full">
                          <input
                            type="text"
                            value={q}
                            onChange={e => handleUpdateQuestion(i, e.target.value)}
                            placeholder={`Ej. ¿Cómo puedo comprar?`}
                            maxLength={80}
                            className="w-full bg-black/30 border border-white/10 rounded-xl pl-4 pr-14 py-2.5 text-sm text-white outline-none focus:border-brand-cyan transition-all"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-mono">{q.length} / 80</span>
                        </div>
                        <button 
                          onClick={() => handleRemoveQuestion(i)}
                          className="p-2.5 rounded-xl bg-white/5 hover:bg-brand-pink/20 hover:text-brand-pink border border-white/10 hover:border-brand-pink/30 text-slate-400 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  
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
                  <div className="mt-4 p-4 rounded-xl bg-brand-cyan/5 border border-brand-cyan/10">
                    <p className="text-[11px] text-slate-400 mb-2 font-medium">Ejemplos sugeridos:</p>
                    <div className="flex flex-wrap gap-2">
                      {QQ_EXAMPLES.map((ex, i) => (
                        <button 
                          key={i} 
                          onClick={() => handleAddExample(ex)}
                          className="px-2.5 py-1.5 bg-white/5 hover:bg-brand-cyan/20 text-slate-300 hover:text-brand-cyan text-[11px] rounded-lg border border-white/10 hover:border-brand-cyan/30 transition-colors"
                        >
                          + {ex}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* E. Captura Visible Info */}
          <div className="bg-[#111] border border-white/5 rounded-3xl p-6 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                <Info className="w-24 h-24 text-white" />
             </div>
             <h3 className="text-sm font-bold text-white mb-2">E. Captura de datos visible</h3>
             <p className="text-xs text-slate-400 max-w-[85%] leading-relaxed">
               El Web Chat solicitará de forma nativa los datos de contacto (Nombre, Email, Teléfono) si lo has activado en la configuración de Comportamiento. Estos formularios se teñirán automáticamente con el tema y color elegidos aquí.
             </p>
          </div>

        </div>

        {/* Columna Derecha - E. Preview Local */}
        <div className="lg:sticky lg:top-24 mt-8 lg:mt-0 flex flex-col gap-4">
          
          <div className="bg-card-bg/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-xl min-h-[600px] flex flex-col relative">
            <div className="mb-5 flex items-center justify-between border-b border-white/[0.04] pb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  Vista previa local
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                  La vista previa no consume mensajes.
                </p>
              </div>
              
              <div className="flex bg-black/40 rounded-xl p-1 border border-white/10 shadow-inner">
                <button 
                  onClick={() => setPreviewMode('desktop')}
                  className={`p-1.5 rounded-lg transition-colors ${previewMode === 'desktop' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-white'}`}
                >
                  <Monitor className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setPreviewMode('mobile')}
                  className={`p-1.5 rounded-lg transition-colors ${previewMode === 'mobile' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-white'}`}
                >
                  <Smartphone className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className={`flex-1 bg-[#1A1A1A] rounded-2xl border border-white/5 relative flex flex-col items-center justify-center transition-all duration-500 ${previewMode === 'mobile' ? 'p-8 bg-black/20 overflow-hidden' : 'p-4 overflow-hidden'}`}>
              
              <AnimatePresence mode="wait">
                {previewMode === 'mobile' ? (
                  // Mobile Mockup
                  <motion.div 
                    key="mobile"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="w-[300px] h-[550px] bg-[#050816] rounded-[35px] border-[6px] border-[#333] shadow-2xl relative overflow-hidden flex flex-col"
                  >
                    <div className="h-6 w-full flex justify-center items-center relative z-50">
                      <div className="w-20 h-4 bg-[#333] rounded-b-2xl"></div>
                    </div>
                    
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
                        {(config.displayName || 'A').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-semibold text-sm m-0 leading-tight truncate">
                          {config.displayName || 'Asistente IA'}
                        </h3>
                        <p className="text-[10px] text-slate-300 m-0 mt-0.5 truncate">
                          {config.subtitle || 'En línea'}
                        </p>
                      </div>
                      <button className="text-white/60"><X className="w-5 h-5" /></button>
                    </div>

                    <div className="flex-1 p-4 flex flex-col gap-3 overflow-y-auto bg-[#0A0D1A] pb-24 relative z-0">
                      <div className="bg-white/5 border border-white/10 px-4 py-3 rounded-2xl rounded-tl-sm self-start max-w-[85%] shadow-sm">
                        <p className="text-slate-200 text-[12px] leading-relaxed break-words">
                          {config.welcomeMessage || 'Hola, soy el asistente virtual. ¿En qué puedo ayudarte?'}
                        </p>
                      </div>
                    </div>

                    {(config.quickQuestions || []).length > 0 && (
                      <div className="absolute bottom-14 left-0 right-0 px-3 pb-2 flex flex-col gap-2 items-end z-20">
                        {(config.quickQuestions || []).map((q, i) => (
                          <div 
                            key={i} 
                            className="bg-black/40 border border-white/20 text-white px-3 py-1.5 rounded-xl text-[11px] shadow-sm backdrop-blur max-w-[85%] text-right cursor-default"
                          >
                            {q}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="absolute bottom-0 left-0 right-0 p-2.5 bg-[#050816] border-t border-white/10 z-30">
                      <div className="bg-white/5 rounded-xl p-1.5 pr-2 flex items-center gap-2 border border-white/10">
                        <input 
                          type="text" 
                          placeholder="Escribe tu mensaje..." 
                          className="bg-transparent text-[12px] outline-none text-white w-full px-2"
                          disabled
                        />
                        <div 
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-white"
                          style={{ background: config.primaryColor || '#7C3AED' }}
                        >
                          <Send className="w-3.5 h-3.5 ml-0.5" />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  // Desktop Mockup
                  <motion.div 
                    key="desktop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full h-full flex flex-col justify-end relative"
                  >
                    <div className={`absolute bottom-4 ${config.position === 'bottom-left' ? 'left-4 flex-row-reverse' : 'right-4 flex-row'} flex items-center justify-end gap-3 z-10 transition-all duration-300`}>
                      {(config.launcherMode !== 'icon' && config.launcherText) && (
                        <div className="bg-white text-black px-4 py-2.5 rounded-2xl text-[13px] font-semibold shadow-xl whitespace-nowrap relative">
                          {config.launcherText}
                          <div className={`absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white ${config.position === 'bottom-left' ? '-left-1 rotate-45' : '-right-1 rotate-45'}`}></div>
                        </div>
                      )}
                      <div 
                        className="w-14 h-14 rounded-full flex items-center justify-center shadow-xl cursor-pointer hover:scale-105 transition-transform"
                        style={{
                          background: config.theme === 'premium' && config.secondaryColor 
                            ? `linear-gradient(135deg, ${config.primaryColor || '#7C3AED'}, ${config.secondaryColor})`
                            : (config.primaryColor || '#7C3AED')
                        }}
                      >
                        <MessageSquare className="w-6 h-6 text-white" />
                      </div>
                    </div>

                    <div className={`absolute bottom-24 ${config.position === 'bottom-left' ? 'left-4' : 'right-4'} w-[340px] h-[480px] bg-[#050816] rounded-2xl border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden z-20 transition-all duration-300`}>
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
                          {(config.displayName || 'A').charAt(0).toUpperCase()}
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

                      <div className="flex-1 p-4 flex flex-col gap-3 overflow-y-auto bg-[#0A0D1A]">
                        <div className="bg-white/5 border border-white/10 px-4 py-3 rounded-2xl rounded-tl-sm self-start max-w-[85%] shadow-sm">
                          <p className="text-slate-200 text-[13px] leading-relaxed break-words">
                            {config.welcomeMessage || 'Hola, soy el asistente virtual. ¿En qué puedo ayudarte?'}
                          </p>
                        </div>
                        
                        <div className="mt-auto flex flex-col gap-2 items-end pt-4">
                          {(config.quickQuestions || []).map((q, i) => (
                            <div 
                              key={i} 
                              className="px-3 py-2 rounded-xl text-[12px] cursor-default transition-colors border shadow-sm font-medium"
                              style={{
                                borderColor: config.primaryColor || '#7C3AED',
                                color: config.primaryColor || '#7C3AED',
                                background: `${config.primaryColor || '#7C3AED'}10`
                              }}
                            >
                              {q}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="p-3 bg-[#0A0D1A] border-t border-white/5 flex items-center gap-2">
                        <div className="flex-1 bg-white/5 rounded-xl border border-white/10 px-3 py-2">
                           <input 
                             type="text" 
                             placeholder="Escribe tu mensaje..." 
                             className="w-full bg-transparent border-none outline-none text-[13px] text-white placeholder:text-slate-500"
                             disabled
                           />
                        </div>
                        <button 
                          className="p-2 rounded-xl bg-white/5 border border-white/10"
                          style={{ color: config.primaryColor || '#7C3AED' }}
                          disabled
                        >
                          <Send className="w-4 h-4 ml-0.5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {toast && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-brand-cyan/20 border border-brand-cyan/40 text-brand-cyan text-sm font-medium shadow-lg backdrop-blur flex items-center gap-2">
                 <CheckCircle2 className="w-4 h-4" /> {toast}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Restore Defaults Modal */}
      <AnimatePresence>
        {isRestoreModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsRestoreModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-[400px] bg-[#111] border border-white/10 rounded-3xl p-6 shadow-2xl z-[101]"
            >
              <div className="w-12 h-12 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mb-4 border border-red-500/20">
                <RotateCcw className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Restaurar apariencia</h3>
              <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                Esto reemplazará la personalización actual por los valores predeterminados de ConversaAI. Puedes volver a editarla después sin consumir mensajes.
              </p>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsRestoreModalOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-colors text-sm border border-white/10"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleRestore}
                  className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold transition-colors text-sm shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                >
                  Restaurar valores
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
