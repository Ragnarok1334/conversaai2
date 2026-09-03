import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { UserSubscription, getPlanConfig, getUsagePercentage, normalizePlan } from '@/lib/plans'

const SUBSCRIPTION_FIELDS = [
  'id',
  'user_id',
  'plan',
  'status',
  'assistants_limit',
  'messages_limit',
  'current_messages_used',
  'created_at',
  'updated_at',
  'current_period_start',
  'current_period_end',
  'grace_ends_at',
  'cancel_at_period_end',
  'cancelled_at',
  'cancellation_reason',
].join(',')

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: subscriptionDataRaw, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select(SUBSCRIPTION_FIELDS)
      .eq('user_id', user.id)
      .maybeSingle()

    if (subscriptionError) {
      console.error('Subscription lookup error:', subscriptionError.message)
      return NextResponse.json({ error: 'Failed to load subscription' }, { status: 500 })
    }

    let subscription = subscriptionDataRaw as unknown as UserSubscription | null

    // Create a fallback free subscription if one does not exist.
    // The unique(user_id) constraint protects against duplicate subscriptions.
    if (!subscription) {
      const planConfig = getPlanConfig('free')
      const supabaseAdmin = createSupabaseAdmin()
      const { data: newSubRaw, error: insertError } = await supabaseAdmin
        .from('subscriptions')
        .insert({
          user_id: user.id,
          plan: 'free',
          status: 'active',
          assistants_limit: planConfig.limits.assistants ?? 0,
          messages_limit: planConfig.limits.messagesPerMonth ?? 0,
          current_messages_used: 0,
        })
        .select(SUBSCRIPTION_FIELDS)
        .single()

      if (insertError) {
        // Another request may have created the subscription concurrently.
        if (insertError.code === '23505') {
          const { data: existingSubRaw, error: refetchError } = await supabase
            .from('subscriptions')
            .select(SUBSCRIPTION_FIELDS)
            .eq('user_id', user.id)
            .maybeSingle()

          const existingSub = existingSubRaw as unknown as UserSubscription | null
          if (refetchError || !existingSub) {
            console.error('Subscription fallback refetch error:', refetchError?.message || 'subscription not found')
            return NextResponse.json({ error: 'Failed to load subscription' }, { status: 500 })
          }

          subscription = existingSub
        } else {
          console.error('Error creating fallback subscription:', insertError.message)
          return NextResponse.json({ error: 'Failed to load subscription' }, { status: 500 })
        }
      } else {
        subscription = newSubRaw as unknown as UserSubscription
      }
    }

    const { count: assistantsUsed, error: assistantsError } = await supabase
      .from('assistants')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if (assistantsError) {
      console.error('Assistant usage lookup error:', assistantsError.message)
      return NextResponse.json({ error: 'Failed to load usage' }, { status: 500 })
    }

    const normalizedPlan = normalizePlan(subscription.plan)
    const planConfig = getPlanConfig(normalizedPlan)

    // Use limits from PLAN_CONFIGS (source of truth), not stored DB value.
    const assistantsLimit = planConfig.limits.assistants
    const messagesLimit = planConfig.limits.messagesPerMonth
    const assistantsUsedCount = assistantsUsed ?? 0

    const payload = {
      subscription: { ...subscription, plan: normalizedPlan },
      planConfig,
      usage: {
        assistantsUsed: assistantsUsedCount,
        assistantsLimit,
        messagesUsed: subscription.current_messages_used,
        messagesLimit,
        messagesPercentage: getUsagePercentage(subscription.current_messages_used, messagesLimit),
        assistantsPercentage: getUsagePercentage(assistantsUsedCount, assistantsLimit),
      },
    }

    return NextResponse.json(payload)
  } catch (error: unknown) {
    console.error('Subscription API Error:', error instanceof Error ? error.message : 'Unknown error')
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
