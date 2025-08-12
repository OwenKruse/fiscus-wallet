// Subscription system type definitions

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

export enum UsageMetricType {
  CONNECTED_ACCOUNTS = 'connected_accounts',
  TOTAL_BALANCE = 'total_balance',
  TRANSACTION_EXPORTS = 'transaction_exports',
  API_CALLS = 'api_calls',
  SYNC_REQUESTS = 'sync_requests'
}

export interface TierLimits {
  accounts: number | 'unlimited';
  balanceLimit: number | 'unlimited';
  transactionHistoryMonths: number | 'unlimited';
  syncFrequency: 'daily' | 'realtime' | 'priority';
  features: string[];
  support: 'none' | 'email' | 'priority_chat';
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
    features: ['csv_export', 'spending_insights', 'trends_analysis'],
    support: 'email'
  },
  [SubscriptionTier.PRO]: {
    accounts: 'unlimited',
    balanceLimit: 'unlimited',
    transactionHistoryMonths: 'unlimited',
    syncFrequency: 'priority',
    features: ['investment_tracking', 'tax_reports', 'ai_insights', 'multi_currency'],
    support: 'priority_chat'
  }
};

export interface SubscriptionData {
  id: string;
  userId: string;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  currentPeriodStart?: Date | null;
  currentPeriodEnd?: Date | null;
  cancelAtPeriodEnd: boolean;
  trialEnd?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UsageMetricData {
  id: string;
  subscriptionId: string;
  userId: string;
  metricType: UsageMetricType;
  currentValue: number;
  limitValue: number;
  periodStart: Date;
  periodEnd: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface BillingHistoryData {
  id: string;
  subscriptionId: string;
  userId: string;
  stripeInvoiceId?: string | null;
  amount: number;
  currency: string;
  status: string;
  billingReason: string;
  periodStart: Date;
  periodEnd: Date;
  paidAt?: Date | null;
  createdAt: Date;
}

// Error types
export class TierLimitExceededError extends Error {
  constructor(
    public limitType: string,
    public currentValue: number,
    public limitValue: number,
    public requiredTier: SubscriptionTier
  ) {
    super(`${limitType} limit exceeded: ${currentValue}/${limitValue}. Upgrade to ${requiredTier} required.`);
    this.name = 'TierLimitExceededError';
  }
}

export class FeatureNotAvailableError extends Error {
  constructor(
    public feature: string,
    public requiredTier: SubscriptionTier
  ) {
    super(`Feature '${feature}' requires ${requiredTier} tier.`);
    this.name = 'FeatureNotAvailableError';
  }
}

export class PaymentFailedError extends Error {
  constructor(message: string, public stripeError?: any) {
    super(`Payment failed: ${message}`);
    this.name = 'PaymentFailedError';
  }
}

export class SubscriptionUpdateError extends Error {
  constructor(message: string, public subscriptionId: string) {
    super(`Subscription update failed for ${subscriptionId}: ${message}`);
    this.name = 'SubscriptionUpdateError';
  }
}