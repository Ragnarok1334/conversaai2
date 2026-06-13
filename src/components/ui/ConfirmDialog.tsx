'use client'

import { useEffect, useRef } from 'react'
import { AlertTriangle, Info, XCircle, Loader2 } from 'lucide-react'

export interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'default'
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'default',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open && !loading) {
        onCancel()
      }
    }
    if (open) {
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, loading, onCancel])

  if (!open) return null

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current && !loading) {
      onCancel()
    }
  }

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: <XCircle className="w-6 h-6 text-brand-pink" />,
          buttonClass: 'bg-brand-pink/10 hover:bg-brand-pink/20 text-brand-pink border border-brand-pink/20',
          iconBg: 'bg-brand-pink/10 border-brand-pink/20',
        }
      case 'warning':
        return {
          icon: <AlertTriangle className="w-6 h-6 text-amber-500" />,
          buttonClass: 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20',
          iconBg: 'bg-amber-500/10 border-amber-500/20',
        }
      default:
        return {
          icon: <Info className="w-6 h-6 text-brand-cyan" />,
          buttonClass: 'bg-brand-cyan/10 hover:bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/20',
          iconBg: 'bg-brand-cyan/10 border-brand-cyan/20',
        }
    }
  }

  const styles = getVariantStyles()

  return (
    <div 
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 transition-all"
    >
      <div 
        className="w-full max-w-md bg-[#070B16] border border-white/10 rounded-2xl shadow-[0_20px_60px_rgb(0,0,0,0.8)] overflow-hidden flex flex-col transform animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl border ${styles.iconBg} shrink-0`}>
              {styles.icon}
            </div>
            <div className="flex-1 mt-1">
              <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
              <p className="text-sm text-slate-300 leading-relaxed">{description}</p>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-white/10 bg-white/[0.02] flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white transition-colors rounded-xl disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all flex items-center gap-2 ${styles.buttonClass} disabled:opacity-50`}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
