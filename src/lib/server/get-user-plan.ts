import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { normalizePlan, getPlanConfig, PlanKey } from '@/lib/plans'

/**
 * Returns the normalized plan key for a given userId.
 * Always reads from DB via admin client (bypasses RLS).
 * Falls back to 'trial' if no active subscription exists or it's expired.
 */
export async function getUserPlan(userId: string): Promise<PlanKey> {
  try {
    const supabaseAdmin = createSupabaseAdmin()
    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('plan, status, current_period_end')
      .eq('user_id', userId)
      .single()

    if (!sub) return 'trial'
    if (sub.status !== 'active') return 'trial'

    // Check expiry if the column exists
    if (sub.current_period_end) {
      const now = new Date()
      const end = new Date(sub.current_period_end)
      if (now > end) return 'trial'
    }

    return normalizePlan(sub.plan)
  } catch {
    return 'trial'
  }
}

/**
 * Returns the plan config (limits, features) for a given userId.
 */
export async function getUserPlanConfig(userId: string) {
  const plan = await getUserPlan(userId)
  return { plan, config: getPlanConfig(plan) }
}
