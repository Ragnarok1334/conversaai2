'use client'

import React from 'react'
import { Clock, Calendar, AlertTriangle, ShieldCheck, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface PlanValidityCardProps {
  effectiveStatus: string;
  planKey: string;
  trialUsed: boolean;
  trialStartedAt?: string | null;
  trialEndsAt?: string | null;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  graceEndsAt?: string | null;
  cancelAtPeriodEnd?: boolean;
}

export function PlanValidityCard({
  effectiveStatus,
  planKey,
  trialUsed,
  trialStartedAt,
  trialEndsAt,
  currentPeriodStart,
  currentPeriodEnd,
  graceEndsAt,
  cancelAtPeriodEnd
}: PlanValidityCardProps) {
  
  const router = useRouter()

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return null
    return new Date(dateString).toLocaleDateString('es-CL', {
      year: 'numeric', month: 'short', day: 'numeric'
    })
  }

  if (effectiveStatus === 'free') {
    return (
      <div className="bg-card-bg/80 backdrop-blur-2xl border border-card-border rounded-3xl p-6 flex items-start gap-4">
        <div className="p-3 bg-white/[0.04] rounded-xl border border-white/[0.05] shrink-0">
          <ShieldCheck className="w-6 h-6 text-slate-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">Vigencia del plan</h3>
          <p className="text-slate-300 font-medium">Plan actual: Free</p>
          <p className="text-sm text-slate-400 mt-1">
            {trialUsed 
              ? "Tu prueba gratuita terminó. Elige un plan para continuar usando funciones premium."
              : "Tu prueba gratis está disponible. Actívala cuando estés listo."}
          </p>
        </div>
      </div>
    )
  }

  if (effectiveStatus === 'trialing') {
    return (
      <div className="bg-card-bg/80 backdrop-blur-2xl border border-brand-violet/30 rounded-3xl p-6 flex items-start gap-4">
        <div className="p-3 bg-brand-violet/10 rounded-xl border border-brand-violet/20 shrink-0">
          <Clock className="w-6 h-6 text-brand-violet" />
        </div>
        <div className="w-full">
          <h3 className="text-lg font-semibold text-white mb-3">Vigencia del plan</h3>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-400">Plan actual</p>
              <p className="font-medium text-white">Prueba gratis</p>
            </div>
            <div>
              <p className="text-slate-400">Duración</p>
              <p className="font-medium text-white">7 días exactos (sin gracia)</p>
            </div>
            <div>
              <p className="text-slate-400">Inicio</p>
              <p className="font-medium text-white">{formatDate(trialStartedAt)}</p>
            </div>
            <div>
              <p className="text-brand-pink/80">Termina el</p>
              <p className="font-medium text-brand-pink">{formatDate(trialEndsAt)}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (effectiveStatus === 'active') {
    if (cancelAtPeriodEnd) {
      if (!currentPeriodEnd) {
        return (
          <div className="bg-card-bg/80 backdrop-blur-2xl border border-amber-500/30 rounded-3xl p-6 flex items-start gap-4">
            <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 shrink-0">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
            </div>
            <div className="w-full">
              <h3 className="text-lg font-semibold text-white mb-3">Vigencia del plan</h3>
              <p className="text-amber-500 font-medium mb-1">Suscripción cancelada al final del periodo</p>
              <p className="text-sm text-slate-300 mb-4">
                Tu suscripción está marcada para cancelación, pero falta registrar la fecha de término del ciclo. Contacta a soporte para regularizar la vigencia.
              </p>
              <a href="mailto:soporte@conversaai.store" className="text-sm text-brand-cyan hover:underline">
                soporte@conversaai.store
              </a>
            </div>
          </div>
        )
      }

      return (
        <div className="bg-card-bg/80 backdrop-blur-2xl border border-amber-500/30 rounded-3xl p-6 flex items-start gap-4">
          <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 shrink-0">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
          </div>
          <div className="w-full">
            <h3 className="text-lg font-semibold text-white mb-3">Vigencia del plan</h3>
            <p className="text-amber-500 font-medium mb-1">Suscripción cancelada al final del periodo</p>
            <p className="text-sm text-slate-300 mb-4">Mantienes acceso hasta el {formatDate(currentPeriodEnd)}. No habrá devolución del dinero ya pagado.</p>
            <div className="grid sm:grid-cols-2 gap-4 text-sm bg-white/[0.02] rounded-xl p-4 border border-white/[0.05]">
              <div>
                <p className="text-slate-400">Plan actual</p>
                <p className="font-medium text-white capitalize">{planKey}</p>
              </div>
              <div>
                <p className="text-slate-400">Termina el</p>
                <p className="font-medium text-amber-400">{formatDate(currentPeriodEnd)}</p>
              </div>
            </div>
          </div>
        </div>
      )
    }

    if (!currentPeriodEnd) {
      return (
        <div className="bg-card-bg/80 backdrop-blur-2xl border border-brand-cyan/30 rounded-3xl p-6 flex items-start gap-4">
          <div className="p-3 bg-brand-cyan/10 rounded-xl border border-brand-cyan/20 shrink-0">
            <Calendar className="w-6 h-6 text-brand-cyan" />
          </div>
          <div className="w-full flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white mb-1">Vigencia pendiente de regularizar</h3>
              <p className="text-sm text-slate-300 mb-2 max-w-xl">
                Tu plan está activo, pero no se encontró una fecha de término registrada para este ciclo. Esto puede ocurrir en suscripciones creadas antes de la actualización del sistema de vigencia.
              </p>
              <div className="inline-flex items-center px-2 py-1 rounded bg-brand-cyan/10 text-brand-cyan text-xs font-semibold">
                Plan activo: {planKey}
              </div>
            </div>
            <button 
              onClick={() => router.refresh()}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-white transition-colors shrink-0"
            >
              <RefreshCw className="w-4 h-4" />
              Actualizar información
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className="bg-card-bg/80 backdrop-blur-2xl border border-brand-cyan/30 rounded-3xl p-6 flex items-start gap-4">
        <div className="p-3 bg-brand-cyan/10 rounded-xl border border-brand-cyan/20 shrink-0">
          <Calendar className="w-6 h-6 text-brand-cyan" />
        </div>
        <div className="w-full">
          <h3 className="text-lg font-semibold text-white mb-3">Vigencia del plan</h3>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-400">Plan actual</p>
              <p className="font-medium text-brand-cyan capitalize">{planKey}</p>
            </div>
            <div>
              <p className="text-slate-400">Periodo</p>
              <p className="font-medium text-white">30 días</p>
            </div>
            <div>
              <p className="text-slate-400">Inicio del ciclo</p>
              <p className="font-medium text-white">{formatDate(currentPeriodStart)}</p>
            </div>
            <div>
              <p className="text-slate-400">Termina el</p>
              <p className="font-medium text-white">{formatDate(currentPeriodEnd)}</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-white/5 text-xs text-slate-400">
            Gracia disponible hasta: {formatDate(graceEndsAt)} (en caso de no renovación)
          </div>
        </div>
      </div>
    )
  }

  if (effectiveStatus === 'past_due') {
    return (
      <div className="bg-card-bg/80 backdrop-blur-2xl border border-amber-500/50 rounded-3xl p-6 flex items-start gap-4">
        <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 shrink-0">
          <AlertTriangle className="w-6 h-6 text-amber-500" />
        </div>
        <div className="w-full">
          <h3 className="text-lg font-semibold text-white mb-1">Vigencia del plan</h3>
          <p className="text-amber-500 font-medium mb-3">Plan pagado en gracia</p>
          <div className="space-y-2 text-sm text-slate-300">
            <p>Tu plan venció el <strong className="text-white">{formatDate(currentPeriodEnd)}</strong>.</p>
            <p>Periodo de gracia hasta el <strong className="text-amber-400">{formatDate(graceEndsAt)}</strong>.</p>
            <p className="text-brand-pink mt-2">¡Renueva antes de esa fecha para evitar el bloqueo de funciones premium!</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card-bg/80 backdrop-blur-2xl border border-red-500/30 rounded-3xl p-6 flex items-start gap-4">
      <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20 shrink-0">
        <AlertTriangle className="w-6 h-6 text-red-500" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-white mb-1">Vigencia del plan</h3>
        <p className="text-red-400 font-medium mb-1">Plan finalizado</p>
        <p className="text-sm text-slate-300">Renueva tu suscripción para recuperar tus funciones premium.</p>
      </div>
    </div>
  )
}
