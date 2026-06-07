'use client'

import { Mail, MessageCircle, ShieldAlert, FileText, CheckCircle2, AlertCircle, Bot, Zap, Globe2 } from 'lucide-react'
import { CONTACT_INFO } from '@/lib/contact'

interface SupportClientProps {
  user: any
  subscription: { plan: string; status: string } | null
  assistants: any[]
}

export default function SupportClient({ user, subscription, assistants }: SupportClientProps) {
  const planName = subscription?.plan || 'free'
  const activeAssistants = assistants.length
  
  // Diagnóstico
  const hasAssistants = activeAssistants > 0
  const hasInstalledWebChat = assistants.some(a => a.assistant_domains?.some((d: any) => d.verification_status === 'verified'))
  const hasChannels = hasInstalledWebChat || false // Podemos expandir a Telegram luego

  const isHealthy = hasAssistants && hasChannels

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Soporte y Ayuda</h1>
        <p className="text-text-soft mt-1">
          Estamos aquí para ayudarte a sacarle el máximo provecho a ConversaAI.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        
        {/* Contact Options */}
        <div className="space-y-6">
          <div className="bg-card-bg/80 backdrop-blur-2xl border border-card-border rounded-2xl p-6 shadow-[0_0_30px_rgba(124,58,237,0.05)]">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-brand-violet" />
              Contacto Directo
            </h2>
            <div className="space-y-4">
              <a 
                href={CONTACT_INFO.telegram} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 rounded-xl bg-[#0088cc]/10 border border-[#0088cc]/20 hover:bg-[#0088cc]/20 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <MessageCircle className="w-5 h-5 text-[#0088cc]" />
                  <div>
                    <p className="font-medium text-[#0088cc]">Chat por Telegram</p>
                    <p className="text-xs text-text-soft group-hover:text-white/80 transition-colors">Respuesta más rápida</p>
                  </div>
                </div>
                <span className="text-[#0088cc] text-sm font-medium">Abrir &rarr;</span>
              </a>

              <a 
                href={`mailto:${CONTACT_INFO.email}`}
                className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] transition-all group"
              >
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-text-soft group-hover:text-white transition-colors" />
                  <div>
                    <p className="font-medium text-white">Correo Electrónico</p>
                    <p className="text-xs text-text-soft group-hover:text-white/80 transition-colors">{CONTACT_INFO.email}</p>
                  </div>
                </div>
                <span className="text-text-soft group-hover:text-white text-sm font-medium transition-colors">Enviar &rarr;</span>
              </a>
            </div>
          </div>

          <div className="bg-card-bg/80 backdrop-blur-2xl border border-card-border rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-brand-cyan" />
              Recursos Útiles
            </h2>
            <div className="space-y-3">
              <a href="/docs/webchat" className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors text-sm">
                <span className="text-text-soft hover:text-white flex items-center gap-2"><Globe2 className="w-4 h-4"/> Cómo instalar Web Chat</span>
                <span className="text-text-soft">&rarr;</span>
              </a>
              <a href="/docs/telegram" className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors text-sm">
                <span className="text-text-soft hover:text-white flex items-center gap-2"><MessageCircle className="w-4 h-4"/> Configurar Telegram</span>
                <span className="text-text-soft">&rarr;</span>
              </a>
              <a href="/docs/billing" className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors text-sm">
                <span className="text-text-soft hover:text-white flex items-center gap-2"><Zap className="w-4 h-4"/> Planes y límites</span>
                <span className="text-text-soft">&rarr;</span>
              </a>
            </div>
          </div>
        </div>

        {/* Diagnostics */}
        <div className="bg-card-bg/80 backdrop-blur-2xl border border-card-border rounded-2xl p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-brand-purple" />
                Diagnóstico de Cuenta
              </h2>
              <p className="text-xs text-text-soft mt-1">Comparte esta información con el soporte</p>
            </div>
            {isHealthy ? (
              <div className="px-2.5 py-1 rounded-full bg-brand-success/10 border border-brand-success/20 text-brand-success text-xs font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Todo en orden
              </div>
            ) : (
              <div className="px-2.5 py-1 rounded-full bg-brand-pink/10 border border-brand-pink/20 text-brand-pink text-xs font-medium flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" /> Faltan pasos
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Zap className="w-4 h-4 text-text-soft" />
                <span className="text-sm font-medium text-white">Plan Actual</span>
              </div>
              <span className="text-sm text-brand-violet capitalize font-medium">{planName}</span>
            </div>

            <div className="p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bot className="w-4 h-4 text-text-soft" />
                <span className="text-sm font-medium text-white">Asistentes Activos</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{activeAssistants}</span>
                {hasAssistants ? <CheckCircle2 className="w-4 h-4 text-brand-success" /> : <AlertCircle className="w-4 h-4 text-brand-pink" />}
              </div>
            </div>

            <div className="p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Globe2 className="w-4 h-4 text-text-soft" />
                <span className="text-sm font-medium text-white">Web Chat Instalado</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-text-soft">{hasInstalledWebChat ? 'Sí' : 'No detectado'}</span>
                {hasInstalledWebChat ? <CheckCircle2 className="w-4 h-4 text-brand-success" /> : <AlertCircle className="w-4 h-4 text-brand-pink" />}
              </div>
            </div>

            <div className="mt-6 p-4 bg-brand-violet/5 border border-brand-violet/10 rounded-xl">
              <p className="text-xs text-text-soft leading-relaxed font-mono">
                UserID: {user?.id}
                <br />
                Email: {user?.email}
                <br />
                Report Date: {new Date().toISOString()}
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
