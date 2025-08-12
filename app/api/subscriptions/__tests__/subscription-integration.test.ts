import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { SubscriptionTier, BillingCycle } from '../../../../lib/subscription/tier-config'

// Mock the entire subscription service module
const mockSubscriptionService = {
  getSubscription: vi.fn(),
  createSubscription: vi.fn(),
  updateSubscription: vi.fn(),
  cancelSubscription: vi.fn(),
  getCurrentUsage: vi.fn()
}

vi.mock('../../../../lib/subscription/subscription-service', () => ({
  SubscriptionService: vi.fn().mockImplementation(() => mockSubscriptionService)
}))

// Mock Prisma
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({}))
}))

// Mock auth middleware to pass through
vi.mock('../../../../lib/auth/api-middleware', () => ({
  withApiAuth: (handler: any) => handler,
  withApiLogging: (handler: any) => handler,
  withValidation: (handler: any, validator: any) => async (req: any, context: any) => {
    let body = {}
    try {
      if (req.method === 'POST' || req.method === 'PUT') {
        body = await req.json()
      }
    } catch (e) {
      // Ignore JSON parsing errors for tests
    }
    
    const validation = validator(body)
    if (!validation.isValid) {
      return new Response(JSON.stringify({
        success: false,
        error: { message: validation.errors.join(', ') }
      }), { status: 400 })
    }
    return handler(req, context, validation.data)
  }
}))

describe('Subscription API Integration Tests', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    tenantId: 'tenant-123'
  }

  const mockContext = {
    user: mockUser,
    token: 'mock-token',
    tenantId: 'tenant-123'
  }

  const mockSubscription = {
    id: 'sub-123',
    userId: 'user-123',
    stripeCustomerId: 'cus_123',
    stripeSubscriptionId: 'sub_stripe_123',
    tier: SubscriptionTier.STARTER,
    status: 'ACTIVE',
    billingCycle: BillingCycle.MONTHLY,
    currentPeriodStart: new Date('2024-01-01'),
    currentPeriodEnd: new Date('2024-02-01'),
    cancelAtPeriodEnd: false,
    trialEnd: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/subscriptions', () => {
    it('should return subscription when found', async () => {
      mockSubscriptionService.getSubscription.mockResolvedValue(mockSubscription)

      // Import after mocking
      const { GET } = await import('../route')
      
      const request = new NextRequest('http://localhost/api/subscriptions')
      const response = await GET(request, mockContext)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toBeDefined()
      expect(data.data.id).toBe(mockSubscription.id)
      expect(data.data.tier).toBe(mockSubscription.tier)
      expect(mockSubscriptionService.getSubscription).toHaveBeenCalledWith(mockUser.id)
    })

    it('should return null when no subscription found', async () => {
      mockSubscriptionService.getSubscription.mockResolvedValue(null)

      const { GET } = await import('../route')
      
      const request = new NextRequest('http://localhost/api/subscriptions')
      const response = await GET(request, mockContext)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toBe(null)
    })
  })

  describe('POST /api/subscriptions', () => {
    it('should create subscription successfully', async () => {
      mockSubscriptionService.getSubscription.mockResolvedValue(null) // No existing subscription
      mockSubscriptionService.createSubscription.mockResolvedValue(mockSubscription)

      const { POST } = await import('../route')
      
      const requestBody = {
        tier: SubscriptionTier.GROWTH,
        billingCycle: BillingCycle.MONTHLY,
        stripeCustomerId: 'cus_123'
      }

      const request = new NextRequest('http://localhost/api/subscriptions', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request, mockContext)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(mockSubscriptionService.createSubscription).toHaveBeenCalled()
    })

    it('should reject creation if subscription exists', async () => {
      mockSubscriptionService.getSubscription.mockResolvedValue(mockSubscription)

      const { POST } = await import('../route')
      
      const requestBody = {
        tier: SubscriptionTier.GROWTH,
        billingCycle: BillingCycle.MONTHLY
      }

      const request = new NextRequest('http://localhost/api/subscriptions', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request, mockContext)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('SUBSCRIPTION_EXISTS')
    })
  })

  describe('PUT /api/subscriptions', () => {
    it('should update subscription successfully', async () => {
      const updatedSubscription = { ...mockSubscription, tier: SubscriptionTier.PRO }
      
      mockSubscriptionService.getSubscription.mockResolvedValue(mockSubscription)
      mockSubscriptionService.updateSubscription.mockResolvedValue(updatedSubscription)

      const { PUT } = await import('../route')
      
      const requestBody = { tier: SubscriptionTier.PRO }

      const request = new NextRequest('http://localhost/api/subscriptions', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await PUT(request, mockContext)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockSubscriptionService.updateSubscription).toHaveBeenCalledWith(
        mockSubscription.id,
        { tier: SubscriptionTier.PRO }
      )
    })

    it('should return 404 if subscription not found', async () => {
      mockSubscriptionService.getSubscription.mockResolvedValue(null)

      const { PUT } = await import('../route')
      
      const requestBody = { tier: SubscriptionTier.PRO }

      const request = new NextRequest('http://localhost/api/subscriptions', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await PUT(request, mockContext)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('SUBSCRIPTION_NOT_FOUND')
    })
  })

  describe('DELETE /api/subscriptions', () => {
    it('should cancel subscription immediately', async () => {
      const canceledSubscription = { ...mockSubscription, status: 'CANCELED' }
      
      mockSubscriptionService.getSubscription.mockResolvedValue(mockSubscription)
      mockSubscriptionService.cancelSubscription.mockResolvedValue(canceledSubscription)

      const { DELETE } = await import('../route')
      
      const request = new NextRequest('http://localhost/api/subscriptions?cancelAtPeriodEnd=false', {
        method: 'DELETE'
      })

      const response = await DELETE(request, mockContext)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Subscription canceled immediately')
      expect(mockSubscriptionService.cancelSubscription).toHaveBeenCalledWith(
        mockSubscription.id,
        false
      )
    })

    it('should schedule cancellation at period end', async () => {
      const scheduledCancelSubscription = { ...mockSubscription, cancelAtPeriodEnd: true }
      
      mockSubscriptionService.getSubscription.mockResolvedValue(mockSubscription)
      mockSubscriptionService.cancelSubscription.mockResolvedValue(scheduledCancelSubscription)

      const { DELETE } = await import('../route')
      
      const request = new NextRequest('http://localhost/api/subscriptions?cancelAtPeriodEnd=true', {
        method: 'DELETE'
      })

      const response = await DELETE(request, mockContext)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Subscription will be canceled at the end of the current period')
      expect(mockSubscriptionService.cancelSubscription).toHaveBeenCalledWith(
        mockSubscription.id,
        true
      )
    })
  })

  describe('POST /api/subscriptions/upgrade', () => {
    it('should upgrade to next tier', async () => {
      const upgradedSubscription = { ...mockSubscription, tier: SubscriptionTier.GROWTH }
      
      mockSubscriptionService.getSubscription.mockResolvedValue(mockSubscription)
      mockSubscriptionService.updateSubscription.mockResolvedValue(upgradedSubscription)

      const { POST: UPGRADE_POST } = await import('../upgrade/route')
      
      const request = new NextRequest('http://localhost/api/subscriptions/upgrade', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await UPGRADE_POST(request, mockContext)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.newTier).toBe(SubscriptionTier.GROWTH)
      expect(data.data.previousTier).toBe(SubscriptionTier.STARTER)
    })
  })

  describe('POST /api/subscriptions/downgrade', () => {
    it('should downgrade to previous tier', async () => {
      const growthSubscription = { ...mockSubscription, tier: SubscriptionTier.GROWTH }
      const downgradedSubscription = { ...mockSubscription, tier: SubscriptionTier.STARTER }
      
      mockSubscriptionService.getSubscription.mockResolvedValue(growthSubscription)
      mockSubscriptionService.updateSubscription.mockResolvedValue(downgradedSubscription)
      mockSubscriptionService.getCurrentUsage.mockResolvedValue([])

      const { POST: DOWNGRADE_POST } = await import('../downgrade/route')
      
      const request = new NextRequest('http://localhost/api/subscriptions/downgrade', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await DOWNGRADE_POST(request, mockContext)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.newTier).toBe(SubscriptionTier.STARTER)
      expect(data.data.previousTier).toBe(SubscriptionTier.GROWTH)
    })
  })
})