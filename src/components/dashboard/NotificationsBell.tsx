'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, CheckCircle2, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'

type Notification = {
  id: string
  title: string
  message: string
  is_read: boolean
  created_at: string
}

export function NotificationsBell() {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

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

    const loadNotifications = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

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
            setNotifications(prev => [newNotif, ...prev])
            setUnreadCount(prev => prev + 1)
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
    }

    loadNotifications()

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [supabase])

  const markAsRead = async (id: string) => {
    // Update local first for instant feedback
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
  }

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id)
    if (unreadIds.length === 0) return

    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnreadCount(0)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .in('id', unreadIds)
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
            className="absolute right-0 mt-3 w-[340px] sm:w-[380px] bg-card-bg/95 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 origin-top-right"
          >
            <div className="p-4 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
              <h3 className="font-semibold flex items-center gap-2">
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
                <div className="divide-y divide-white/[0.05]">
                  {notifications.map((notif) => (
                    <div 
                      key={notif.id} 
                      className={`p-4 transition-colors hover:bg-white/[0.03] ${!notif.is_read ? 'bg-brand-violet/[0.03]' : ''}`}
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
                            <p className={`text-sm font-medium ${!notif.is_read ? 'text-text-main' : 'text-text-secondary'}`}>
                              {notif.title}
                            </p>
                            <span className="text-[10px] text-text-soft whitespace-nowrap">
                              {new Date(notif.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                          <p className="text-xs text-text-soft leading-relaxed break-words">
                            {notif.message}
                          </p>
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
            
            <div className="p-2 border-t border-white/[0.08] bg-white/[0.01]">
              <button 
                onClick={() => setIsOpen(false)}
                className="w-full p-2 text-xs text-text-soft hover:text-text-main hover:bg-white/[0.04] rounded-lg transition-colors flex items-center justify-center gap-1"
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
