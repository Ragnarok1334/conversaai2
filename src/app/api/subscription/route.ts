import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { UserSubscription, getPlanConfig, getUsagePercentage, normalizePlan } from '@/lib/plans'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: subscriptionData } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single()
      
    let subscription = subscriptionData

    // If subscription doesn't exist, create a fallback trial one using admin (bypasses RLS)
    if (!subscription) {
      const planConfig = getPlanConfig('trial')
      const supabaseAdmin = createSupabaseAdmin()
      const { data: newSub, error: insertError } = await supabaseAdmin
        .from('subscriptions')
        .insert({
          user_id: user.id,
          plan: 'trial',
          status: 'active',
          assistants_limit: planConfig.limits.assistants ?? 1,
          messages_limit: planConfig.limits.messagesPerMonth ?? 100,
          current_messages_used: 0
        })
        .select()
        .single()
        
      if (insertError) {
        console.error('Error creating fallback subscription:', insertError)
        return NextResponse.json({ error: 'Failed to load subscription' }, { status: 500 })
      }
      subscription = newSub
    }

    // Fetch actual assistants count
    const { count: assistantsUsed } = await supabase
      .from('assistants')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    const normalizedPlan = normalizePlan(subscription.plan)
    const sub = subscription as UserSubscription
    const planConfig = getPlanConfig(normalizedPlan)

    // Use limits from PLAN_CONFIGS (source of truth), not stored DB value
    const assistantsLimit = planConfig.limits.assistants
    const messagesLimit = planConfig.limits.messagesPerMonth

    const payload = {
      subscription: { ...sub, plan: normalizedPlan },
      planConfig,
      usage: {
        assistantsUsed: assistantsUsed || 0,
        assistantsLimit,
        messagesUsed: sub.current_messages_used,
        messagesLimit,
        messagesPercentage: getUsagePercentage(sub.current_messages_used, messagesLimit),
        assistantsPercentage: getUsagePercentage(assistantsUsed || 0, assistantsLimit),
      }
    }

    return NextResponse.json(payload)
  } catch (error) {
    console.error('Subscription API Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

