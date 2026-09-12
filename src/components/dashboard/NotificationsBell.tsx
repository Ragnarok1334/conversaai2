'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Bell, CheckCircle2, ExternalLink, Volume2, VolumeX, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'

type Notification = {
  id: string
  title: string
  message: string
  is_read: boolean
  created_at: string
  type: string
  action_url?: string | null
  metadata?: Record<string, unknown> | null
}

type SoundPreferences = { dashboard: boolean; chat: boolean; alerts: boolean }

export function NotificationsBell() {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const supabase = useMemo(() => createClient(), [])
  const [sounds, setSounds] = useState<SoundPreferences>({ dashboard: true, chat: true, alerts: true })
  const soundsRef = useRef(sounds)
  const audioReady = useRef(false)

  useEffect(() => { soundsRef.current = sounds }, [sounds])

  const playSound = useCallback((type: string) => {
    const preferences = soundsRef.current
    if (!preferences.dashboard || (type === 'conversation' ? !preferences.chat : !preferences.alerts)) return
    try {
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AudioContextClass) return
      const context = new AudioContextClass()
      if (context.state === 'suspended' && !audioReady.current) { void context.close(); return }
      const gain = context.createGain(); const oscillator = context.createOscillator()
      oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(type === 'conversation' ? 660 : 520, context.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(type === 'conversation' ? 880 : 700, context.currentTime + 0.14)
      gain.gain.setValueAtTime(0.0001, context.currentTime); gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.02); gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.24)
      oscillator.connect(gain); gain.connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + 0.25)
      oscillator.addEventListener('ended', () => void context.close())
    } catch { /* Browsers may block audio before the first interaction. */ }
  }, [])

  useEffect(() => {
    const unlock = () => { audioReady.current = true }
    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })
    return () => { window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock) }
  }, [])

  useEffect(() => {
    // Cerrar al hacer click fuera
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel>
    let refreshTimer: number | undefined

    const loadNotifications = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const settingsResponse = await fetch('/api/settings', { cache: 'no-store' }).catch(() => null)
      if (settingsResponse?.ok) {
        const value = await settingsResponse.json()
        setSounds({ dashboard: value.dashboard_notifications !== false, chat: value.chat_sound_enabled !== false, alerts: value.notification_sound_enabled !== false })
      }

      // Fetch inicial
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (data) {
        setNotifications(data)
        setUnreadCount(data.filter(n => !n.is_read).length)
      }

      // Suscripción a cambios
      channel = supabase.channel(`realtime-notifications-${user.id}-${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newNotif = payload.new as Notification
            setNotifications(prev => prev.some(item => item.id === newNotif.id) ? prev : [newNotif, ...prev].slice(0, 20))
            setUnreadCount(prev => prev + 1)
            playSound(newNotif.type)
            if (document.hidden) document.title = `● ${newNotif.title} · ConversaAI`
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const updatedNotif = payload.new as Notification
            setNotifications(prev => prev.map(n => n.id === updatedNotif.id ? updatedNotif : n))
            setUnreadCount(prev => {
              const isNowRead = updatedNotif.is_read
              const wasRead = payload.old?.is_read
              if (!wasRead && isNowRead) return Math.max(0, prev - 1)
              if (wasRead && !isNowRead) return prev + 1
              return prev
            })
          }
        )
        .subscribe()

      const refresh = async () => {
        const { data: latest } = await supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20)
        if (latest) {
          setNotifications(latest)
          setUnreadCount(latest.filter(item => !item.is_read).length)
        }
      }
      refreshTimer = window.setInterval(() => void refresh(), 30_000)
      window.addEventListener('focus', refresh)
      return () => window.removeEventListener('focus', refresh)
    }

    let removeFocus: (() => void) | undefined
    void loadNotifications().then(cleanup => { removeFocus = cleanup })

    return () => {
      if (channel) supabase.removeChannel(channel)
      if (refreshTimer) window.clearInterval(refreshTimer)
      removeFocus?.()
    }
  }, [playSound, supabase])

  const markAsRead = async (id: string) => {
    // Update local first for instant feedback
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))

    try {
      const response = await fetch('/api/notifications/read', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      })
      if (!response.ok) throw new Error('No se pudo guardar')
    } catch (err) {
      console.error('Failed to mark notification as read:', err)
    }
  }

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id)
    if (unreadIds.length === 0) return

    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnreadCount(0)

    try {
      await fetch('/api/notifications/read', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true })
      })
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err)
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`relative w-10 h-10 rounded-xl border flex items-center justify-center transition-all duration-300 ${
          isOpen 
            ? 'bg-brand-violet/20 border-brand-violet/40 text-brand-violet shadow-[0_0_15px_rgba(124,58,237,0.3)]' 
            : 'bg-card-bg border-card-border text-text-soft hover:bg-white/10 hover:text-text-main'
        }`}
      >
        <Bell className={`w-4.5 h-4.5 ${unreadCount > 0 ? 'animate-[wiggle_1s_ease-in-out_infinite]' : ''}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-brand-cyan rounded-full text-[10px] font-bold text-[#050816] flex items-center justify-center shadow-lg shadow-brand-cyan/40">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed right-3 top-16 z-[10000] w-[calc(100vw-1.5rem)] max-w-[390px] overflow-hidden rounded-2xl border border-card-border bg-card-bg shadow-[0_18px_60px_rgba(0,0,0,0.3)] origin-top-right"
          >
            <div className="flex items-center justify-between border-b border-card-border bg-black/[0.025] px-4 py-3.5">
              <h3 className="dashboard-strong flex items-center gap-2 font-semibold">
                Notificaciones
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-brand-violet/20 text-brand-violet text-xs">
                    {unreadCount} nuevas
                  </span>
                )}
              </h3>
              {unreadCount > 0 && (
                <button 
                  onClick={markAllAsRead}
                  className="text-xs text-text-soft hover:text-brand-cyan transition-colors"
                >
                  Marcar todo leído
                </button>
              )}
            </div>

            <div className="max-h-[380px] overflow-y-auto overflow-x-hidden custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="p-8 text-center flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-white/[0.03] border border-white/[0.05] flex items-center justify-center mb-3">
                    <CheckCircle2 className="w-6 h-6 text-text-soft/50" />
                  </div>
                  <p className="text-text-soft text-sm">No tienes notificaciones por ahora.</p>
                </div>
              ) : (
                <div className="divide-y divide-card-border">
                  {notifications.map((notif) => (
                    <div 
                      key={notif.id} 
                    className={`p-4 transition-colors hover:bg-brand-violet/[0.04] ${!notif.is_read ? 'bg-brand-violet/[0.06]' : ''}`}
                    >
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {!notif.is_read ? (
                            <div className="w-2 h-2 rounded-full bg-brand-cyan shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
                          ) : (
                            <div className="w-2 h-2 rounded-full border border-white/20" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className={`dashboard-strong text-sm font-medium ${notif.is_read ? 'opacity-70' : ''}`}>
                              {notif.title}
                            </p>
                            <span className="text-[10px] text-text-soft whitespace-nowrap">
                              {new Date(notif.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                          <p className="text-xs text-text-soft leading-relaxed break-words">
                            {notif.message}
                          </p>
                          {notif.action_url && <a href={notif.action_url} onClick={() => void markAsRead(notif.id)} className="mt-2 inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-brand-violet">Ver detalle <ExternalLink className="h-3 w-3" /></a>}
                          {!notif.is_read && (
                            <button 
                              onClick={() => markAsRead(notif.id)}
                              className="mt-2 text-xs font-medium text-brand-cyan hover:text-white transition-colors flex items-center gap-1"
                            >
                              Marcar como leído
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2 border-t border-card-border bg-black/[0.02] p-2">
              <a href="/dashboard/settings" className="flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-lg p-2 text-xs text-text-soft transition-colors hover:bg-brand-violet/[0.05] hover:text-brand-violet">{sounds.chat || sounds.alerts ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />} Configurar avisos</a>
              <button 
                onClick={() => setIsOpen(false)}
                className="flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-lg p-2 text-xs text-text-soft transition-colors hover:bg-black/[0.04] hover:text-text-main"
              >
                <X className="w-3 h-3" />
                Cerrar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
