import { describe, it, expect } from 'vitest'
import {
  SubscriptionTier,
  BillingCycle,
  TIER_CONFIGS,
  TIER_PRICING,
  getTierLimits,
  getTierPricing,
  isFeatureAvailable,
  canAccessFeature,
  getNextTier,
  getPreviousTier
} from '../tier-config'

describe('Tier Configuration', () => {
  describe('TIER_CONFIGS', () => {
    it('should have correct configuration for STARTER tier', () => {
      const config = TIER_CONFIGS[SubscriptionTier.STARTER]
      
      expect(config.accounts).toBe(3)
      expect(config.balanceLimit).toBe(15000)
      expect(config.transactionHistoryMonths).toBe(12)
      expect(config.syncFrequency).toBe('daily')
      expect(config.features).toContain('basic_budgeting')
      expect(config.features).toContain('goal_tracking')
      expect(config.features).toContain('mobile_web_access')
      expect(config.support).toBe('none')
    })

    it('should have correct configuration for GROWTH tier', () => {
      const config = TIER_CONFIGS[SubscriptionTier.GROWTH]
      
      expect(config.accounts).toBe(10)
      expect(config.balanceLimit).toBe(100000)
      expect(config.transactionHistoryMonths).toBe('unlimited')
      expect(config.syncFrequency).toBe('realtime')
      expect(config.features).toContain('basic_budgeting')
      expect(config.features).toContain('goal_tracking')
      expect(config.features).toContain('mobile_web_access')
      expect(config.features).toContain('csv_export')
      expect(config.features).toContain('spending_insights')
      expect(config.features).toContain('trends_analysis')
      expect(config.support).toBe('email')
    })

    it('should have correct configuration for PRO tier', () => {
      const config = TIER_CONFIGS[SubscriptionTier.PRO]
      
      expect(config.accounts).toBe('unlimited')
      expect(config.balanceLimit).toBe('unlimited')
      expect(config.transactionHistoryMonths).toBe('unlimited')
      expect(config.syncFrequency).toBe('priority')
      expect(config.features).toContain('basic_budgeting')
      expect(config.features).toContain('goal_tracking')
      expect(config.features).toContain('mobile_web_access')
      expect(config.features).toContain('csv_export')
      expect(config.features).toContain('spending_insights')
      expect(config.features).toContain('trends_analysis')
      expect(config.features).toContain('investment_tracking')
      expect(config.features).toContain('tax_reports')
      expect(config.features).toContain('ai_insights')
      expect(config.features).toContain('multi_currency')
      expect(config.support).toBe('priority_chat')
    })
  })

  describe('TIER_PRICING', () => {
    it('should have correct pricing for all tiers', () => {
      expect(TIER_PRICING[SubscriptionTier.STARTER].monthly).toBe(0)
      expect(TIER_PRICING[SubscriptionTier.STARTER].yearly).toBe(0)
      
      expect(TIER_PRICING[SubscriptionTier.GROWTH].monthly).toBe(5)
      expect(TIER_PRICING[SubscriptionTier.GROWTH].yearly).toBe(50)
      
      expect(TIER_PRICING[SubscriptionTier.PRO].monthly).toBe(15)
      expect(TIER_PRICING[SubscriptionTier.PRO].yearly).toBe(150)
    })

    it('should show 2-month savings for yearly billing', () => {
      // Growth tier: $5/month * 12 = $60, yearly = $50 (2 months free)
      const growthMonthlyCost = TIER_PRICING[SubscriptionTier.GROWTH].monthly * 12
      const growthYearlyCost = TIER_PRICING[SubscriptionTier.GROWTH].yearly
      expect(growthMonthlyCost - growthYearlyCost).toBe(10) // 2 months savings
      
      // Pro tier: $15/month * 12 = $180, yearly = $150 (2 months free)
      const proMonthlyCost = TIER_PRICING[SubscriptionTier.PRO].monthly * 12
      const proYearlyCost = TIER_PRICING[SubscriptionTier.PRO].yearly
      expect(proMonthlyCost - proYearlyCost).toBe(30) // 2 months savings
    })
  })

  describe('getTierLimits', () => {
    it('should return correct limits for each tier', () => {
      const starterLimits = getTierLimits(SubscriptionTier.STARTER)
      expect(starterLimits.accounts).toBe(3)
      
      const growthLimits = getTierLimits(SubscriptionTier.GROWTH)
      expect(growthLimits.accounts).toBe(10)
      
      const proLimits = getTierLimits(SubscriptionTier.PRO)
      expect(proLimits.accounts).toBe('unlimited')
    })
  })

  describe('getTierPricing', () => {
    it('should return correct monthly pricing', () => {
      expect(getTierPricing(SubscriptionTier.STARTER, BillingCycle.MONTHLY)).toBe(0)
      expect(getTierPricing(SubscriptionTier.GROWTH, BillingCycle.MONTHLY)).toBe(5)
      expect(getTierPricing(SubscriptionTier.PRO, BillingCycle.MONTHLY)).toBe(15)
    })

    it('should return correct yearly pricing', () => {
      expect(getTierPricing(SubscriptionTier.STARTER, BillingCycle.YEARLY)).toBe(0)
      expect(getTierPricing(SubscriptionTier.GROWTH, BillingCycle.YEARLY)).toBe(50)
      expect(getTierPricing(SubscriptionTier.PRO, BillingCycle.YEARLY)).toBe(150)
    })
  })

  describe('isFeatureAvailable', () => {
    it('should return true for available features', () => {
      expect(isFeatureAvailable(SubscriptionTier.STARTER, 'basic_budgeting')).toBe(true)
      expect(isFeatureAvailable(SubscriptionTier.GROWTH, 'csv_export')).toBe(true)
      expect(isFeatureAvailable(SubscriptionTier.PRO, 'ai_insights')).toBe(true)
    })

    it('should return false for unavailable features', () => {
      expect(isFeatureAvailable(SubscriptionTier.STARTER, 'csv_export')).toBe(false)
      expect(isFeatureAvailable(SubscriptionTier.STARTER, 'ai_insights')).toBe(false)
      expect(isFeatureAvailable(SubscriptionTier.GROWTH, 'ai_insights')).toBe(false)
    })
  })

  describe('canAccessFeature', () => {
    it('should return true when user tier meets or exceeds required tier', () => {
      expect(canAccessFeature(SubscriptionTier.STARTER, SubscriptionTier.STARTER)).toBe(true)
      expect(canAccessFeature(SubscriptionTier.GROWTH, SubscriptionTier.STARTER)).toBe(true)
      expect(canAccessFeature(SubscriptionTier.GROWTH, SubscriptionTier.GROWTH)).toBe(true)
      expect(canAccessFeature(SubscriptionTier.PRO, SubscriptionTier.STARTER)).toBe(true)
      expect(canAccessFeature(SubscriptionTier.PRO, SubscriptionTier.GROWTH)).toBe(true)
      expect(canAccessFeature(SubscriptionTier.PRO, SubscriptionTier.PRO)).toBe(true)
    })

    it('should return false when user tier is below required tier', () => {
      expect(canAccessFeature(SubscriptionTier.STARTER, SubscriptionTier.GROWTH)).toBe(false)
      expect(canAccessFeature(SubscriptionTier.STARTER, SubscriptionTier.PRO)).toBe(false)
      expect(canAccessFeature(SubscriptionTier.GROWTH, SubscriptionTier.PRO)).toBe(false)
    })
  })

  describe('getNextTier', () => {
    it('should return correct next tier', () => {
      expect(getNextTier(SubscriptionTier.STARTER)).toBe(SubscriptionTier.GROWTH)
      expect(getNextTier(SubscriptionTier.GROWTH)).toBe(SubscriptionTier.PRO)
      expect(getNextTier(SubscriptionTier.PRO)).toBeNull()
    })
  })

  describe('getPreviousTier', () => {
    it('should return correct previous tier', () => {
      expect(getPreviousTier(SubscriptionTier.PRO)).toBe(SubscriptionTier.GROWTH)
      expect(getPreviousTier(SubscriptionTier.GROWTH)).toBe(SubscriptionTier.STARTER)
      expect(getPreviousTier(SubscriptionTier.STARTER)).toBeNull()
    })
  })
})