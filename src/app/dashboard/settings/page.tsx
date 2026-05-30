import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SettingsClient } from '@/components/dashboard/SettingsClient'

/**
 * SettingsPage — Server component.
 * Fetches initial user data + assistant count server-side,
 * then renders <SettingsClient> for all interactive features.
 */
export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { count: assistantCount } = await supabase
    .from('assistants')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  const userName = user.user_metadata?.name || user.email?.split('@')[0] || 'Usuario'
  const joinDate = new Date(user.created_at).toLocaleDateString('es-CL', {
    day: '2-digit', month: 'long', year: 'numeric'
  })

  return (
    <SettingsClient
      userName={userName}
      email={user.email ?? ''}
      joinDate={joinDate}
      assistantCount={assistantCount ?? 0}
    />
  )
}

