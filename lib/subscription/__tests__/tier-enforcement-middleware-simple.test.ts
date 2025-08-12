import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTierAwareResponse } from '../tier-enforcement-middleware'
import { SubscriptionTier } from '../tier-config'

describe('TierEnforcementMiddleware - Helper Functions', () => {
  describe('createTierAwareResponse', () => {
    it('should create response with tier information', () => {
      const data = { accounts: [], balance: 1000 }
      const userTier = SubscriptionTier.GROWTH
      const availableFeatures = ['csv_export', 'spending_insights']
      
      const result = createTierAwareResponse(data, userTier, availableFeatures)
      
      expect(result).toEqual({
        data,
        tier: {
          current: userTier,
          availableFeatures
        }
      })
    })

    it('should handle empty data', () => {
      const data = null
      const userTier = SubscriptionTier.STARTER
      const availableFeatures: string[] = []
      
      const result = createTierAwareResponse(data, userTier, availableFeatures)
      
      expect(result).toEqual({
        data: null,
        tier: {
          current: userTier,
          availableFeatures: []
        }
      })
    })

    it('should handle complex data structures', () => {
      const data = {
        accounts: [
          { id: '1', name: 'Checking', balance: 1000 },
          { id: '2', name: 'Savings', balance: 5000 }
        ],
        totalBalance: 6000,
        lastSync: new Date('2024-01-01')
      }
      const userTier = SubscriptionTier.PRO
      const availableFeatures = ['ai_insights', 'investment_tracking', 'multi_currency']
      
      const result = createTierAwareResponse(data, userTier, availableFeatures)
      
      expect(result.data).toEqual(data)
      expect(result.tier.current).toBe(SubscriptionTier.PRO)
      expect(result.tier.availableFeatures).toEqual(availableFeatures)
    })

    it('should handle string tier values', () => {
      const data = { message: 'Success' }
      const userTier = 'GROWTH' as any
      const availableFeatures = ['feature1', 'feature2']
      
      const result = createTierAwareResponse(data, userTier, availableFeatures)
      
      expect(result.tier.current).toBe('GROWTH')
    })
  })
})