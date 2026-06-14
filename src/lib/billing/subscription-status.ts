import { PlanConfig } from '@/lib/plans';

export type EffectiveStatus = 'free' | 'trialing' | 'active' | 'past_due' | 'expired' | 'cancelled';

export interface SubscriptionDates {
  current_period_start?: string | null;
  current_period_end?: string | null;
  grace_ends_at?: string | null;
}

export function getEffectiveSubscriptionStatus(
  subscription: any,
  profile: any
): EffectiveStatus {
  if (!subscription) return 'free';

  const plan = subscription.plan;
  const now = new Date();

  // 1. FREE PLAN
  if (plan === 'free') {
    return 'free';
  }

  // 2. TRIAL PLAN
  if (plan === 'trial') {
    if (!profile?.trial_ends_at) return 'expired';
    
    const trialEndsAt = new Date(profile.trial_ends_at);
    if (now > trialEndsAt) {
      return 'expired';
    }
    return 'trialing'; // active trial
  }

  // 3. PAID PLANS
  // Use dates as the ultimate source of truth
  if (subscription.current_period_end) {
    const periodEnd = new Date(subscription.current_period_end);
    
    if (now <= periodEnd) {
      return 'active';
    }

    // No grace period if cancelled voluntarily
    if (subscription.cancel_at_period_end) {
      return 'cancelled';
    }

    if (subscription.grace_ends_at) {
      const graceEnd = new Date(subscription.grace_ends_at);
      if (now <= graceEnd) {
        return 'past_due';
      }
    }

    // If past grace period, or if no grace period and past period end
    return 'expired';
  }

  // Fallback if no dates exist but status is active (legacy behavior, or right after manual DB insert)
  if (subscription.status === 'active') {
    return 'active';
  }

  return subscription.status as EffectiveStatus;
}

export function canUsePremiumFeatures(subscription: any, profile: any): boolean {
  const status = getEffectiveSubscriptionStatus(subscription, profile);
  return ['active', 'trialing', 'past_due'].includes(status);
}

export function isPaidPlanActive(subscription: any, profile: any): boolean {
  const status = getEffectiveSubscriptionStatus(subscription, profile);
  return ['active', 'past_due'].includes(status) && subscription?.plan !== 'free' && subscription?.plan !== 'trial';
}

export function isTrialActive(subscription: any, profile: any): boolean {
  return getEffectiveSubscriptionStatus(subscription, profile) === 'trialing';
}

export function isInGracePeriod(subscription: any, profile: any): boolean {
  return getEffectiveSubscriptionStatus(subscription, profile) === 'past_due';
}
