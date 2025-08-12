import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SubscriptionService } from '../subscription-service'
import { 
  SubscriptionTier, 
  SubscriptionStatus, 
  BillingCycle 
} from '../tier-config'
import { 
  UsageMetricType,
  SubscriptionNotFoundError,
  SubscriptionUpdateError
} from '../types'

// Mock PrismaClient
const mockPrisma = {
  subscription: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  usageMetric: {
    create: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
} as any

// Mock UsageTrackingService
vi.mock('../usage-tracking-service', () => ({
  UsageTrackingService: vi.fn().mockImplementation(() => ({
    trackUsage: vi.fn(),
    checkUsageLimit: vi.fn(),
    getCurrentUsage: vi.fn(),
  }))
}))

describe('SubscriptionService', () => {
  let service: SubscriptionService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new SubscriptionService(mockPrisma)
  })

  describe('createSubscription', () => {
    it('should create a new subscription with default values', async () => {
      const data = {
        userId: 'user-1',
        tier: SubscriptionTier.STARTER,
        billingCycle: BillingCycle.MONTHLY
      }

      const mockSubscription = {
        id: 'sub-1',
        userId: 'user-1',
        tier: SubscriptionTier.STARTER,
        status: SubscriptionStatus.ACTIVE,
        billingCycle: BillingCycle.MONTHLY,
        cancelAtPeriodEnd: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
      }

      mockPrisma.subscription.create.mockResolvedValue(mockSubscription)
      mockPrisma.usageMetric.create.mockResolvedValue({})

      const subscription = await service.createSubscription(data)

      expect(subscription).toMatchObject({
        userId: 'user-1',
        tier: SubscriptionTier.STARTER,
        status: SubscriptionStatus.ACTIVE,
        billingCycle: BillingCycle.MONTHLY,
        cancelAtPeriodEnd: false
      })
      expect(subscription.id).toBeDefined()
      expect(subscription.createdAt).toBeInstanceOf(Date)
      expect(subscription.updatedAt).toBeInstanceOf(Date)
      expect(subscription.currentPeriodStart).toBeInstanceOf(Date)
      expect(subscription.currentPeriodEnd).toBeInstanceOf(Date)
    })

    it('should create subscription with Stripe data', async () => {
      const data = {
        userId: 'user-1',
        tier: SubscriptionTier.GROWTH,
        billingCycle: BillingCycle.YEARLY,
        stripeCustomerId: 'cus_123',
        stripeSubscriptionId: 'sub_123'
      }

      const subscription = await service.createSubscription(data)

      expect(subscription.stripeCustomerId).toBe('cus_123')
      expect(subscription.stripeSubscriptionId).toBe('sub_123')
      expect(subscription.tier).toBe(SubscriptionTier.GROWTH)
      expect(subscription.billingCycle).toBe(BillingCycle.YEARLY)
    })

    it('should create subscription with trial end date', async () => {
      const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days from now
      const data = {
        userId: 'user-1',
        tier: SubscriptionTier.PRO,
        billingCycle: BillingCycle.MONTHLY,
        trialEnd
      }

      const subscription = await service.createSubscription(data)

      expect(subscription.trialEnd).toEqual(trialEnd)
    })

    it('should initialize usage metrics for new subscription', async () => {
      const data = {
        userId: 'user-1',
        tier: SubscriptionTier.STARTER,
        billingCycle: BillingCycle.MONTHLY
      }

      await service.createSubscription(data)
      const usage = await service.getCurrentUsage('user-1')

      expect(usage).toHaveLength(5) // 5 metric types
      expect(usage.some(m => m.metricType === UsageMetricType.CONNECTED_ACCOUNTS)).toBe(true)
      expect(usage.some(m => m.metricType === UsageMetricType.TOTAL_BALANCE)).toBe(true)
    })
  })

  describe('getSubscription', () => {
    it('should return subscription for existing user', async () => {
      const data = {
        userId: 'user-1',
        tier: SubscriptionTier.STARTER,
        billingCycle: BillingCycle.MONTHLY
      }

      const created = await service.createSubscription(data)
      const retrieved = await service.getSubscription('user-1')

      expect(retrieved).toEqual(created)
    })

    it('should return null for non-existing user', async () => {
      const subscription = await service.getSubscription('non-existing')
      expect(subscription).toBeNull()
    })
  })

  describe('updateSubscription', () => {
    it('should update subscription successfully', async () => {
      const data = {
        userId: 'user-1',
        tier: SubscriptionTier.STARTER,
        billingCycle: BillingCycle.MONTHLY
      }

      const created = await service.createSubscription(data)
      
      // Add a small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 1))
      
      const updates = {
        tier: SubscriptionTier.GROWTH,
        stripeCustomerId: 'cus_updated'
      }

      const updated = await service.updateSubscription(created.id, updates)

      expect(updated.tier).toBe(SubscriptionTier.GROWTH)
      expect(updated.stripeCustomerId).toBe('cus_updated')
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(created.updatedAt.getTime())
    })

    it('should throw error for non-existing subscription', async () => {
      await expect(
        service.updateSubscription('non-existing', { tier: SubscriptionTier.GROWTH })
      ).rejects.toThrow(SubscriptionUpdateError)
    })

    it('should update usage metrics when tier changes', async () => {
      const data = {
        userId: 'user-1',
        tier: SubscriptionTier.STARTER,
        billingCycle: BillingCycle.MONTHLY
      }

      const created = await service.createSubscription(data)
      
      // Check initial limits for STARTER tier
      const initialUsage = await service.getCurrentUsage('user-1')
      const accountsMetric = initialUsage.find(m => m.metricType === UsageMetricType.CONNECTED_ACCOUNTS)
      expect(accountsMetric?.limitValue).toBe(3)

      // Update to GROWTH tier
      await service.updateSubscription(created.id, { tier: SubscriptionTier.GROWTH })
      
      // Check updated limits for GROWTH tier
      const updatedUsage = await service.getCurrentUsage('user-1')
      const updatedAccountsMetric = updatedUsage.find(m => m.metricType === UsageMetricType.CONNECTED_ACCOUNTS)
      expect(updatedAccountsMetric?.limitValue).toBe(10)
    })
  })

  describe('cancelSubscription', () => {
    it('should cancel subscription at period end', async () => {
      const data = {
        userId: 'user-1',
        tier: SubscriptionTier.GROWTH,
        billingCycle: BillingCycle.MONTHLY
      }

      const created = await service.createSubscription(data)
      const canceled = await service.cancelSubscription(created.id, true)

      expect(canceled.cancelAtPeriodEnd).toBe(true)
      expect(canceled.status).toBe(SubscriptionStatus.ACTIVE) // Still active until period end
      expect(canceled.tier).toBe(SubscriptionTier.GROWTH) // Tier unchanged
    })

    it('should cancel subscription immediately', async () => {
      const data = {
        userId: 'user-1',
        tier: SubscriptionTier.GROWTH,
        billingCycle: BillingCycle.MONTHLY
      }

      const created = await service.createSubscription(data)
      const canceled = await service.cancelSubscription(created.id, false)

      expect(canceled.cancelAtPeriodEnd).toBe(false)
      expect(canceled.status).toBe(SubscriptionStatus.CANCELED)
      expect(canceled.tier).toBe(SubscriptionTier.STARTER) // Downgraded to free tier
    })

    it('should throw error for non-existing subscription', async () => {
      await expect(
        service.cancelSubscription('non-existing', true)
      ).rejects.toThrow(SubscriptionUpdateError)
    })
  })

  describe('trackUsage', () => {
    it('should track usage for existing metric', async () => {
      const data = {
        userId: 'user-1',
        tier: SubscriptionTier.STARTER,
        billingCycle: BillingCycle.MONTHLY
      }

      await service.createSubscription(data)
      await service.trackUsage('user-1', UsageMetricType.CONNECTED_ACCOUNTS, 2)

      const usage = await service.getCurrentUsage('user-1')
      const accountsMetric = usage.find(m => m.metricType === UsageMetricType.CONNECTED_ACCOUNTS)
      
      expect(accountsMetric?.currentValue).toBe(2)
    })

    it('should increment usage multiple times', async () => {
      const data = {
        userId: 'user-1',
        tier: SubscriptionTier.STARTER,
        billingCycle: BillingCycle.MONTHLY
      }

      await service.createSubscription(data)
      await service.trackUsage('user-1', UsageMetricType.CONNECTED_ACCOUNTS, 1)
      await service.trackUsage('user-1', UsageMetricType.CONNECTED_ACCOUNTS, 1)

      const usage = await service.getCurrentUsage('user-1')
      const accountsMetric = usage.find(m => m.metricType === UsageMetricType.CONNECTED_ACCOUNTS)
      
      expect(accountsMetric?.currentValue).toBe(2)
    })

    it('should throw error for non-existing user', async () => {
      await expect(
        service.trackUsage('non-existing', UsageMetricType.CONNECTED_ACCOUNTS, 1)
      ).rejects.toThrow(SubscriptionNotFoundError)
    })
  })

  describe('checkUsageLimit', () => {
    it('should return true when within limits', async () => {
      const data = {
        userId: 'user-1',
        tier: SubscriptionTier.STARTER,
        billingCycle: BillingCycle.MONTHLY
      }

      await service.createSubscription(data)
      await service.trackUsage('user-1', UsageMetricType.CONNECTED_ACCOUNTS, 2)

      const withinLimit = await service.checkUsageLimit('user-1', UsageMetricType.CONNECTED_ACCOUNTS)
      expect(withinLimit).toBe(true)
    })

    it('should return false when at limit', async () => {
      const data = {
        userId: 'user-1',
        tier: SubscriptionTier.STARTER,
        billingCycle: BillingCycle.MONTHLY
      }

      await service.createSubscription(data)
      await service.trackUsage('user-1', UsageMetricType.CONNECTED_ACCOUNTS, 3)

      const withinLimit = await service.checkUsageLimit('user-1', UsageMetricType.CONNECTED_ACCOUNTS)
      expect(withinLimit).toBe(false)
    })

    it('should return true for unlimited metrics', async () => {
      const data = {
        userId: 'user-1',
        tier: SubscriptionTier.PRO,
        billingCycle: BillingCycle.MONTHLY
      }

      await service.createSubscription(data)
      await service.trackUsage('user-1', UsageMetricType.CONNECTED_ACCOUNTS, 100)

      const withinLimit = await service.checkUsageLimit('user-1', UsageMetricType.CONNECTED_ACCOUNTS)
      expect(withinLimit).toBe(true)
    })

    it('should throw error for non-existing user', async () => {
      await expect(
        service.checkUsageLimit('non-existing', UsageMetricType.CONNECTED_ACCOUNTS)
      ).rejects.toThrow(SubscriptionNotFoundError)
    })
  })

  describe('getCurrentUsage', () => {
    it('should return current usage metrics', async () => {
      const data = {
        userId: 'user-1',
        tier: SubscriptionTier.STARTER,
        billingCycle: BillingCycle.MONTHLY
      }

      await service.createSubscription(data)
      await service.trackUsage('user-1', UsageMetricType.CONNECTED_ACCOUNTS, 2)

      const usage = await service.getCurrentUsage('user-1')
      
      expect(usage).toHaveLength(5)
      const accountsMetric = usage.find(m => m.metricType === UsageMetricType.CONNECTED_ACCOUNTS)
      expect(accountsMetric?.currentValue).toBe(2)
      expect(accountsMetric?.limitValue).toBe(3)
    })

    it('should throw error for non-existing user', async () => {
      await expect(
        service.getCurrentUsage('non-existing')
      ).rejects.toThrow(SubscriptionNotFoundError)
    })
  })

  describe('getUserTier', () => {
    it('should return user tier for existing subscription', async () => {
      const data = {
        userId: 'user-1',
        tier: SubscriptionTier.GROWTH,
        billingCycle: BillingCycle.MONTHLY
      }

      await service.createSubscription(data)
      const tier = await service.getUserTier('user-1')

      expect(tier).toBe(SubscriptionTier.GROWTH)
    })

    it('should return STARTER tier for non-existing subscription', async () => {
      const tier = await service.getUserTier('non-existing')
      expect(tier).toBe(SubscriptionTier.STARTER)
    })
  })

  describe('canPerformAction', () => {
    it('should return true for available feature', async () => {
      const data = {
        userId: 'user-1',
        tier: SubscriptionTier.GROWTH,
        billingCycle: BillingCycle.MONTHLY
      }

      await service.createSubscription(data)
      const canPerform = await service.canPerformAction('user-1', 'csv_export')

      expect(canPerform).toBe(true)
    })

    it('should return false for unavailable feature', async () => {
      const data = {
        userId: 'user-1',
        tier: SubscriptionTier.STARTER,
        billingCycle: BillingCycle.MONTHLY
      }

      await service.createSubscription(data)
      const canPerform = await service.canPerformAction('user-1', 'csv_export')

      expect(canPerform).toBe(false)
    })

    it('should return false for inactive subscription', async () => {
      const data = {
        userId: 'user-1',
        tier: SubscriptionTier.GROWTH,
        billingCycle: BillingCycle.MONTHLY
      }

      const created = await service.createSubscription(data)
      await service.updateSubscription(created.id, { status: SubscriptionStatus.CANCELED })
      
      const canPerform = await service.canPerformAction('user-1', 'csv_export')

      expect(canPerform).toBe(false)
    })

    it('should return false for non-existing user', async () => {
      const canPerform = await service.canPerformAction('non-existing', 'csv_export')
      expect(canPerform).toBe(false)
    })
  })
})