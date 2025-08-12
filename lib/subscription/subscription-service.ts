import { PrismaClient } from '@prisma/client'
import { 
  Subscription, 
  CreateSubscriptionData, 
  UpdateSubscriptionData,
  UsageMetric,
  UsageMetricType,
  SubscriptionNotFoundError,
  SubscriptionUpdateError,
  TierLimitExceededError,
  FeatureNotAvailableError
} from './types'
import { 
  SubscriptionTier, 
  SubscriptionStatus, 
  BillingCycle,
  getTierLimits,
  isFeatureAvailable,
  canAccessFeature
} from './tier-config'
import { UsageTrackingService, IUsageTrackingService } from './usage-tracking-service'
import { BillingHistoryService, IBillingHistoryService, CreateBillingRecordData } from './billing-history-service'
import { BillingHistoryData } from '../../types/subscription'

export interface ISubscriptionService {
  // Subscription management
  createSubscription(data: CreateSubscriptionData): Promise<Subscription>
  getSubscription(userId: string): Promise<Subscription | null>
  updateSubscription(subscriptionId: string, updates: UpdateSubscriptionData): Promise<Subscription>
  cancelSubscription(subscriptionId: string, cancelAtPeriodEnd: boolean): Promise<Subscription>
  
  // Usage tracking
  trackUsage(userId: string, metricType: UsageMetricType, increment: number): Promise<void>
  checkUsageLimit(userId: string, metricType: UsageMetricType): Promise<boolean>
  getCurrentUsage(userId: string): Promise<UsageMetric[]>
  
  // Tier management
  getUserTier(userId: string): Promise<SubscriptionTier>
  canPerformAction(userId: string, action: string): Promise<boolean>
  
  // Billing history
  getBillingHistory(userId: string, limit?: number, offset?: number): Promise<BillingHistoryData[]>
  createBillingRecord(data: CreateBillingRecordData): Promise<BillingHistoryData>
}

export class SubscriptionService implements ISubscriptionService {
  private usageTrackingService: IUsageTrackingService
  private billingHistoryService: IBillingHistoryService

  constructor(private prisma: PrismaClient) {
    this.usageTrackingService = new UsageTrackingService(prisma)
    this.billingHistoryService = new BillingHistoryService(prisma)
  }

  async createSubscription(data: CreateSubscriptionData): Promise<Subscription> {
    const subscription = await this.prisma.subscription.create({
      data: {
        userId: data.userId,
        stripeCustomerId: data.stripeCustomerId,
        stripeSubscriptionId: data.stripeSubscriptionId,
        tier: data.tier,
        status: SubscriptionStatus.ACTIVE,
        billingCycle: data.billingCycle,
        currentPeriodStart: new Date(),
        currentPeriodEnd: this.calculatePeriodEnd(data.billingCycle),
        cancelAtPeriodEnd: false,
        trialEnd: data.trialEnd,
      }
    })
    
    // Initialize usage metrics for the new subscription
    await this.initializeUsageMetrics(subscription)
    
    return this.mapPrismaToSubscription(subscription)
  }

  async getSubscription(userId: string): Promise<Subscription | null> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId }
    })
    
    return subscription ? this.mapPrismaToSubscription(subscription) : null
  }

  async updateSubscription(subscriptionId: string, updates: UpdateSubscriptionData): Promise<Subscription> {
    const existingSubscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId }
    })
    
    if (!existingSubscription) {
      throw new SubscriptionUpdateError('Subscription not found', subscriptionId)
    }

    const updatedSubscription = await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        ...updates,
        updatedAt: new Date()
      }
    })
    
    // Update usage metrics if tier changed
    if (updates.tier && updates.tier !== existingSubscription.tier) {
      await this.updateUsageMetricsForTierChange(this.mapPrismaToSubscription(updatedSubscription))
    }
    
    return this.mapPrismaToSubscription(updatedSubscription)
  }

  async cancelSubscription(subscriptionId: string, cancelAtPeriodEnd: boolean): Promise<Subscription> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId }
    })
    
    if (!subscription) {
      throw new SubscriptionUpdateError('Subscription not found', subscriptionId)
    }

    const updates: UpdateSubscriptionData = {
      cancelAtPeriodEnd,
      updatedAt: new Date()
    }

    if (!cancelAtPeriodEnd) {
      updates.status = SubscriptionStatus.CANCELED
      updates.tier = SubscriptionTier.STARTER // Downgrade to free tier immediately
    }

    return this.updateSubscription(subscriptionId, updates)
  }

  async trackUsage(userId: string, metricType: UsageMetricType, increment: number = 1): Promise<void> {
    return this.usageTrackingService.trackUsage(userId, metricType, increment)
  }

  async checkUsageLimit(userId: string, metricType: UsageMetricType): Promise<boolean> {
    return this.usageTrackingService.checkUsageLimit(userId, metricType)
  }

  async getCurrentUsage(userId: string): Promise<UsageMetric[]> {
    return this.usageTrackingService.getCurrentUsage(userId)
  }

  async getUserTier(userId: string): Promise<SubscriptionTier> {
    const subscription = await this.getSubscription(userId)
    return (subscription?.tier as SubscriptionTier) || SubscriptionTier.STARTER
  }

  async canPerformAction(userId: string, action: string): Promise<boolean> {
    const subscription = await this.getSubscription(userId)
    if (!subscription) {
      return false
    }

    // Check if feature is available for user's tier
    if (!isFeatureAvailable(subscription.tier as SubscriptionTier, action)) {
      return false
    }

    // Check subscription status
    if (subscription.status !== SubscriptionStatus.ACTIVE && subscription.status !== SubscriptionStatus.TRIALING) {
      return false
    }

    return true
  }

  async getBillingHistory(userId: string, limit?: number, offset?: number): Promise<BillingHistoryData[]> {
    return this.billingHistoryService.getBillingHistory(userId, limit, offset)
  }

  async createBillingRecord(data: CreateBillingRecordData): Promise<BillingHistoryData> {
    return this.billingHistoryService.createBillingRecord(data)
  }

  // Helper methods
  private calculatePeriodEnd(billingCycle: string): Date {
    const now = new Date()
    if (billingCycle === 'MONTHLY') {
      return new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())
    } else {
      return new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())
    }
  }

  private async initializeUsageMetrics(subscription: any): Promise<void> {
    const limits = getTierLimits(subscription.tier as SubscriptionTier)

    // Initialize common usage metrics
    const metricTypes = [
      UsageMetricType.CONNECTED_ACCOUNTS,
      UsageMetricType.TOTAL_BALANCE,
      UsageMetricType.TRANSACTION_EXPORTS,
      UsageMetricType.API_CALLS,
      UsageMetricType.SYNC_REQUESTS
    ]

    for (const metricType of metricTypes) {
      const limitValue = this.getMetricLimit(metricType, limits)
      
      await this.prisma.usageMetric.create({
        data: {
          subscriptionId: subscription.id,
          userId: subscription.userId,
          metricType,
          currentValue: 0,
          limitValue,
          periodStart: subscription.currentPeriodStart || new Date(),
          periodEnd: subscription.currentPeriodEnd || this.calculatePeriodEnd(subscription.billingCycle),
        }
      })
    }
  }

  private async updateUsageMetricsForTierChange(subscription: Subscription): Promise<void> {
    const limits = getTierLimits(subscription.tier)
    const currentPeriodStart = subscription.currentPeriodStart || new Date()

    // Update all usage metrics for the current period with new limits
    const userMetrics = await this.prisma.usageMetric.findMany({
      where: {
        userId: subscription.userId,
        periodStart: currentPeriodStart
      }
    })

    for (const metric of userMetrics) {
      const newLimitValue = this.getMetricLimit(metric.metricType as UsageMetricType, limits)
      
      await this.prisma.usageMetric.update({
        where: { id: metric.id },
        data: {
          limitValue: newLimitValue,
          updatedAt: new Date()
        }
      })
    }
  }

  private getMetricLimit(metricType: UsageMetricType, limits: any): number {
    switch (metricType) {
      case UsageMetricType.CONNECTED_ACCOUNTS:
        return limits.accounts === 'unlimited' ? -1 : limits.accounts
      case UsageMetricType.TOTAL_BALANCE:
        return limits.balanceLimit === 'unlimited' ? -1 : limits.balanceLimit
      case UsageMetricType.TRANSACTION_EXPORTS:
        return limits.features.includes('csv_export') ? -1 : 0
      case UsageMetricType.API_CALLS:
        return -1 // No API call limits for now
      case UsageMetricType.SYNC_REQUESTS:
        return -1 // No sync request limits for now
      default:
        return -1
    }
  }

  private mapPrismaToSubscription(prismaSubscription: any): Subscription {
    return {
      id: prismaSubscription.id,
      userId: prismaSubscription.userId,
      stripeCustomerId: prismaSubscription.stripeCustomerId,
      stripeSubscriptionId: prismaSubscription.stripeSubscriptionId,
      tier: prismaSubscription.tier as SubscriptionTier,
      status: prismaSubscription.status as SubscriptionStatus,
      billingCycle: prismaSubscription.billingCycle as BillingCycle,
      currentPeriodStart: prismaSubscription.currentPeriodStart,
      currentPeriodEnd: prismaSubscription.currentPeriodEnd,
      cancelAtPeriodEnd: prismaSubscription.cancelAtPeriodEnd,
      trialEnd: prismaSubscription.trialEnd,
      createdAt: prismaSubscription.createdAt,
      updatedAt: prismaSubscription.updatedAt
    }
  }
}