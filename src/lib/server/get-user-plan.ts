import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { normalizePlan, getPlanConfig, PlanKey } from '@/lib/plans'
import { getEffectiveSubscriptionStatus } from '@/lib/billing/subscription-status'

/**
 * Returns the normalized plan key for a given userId.
 * Always reads from DB via admin client (bypasses RLS).
 * Falls back to 'free' if no active subscription exists or it's expired.
 */
export async function getUserPlan(userId: string): Promise<PlanKey> {
  try {
    const supabaseAdmin = createSupabaseAdmin()
    
    const [subRes, profileRes] = await Promise.all([
      supabaseAdmin
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .single(),
      supabaseAdmin
        .from('profiles')
        .select('trial_used, trial_ends_at')
        .eq('id', userId)
        .single()
    ])

    const sub = subRes.data
    const profile = profileRes.data

    if (!sub) return 'free'

    const status = getEffectiveSubscriptionStatus(sub, profile)
    
    if (status === 'free' || status === 'expired' || status === 'cancelled') {
      return 'free'
    }

    return normalizePlan(sub.plan)
  } catch {
    return 'free'
  }
}

/**
 * Returns the plan config (limits, features) for a given userId.
 */
export async function getUserPlanConfig(userId: string) {
  const plan = await getUserPlan(userId)
  return { plan, config: getPlanConfig(plan) }
}
