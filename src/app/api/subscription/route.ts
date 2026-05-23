import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { UserSubscription, getPlanConfig, getUsagePercentage } from '@/lib/plans'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single()

    // If subscription doesn't exist for some reason, create a fallback Free one
    if (!subscription || error) {
      const fallbackSub = {
        user_id: user.id,
        plan: 'free',
        status: 'active',
        assistants_limit: 1,
        messages_limit: 100,
        current_messages_used: 0
      }
      const { data: newSub, error: insertError } = await supabase
        .from('subscriptions')
        .insert(fallbackSub)
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

    const sub = subscription as UserSubscription
    const planConfig = getPlanConfig(sub.plan)

    const assistantsLimit = planConfig.assistantsLimit
    const messagesLimit = planConfig.messagesLimit

    const payload = {
      subscription: sub,
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
