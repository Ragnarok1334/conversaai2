'use client'

import { useState } from 'react'
import { Copy, CheckCircle2, Globe, Send, MessageCircle } from 'lucide-react'

import { AssistantDomainsPanel } from './AssistantDomainsPanel'

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

  // Determine BASE URL
  // If we are in the browser, window.location.origin works
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'

  const snippet = `<script
  src="${origin}/widget.js"
  data-assistant-id="${assistantId}"
  async
></script>`

  const handleCopy = () => {
    navigator.clipboard.writeText(snippet)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }



  return (
    <>
    <AssistantDomainsPanel assistantId={assistantId} planLimits={planLimits} effectivePlanStatus={effectivePlanStatus} />
    <div className="grid lg:grid-cols-2 gap-8 mb-8">
      {/* Instructions Side */}
      <div className="space-y-6">
        <div className="bg-card-bg/80 backdrop-blur-2xl border border-card-border rounded-3xl p-8 h-full flex flex-col">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-brand-cyan/10 border border-brand-cyan/20 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Globe className="w-8 h-8 text-brand-cyan" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Instalar Web Chat</h2>
              <p className="text-text-soft text-sm">Copia este script y pégalo justo antes de la etiqueta <code>&lt;/body&gt;</code> de tu web.</p>
            </div>
          </div>
          
          <div className="relative group mb-6 flex-1">
            <pre className="bg-[#050816] border border-white/10 p-5 rounded-2xl text-sm text-text-soft overflow-x-auto whitespace-pre-wrap font-mono h-full">
              {snippet}
            </pre>
            <button
              onClick={handleCopy}
              className="absolute top-4 right-4 p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] transition-all text-white flex items-center gap-2 text-xs font-semibold"
            >
              {copied ? <CheckCircle2 className="w-4 h-4 text-brand-success" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copiado' : 'Copiar script'}
            </button>
          </div>

          <div className="mt-4 space-y-4">
            <h3 className="font-semibold text-white">Instrucciones rápidas</h3>
            <div className="grid gap-3">
              <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                <span className="text-brand-cyan text-xs font-bold uppercase tracking-wider block mb-1">HTML</span>
                <p className="text-sm text-slate-300">Pega el script justo antes de la etiqueta <code>&lt;/body&gt;</code>.</p>
              </div>
              <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                <span className="text-brand-violet text-xs font-bold uppercase tracking-wider block mb-1">WordPress</span>
                <p className="text-sm text-slate-300">Agrega el script en un plugin de headers/footers o en el tema, antes de <code>&lt;/body&gt;</code>.</p>
              </div>
              <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                <span className="text-emerald-500 text-xs font-bold uppercase tracking-wider block mb-1">Shopify</span>
                <p className="text-sm text-slate-300">Agrega el script en <code>theme.liquid</code> justo antes de <code>&lt;/body&gt;</code>.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Side */}
      <div>
        <div className="bg-[#050816] border border-card-border rounded-3xl h-[600px] flex items-end justify-end p-8 relative overflow-hidden shadow-inner">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none" />
          <div className="absolute top-6 left-6 text-white/20 font-bold text-2xl">
            Vista previa de tu web
          </div>

          <div className="relative z-10 flex flex-col items-end gap-4 w-[360px] animate-in slide-in-from-bottom-8 duration-700">
            {/* Fake Widget Panel */}
            <div className="w-full bg-[#050816] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
              <div className="bg-gradient-to-r from-brand-violet/10 to-brand-cyan/10 border-b border-white/5 p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-violet to-brand-cyan flex items-center justify-center font-bold text-white shadow-lg">
                  A
                </div>
                <div>
                  <h4 className="text-white font-bold text-sm">Tu Asistente</h4>
                  <p className="text-brand-success text-[10px] flex items-center gap-1 font-medium mt-0.5">
                    <span className="w-1.5 h-1.5 bg-brand-success rounded-full" /> En línea
                  </p>
                </div>
              </div>
              <div className="p-4 bg-[#050816] h-64 flex flex-col justify-end gap-3">
                <div className="bg-white/5 border border-white/5 text-white/90 p-3 rounded-2xl rounded-bl-sm text-sm self-start max-w-[85%]">
                  Hola, ¿cómo puedo ayudarte hoy?
                </div>
                <div className="bg-gradient-to-br from-brand-violet to-brand-cyan text-white p-3 rounded-2xl rounded-br-sm text-sm self-end max-w-[85%]">
                  Quisiera más información sobre los servicios.
                </div>
                <div className="bg-white/5 border border-white/5 text-white/90 p-3 rounded-2xl rounded-bl-sm text-sm self-start max-w-[85%] flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-pulse" />
                  <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-pulse delay-75" />
                  <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-pulse delay-150" />
                </div>
              </div>
              <div className="p-4 border-t border-white/5 bg-[#080f28]">
                <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white/30 flex justify-between items-center">
                  Escribe un mensaje...
                  <Send className="w-4 h-4 text-brand-cyan" />
                </div>
              </div>
            </div>

            {/* Fake Widget Button */}
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-violet to-brand-cyan shadow-lg shadow-brand-violet/20 flex items-center justify-center cursor-pointer hover:scale-105 transition-transform">
              <MessageCircle className="w-7 h-7 text-white" />
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div className="grid md:grid-cols-2 gap-6">
      {/* Telegram Upcoming */}
      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 opacity-60 pointer-events-none flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-brand-violet/10 flex items-center justify-center">
            <Send className="w-6 h-6 text-brand-violet" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-lg">Telegram</h3>
            <p className="text-sm text-slate-400">Canal planeado para conectar con bots.</p>
          </div>
        </div>
        <span className="px-3 py-1 bg-brand-violet/10 border border-brand-violet/20 rounded-full text-xs font-bold text-brand-violet shrink-0">
          PRÓXIMAMENTE
        </span>
      </div>

      {/* WhatsApp Upcoming */}
      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 opacity-60 pointer-events-none flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <MessageCircle className="w-6 h-6 text-emerald-500" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-lg">WhatsApp</h3>
            <p className="text-sm text-slate-400">Canal planeado para atención móvil.</p>
          </div>
        </div>
        <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-xs font-bold text-emerald-500 shrink-0">
          PRÓXIMAMENTE
        </span>
      </div>
    </div>
    </>
  )
}
