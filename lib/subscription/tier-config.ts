export enum SubscriptionTier {
  STARTER = 'STARTER',
  GROWTH = 'GROWTH',
  PRO = 'PRO'
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  CANCELED = 'CANCELED',
  PAST_DUE = 'PAST_DUE',
  UNPAID = 'UNPAID',
  TRIALING = 'TRIALING'
}

export enum BillingCycle {
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY'
}

export interface TierLimits {
  accounts: number | 'unlimited'
  balanceLimit: number | 'unlimited'
  transactionHistoryMonths: number | 'unlimited'
  syncFrequency: 'daily' | 'realtime' | 'priority'
  features: string[]
  support: 'none' | 'email' | 'priority_chat'
}

export const TIER_CONFIGS: Record<SubscriptionTier, TierLimits> = {
  [SubscriptionTier.STARTER]: {
    accounts: 3,
    balanceLimit: 15000,
    transactionHistoryMonths: 12,
    syncFrequency: 'daily',
    features: ['basic_budgeting', 'goal_tracking', 'mobile_web_access'],
    support: 'none'
  },
  [SubscriptionTier.GROWTH]: {
    accounts: 10,
    balanceLimit: 100000,
    transactionHistoryMonths: 'unlimited',
    syncFrequency: 'realtime',
    features: ['basic_budgeting', 'goal_tracking', 'mobile_web_access', 'csv_export', 'spending_insights', 'trends_analysis'],
    support: 'email'
  },
  [SubscriptionTier.PRO]: {
    accounts: 'unlimited',
    balanceLimit: 'unlimited',
    transactionHistoryMonths: 'unlimited',
    syncFrequency: 'priority',
    features: ['basic_budgeting', 'goal_tracking', 'mobile_web_access', 'csv_export', 'spending_insights', 'trends_analysis', 'investment_tracking', 'tax_reports', 'ai_insights', 'multi_currency'],
    support: 'priority_chat'
  }
}

export const TIER_PRICING = {
  [SubscriptionTier.STARTER]: {
    monthly: 0,
    yearly: 0
  },
  [SubscriptionTier.GROWTH]: {
    monthly: 5,
    yearly: 50
  },
  [SubscriptionTier.PRO]: {
    monthly: 15,
    yearly: 150
  }
}

// Helper functions
export function getTierLimits(tier: SubscriptionTier): TierLimits {
  return TIER_CONFIGS[tier]
}

export function getTierPricing(tier: SubscriptionTier, cycle: BillingCycle): number {
  return cycle === BillingCycle.MONTHLY 
    ? TIER_PRICING[tier].monthly 
    : TIER_PRICING[tier].yearly
}

export function isFeatureAvailable(tier: SubscriptionTier, feature: string): boolean {
  return TIER_CONFIGS[tier].features.includes(feature)
}

export function canAccessFeature(userTier: SubscriptionTier, requiredTier: SubscriptionTier): boolean {
  const tierOrder = [SubscriptionTier.STARTER, SubscriptionTier.GROWTH, SubscriptionTier.PRO]
  return tierOrder.indexOf(userTier) >= tierOrder.indexOf(requiredTier)
}

export function getNextTier(currentTier: SubscriptionTier): SubscriptionTier | null {
  switch (currentTier) {
    case SubscriptionTier.STARTER:
      return SubscriptionTier.GROWTH
    case SubscriptionTier.GROWTH:
      return SubscriptionTier.PRO
    case SubscriptionTier.PRO:
      return null
  }
}

export function getPreviousTier(currentTier: SubscriptionTier): SubscriptionTier | null {
  switch (currentTier) {
    case SubscriptionTier.PRO:
      return SubscriptionTier.GROWTH
    case SubscriptionTier.GROWTH:
      return SubscriptionTier.STARTER
    case SubscriptionTier.STARTER:
      return null
  }
}