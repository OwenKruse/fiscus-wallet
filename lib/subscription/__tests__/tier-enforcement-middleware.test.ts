import { describe, it, expect, beforeEach, vi, Mock } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { 
  withTierEnforcement, 
  tierEnforcementMiddleware,
  createTierAwareResponse
} from '../tier-enforcement-middleware'
import { SubscriptionService } from '../subscription-service'
import { TierEnforcementService } from '../tier-enforcement-service'
import { 
  TierLimitExceededError, 
  FeatureNotAvailableError 
} from '../types'
import { SubscriptionTier } from '../tier-config'

// Create mock instances
const mockEnforcementService = {
  checkFeatureAccessWithThrow: vi.fn(),
  checkAccountLimitWithThrow: vi.fn(),
  checkBalanceLimitWithThrow: vi.fn(),
}

const mockSubscriptionService = {}

const mockPrisma = {}

// Mock dependencies
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => mockPrisma),
}))

vi.mock('../subscription-service', () => ({
  SubscriptionService: vi.fn().mockImplementation(() => mockSubscriptionService),
}))

vi.mock('../tier-enforcement-service', () => ({
  TierEnforcementService: vi.fn().mockImplementation(() => mockEnforcementService),
}))

describe('TierEnforcementMiddleware', () => {
  let mockRequest: Partial<NextRequest>
  let mockHandler: Mock

  beforeEach(() => {
    vi.clearAllMocks()
    
    mockRequest = {
      headers: new Map([['x-user-id', 'user-123']]) as any,
    }
    
    mockHandler = vi.fn().mockResolvedValue(NextResponse.json({ success: true }))
  })

  describe('withTierEnforcement', () => {
    it('should call handler when no enforcement options are provided', async () => {
      const middleware = withTierEnforcement()
      const wrappedHandler = middleware(mockHandler)
      
      const result = await wrappedHandler(mockRequest as NextRequest, {})
      
      expect(mockHandler).toHaveBeenCalled()
      expect(result).toEqual(NextResponse.json({ success: true }))
    })

    it('should return 401 when no user ID is provided', async () => {
      const middleware = withTierEnforcement()
      const wrappedHandler = middleware(mockHandler)
      
      const requestWithoutUserId = {
        headers: new Map() as any,
      }
      
      const result = await wrappedHandler(requestWithoutUserId as NextRequest, {})
      
      expect(result.status).toBe(401)
      expect(mockHandler).not.toHaveBeenCalled()
    })

    it('should get user ID from context params when not in headers', async () => {
      const middleware = withTierEnforcement()
      const wrappedHandler = middleware(mockHandler)
      
      const requestWithoutUserId = {
        headers: new Map() as any,
      }
      
      const context = { params: { userId: 'user-456' } }
      
      const result = await wrappedHandler(requestWithoutUserId as NextRequest, context)
      
      expect(mockHandler).toHaveBeenCalled()
      expect(result).toEqual(NextResponse.json({ success: true }))
    })

    it('should enforce feature access when feature option is provided', async () => {
      const middleware = withTierEnforcement({ feature: 'csv_export' })
      const wrappedHandler = middleware(mockHandler)
      
      const result = await wrappedHandler(mockRequest as NextRequest, {})
      
      expect(mockEnforcementService.checkFeatureAccessWithThrow).toHaveBeenCalledWith('user-123', 'csv_export')
      expect(mockHandler).toHaveBeenCalled()
    })

    it('should enforce account limit when requireAccountLimit is true', async () => {
      const middleware = withTierEnforcement({ requireAccountLimit: true })
      const wrappedHandler = middleware(mockHandler)
      
      const result = await wrappedHandler(mockRequest as NextRequest, {})
      
      expect(mockEnforcementService.checkAccountLimitWithThrow).toHaveBeenCalledWith('user-123')
      expect(mockHandler).toHaveBeenCalled()
    })

    it('should enforce balance limit when requireBalanceLimit is provided', async () => {
      const middleware = withTierEnforcement({ requireBalanceLimit: 50000 })
      const wrappedHandler = middleware(mockHandler)
      
      const result = await wrappedHandler(mockRequest as NextRequest, {})
      
      expect(mockEnforcementService.checkBalanceLimitWithThrow).toHaveBeenCalledWith('user-123', 50000)
      expect(mockHandler).toHaveBeenCalled()
    })

    it('should run custom check when provided', async () => {
      const customCheck = vi.fn().mockResolvedValue(true)
      const middleware = withTierEnforcement({ customCheck })
      const wrappedHandler = middleware(mockHandler)
      
      const result = await wrappedHandler(mockRequest as NextRequest, {})
      
      expect(customCheck).toHaveBeenCalledWith('user-123', mockEnforcementService)
      expect(mockHandler).toHaveBeenCalled()
    })

    it('should return 403 when custom check fails', async () => {
      const customCheck = vi.fn().mockResolvedValue(false)
      const middleware = withTierEnforcement({ customCheck })
      const wrappedHandler = middleware(mockHandler)
      
      const result = await wrappedHandler(mockRequest as NextRequest, {})
      
      expect(result.status).toBe(403)
      expect(mockHandler).not.toHaveBeenCalled()
    })

    it('should return 403 with proper error format for TierLimitExceededError', async () => {
      const error = new TierLimitExceededError('Connected accounts', 3, 3, SubscriptionTier.GROWTH)
      mockEnforcementService.checkAccountLimitWithThrow.mockRejectedValue(error)
      
      const middleware = withTierEnforcement({ requireAccountLimit: true })
      const wrappedHandler = middleware(mockHandler)
      
      const result = await wrappedHandler(mockRequest as NextRequest, {})
      
      expect(result.status).toBe(403)
      
      const responseBody = await result.json()
      expect(responseBody).toEqual({
        error: 'Tier limit exceeded',
        message: error.message,
        limitType: 'Connected accounts',
        currentValue: 3,
        limitValue: 3,
        requiredTier: SubscriptionTier.GROWTH
      })
    })

    it('should return 403 with proper error format for FeatureNotAvailableError', async () => {
      const error = new FeatureNotAvailableError('csv_export', SubscriptionTier.GROWTH)
      mockEnforcementService.checkFeatureAccessWithThrow.mockRejectedValue(error)
      
      const middleware = withTierEnforcement({ feature: 'csv_export' })
      const wrappedHandler = middleware(mockHandler)
      
      const result = await wrappedHandler(mockRequest as NextRequest, {})
      
      expect(result.status).toBe(403)
      
      const responseBody = await result.json()
      expect(responseBody).toEqual({
        error: 'Feature not available',
        message: error.message,
        feature: 'csv_export',
        requiredTier: SubscriptionTier.GROWTH
      })
    })

    it('should re-throw other errors', async () => {
      const error = new Error('Database connection failed')
      mockEnforcementService.checkFeatureAccessWithThrow.mockRejectedValue(error)
      
      const middleware = withTierEnforcement({ feature: 'csv_export' })
      const wrappedHandler = middleware(mockHandler)
      
      await expect(wrappedHandler(mockRequest as NextRequest, {})).rejects.toThrow('Database connection failed')
    })
  })

  describe('tierEnforcementMiddleware (Express-style)', () => {
    let mockReq: any
    let mockRes: any
    let mockNext: Mock

    beforeEach(() => {
      vi.clearAllMocks()
      
      mockReq = {
        user: { id: 'user-123' },
        headers: {}
      }
      
      mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis()
      }
      
      mockNext = vi.fn()
    })

    it('should call next() when no enforcement options are provided', async () => {
      await tierEnforcementMiddleware(mockReq, mockRes, mockNext)
      
      expect(mockNext).toHaveBeenCalled()
      expect(mockReq.tierEnforcement).toBeDefined()
    })

    it('should return 401 when no user ID is available', async () => {
      mockReq.user = undefined
      mockReq.headers = {}
      
      await tierEnforcementMiddleware(mockReq, mockRes, mockNext)
      
      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'User ID required for tier enforcement' })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should get user ID from headers when user object is not available', async () => {
      mockReq.user = undefined
      mockReq.headers = { 'x-user-id': 'user-456' }
      
      await tierEnforcementMiddleware(mockReq, mockRes, mockNext)
      
      expect(mockNext).toHaveBeenCalled()
    })

    it('should enforce feature access', async () => {
      await tierEnforcementMiddleware(mockReq, mockRes, mockNext, { feature: 'csv_export' })
      
      expect(mockEnforcementService.checkFeatureAccessWithThrow).toHaveBeenCalledWith('user-123', 'csv_export')
      expect(mockNext).toHaveBeenCalled()
    })

    it('should return 403 for TierLimitExceededError', async () => {
      const error = new TierLimitExceededError('Connected accounts', 3, 3, SubscriptionTier.GROWTH)
      mockEnforcementService.checkAccountLimitWithThrow.mockRejectedValue(error)
      
      await tierEnforcementMiddleware(mockReq, mockRes, mockNext, { requireAccountLimit: true })
      
      expect(mockRes.status).toHaveBeenCalledWith(403)
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Tier limit exceeded',
        message: error.message,
        limitType: 'Connected accounts',
        currentValue: 3,
        limitValue: 3,
        requiredTier: SubscriptionTier.GROWTH
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should return 403 for FeatureNotAvailableError', async () => {
      const error = new FeatureNotAvailableError('csv_export', SubscriptionTier.GROWTH)
      mockEnforcementService.checkFeatureAccessWithThrow.mockRejectedValue(error)
      
      await tierEnforcementMiddleware(mockReq, mockRes, mockNext, { feature: 'csv_export' })
      
      expect(mockRes.status).toHaveBeenCalledWith(403)
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Feature not available',
        message: error.message,
        feature: 'csv_export',
        requiredTier: SubscriptionTier.GROWTH
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should call next with error for other errors', async () => {
      const error = new Error('Database connection failed')
      mockEnforcementService.checkFeatureAccessWithThrow.mockRejectedValue(error)
      
      await tierEnforcementMiddleware(mockReq, mockRes, mockNext, { feature: 'csv_export' })
      
      expect(mockNext).toHaveBeenCalledWith(error)
    })
  })

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
  })

})