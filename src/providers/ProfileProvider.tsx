'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Profile {
  id: string
  full_name: string | null
  company_name: string | null
  phone: string | null
  country: string | null
  avatar_url: string | null
  email: string | null
}

interface ProfileContextType {
  profile: Profile | null
  loading: boolean
  refreshProfile: () => Promise<void>
  setProfile: (profile: Profile) => void
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined)

export function ProfileProvider({ 
  children,
  initialUser
}: { 
  children: React.ReactNode,
  initialUser: { id: string; email: string | null; name: string | null }
}) {
  const [profile, setProfileState] = useState<Profile | null>({
    id: initialUser.id,
    email: initialUser.email,
    full_name: initialUser.name,
    company_name: null,
    phone: null,
    country: null,
    avatar_url: null
  })
  const [loading, setLoading] = useState(true)

  const refreshProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/profile')
      const data = await res.json()
      if (!data.error) {
        setProfileState(prev => ({ ...prev, ...data, email: initialUser.email }))
      }
    } catch (err) {
      console.error('[ProfileProvider] Error fetching profile:', err)
    } finally {
      setLoading(false)
    }
  }, [initialUser.email])

  useEffect(() => {
    refreshProfile()

    const supabase = createClient()
    const channel = supabase.channel(`realtime-profile-${initialUser.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${initialUser.id}`
        },
        (payload) => {
          setProfileState(prev => prev ? { ...prev, ...payload.new } : null)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [initialUser.id, refreshProfile])

  const setProfile = useCallback((newProfile: Profile) => {
    setProfileState(newProfile)
  }, [])

  return (
    <ProfileContext.Provider value={{ profile, loading, refreshProfile, setProfile }}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile() {
  const context = useContext(ProfileContext)
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider')
  }
  return context
}
