'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Globe, Plus, Trash2, CheckCircle2, Clock, Lock, RefreshCw, AlertCircle, ExternalLink } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

interface Domain {
  id: string
  domain: string
  is_verified: boolean
  verification_status: string
  last_seen_at: string | null
  last_seen_url: string | null
  install_events_count: number
  is_active: boolean
  updated_at: string | null
  created_at: string | null
}

function timeAgo(dateString: string | null): string {
  if (!dateString) return 'Nunca detectado'
  const date = new Date(dateString)
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)

  if (seconds < 60) return 'Detectado hace unos segundos'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `Detectado hace ${minutes} minuto${minutes !== 1 ? 's' : ''}`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Detectado hace ${hours} hora${hours !== 1 ? 's' : ''}`
  const days = Math.floor(hours / 24)
  if (days < 30) return `Detectado hace ${days} día${days !== 1 ? 's' : ''}`
  const months = Math.floor(days / 30)
  if (months < 12) return `Detectado hace ${months} mes${months !== 1 ? 'es' : ''}`
  const years = Math.floor(months / 12)
  return `Detectado hace ${years} año${years !== 1 ? 's' : ''}`
}

function DomainStatusBadge({ domain }: { domain: Domain }) {
  // La lógica de estado se basa estrictamente en los campos reales de la DB
  const isInstalled = domain.is_verified && domain.verification_status === 'verified' && domain.last_seen_at !== null
  const isBlocked = domain.verification_status === 'blocked'
  const isPending = !isInstalled && !isBlocked

  if (isInstalled) {
    return (
      <span className="px-2 py-0.5 rounded-full bg-brand-success/10 text-brand-success text-[10px] border border-brand-success/20 flex items-center gap-1">
        <CheckCircle2 className="w-3 h-3" /> Detectado
      </span>
    )
  }
  if (isBlocked) {
    return (
      <span className="px-2 py-0.5 rounded-full bg-brand-pink/10 text-brand-pink text-[10px] border border-brand-pink/20 flex items-center gap-1">
        <Lock className="w-3 h-3" /> Bloqueado
      </span>
    )
  }
  return (
    <span className="px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-400 text-[10px] border border-amber-400/20 flex items-center gap-1">
      <Clock className="w-3 h-3" /> Esperando detección
    </span>
  )
}

export function AssistantDomainsPanel({ 
  assistantId,
  planLimits,
  effectivePlanStatus 
}: { 
  assistantId: string
  planLimits?: any
  effectivePlanStatus?: string
}) {
  const router = useRouter()
  const [domains, setDomains] = useState<Domain[]>([])
  const [loading, setLoading] = useState(true)
  const [newDomain, setNewDomain] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteDomainId, setConfirmDeleteDomainId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  
  // Ref para saber si estamos montados (evitar setState en componente desmontado)
  const isMounted = useRef(true)

  const fetchDomains = useCallback(async () => {
    if (!isMounted.current) return
    setLoading(true)
    setError(null)
    try {
      // cache: 'no-store' para no usar datos cacheados por el navegador o Next.js
      const res = await fetch(`/api/assistants/${assistantId}/domains`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || `Error ${res.status} al cargar dominios`)
      }
      const data: Domain[] = await res.json()
      if (isMounted.current) {
        setDomains(data)
      }
    } catch (err: any) {
      if (isMounted.current) {
        setError(err.message)
      }
    } finally {
      if (isMounted.current) {
        setLoading(false)
      }
    }
  }, [assistantId])

  useEffect(() => {
    isMounted.current = true
    fetchDomains()

    // Supabase Realtime: escuchar cambios en assistant_domains filtrado por assistant_id
    const supabase = createClient()
    const channelName = `domains_panel_${assistantId}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'assistant_domains',
          filter: `assistant_id=eq.${assistantId}`,
        },
        (payload) => {
          console.log('[Realtime] assistant_domains cambio detectado:', payload.eventType)
          // Al recibir cualquier cambio, hacer re-fetch fresco del servidor y refrescar la página
          fetchDomains()
          router.refresh()
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Suscrito a assistant_domains para', assistantId)
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('[Realtime] Error de canal:', status, '— usa el botón Actualizar como fallback')
        }
      })

    return () => {
      isMounted.current = false
      supabase.removeChannel(channel)
    }
  }, [assistantId, fetchDomains])

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDomain.trim()) return
    setIsAdding(true)
    setError(null)
    try {
      const res = await fetch(`/api/assistants/${assistantId}/domains`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: newDomain }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al agregar dominio')
      setNewDomain('')
      await fetchDomains()
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsAdding(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!confirmDeleteDomainId) return
    const id = confirmDeleteDomainId
    setDeletingId(id)
    setDeleteError(null)

    try {
      const res = await fetch(`/api/assistants/${assistantId}/domains/${id}`, {
        method: 'DELETE'
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Error al eliminar dominio')
      }

      setDomains(prev => prev.filter(d => d.id !== id))
      setConfirmDeleteDomainId(null)
      router.refresh()
    } catch (err: any) {
      setDeleteError(err.message || 'Error al eliminar dominio')
    } finally {
      setDeletingId(null)
    }
  }

  const handleDelete = (id: string) => {
    setConfirmDeleteDomainId(id)
    setDeleteError(null)
  }

  return (
    <div className="bg-card-bg/80 backdrop-blur-2xl border border-card-border rounded-3xl p-8 mb-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Globe className="w-5 h-5 text-brand-cyan" />
          Dominios autorizados ({domains.length}{planLimits?.domains ? `/${planLimits.domains}` : ''})
        </h2>
        <button
          onClick={fetchDomains}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-text-soft hover:text-white transition-colors text-xs font-medium"
          title="Verificar instalación"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Verificar instalación
        </button>
      </div>

      <p className="text-sm text-text-soft mb-6">
        Agrega el dominio de tu sitio web para autorizar el Web Chat. El sistema detectará la instalación automáticamente cuando el script se cargue.
      </p>

      {error && (
        <div className="mb-6 p-4 bg-brand-pink/10 border border-brand-pink/20 rounded-xl flex items-center gap-2 text-brand-pink text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {['free', 'expired', 'cancelled'].includes(effectivePlanStatus || '') ? (
        <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-500 text-sm">
          <p className="font-semibold mb-1 flex items-center gap-2"><Lock className="w-4 h-4"/> Autorización bloqueada</p>
          <p>Debes elegir un plan o activar tu prueba para autorizar dominios.</p>
        </div>
      ) : planLimits?.domains !== null && domains.length >= (planLimits?.domains || 0) ? (
        <div className="mb-6 p-4 bg-brand-violet/10 border border-brand-violet/20 rounded-xl text-brand-violet text-sm">
          <p className="font-semibold mb-1 flex items-center gap-2"><Lock className="w-4 h-4"/> Límite alcanzado</p>
          <p>Tu plan actual permite un máximo de {planLimits?.domains} dominios. Mejora tu plan para agregar más.</p>
        </div>
      ) : (
        <form onSubmit={handleAddDomain} className="flex gap-3 mb-6">
          <input
            type="text"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            placeholder="Ej: midominio.com"
            className="flex-1 bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-brand-cyan/50 transition-colors"
          />
          <button
            type="submit"
            disabled={isAdding || !newDomain.trim()}
            className="px-4 py-2 rounded-xl bg-brand-cyan text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            {isAdding ? 'Agregando...' : 'Agregar'}
          </button>
        </form>
      )}

      <div className="space-y-3">
        {loading && domains.length === 0 && (
          <div className="text-center p-6 bg-white/[0.02] border border-white/[0.05] rounded-xl text-text-soft text-sm animate-pulse">
            Cargando dominios...
          </div>
        )}

        {!loading && domains.length === 0 && (
          <div className="text-center p-6 bg-white/[0.02] border border-white/[0.05] rounded-xl text-text-soft text-sm">
            No hay dominios autorizados todavía. Agrega el dominio de tu sitio web para comenzar.
          </div>
        )}

        {domains.map((d) => {
          const isInstalled = d.is_verified && d.verification_status === 'verified' && d.last_seen_at !== null
          return (
            <div
              key={d.id}
              className="flex items-start justify-between p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl hover:bg-white/[0.03] transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white text-sm flex items-center gap-2 flex-wrap">
                  <span className="font-mono">{d.domain}</span>
                  <DomainStatusBadge domain={d} />
                </p>
                <p className="text-[11px] text-text-soft mt-1">
                  {timeAgo(d.last_seen_at)}
                  {isInstalled && d.install_events_count > 0 && (
                    <span className="ml-2 text-brand-success/70">· {d.install_events_count} detección{d.install_events_count !== 1 ? 'es' : ''}</span>
                  )}
                </p>
                {isInstalled && d.last_seen_url && (
                  <p className="text-[10px] text-text-soft/60 mt-0.5 flex items-center gap-1 truncate">
                    <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                    <span className="truncate">{d.last_seen_url}</span>
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1">
                <button
                  onClick={() => handleDelete(d.id)}
                  disabled={deletingId === d.id}
                  className="ml-3 p-2 rounded-lg text-text-soft hover:text-brand-pink hover:bg-brand-pink/10 transition-colors flex-shrink-0"
                  title="Eliminar dominio"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                {deleteError && confirmDeleteDomainId === d.id && (
                  <span className="text-[10px] text-red-400">{deleteError}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <ConfirmDialog
        open={confirmDeleteDomainId !== null}
        title="Eliminar dominio autorizado"
        description="El Web Chat dejará de funcionar en este dominio. Puedes volver a autorizarlo después."
        confirmLabel="Eliminar dominio"
        cancelLabel="Mantener dominio"
        variant="danger"
        loading={deletingId !== null}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setConfirmDeleteDomainId(null)
          setDeleteError(null)
        }}
      />
    </div>
  )
}
