import { SubscriptionTier, SubscriptionStatus, BillingCycle } from './tier-config'

export interface Subscription {
  id: string
  userId: string
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  tier: SubscriptionTier
  status: SubscriptionStatus
  billingCycle: BillingCycle
  currentPeriodStart?: Date
  currentPeriodEnd?: Date
  cancelAtPeriodEnd: boolean
  trialEnd?: Date
  createdAt: Date
  updatedAt: Date
}

export interface CreateSubscriptionData {
  userId: string
  tier: SubscriptionTier
  billingCycle: BillingCycle
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  trialEnd?: Date
}

export interface UpdateSubscriptionData {
  tier?: SubscriptionTier
  status?: SubscriptionStatus
  billingCycle?: BillingCycle
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  currentPeriodStart?: Date
  currentPeriodEnd?: Date
  cancelAtPeriodEnd?: boolean
  trialEnd?: Date
}

export interface UsageMetric {
  id: string
  subscriptionId: string
  userId: string
  metricType: string
  currentValue: number
  limitValue: number
  periodStart: Date
  periodEnd: Date
  createdAt: Date
  updatedAt: Date
}

export enum UsageMetricType {
  CONNECTED_ACCOUNTS = 'connected_accounts',
  TOTAL_BALANCE = 'total_balance',
  TRANSACTION_EXPORTS = 'transaction_exports',
  API_CALLS = 'api_calls',
  SYNC_REQUESTS = 'sync_requests'
}

export class TierLimitExceededError extends Error {
  constructor(
    public limitType: string,
    public currentValue: number,
    public limitValue: number,
    public requiredTier: SubscriptionTier
  ) {
    super(`${limitType} limit exceeded: ${currentValue}/${limitValue}. Upgrade to ${requiredTier} required.`)
    this.name = 'TierLimitExceededError'
  }
}

export class FeatureNotAvailableError extends Error {
  constructor(
    public feature: string,
    public requiredTier: SubscriptionTier
  ) {
    super(`Feature '${feature}' requires ${requiredTier} tier.`)
    this.name = 'FeatureNotAvailableError'
  }
}

export class SubscriptionNotFoundError extends Error {
  constructor(userId: string) {
    super(`Subscription not found for user: ${userId}`)
    this.name = 'SubscriptionNotFoundError'
  }
}

export class SubscriptionUpdateError extends Error {
  constructor(message: string, public subscriptionId: string) {
    super(`Subscription update failed for ${subscriptionId}: ${message}`)
    this.name = 'SubscriptionUpdateError'
  }
}