import { PrismaClient } from '@prisma/client'
import { 
  UsageMetric, 
  UsageMetricType, 
  TierLimitExceededError,
  SubscriptionNotFoundError 
} from './types'
import { SubscriptionTier, getTierLimits } from './tier-config'

export interface IUsageTrackingService {
  // Usage tracking
  trackUsage(userId: string, metricType: UsageMetricType, increment?: number): Promise<void>
  checkUsageLimit(userId: string, metricType: UsageMetricType): Promise<boolean>
  getCurrentUsage(userId: string): Promise<UsageMetric[]>
  getUsageMetric(userId: string, metricType: UsageMetricType): Promise<UsageMetric | null>
  
  // Usage calculations and aggregations
  calculateTotalBalance(userId: string): Promise<number>
  calculateConnectedAccounts(userId: string): Promise<number>
  aggregateUsageForPeriod(userId: string, startDate: Date, endDate: Date): Promise<UsageMetric[]>
  
  // Limit enforcement
  enforceUsageLimit(userId: string, metricType: UsageMetricType, requestedIncrement?: number): Promise<void>
  getUsageLimitStatus(userId: string): Promise<Record<string, { current: number; limit: number; percentage: number }>>
}

export class UsageTrackingService implements IUsageTrackingService {
  constructor(private prisma: PrismaClient) {}

  async trackUsage(userId: string, metricType: UsageMetricType, increment: number = 1): Promise<void> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId }
    })

    if (!subscription) {
      throw new SubscriptionNotFoundError(userId)
    }

    const currentPeriodStart = subscription.currentPeriodStart || new Date()
    const currentPeriodEnd = subscription.currentPeriodEnd || this.calculatePeriodEnd(subscription.billingCycle)

    // Get or create usage metric for current period
    const existingMetric = await this.prisma.usageMetric.findUnique({
      where: {
        subscriptionId_metricType_periodStart: {
          subscriptionId: subscription.id,
          metricType,
          periodStart: currentPeriodStart
        }
      }
    })

    if (existingMetric) {
      // Update existing metric
      await this.prisma.usageMetric.update({
        where: { id: existingMetric.id },
        data: {
          currentValue: existingMetric.currentValue + increment,
          updatedAt: new Date()
        }
      })
    } else {
      // Create new metric
      const limits = getTierLimits(subscription.tier as SubscriptionTier)
      const limitValue = this.getMetricLimit(metricType, limits)

      await this.prisma.usageMetric.create({
        data: {
          subscriptionId: subscription.id,
          userId,
          metricType,
          currentValue: increment,
          limitValue,
          periodStart: currentPeriodStart,
          periodEnd: currentPeriodEnd
        }
      })
    }
  }

  async checkUsageLimit(userId: string, metricType: UsageMetricType): Promise<boolean> {
    const metric = await this.getUsageMetric(userId, metricType)
    
    if (!metric) {
      return true // No usage tracked yet, within limits
    }

    return metric.limitValue === -1 || metric.currentValue < metric.limitValue
  }

  async getCurrentUsage(userId: string): Promise<UsageMetric[]> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId }
    })

    if (!subscription) {
      throw new SubscriptionNotFoundError(userId)
    }

    const currentPeriodStart = subscription.currentPeriodStart || new Date()

    const metrics = await this.prisma.usageMetric.findMany({
      where: {
        userId,
        periodStart: currentPeriodStart
      },
      orderBy: {
        metricType: 'asc'
      }
    })

    return metrics.map(this.mapPrismaToUsageMetric)
  }

  async getUsageMetric(userId: string, metricType: UsageMetricType): Promise<UsageMetric | null> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId }
    })

    if (!subscription) {
      throw new SubscriptionNotFoundError(userId)
    }

    const currentPeriodStart = subscription.currentPeriodStart || new Date()

    const metric = await this.prisma.usageMetric.findUnique({
      where: {
        subscriptionId_metricType_periodStart: {
          subscriptionId: subscription.id,
          metricType,
          periodStart: currentPeriodStart
        }
      }
    })

    return metric ? this.mapPrismaToUsageMetric(metric) : null
  }

  async calculateTotalBalance(userId: string): Promise<number> {
    const accounts = await this.prisma.account.findMany({
      where: { userId },
      select: { balanceCurrent: true }
    })

    return accounts.reduce((total, account) => {
      return total + (account.balanceCurrent?.toNumber() || 0)
    }, 0)
  }

  async calculateConnectedAccounts(userId: string): Promise<number> {
    const accountCount = await this.prisma.account.count({
      where: { userId }
    })

    return accountCount
  }

  async aggregateUsageForPeriod(userId: string, startDate: Date, endDate: Date): Promise<UsageMetric[]> {
    const metrics = await this.prisma.usageMetric.findMany({
      where: {
        userId,
        periodStart: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: [
        { metricType: 'asc' },
        { periodStart: 'desc' }
      ]
    })

    return metrics.map(this.mapPrismaToUsageMetric)
  }

  async enforceUsageLimit(userId: string, metricType: UsageMetricType, requestedIncrement: number = 1): Promise<void> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId }
    })

    if (!subscription) {
      throw new SubscriptionNotFoundError(userId)
    }

    const metric = await this.getUsageMetric(userId, metricType)
    const limits = getTierLimits(subscription.tier as SubscriptionTier)
    const limitValue = this.getMetricLimit(metricType, limits)

    // Check if unlimited
    if (limitValue === -1) {
      return
    }

    const currentValue = metric?.currentValue || 0
    const newValue = currentValue + requestedIncrement

    if (newValue > limitValue) {
      const requiredTier = this.getRequiredTierForLimit(metricType)
      throw new TierLimitExceededError(
        metricType,
        currentValue,
        limitValue,
        requiredTier
      )
    }
  }

  async getUsageLimitStatus(userId: string): Promise<Record<string, { current: number; limit: number; percentage: number }>> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId }
    })

    if (!subscription) {
      throw new SubscriptionNotFoundError(userId)
    }

    const metrics = await this.getCurrentUsage(userId)
    const limits = getTierLimits(subscription.tier as SubscriptionTier)
    const status: Record<string, { current: number; limit: number; percentage: number }> = {}

    // Add real-time calculations for dynamic metrics
    const totalBalance = await this.calculateTotalBalance(userId)
    const connectedAccounts = await this.calculateConnectedAccounts(userId)

    // Update or create usage metrics with real-time values
    await this.updateRealTimeMetrics(userId, totalBalance, connectedAccounts)

    // Get all metric types to check
    const metricTypes = [
      UsageMetricType.CONNECTED_ACCOUNTS,
      UsageMetricType.TOTAL_BALANCE,
      UsageMetricType.TRANSACTION_EXPORTS,
      UsageMetricType.API_CALLS,
      UsageMetricType.SYNC_REQUESTS
    ]

    for (const metricType of metricTypes) {
      const metric = metrics.find(m => m.metricType === metricType)
      const limitValue = this.getMetricLimit(metricType, limits)
      
      let currentValue = 0
      
      // Use real-time values for dynamic metrics
      if (metricType === UsageMetricType.TOTAL_BALANCE) {
        currentValue = totalBalance
      } else if (metricType === UsageMetricType.CONNECTED_ACCOUNTS) {
        currentValue = connectedAccounts
      } else {
        currentValue = metric?.currentValue || 0
      }

      const percentage = limitValue === -1 ? 0 : Math.min((currentValue / limitValue) * 100, 100)

      status[metricType] = {
        current: currentValue,
        limit: limitValue,
        percentage
      }
    }

    return status
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

  private getRequiredTierForLimit(metricType: UsageMetricType): SubscriptionTier {
    switch (metricType) {
      case UsageMetricType.CONNECTED_ACCOUNTS:
        return SubscriptionTier.GROWTH // Growth allows 10 accounts vs Starter's 3
      case UsageMetricType.TOTAL_BALANCE:
        return SubscriptionTier.GROWTH // Growth allows $100k vs Starter's $15k
      case UsageMetricType.TRANSACTION_EXPORTS:
        return SubscriptionTier.GROWTH // Growth includes CSV export
      default:
        return SubscriptionTier.GROWTH
    }
  }

  private mapPrismaToUsageMetric(prismaMetric: any): UsageMetric {
    return {
      id: prismaMetric.id,
      subscriptionId: prismaMetric.subscriptionId,
      userId: prismaMetric.userId,
      metricType: prismaMetric.metricType,
      currentValue: prismaMetric.currentValue,
      limitValue: prismaMetric.limitValue,
      periodStart: prismaMetric.periodStart,
      periodEnd: prismaMetric.periodEnd,
      createdAt: prismaMetric.createdAt,
      updatedAt: prismaMetric.updatedAt
    }
  }

  private async updateRealTimeMetrics(userId: string, totalBalance: number, connectedAccounts: number): Promise<void> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId }
    })

    if (!subscription) {
      return
    }

    const currentPeriodStart = subscription.currentPeriodStart || new Date()
    const currentPeriodEnd = subscription.currentPeriodEnd || this.calculatePeriodEnd(subscription.billingCycle)
    const limits = getTierLimits(subscription.tier as SubscriptionTier)

    // Update total balance metric
    await this.prisma.usageMetric.upsert({
      where: {
        subscriptionId_metricType_periodStart: {
          subscriptionId: subscription.id,
          metricType: UsageMetricType.TOTAL_BALANCE,
          periodStart: currentPeriodStart
        }
      },
      update: {
        currentValue: Math.round(totalBalance),
        updatedAt: new Date()
      },
      create: {
        subscriptionId: subscription.id,
        userId,
        metricType: UsageMetricType.TOTAL_BALANCE,
        currentValue: Math.round(totalBalance),
        limitValue: limits.balanceLimit === 'unlimited' ? -1 : limits.balanceLimit,
        periodStart: currentPeriodStart,
        periodEnd: currentPeriodEnd
      }
    })

    // Update connected accounts metric
    await this.prisma.usageMetric.upsert({
      where: {
        subscriptionId_metricType_periodStart: {
          subscriptionId: subscription.id,
          metricType: UsageMetricType.CONNECTED_ACCOUNTS,
          periodStart: currentPeriodStart
        }
      },
      update: {
        currentValue: connectedAccounts,
        updatedAt: new Date()
      },
      create: {
        subscriptionId: subscription.id,
        userId,
        metricType: UsageMetricType.CONNECTED_ACCOUNTS,
        currentValue: connectedAccounts,
        limitValue: limits.accounts === 'unlimited' ? -1 : limits.accounts,
        periodStart: currentPeriodStart,
        periodEnd: currentPeriodEnd
      }
    })
  }
}