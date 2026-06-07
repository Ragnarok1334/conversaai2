'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Bot, Loader2, Sparkles, Trash2, AlertTriangle, MessageSquare, Zap } from 'lucide-react'
import { BuilderFormData } from './types'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isSimulated?: boolean
}

interface Props {
  form: BuilderFormData
  onTestReal: (message: string) => Promise<string>
  isTestingReal: boolean
}

export function AssistantLivePreview({ form, onTestReal, isTestingReal }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [showWarningModal, setShowWarningModal] = useState(false)
  const [hasAcknowledgedWarning, setHasAcknowledgedWarning] = useState(false)
  const [isLocalTyping, setIsLocalTyping] = useState(false)
  const [pendingRealMessage, setPendingRealMessage] = useState('')
  
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLocalTyping, isTestingReal])

  // Get dynamic simulated greeting
  const getSimulatedGreeting = () => {
    const { tone, goal, rules } = form.behavior
    let greeting = ''
    
    if (tone === 'amigable') greeting = '¡Hola! 😊 Qué gusto saludarte.'
    else if (tone === 'profesional') greeting = 'Bienvenido a nuestro canal de atención.'
    else if (tone === 'vendedor') greeting = '¡Hola! Estás en el lugar indicado para encontrar lo que necesitas.'
    else if (tone === 'directo') greeting = 'Hola. ¿En qué te ayudo?'
    else greeting = '¡Hola! Soy el asistente virtual.'

    if (goal === 'captar leads') {
      greeting += rules.askName ? ' Para brindarte una mejor atención, ¿me compartirías tu nombre y qué servicio buscas?' : ' Cuéntame qué servicio buscas.'
    } else if (goal === 'dar soporte') {
      greeting += ' Por favor, indícame el detalle de tu solicitud y lo revisaré de inmediato.'
    } else if (goal === 'vender productos') {
      greeting += ' Cuéntame qué estás buscando y te enviaré nuestras mejores opciones.'
    } else if (goal === 'agendar citas') {
      greeting += ' Indícame qué día, horario y servicio necesitas para revisar nuestra agenda.'
    } else {
      greeting += ' Dime cómo puedo ayudarte hoy.'
    }

    if (rules.askContact && goal !== 'captar leads') {
      greeting += ' Si la consulta es compleja, te pediré un correo o teléfono para contactarte.'
    }

    if (rules.doNotInvent) {
      greeting += ' Si no cuento con un dato, te lo diré con claridad.'
    }

    if (rules.escalateIfUnknown && goal !== 'dar soporte') {
      greeting += ' Si no tengo la información exacta, puedo derivarte con alguien del equipo.'
    }

    return greeting
  }

  // Determine local reply based on simple keyword matching with instructions
  const generateLocalReply = (msg: string) => {
    const lowerMsg = msg.toLowerCase()
    const instructions = form.instructions.toLowerCase()
    const fallback = form.fallback_message || 'Lo siento, no tengo esa información.'

    if (lowerMsg.includes('precio') || lowerMsg.includes('cuanto') || lowerMsg.includes('costo')) {
      if (instructions.includes('precio') || instructions.includes('$')) {
        return '*(Simulado)* Basado en el entrenamiento: ' + form.instructions.substring(0, 150) + '...'
      }
    }
    if (lowerMsg.includes('hora') || lowerMsg.includes('abierto') || lowerMsg.includes('cierra')) {
      if (form.schedule) return `*(Simulado)* Nuestro horario es: ${form.schedule}`
      if (instructions.includes('hora') || instructions.includes('lunes')) {
        return '*(Simulado)* Tenemos horarios definidos en el entrenamiento.'
      }
    }
    if (lowerMsg.includes('ubic') || lowerMsg.includes('donde') || lowerMsg.includes('direccion')) {
      if (instructions.includes('ubic') || instructions.includes('calle') || instructions.includes('av')) {
        return '*(Simulado)* Nuestra ubicación se encuentra detallada en la información.'
      }
    }

    return `*(Simulado)* ${fallback} (Falta agregar información específica al entrenamiento).`
  }

  // Dynamic quick questions based on business type
  const getQuickQuestions = () => {
    const type = form.business_type
    if (type === 'Restaurante / Comida') return ['¿Tienen menú?', '¿Hacen reservas?', '¿Cuál es su horario?']
    if (type === 'Clínica / Salud') return ['¿Qué servicios ofrecen?', '¿Tienen citas disponibles?', '¿Dónde están ubicados?']
    if (type === 'Tienda online / E-commerce') return ['¿Cuánto cuesta el envío?', '¿Tienen mi talla?', '¿Cómo compro?']
    if (type === 'Barbería / Belleza') return ['¿Cuáles son los precios?', '¿Tienen turnos hoy?', '¿Qué servicios hacen?']
    if (type === 'Inmobiliaria') return ['¿Qué propiedades tienen?', '¿Requisitos para arrendar?', '¿Agendar visita?']
    if (type === 'Servicios profesionales') return ['¿Cuáles son sus tarifas?', '¿Hacen asesorías?', '¿Cómo los contrato?']
    return ['Hola, ¿cómo puedo ayudarte?', '¿Cuáles son sus precios?', '¿Dónde están ubicados?']
  }

  const handleSendSimulated = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return

    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: trimmed, timestamp: new Date() }])
    setInput('')
    setIsLocalTyping(true)

    // Simulate delay
    setTimeout(() => {
      setIsLocalTyping(false)
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: generateLocalReply(trimmed),
        timestamp: new Date(),
        isSimulated: true
      }])
    }, 1000)
  }

  const handleSendReal = () => {
    const trimmed = input.trim()
    if (!trimmed) return

    if (!hasAcknowledgedWarning) {
      setPendingRealMessage(trimmed)
      setShowWarningModal(true)
      return
    }

    executeReal(trimmed)
  }

  const executeReal = async (text: string) => {
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: text, timestamp: new Date() }])
    setInput('')
    
    try {
      const reply = await onTestReal(text)
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: reply,
        timestamp: new Date()
      }])
    } catch (e) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Error de conexión. ' + (e instanceof Error ? e.message : ''),
        timestamp: new Date()
      }])
    }
  }

  return (
    <div className="flex flex-col h-full min-h-[600px] bg-[#050816]/80 backdrop-blur-2xl border border-white/[0.08] rounded-3xl overflow-hidden relative shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl gradient-btn flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-amber-400 rounded-full border-2 border-[#050816]" />
          </div>
          <div>
            <p className="font-semibold text-sm text-white">{form.assistant_name || 'Nuevo Asistente'}</p>
            <p className="text-xs text-amber-400 font-medium">Borrador · {form.behavior.initialChannel}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] transition-colors text-text-soft hover:text-white"
              title="Limpiar chat"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Configuration Summary Badge */}
      <div className="bg-white/[0.02] border-b border-white/[0.04] px-4 py-2 flex flex-wrap gap-2 text-[10px] text-slate-400">
        <span className="px-2 py-1 rounded bg-white/5 border border-white/5">Tono: <span className="capitalize text-slate-300">{form.behavior.tone}</span></span>
        <span className="px-2 py-1 rounded bg-white/5 border border-white/5">Objetivo: <span className="capitalize text-slate-300">{form.behavior.goal}</span></span>
        <span className="px-2 py-1 rounded bg-white/5 border border-white/5">Entrenamiento: <span className="text-slate-300">{form.instructions.length} chars</span></span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center py-6 px-2">
            {/* Encabezado del asistente */}
            <div className="w-full mb-4 bg-white/[0.02] border border-white/[0.06] rounded-xl p-3 text-left">
              <div className="flex items-center gap-2 mb-2">
                <Bot className="w-4 h-4 text-brand-violet" />
                <span className="text-xs font-semibold text-white">{form.assistant_name || 'Nuevo Asistente'}</span>
                <span className="ml-auto text-[10px] px-1.5 py-0.5 bg-amber-400/10 border border-amber-400/20 text-amber-400 rounded-full">Borrador</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[10px] px-2 py-0.5 bg-white/5 border border-white/5 rounded text-slate-400">Tono: <span className="text-slate-300 capitalize">{form.behavior.tone}</span></span>
                <span className="text-[10px] px-2 py-0.5 bg-white/5 border border-white/5 rounded text-slate-400">Objetivo: <span className="text-slate-300 capitalize">{form.behavior.goal}</span></span>
                <span className="text-[10px] px-2 py-0.5 bg-white/5 border border-white/5 rounded text-slate-400">
                  <span className="text-slate-300">{form.instructions.length}</span> chars
                </span>
              </div>
            </div>

            {/* Mensaje de bienvenida dinámico */}
            <div className="bg-brand-violet/10 border border-brand-violet/20 rounded-2xl p-4 text-sm text-slate-200 mb-4 w-full text-left italic shadow-lg">
              "{getSimulatedGreeting()}"
            </div>

            {/* Preguntas rápidas */}
            <p className="text-[10px] text-slate-500 mb-2">Preguntas de ejemplo</p>
            <div className="flex flex-wrap gap-2 justify-center mb-4">
              {getQuickQuestions().map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleSendSimulated(s)}
                  className="text-[11px] px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-slate-400 hover:text-white hover:border-brand-violet/30 transition-all"
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Nota inferior */}
            <p className="text-[10px] text-slate-600 leading-relaxed max-w-[220px]">
              Vista previa local. Las pruebas reales con IA pueden consumir mensajes de tu plan.
            </p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-3`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-xl gradient-btn flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}
              <div className="max-w-[85%]">
                <div
                  className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-brand-violet/80 text-white rounded-tr-sm'
                      : 'bg-white/[0.06] border border-white/[0.08] text-slate-200 rounded-tl-sm'
                  }`}
                >
                  {msg.content}
                </div>
                {msg.isSimulated && (
                  <p className="text-[10px] text-amber-500/70 mt-1 ml-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Respuesta simulada localmente
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {(isLocalTyping || isTestingReal) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-xl gradient-btn flex items-center justify-center flex-shrink-0 mt-1">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-white/[0.06] border border-white/[0.08] px-4 py-3 rounded-2xl rounded-tl-sm text-slate-400 text-xs flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin" /> Escribiendo...
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Controls */}
      <div className="p-4 bg-white/[0.02] border-t border-white/[0.06]">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSendSimulated(input) }}
            placeholder="Prueba local gratuita..."
            className="flex-1 bg-slate-950/50 border border-white/10 rounded-xl px-4 text-sm text-white focus:outline-none focus:border-brand-violet/50"
          />
          <button
            onClick={() => handleSendSimulated(input)}
            disabled={!input.trim() || isLocalTyping || isTestingReal}
            className="w-11 h-11 rounded-xl bg-white/[0.05] border border-white/10 text-white flex items-center justify-center disabled:opacity-50 hover:bg-white/10"
            title="Vista previa local (No consume IA)"
          >
            <Bot className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        
        <button
          onClick={handleSendReal}
          disabled={!input.trim() || isLocalTyping || isTestingReal}
          className="w-full mt-3 py-2.5 rounded-xl gradient-btn flex items-center justify-center gap-2 text-white text-sm font-semibold disabled:opacity-50 hover:shadow-[0_0_15px_rgba(34,211,238,0.3)] transition-all"
        >
          <Sparkles className="w-4 h-4" />
          Probar respuesta real con IA
        </button>
      </div>

      {/* Modal Aviso IA */}
      <AnimatePresence>
        {showWarningModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-[#050816]/90 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card-bg border border-card-border rounded-3xl p-6 shadow-2xl relative w-full"
            >
              <h3 className="text-lg font-bold mb-2">Esta prueba consume mensajes</h3>
              <p className="text-sm text-slate-400 mb-6">
                Llamar a la IA consumirá mensajes de tu plan actual. Asegúrate de haber completado la configuración y entrenamiento antes de probar.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowWarningModal(false)}
                  className="flex-1 py-2 rounded-xl bg-white/5 text-sm font-medium hover:bg-white/10"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    setHasAcknowledgedWarning(true)
                    setShowWarningModal(false)
                    executeReal(pendingRealMessage)
                  }}
                  className="flex-1 py-2 rounded-xl gradient-btn text-white text-sm font-bold shadow-lg"
                >
                  Entendido, probar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
