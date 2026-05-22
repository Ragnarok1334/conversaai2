'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Bot, Loader2, Trash2, Sparkles } from 'lucide-react'
import { type AssistantConfig } from '@/lib/openai'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface AssistantPlaygroundProps {
  assistantId?: string
  assistantConfig?: Partial<AssistantConfig>
  title?: string
}

export function AssistantPlayground({ assistantId, assistantConfig, title }: AssistantPlaygroundProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async () => {
    const trimmed = input.trim()
    if (!trimmed || isLoading) return

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/assistant/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assistantId,
          assistantConfig,
          userMessage: trimmed,
        }),
      })

      const data = await res.json()

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: res.ok ? data.reply : (data.error || 'Error al procesar tu mensaje.'),
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, assistantMsg])
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Error de conexión. Verifica tu configuración.',
        timestamp: new Date(),
      }])
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const assistantName = assistantConfig?.assistantName || 'Asistente IA'

  return (
    <div className="flex flex-col h-full min-h-[480px] bg-[#050816]/80 backdrop-blur-2xl border border-white/[0.08] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl gradient-btn flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-brand-success rounded-full border-2 border-[#050816]" />
          </div>
          <div>
            <p className="font-semibold text-sm">{title || assistantName}</p>
            <p className="text-xs text-brand-success">En línea · Listo para responder</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-soft flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-brand-cyan" />
            Playground
          </span>
          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors text-text-soft hover:text-text-main"
              title="Limpiar chat"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 scroll-smooth">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center py-12">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-16 h-16 rounded-2xl gradient-btn/10 border border-brand-violet/20 flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(124,58,237,0.15)]"
            >
              <Bot className="w-8 h-8 text-brand-violet/60" />
            </motion.div>
            <p className="font-semibold text-text-secondary mb-1">Prueba tu asistente</p>
            <p className="text-sm text-text-soft max-w-xs">Escribe una pregunta como lo haría un cliente real para ver cómo responde.</p>
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              {['Hola, ¿cómo puedo ayudarte?', '¿Cuáles son sus precios?', '¿Tienen disponibilidad?'].map((s) => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="text-xs px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-text-soft hover:text-text-main hover:border-brand-violet/30 transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-3`}
            >
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg gradient-btn flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}
              <div
                className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-brand-violet/80 text-white rounded-tr-sm'
                    : 'bg-white/[0.06] border border-white/[0.08] text-text-secondary rounded-tl-sm'
                }`}
              >
                {msg.content}
                <p className="text-[10px] opacity-50 mt-1 text-right">
                  {msg.timestamp.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3 justify-start"
          >
            <div className="w-7 h-7 rounded-lg gradient-btn flex items-center justify-center flex-shrink-0 mt-1">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-white/[0.06] border border-white/[0.08] px-4 py-3 rounded-2xl rounded-tl-sm">
              <div className="flex items-center gap-2 text-text-soft text-xs">
                <Loader2 className="w-3 h-3 animate-spin" />
                Escribiendo...
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-white/[0.06] p-4 bg-white/[0.01]">
        <div className="flex gap-3 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe un mensaje..."
            rows={1}
            className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-text-main placeholder:text-text-soft/50 focus:outline-none focus:border-brand-violet/40 focus:ring-1 focus:ring-brand-violet/20 transition-all resize-none"
            style={{ maxHeight: '120px' }}
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="w-11 h-11 rounded-xl gradient-btn flex items-center justify-center text-white disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 shadow-[0_0_20px_rgba(124,58,237,0.3)] transition-opacity"
          >
            <Send className="w-4 h-4" />
          </motion.button>
        </div>
        <p className="text-[10px] text-text-soft/40 mt-2 text-center">Enter para enviar · Shift+Enter para nueva línea</p>
      </div>
    </div>
  )
}
