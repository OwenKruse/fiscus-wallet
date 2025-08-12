import { describe, it, expect, beforeEach, vi, Mock } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { TierEnforcementService } from '../tier-enforcement-service'
import { SubscriptionService } from '../subscription-service'
import { 
  SubscriptionTier, 
  getTierLimits 
} from '../tier-config'
import { 
  TierLimitExceededError, 
  FeatureNotAvailableError,
  UsageMetricType 
} from '../types'

// Mock PrismaClient
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    subscription: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    usageMetric: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  })),
}))

// Mock SubscriptionService
vi.mock('../subscription-service', () => ({
  SubscriptionService: vi.fn().mockImplementation(() => ({
    getUserTier: vi.fn(),
    getCurrentUsage: vi.fn(),
  })),
}))

describe('TierEnforcementService', () => {
  let tierEnforcementService: TierEnforcementService
  let mockPrisma: any
  let mockSubscriptionService: any

  beforeEach(() => {
    vi.clearAllMocks()
    
    mockPrisma = new PrismaClient()
    mockSubscriptionService = new SubscriptionService(mockPrisma)
    tierEnforcementService = new TierEnforcementService(mockPrisma, mockSubscriptionService)
  })

  describe('enforceAccountLimit', () => {
    it('should return true for unlimited accounts (PRO tier)', async () => {
      mockSubscriptionService.getUserTier.mockResolvedValue(SubscriptionTier.PRO)
      
      const result = await tierEnforcementService.enforceAccountLimit('user-1')
      
      expect(result).toBe(true)
      expect(mockSubscriptionService.getUserTier).toHaveBeenCalledWith('user-1')
    })

    it('should return true when under account limit (STARTER tier)', async () => {
      mockSubscriptionService.getUserTier.mockResolvedValue(SubscriptionTier.STARTER)
      mockSubscriptionService.getCurrentUsage.mockResolvedValue([
        {
          metricType: UsageMetricType.CONNECTED_ACCOUNTS,
          currentValue: 2,
          limitValue: 3
        }
      ])
      
      const result = await tierEnforcementService.enforceAccountLimit('user-1')
      
      expect(result).toBe(true)
    })

    it('should return false when at account limit (STARTER tier)', async () => {
      mockSubscriptionService.getUserTier.mockResolvedValue(SubscriptionTier.STARTER)
      mockSubscriptionService.getCurrentUsage.mockResolvedValue([
        {
          metricType: UsageMetricType.CONNECTED_ACCOUNTS,
          currentValue: 3,
          limitValue: 3
        }
      ])
      
      const result = await tierEnforcementService.enforceAccountLimit('user-1')
      
      expect(result).toBe(false)
    })

    it('should return true when no usage metric exists', async () => {
      mockSubscriptionService.getUserTier.mockResolvedValue(SubscriptionTier.STARTER)
      mockSubscriptionService.getCurrentUsage.mockResolvedValue([])
      
      const result = await tierEnforcementService.enforceAccountLimit('user-1')
      
      expect(result).toBe(true)
    })
  })

  describe('enforceBalanceLimit', () => {
    it('should return true for unlimited balance (PRO tier)', async () => {
      mockSubscriptionService.getUserTier.mockResolvedValue(SubscriptionTier.PRO)
      
      const result = await tierEnforcementService.enforceBalanceLimit('user-1', 50000)
      
      expect(result).toBe(true)
    })

    it('should return true when under balance limit (STARTER tier)', async () => {
      mockSubscriptionService.getUserTier.mockResolvedValue(SubscriptionTier.STARTER)
      
      const result = await tierEnforcementService.enforceBalanceLimit('user-1', 10000)
      
      expect(result).toBe(true)
    })

    it('should return false when over balance limit (STARTER tier)', async () => {
      mockSubscriptionService.getUserTier.mockResolvedValue(SubscriptionTier.STARTER)
      
      const result = await tierEnforcementService.enforceBalanceLimit('user-1', 20000)
      
      expect(result).toBe(false)
    })

    it('should return true when exactly at balance limit (STARTER tier)', async () => {
      mockSubscriptionService.getUserTier.mockResolvedValue(SubscriptionTier.STARTER)
      
      const result = await tierEnforcementService.enforceBalanceLimit('user-1', 15000)
      
      expect(result).toBe(true)
    })
  })

  describe('enforceFeatureAccess', () => {
    it('should return true for basic features on STARTER tier', async () => {
      mockSubscriptionService.getUserTier.mockResolvedValue(SubscriptionTier.STARTER)
      
      const result = await tierEnforcementService.enforceFeatureAccess('user-1', 'basic_budgeting')
      
      expect(result).toBe(true)
    })

    it('should return false for premium features on STARTER tier', async () => {
      mockSubscriptionService.getUserTier.mockResolvedValue(SubscriptionTier.STARTER)
      
      const result = await tierEnforcementService.enforceFeatureAccess('user-1', 'csv_export')
      
      expect(result).toBe(false)
    })

    it('should return true for premium features on GROWTH tier', async () => {
      mockSubscriptionService.getUserTier.mockResolvedValue(SubscriptionTier.GROWTH)
      
      const result = await tierEnforcementService.enforceFeatureAccess('user-1', 'csv_export')
      
      expect(result).toBe(true)
    })

    it('should return true for pro features on PRO tier', async () => {
      mockSubscriptionService.getUserTier.mockResolvedValue(SubscriptionTier.PRO)
      
      const result = await tierEnforcementService.enforceFeatureAccess('user-1', 'ai_insights')
      
      expect(result).toBe(true)
    })
  })

  describe('enforceSyncFrequency', () => {
    it('should return daily for STARTER tier', async () => {
      mockSubscriptionService.getUserTier.mockResolvedValue(SubscriptionTier.STARTER)
      
      const result = await tierEnforcementService.enforceSyncFrequency('user-1')
      
      expect(result).toBe('daily')
    })

    it('should return realtime for GROWTH tier', async () => {
      mockSubscriptionService.getUserTier.mockResolvedValue(SubscriptionTier.GROWTH)
      
      const result = await tierEnforcementService.enforceSyncFrequency('user-1')
      
      expect(result).toBe('realtime')
    })

    it('should return priority for PRO tier', async () => {
      mockSubscriptionService.getUserTier.mockResolvedValue(SubscriptionTier.PRO)
      
      const result = await tierEnforcementService.enforceSyncFrequency('user-1')
      
      expect(result).toBe('priority')
    })
  })

  describe('enforceTransactionHistory', () => {
    it('should return 12 months for STARTER tier', async () => {
      mockSubscriptionService.getUserTier.mockResolvedValue(SubscriptionTier.STARTER)
      
      const result = await tierEnforcementService.enforceTransactionHistory('user-1')
      
      expect(result).toBe(12)
    })

    it('should return -1 (unlimited) for GROWTH tier', async () => {
      mockSubscriptionService.getUserTier.mockResolvedValue(SubscriptionTier.GROWTH)
      
      const result = await tierEnforcementService.enforceTransactionHistory('user-1')
      
      expect(result).toBe(-1)
    })

    it('should return -1 (unlimited) for PRO tier', async () => {
      mockSubscriptionService.getUserTier.mockResolvedValue(SubscriptionTier.PRO)
      
      const result = await tierEnforcementService.enforceTransactionHistory('user-1')
      
      expect(result).toBe(-1)
    })
  })

  describe('checkAccountLimitWithThrow', () => {
    it('should not throw when under account limit', async () => {
      mockSubscriptionService.getUserTier.mockResolvedValue(SubscriptionTier.STARTER)
      mockSubscriptionService.getCurrentUsage.mockResolvedValue([
        {
          metricType: UsageMetricType.CONNECTED_ACCOUNTS,
          currentValue: 2,
          limitValue: 3
        }
      ])
      
      await expect(tierEnforcementService.checkAccountLimitWithThrow('user-1')).resolves.not.toThrow()
    })

    it('should throw TierLimitExceededError when at account limit', async () => {
      mockSubscriptionService.getUserTier.mockResolvedValue(SubscriptionTier.STARTER)
      mockSubscriptionService.getCurrentUsage.mockResolvedValue([
        {
          metricType: UsageMetricType.CONNECTED_ACCOUNTS,
          currentValue: 3,
          limitValue: 3
        }
      ])
      
      await expect(tierEnforcementService.checkAccountLimitWithThrow('user-1'))
        .rejects.toThrow(TierLimitExceededError)
    })

    it('should throw with correct error details', async () => {
      mockSubscriptionService.getUserTier.mockResolvedValue(SubscriptionTier.STARTER)
      mockSubscriptionService.getCurrentUsage.mockResolvedValue([
        {
          metricType: UsageMetricType.CONNECTED_ACCOUNTS,
          currentValue: 3,
          limitValue: 3
        }
      ])
      
      try {
        await tierEnforcementService.checkAccountLimitWithThrow('user-1')
      } catch (error) {
        expect(error).toBeInstanceOf(TierLimitExceededError)
        expect((error as TierLimitExceededError).limitType).toBe('Connected accounts')
        expect((error as TierLimitExceededError).currentValue).toBe(3)
        expect((error as TierLimitExceededError).limitValue).toBe(3)
        expect((error as TierLimitExceededError).requiredTier).toBe(SubscriptionTier.GROWTH)
      }
    })
  })

  describe('checkBalanceLimitWithThrow', () => {
    it('should not throw when under balance limit', async () => {
      mockSubscriptionService.getUserTier.mockResolvedValue(SubscriptionTier.STARTER)
      
      await expect(tierEnforcementService.checkBalanceLimitWithThrow('user-1', 10000))
        .resolves.not.toThrow()
    })

    it('should throw TierLimitExceededError when over balance limit', async () => {
      mockSubscriptionService.getUserTier.mockResolvedValue(SubscriptionTier.STARTER)
      
      await expect(tierEnforcementService.checkBalanceLimitWithThrow('user-1', 20000))
        .rejects.toThrow(TierLimitExceededError)
    })

    it('should throw with correct error details for balance limit', async () => {
      mockSubscriptionService.getUserTier.mockResolvedValue(SubscriptionTier.STARTER)
      
      try {
        await tierEnforcementService.checkBalanceLimitWithThrow('user-1', 20000)
      } catch (error) {
        expect(error).toBeInstanceOf(TierLimitExceededError)
        expect((error as TierLimitExceededError).limitType).toBe('Total balance tracking')
        expect((error as TierLimitExceededError).currentValue).toBe(20000)
        expect((error as TierLimitExceededError).limitValue).toBe(15000)
        expect((error as TierLimitExceededError).requiredTier).toBe(SubscriptionTier.GROWTH)
      }
    })
  })

  describe('checkFeatureAccessWithThrow', () => {
    it('should not throw for available features', async () => {
      mockSubscriptionService.getUserTier.mockResolvedValue(SubscriptionTier.GROWTH)
      
      await expect(tierEnforcementService.checkFeatureAccessWithThrow('user-1', 'csv_export'))
        .resolves.not.toThrow()
    })

    it('should throw FeatureNotAvailableError for unavailable features', async () => {
      mockSubscriptionService.getUserTier.mockResolvedValue(SubscriptionTier.STARTER)
      
      await expect(tierEnforcementService.checkFeatureAccessWithThrow('user-1', 'csv_export'))
        .rejects.toThrow(FeatureNotAvailableError)
    })

    it('should throw with correct error details for feature access', async () => {
      mockSubscriptionService.getUserTier.mockResolvedValue(SubscriptionTier.STARTER)
      
      try {
        await tierEnforcementService.checkFeatureAccessWithThrow('user-1', 'csv_export')
      } catch (error) {
        expect(error).toBeInstanceOf(FeatureNotAvailableError)
        expect((error as FeatureNotAvailableError).feature).toBe('csv_export')
        expect((error as FeatureNotAvailableError).requiredTier).toBe(SubscriptionTier.GROWTH)
      }
    })
  })

  describe('getUserTierLimits', () => {
    it('should return correct limits for STARTER tier', async () => {
      mockSubscriptionService.getUserTier.mockResolvedValue(SubscriptionTier.STARTER)
      
      const result = await tierEnforcementService.getUserTierLimits('user-1')
      
      expect(result).toEqual(getTierLimits(SubscriptionTier.STARTER))
      expect(result.accounts).toBe(3)
      expect(result.balanceLimit).toBe(15000)
    })

    it('should return correct limits for GROWTH tier', async () => {
      mockSubscriptionService.getUserTier.mockResolvedValue(SubscriptionTier.GROWTH)
      
      const result = await tierEnforcementService.getUserTierLimits('user-1')
      
      expect(result).toEqual(getTierLimits(SubscriptionTier.GROWTH))
      expect(result.accounts).toBe(10)
      expect(result.balanceLimit).toBe(100000)
    })

    it('should return correct limits for PRO tier', async () => {
      mockSubscriptionService.getUserTier.mockResolvedValue(SubscriptionTier.PRO)
      
      const result = await tierEnforcementService.getUserTierLimits('user-1')
      
      expect(result).toEqual(getTierLimits(SubscriptionTier.PRO))
      expect(result.accounts).toBe('unlimited')
      expect(result.balanceLimit).toBe('unlimited')
    })
  })

  describe('canAddAccount', () => {
    it('should return true when user can add account', async () => {
      mockSubscriptionService.getUserTier.mockResolvedValue(SubscriptionTier.STARTER)
      mockSubscriptionService.getCurrentUsage.mockResolvedValue([
        {
          metricType: UsageMetricType.CONNECTED_ACCOUNTS,
          currentValue: 1,
          limitValue: 3
        }
      ])
      
      const result = await tierEnforcementService.canAddAccount('user-1')
      
      expect(result).toBe(true)
    })

    it('should return false when user cannot add account', async () => {
      mockSubscriptionService.getUserTier.mockResolvedValue(SubscriptionTier.STARTER)
      mockSubscriptionService.getCurrentUsage.mockResolvedValue([
        {
          metricType: UsageMetricType.CONNECTED_ACCOUNTS,
          currentValue: 3,
          limitValue: 3
        }
      ])
      
      const result = await tierEnforcementService.canAddAccount('user-1')
      
      expect(result).toBe(false)
    })
  })

  describe('canTrackBalance', () => {
    it('should return true when additional balance is within limit', async () => {
      mockSubscriptionService.getUserTier.mockResolvedValue(SubscriptionTier.STARTER)
      mockSubscriptionService.getCurrentUsage.mockResolvedValue([
        {
          metricType: UsageMetricType.TOTAL_BALANCE,
          currentValue: 10000,
          limitValue: 15000
        }
      ])
      
      const result = await tierEnforcementService.canTrackBalance('user-1', 3000)
      
      expect(result).toBe(true)
    })

    it('should return false when additional balance exceeds limit', async () => {
      mockSubscriptionService.getUserTier.mockResolvedValue(SubscriptionTier.STARTER)
      mockSubscriptionService.getCurrentUsage.mockResolvedValue([
        {
          metricType: UsageMetricType.TOTAL_BALANCE,
          currentValue: 12000,
          limitValue: 15000
        }
      ])
      
      const result = await tierEnforcementService.canTrackBalance('user-1', 5000)
      
      expect(result).toBe(false)
    })

    it('should handle case when no balance usage metric exists', async () => {
      mockSubscriptionService.getUserTier.mockResolvedValue(SubscriptionTier.STARTER)
      mockSubscriptionService.getCurrentUsage.mockResolvedValue([])
      
      const result = await tierEnforcementService.canTrackBalance('user-1', 10000)
      
      expect(result).toBe(true)
    })

    it('should return true for unlimited balance tiers', async () => {
      mockSubscriptionService.getUserTier.mockResolvedValue(SubscriptionTier.PRO)
      mockSubscriptionService.getCurrentUsage.mockResolvedValue([])
      
      const result = await tierEnforcementService.canTrackBalance('user-1', 100000)
      
      expect(result).toBe(true)
    })
  })

  describe('getUpgradeSuggestions', () => {
    it('should suggest upgrade when approaching account limit', async () => {
      mockSubscriptionService.getUserTier.mockResolvedValue(SubscriptionTier.STARTER)
      mockSubscriptionService.getCurrentUsage.mockResolvedValue([
        {
          metricType: UsageMetricType.CONNECTED_ACCOUNTS,
          currentValue: 3,
          limitValue: 3
        }
      ])
      
      const result = await tierEnforcementService.getUpgradeSuggestions('user-1')
      
      expect(result.shouldUpgrade).toBe(true)
      expect(result.suggestedTier).toBe(SubscriptionTier.GROWTH)
      expect(result.reasons).toContain('You\'re using 3/3 accounts (100%)')
    })

    it('should suggest upgrade when approaching balance limit', async () => {
      mockSubscriptionService.getUserTier.mockResolvedValue(SubscriptionTier.STARTER)
      mockSubscriptionService.getCurrentUsage.mockResolvedValue([
        {
          metricType: UsageMetricType.TOTAL_BALANCE,
          currentValue: 14000,
          limitValue: 15000
        }
      ])
      
      const result = await tierEnforcementService.getUpgradeSuggestions('user-1')
      
      expect(result.shouldUpgrade).toBe(true)
      expect(result.suggestedTier).toBe(SubscriptionTier.GROWTH)
      expect(result.reasons).toContain('Your tracked balance is 93% of your limit')
    })

    it('should not suggest upgrade when usage is low', async () => {
      mockSubscriptionService.getUserTier.mockResolvedValue(SubscriptionTier.STARTER)
      mockSubscriptionService.getCurrentUsage.mockResolvedValue([
        {
          metricType: UsageMetricType.CONNECTED_ACCOUNTS,
          currentValue: 1,
          limitValue: 3
        }
      ])
      
      const result = await tierEnforcementService.getUpgradeSuggestions('user-1')
      
      expect(result.shouldUpgrade).toBe(false)
      expect(result.suggestedTier).toBe(null)
      expect(result.reasons).toHaveLength(0)
    })

    it('should suggest PRO tier for GROWTH users', async () => {
      mockSubscriptionService.getUserTier.mockResolvedValue(SubscriptionTier.GROWTH)
      mockSubscriptionService.getCurrentUsage.mockResolvedValue([
        {
          metricType: UsageMetricType.CONNECTED_ACCOUNTS,
          currentValue: 9,
          limitValue: 10
        }
      ])
      
      const result = await tierEnforcementService.getUpgradeSuggestions('user-1')
      
      expect(result.shouldUpgrade).toBe(true)
      expect(result.suggestedTier).toBe(SubscriptionTier.PRO)
    })
  })

  describe('getUsageSummary', () => {
    it('should return complete usage summary for STARTER tier', async () => {
      mockSubscriptionService.getUserTier.mockResolvedValue(SubscriptionTier.STARTER)
      mockSubscriptionService.getCurrentUsage.mockResolvedValue([
        {
          metricType: UsageMetricType.CONNECTED_ACCOUNTS,
          currentValue: 2,
          limitValue: 3
        },
        {
          metricType: UsageMetricType.TOTAL_BALANCE,
          currentValue: 10000,
          limitValue: 15000
        }
      ])
      
      const result = await tierEnforcementService.getUsageSummary('user-1')
      
      expect(result.tier).toBe(SubscriptionTier.STARTER)
      expect(result.usage.accounts.current).toBe(2)
      expect(result.usage.accounts.limit).toBe(3)
      expect(result.usage.accounts.percentage).toBe(67)
      expect(result.usage.balance.current).toBe(10000)
      expect(result.usage.balance.limit).toBe(15000)
      expect(result.usage.balance.percentage).toBe(67)
    })

    it('should handle unlimited limits for PRO tier', async () => {
      mockSubscriptionService.getUserTier.mockResolvedValue(SubscriptionTier.PRO)
      mockSubscriptionService.getCurrentUsage.mockResolvedValue([
        {
          metricType: UsageMetricType.CONNECTED_ACCOUNTS,
          currentValue: 15,
          limitValue: -1
        }
      ])
      
      const result = await tierEnforcementService.getUsageSummary('user-1')
      
      expect(result.tier).toBe(SubscriptionTier.PRO)
      expect(result.usage.accounts.current).toBe(15)
      expect(result.usage.accounts.limit).toBe('unlimited')
      expect(result.usage.accounts.percentage).toBe(0)
    })

    it('should handle missing usage metrics', async () => {
      mockSubscriptionService.getUserTier.mockResolvedValue(SubscriptionTier.STARTER)
      mockSubscriptionService.getCurrentUsage.mockResolvedValue([])
      
      const result = await tierEnforcementService.getUsageSummary('user-1')
      
      expect(result.usage.accounts.current).toBe(0)
      expect(result.usage.balance.current).toBe(0)
    })
  })

  describe('isApproachingLimits', () => {
    it('should detect when approaching account limit', async () => {
      mockSubscriptionService.getUserTier.mockResolvedValue(SubscriptionTier.STARTER)
      mockSubscriptionService.getCurrentUsage.mockResolvedValue([
        {
          metricType: UsageMetricType.CONNECTED_ACCOUNTS,
          currentValue: 3,
          limitValue: 3
        }
      ])
      
      const result = await tierEnforcementService.isApproachingLimits('user-1')
      
      expect(result.approaching).toBe(true)
      expect(result.warnings).toContain('Account limit: 3/3 (100%)')
    })

    it('should detect when approaching balance limit', async () => {
      mockSubscriptionService.getUserTier.mockResolvedValue(SubscriptionTier.STARTER)
      mockSubscriptionService.getCurrentUsage.mockResolvedValue([
        {
          metricType: UsageMetricType.TOTAL_BALANCE,
          currentValue: 12000,
          limitValue: 15000
        }
      ])
      
      const result = await tierEnforcementService.isApproachingLimits('user-1')
      
      expect(result.approaching).toBe(true)
      expect(result.warnings).toContain('Balance limit: $12,000/$15,000 (80%)')
    })

    it('should not warn when usage is low', async () => {
      mockSubscriptionService.getUserTier.mockResolvedValue(SubscriptionTier.STARTER)
      mockSubscriptionService.getCurrentUsage.mockResolvedValue([
        {
          metricType: UsageMetricType.CONNECTED_ACCOUNTS,
          currentValue: 1,
          limitValue: 3
        }
      ])
      
      const result = await tierEnforcementService.isApproachingLimits('user-1')
      
      expect(result.approaching).toBe(false)
      expect(result.warnings).toHaveLength(0)
    })

    it('should not warn for unlimited tiers', async () => {
      mockSubscriptionService.getUserTier.mockResolvedValue(SubscriptionTier.PRO)
      mockSubscriptionService.getCurrentUsage.mockResolvedValue([
        {
          metricType: UsageMetricType.CONNECTED_ACCOUNTS,
          currentValue: 100,
          limitValue: -1
        }
      ])
      
      const result = await tierEnforcementService.isApproachingLimits('user-1')
      
      expect(result.approaching).toBe(false)
      expect(result.warnings).toHaveLength(0)
    })
  })

  describe('getAvailableFeatures', () => {
    it('should return STARTER features for STARTER tier', async () => {
      mockSubscriptionService.getUserTier.mockResolvedValue(SubscriptionTier.STARTER)
      
      const result = await tierEnforcementService.getAvailableFeatures('user-1')
      
      expect(result).toEqual(['basic_budgeting', 'goal_tracking', 'mobile_web_access'])
    })

    it('should return GROWTH features for GROWTH tier', async () => {
      mockSubscriptionService.getUserTier.mockResolvedValue(SubscriptionTier.GROWTH)
      
      const result = await tierEnforcementService.getAvailableFeatures('user-1')
      
      expect(result).toContain('csv_export')
      expect(result).toContain('spending_insights')
    })

    it('should return PRO features for PRO tier', async () => {
      mockSubscriptionService.getUserTier.mockResolvedValue(SubscriptionTier.PRO)
      
      const result = await tierEnforcementService.getAvailableFeatures('user-1')
      
      expect(result).toContain('ai_insights')
      expect(result).toContain('investment_tracking')
    })
  })

  describe('canPerformActions', () => {
    it('should check multiple actions at once', async () => {
      mockSubscriptionService.getUserTier.mockResolvedValue(SubscriptionTier.GROWTH)
      
      const result = await tierEnforcementService.canPerformActions('user-1', [
        'basic_budgeting',
        'csv_export',
        'ai_insights'
      ])
      
      expect(result['basic_budgeting']).toBe(true)
      expect(result['csv_export']).toBe(true)
      expect(result['ai_insights']).toBe(false)
    })

    it('should handle empty actions array', async () => {
      mockSubscriptionService.getUserTier.mockResolvedValue(SubscriptionTier.STARTER)
      
      const result = await tierEnforcementService.canPerformActions('user-1', [])
      
      expect(result).toEqual({})
    })
  })

  describe('getRequiredTierForFeature (private method behavior)', () => {
    it('should suggest GROWTH tier for STARTER user trying to access GROWTH features', async () => {
      mockSubscriptionService.getUserTier.mockResolvedValue(SubscriptionTier.STARTER)
      
      try {
        await tierEnforcementService.checkFeatureAccessWithThrow('user-1', 'csv_export')
      } catch (error) {
        expect((error as FeatureNotAvailableError).requiredTier).toBe(SubscriptionTier.GROWTH)
      }
    })

    it('should suggest PRO tier for GROWTH user trying to access PRO features', async () => {
      mockSubscriptionService.getUserTier.mockResolvedValue(SubscriptionTier.GROWTH)
      
      try {
        await tierEnforcementService.checkFeatureAccessWithThrow('user-1', 'ai_insights')
      } catch (error) {
        expect((error as FeatureNotAvailableError).requiredTier).toBe(SubscriptionTier.PRO)
      }
    })
  })
})