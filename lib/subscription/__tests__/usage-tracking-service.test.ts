import { describe, it, expect, beforeEach, vi, Mock } from 'vitest'
import { UsageTrackingService } from '../usage-tracking-service'
import { UsageMetricType, TierLimitExceededError, SubscriptionNotFoundError } from '../types'
import { SubscriptionTier } from '../tier-config'

// Mock PrismaClient
const mockPrisma = {
  subscription: {
    findUnique: vi.fn(),
  },
  usageMetric: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
  },
  account: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
} as any

describe('UsageTrackingService', () => {
  let service: UsageTrackingService
  const userId = 'user-123'
  const subscriptionId = 'sub-123'

  beforeEach(() => {
    vi.clearAllMocks()
    service = new UsageTrackingService(mockPrisma)
  })

  describe('trackUsage', () => {
    it('should create new usage metric when none exists', async () => {
      const subscription = {
        id: subscriptionId,
        userId,
        tier: SubscriptionTier.STARTER,
        billingCycle: 'MONTHLY',
        currentPeriodStart: new Date('2024-01-01'),
        currentPeriodEnd: new Date('2024-02-01'),
      }

      mockPrisma.subscription.findUnique.mockResolvedValue(subscription)
      mockPrisma.usageMetric.findUnique.mockResolvedValue(null)
      mockPrisma.usageMetric.create.mockResolvedValue({})

      await service.trackUsage(userId, UsageMetricType.CONNECTED_ACCOUNTS, 1)

      expect(mockPrisma.usageMetric.create).toHaveBeenCalledWith({
        data: {
          subscriptionId,
          userId,
          metricType: UsageMetricType.CONNECTED_ACCOUNTS,
          currentValue: 1,
          limitValue: 3, // Starter tier limit
          periodStart: subscription.currentPeriodStart,
          periodEnd: subscription.currentPeriodEnd,
        }
      })
    })

    it('should update existing usage metric', async () => {
      const subscription = {
        id: subscriptionId,
        userId,
        tier: SubscriptionTier.STARTER,
        billingCycle: 'MONTHLY',
        currentPeriodStart: new Date('2024-01-01'),
        currentPeriodEnd: new Date('2024-02-01'),
      }

      const existingMetric = {
        id: 'metric-123',
        currentValue: 2,
      }

      mockPrisma.subscription.findUnique.mockResolvedValue(subscription)
      mockPrisma.usageMetric.findUnique.mockResolvedValue(existingMetric)
      mockPrisma.usageMetric.update.mockResolvedValue({})

      await service.trackUsage(userId, UsageMetricType.CONNECTED_ACCOUNTS, 1)

      expect(mockPrisma.usageMetric.update).toHaveBeenCalledWith({
        where: { id: existingMetric.id },
        data: {
          currentValue: 3,
          updatedAt: expect.any(Date),
        }
      })
    })

    it('should throw error when subscription not found', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(null)

      await expect(
        service.trackUsage(userId, UsageMetricType.CONNECTED_ACCOUNTS, 1)
      ).rejects.toThrow(SubscriptionNotFoundError)
    })
  })

  describe('checkUsageLimit', () => {
    it('should return true when no usage metric exists', async () => {
      const subscription = {
        id: subscriptionId,
        userId,
        tier: SubscriptionTier.STARTER,
        currentPeriodStart: new Date('2024-01-01'),
      }

      mockPrisma.subscription.findUnique.mockResolvedValue(subscription)
      mockPrisma.usageMetric.findUnique.mockResolvedValue(null)

      const result = await service.checkUsageLimit(userId, UsageMetricType.CONNECTED_ACCOUNTS)

      expect(result).toBe(true)
    })

    it('should return true when usage is within limits', async () => {
      const subscription = {
        id: subscriptionId,
        userId,
        tier: SubscriptionTier.STARTER,
        currentPeriodStart: new Date('2024-01-01'),
      }

      const metric = {
        currentValue: 2,
        limitValue: 3,
      }

      mockPrisma.subscription.findUnique.mockResolvedValue(subscription)
      mockPrisma.usageMetric.findUnique.mockResolvedValue(metric)

      const result = await service.checkUsageLimit(userId, UsageMetricType.CONNECTED_ACCOUNTS)

      expect(result).toBe(true)
    })

    it('should return false when usage exceeds limits', async () => {
      const subscription = {
        id: subscriptionId,
        userId,
        tier: SubscriptionTier.STARTER,
        currentPeriodStart: new Date('2024-01-01'),
      }

      const metric = {
        currentValue: 3,
        limitValue: 3,
      }

      mockPrisma.subscription.findUnique.mockResolvedValue(subscription)
      mockPrisma.usageMetric.findUnique.mockResolvedValue(metric)

      const result = await service.checkUsageLimit(userId, UsageMetricType.CONNECTED_ACCOUNTS)

      expect(result).toBe(false)
    })

    it('should return true for unlimited usage', async () => {
      const subscription = {
        id: subscriptionId,
        userId,
        tier: SubscriptionTier.PRO,
        currentPeriodStart: new Date('2024-01-01'),
      }

      const metric = {
        currentValue: 100,
        limitValue: -1, // Unlimited
      }

      mockPrisma.subscription.findUnique.mockResolvedValue(subscription)
      mockPrisma.usageMetric.findUnique.mockResolvedValue(metric)

      const result = await service.checkUsageLimit(userId, UsageMetricType.CONNECTED_ACCOUNTS)

      expect(result).toBe(true)
    })
  })

  describe('getCurrentUsage', () => {
    it('should return current usage metrics for user', async () => {
      const subscription = {
        id: subscriptionId,
        userId,
        currentPeriodStart: new Date('2024-01-01'),
      }

      const metrics = [
        {
          id: 'metric-1',
          subscriptionId,
          userId,
          metricType: UsageMetricType.CONNECTED_ACCOUNTS,
          currentValue: 2,
          limitValue: 3,
          periodStart: new Date('2024-01-01'),
          periodEnd: new Date('2024-02-01'),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'metric-2',
          subscriptionId,
          userId,
          metricType: UsageMetricType.TOTAL_BALANCE,
          currentValue: 10000,
          limitValue: 15000,
          periodStart: new Date('2024-01-01'),
          periodEnd: new Date('2024-02-01'),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      mockPrisma.subscription.findUnique.mockResolvedValue(subscription)
      mockPrisma.usageMetric.findMany.mockResolvedValue(metrics)

      const result = await service.getCurrentUsage(userId)

      expect(result).toHaveLength(2)
      expect(result[0].metricType).toBe(UsageMetricType.CONNECTED_ACCOUNTS)
      expect(result[1].metricType).toBe(UsageMetricType.TOTAL_BALANCE)
    })

    it('should throw error when subscription not found', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(null)

      await expect(service.getCurrentUsage(userId)).rejects.toThrow(SubscriptionNotFoundError)
    })
  })

  describe('calculateTotalBalance', () => {
    it('should calculate total balance from all accounts', async () => {
      const accounts = [
        { balanceCurrent: { toNumber: () => 1000 } },
        { balanceCurrent: { toNumber: () => 2500 } },
        { balanceCurrent: { toNumber: () => 750 } },
      ]

      mockPrisma.account.findMany.mockResolvedValue(accounts)

      const result = await service.calculateTotalBalance(userId)

      expect(result).toBe(4250)
      expect(mockPrisma.account.findMany).toHaveBeenCalledWith({
        where: { userId },
        select: { balanceCurrent: true }
      })
    })

    it('should handle accounts with null balance', async () => {
      const accounts = [
        { balanceCurrent: { toNumber: () => 1000 } },
        { balanceCurrent: null },
        { balanceCurrent: { toNumber: () => 500 } },
      ]

      mockPrisma.account.findMany.mockResolvedValue(accounts)

      const result = await service.calculateTotalBalance(userId)

      expect(result).toBe(1500)
    })
  })

  describe('calculateConnectedAccounts', () => {
    it('should return count of connected accounts', async () => {
      mockPrisma.account.count.mockResolvedValue(5)

      const result = await service.calculateConnectedAccounts(userId)

      expect(result).toBe(5)
      expect(mockPrisma.account.count).toHaveBeenCalledWith({
        where: { userId }
      })
    })
  })

  describe('enforceUsageLimit', () => {
    it('should allow usage within limits', async () => {
      const subscription = {
        id: subscriptionId,
        userId,
        tier: SubscriptionTier.STARTER,
        currentPeriodStart: new Date('2024-01-01'),
      }

      const metric = {
        currentValue: 2,
        limitValue: 3,
      }

      mockPrisma.subscription.findUnique.mockResolvedValue(subscription)
      mockPrisma.usageMetric.findUnique.mockResolvedValue(metric)

      await expect(
        service.enforceUsageLimit(userId, UsageMetricType.CONNECTED_ACCOUNTS, 1)
      ).resolves.not.toThrow()
    })

    it('should throw error when usage would exceed limits', async () => {
      const subscription = {
        id: subscriptionId,
        userId,
        tier: SubscriptionTier.STARTER,
        currentPeriodStart: new Date('2024-01-01'),
      }

      const metric = {
        currentValue: 3,
        limitValue: 3,
      }

      mockPrisma.subscription.findUnique.mockResolvedValue(subscription)
      mockPrisma.usageMetric.findUnique.mockResolvedValue(metric)

      await expect(
        service.enforceUsageLimit(userId, UsageMetricType.CONNECTED_ACCOUNTS, 1)
      ).rejects.toThrow(TierLimitExceededError)
    })

    it('should allow unlimited usage for PRO tier', async () => {
      const subscription = {
        id: subscriptionId,
        userId,
        tier: SubscriptionTier.PRO,
        currentPeriodStart: new Date('2024-01-01'),
      }

      mockPrisma.subscription.findUnique.mockResolvedValue(subscription)

      await expect(
        service.enforceUsageLimit(userId, UsageMetricType.CONNECTED_ACCOUNTS, 100)
      ).resolves.not.toThrow()
    })
  })

  describe('getUsageLimitStatus', () => {
    it('should return usage status for all metrics', async () => {
      const subscription = {
        id: subscriptionId,
        userId,
        tier: SubscriptionTier.STARTER,
        currentPeriodStart: new Date('2024-01-01'),
      }

      const metrics = [
        {
          id: 'metric-1',
          subscriptionId,
          userId,
          metricType: UsageMetricType.CONNECTED_ACCOUNTS,
          currentValue: 2,
          limitValue: 3,
          periodStart: new Date('2024-01-01'),
          periodEnd: new Date('2024-02-01'),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      const accounts = [
        { balanceCurrent: { toNumber: () => 5000 } },
        { balanceCurrent: { toNumber: () => 3000 } },
      ]

      mockPrisma.subscription.findUnique.mockResolvedValue(subscription)
      mockPrisma.usageMetric.findMany.mockResolvedValue(metrics)
      mockPrisma.account.findMany.mockResolvedValue(accounts)
      mockPrisma.account.count.mockResolvedValue(2)
      mockPrisma.usageMetric.upsert.mockResolvedValue({})

      const result = await service.getUsageLimitStatus(userId)

      expect(result[UsageMetricType.CONNECTED_ACCOUNTS]).toEqual({
        current: 2,
        limit: 3,
        percentage: expect.closeTo(66.67, 1)
      })

      expect(result[UsageMetricType.TOTAL_BALANCE]).toEqual({
        current: 8000,
        limit: 15000,
        percentage: expect.closeTo(53.33, 1)
      })
    })
  })

  describe('aggregateUsageForPeriod', () => {
    it('should return usage metrics for specified period', async () => {
      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-01-31')

      const metrics = [
        {
          id: 'metric-1',
          subscriptionId,
          userId,
          metricType: UsageMetricType.CONNECTED_ACCOUNTS,
          currentValue: 2,
          limitValue: 3,
          periodStart: new Date('2024-01-01'),
          periodEnd: new Date('2024-02-01'),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      mockPrisma.usageMetric.findMany.mockResolvedValue(metrics)

      const result = await service.aggregateUsageForPeriod(userId, startDate, endDate)

      expect(result).toHaveLength(1)
      expect(mockPrisma.usageMetric.findMany).toHaveBeenCalledWith({
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
    })
  })
})