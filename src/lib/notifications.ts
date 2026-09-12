import 'server-only'
import { createSupabaseAdmin } from '@/lib/supabase/admin'

export type NotificationCategory = 'lead' | 'conversation' | 'usage' | 'billing' | 'security' | 'product'

const preferenceFor: Record<NotificationCategory, string | null> = {
  lead: 'lead_alerts', conversation: 'conversation_alerts', usage: 'usage_limit_alerts',
  billing: 'billing_alerts', security: 'security_alerts', product: 'product_updates',
}

export async function createUserNotification(input: {
  userId: string
  title: string
  message: string
  category: NotificationCategory
  metadata?: Record<string, unknown>
  actionUrl?: string
}) {
  const admin = createSupabaseAdmin()
  const { data: settings } = await admin.from('user_settings')
    .select('dashboard_notifications,lead_alerts,conversation_alerts,usage_limit_alerts,billing_alerts,security_alerts,product_updates')
    .eq('user_id', input.userId).maybeSingle()
  const preference = preferenceFor[input.category]
  if (settings?.dashboard_notifications === false) return null
  if (preference && settings?.[preference as keyof typeof settings] === false) return null

  const { data, error } = await admin.from('notifications').insert({
    user_id: input.userId,
    title: input.title.slice(0, 160),
    message: input.message.slice(0, 500),
    type: input.category,
    action_url: input.actionUrl?.startsWith('/dashboard/') ? input.actionUrl : null,
    metadata: input.metadata || {},
  }).select('id').single()
  if (error) {
    console.error('[notification]', error.code || 'insert_failed')
    return null
  }
  return data
}
