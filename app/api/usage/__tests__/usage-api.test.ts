import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { SubscriptionTier, SubscriptionStatus, BillingCycle } from '../../../../lib/subscription/tier-config'
import { UsageMetricType } from '../../../../lib/subscription/types'

// Mock Prisma Client
const mockPrisma = {
  subscription: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
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
}

// Mock auth service
vi.mock('../../../../lib/auth/nile-auth-service', () => ({
  getNileAuthService: () => ({
    getCurrentUser: vi.fn().mockResolvedValue({
      id: 'test-user-id',
      email: 'test@example.com',
      tenantId: 'test-tenant-id'
    }),
    validateSession: vi.fn().mockResolvedValue(true)
  })
}))

// Mock Prisma Client constructor
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => mockPrisma)
}))

// Import route handlers after mocks are set up
const { GET } = await import('../route')
const { POST } = await import('../track/route')
const { GET: GET_LIMITS } = await import('../limits/route')

describe('Usage API Endpoints', () => {
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    tenantId: 'test-tenant-id'
  }

  const mockSubscription = {
    id: 'test-subscription-id',
    userId: 'test-user-id',
    tier: SubscriptionTier.GROWTH,
    status: SubscriptionStatus.ACTIVE,
    billingCycle: BillingCycle.MONTHLY,
    currentPeriodStart: new Date('2024-01-01'),
    currentPeriodEnd: new Date('2024-02-01'),
    cancelAtPeriodEnd: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  }

  const mockUsageMetrics = [
    {
      id: 'metric-1',
      subscriptionId: 'test-subscription-id',
      userId: 'test-user-id',
      metricType: UsageMetricType.CONNECTED_ACCOUNTS,
      currentValue: 5,
      limitValue: 10,
      periodStart: new Date('2024-01-01'),
      periodEnd: new Date('2024-02-01'),
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    },
    {
      id: 'metric-2',
      subscriptionId: 'test-subscription-id',
      userId: 'test-user-id',
      metricType: UsageMetricType.TOTAL_BALANCE,
      currentValue: 50000,
      limitValue: 100000,
      periodStart: new Date('2024-01-01'),
      periodEnd: new Date('2024-02-01'),
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup default mocks
    mockPrisma.subscription.findUnique.mockResolvedValue(mockSubscription)
    mockPrisma.usageMetric.findMany.mockResolvedValue(mockUsageMetrics)
    mockPrisma.account.findMany.mockResolvedValue([
      { balanceCurrent: { toNumber: () => 25000 } },
      { balanceCurrent: { toNumber: () => 25000 } }
    ])
    mockPrisma.account.count.mockResolvedValue(5)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('GET /api/usage', () => {
    it('should return current usage metrics', async () => {
      const request = new NextRequest('http://localhost:3000/api/usage', {
        method: 'GET',
        headers: {
          'authorization': 'Bearer test-token'
        }
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.usage).toHaveLength(2)
      expect(data.data.timestamp).toBeDefined()
    })

    it('should return usage status when includeStatus=true', async () => {
      const request = new NextRequest('http://localhost:3000/api/usage?includeStatus=true', {
        method: 'GET',
        headers: {
          'authorization': 'Bearer test-token'
        }
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.usage).toBeDefined()
      expect(typeof data.data.usage).toBe('object')
    })

    it('should handle subscription not found', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/usage', {
        method: 'GET',
        headers: {
          'authorization': 'Bearer test-token'
        }
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('USAGE_FETCH_ERROR')
    })
  })

  describe('POST /api/usage/track', () => {
    it('should track usage successfully', async () => {
      const trackingData = {
        metricType: UsageMetricType.TRANSACTION_EXPORTS,
        increment: 1
      }

      mockPrisma.usageMetric.findUnique.mockResolvedValue({
        ...mockUsageMetrics[0],
        metricType: UsageMetricType.TRANSACTION_EXPORTS,
        currentValue: 1,
        limitValue: -1
      })

      const request = new NextRequest('http://localhost:3000/api/usage/track', {
        method: 'POST',
        headers: {
          'authorization': 'Bearer test-token',
          'content-type': 'application/json'
        },
        body: JSON.stringify(trackingData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.message).toContain('Successfully tracked')
      expect(data.data.metric).toBeDefined()
      expect(data.data.status).toBeDefined()
    })

    it('should handle tier limit exceeded', async () => {
      const trackingData = {
        metricType: UsageMetricType.CONNECTED_ACCOUNTS,
        increment: 10 // This would exceed the limit
      }

      // Mock the subscription with STARTER tier (3 accounts limit)
      mockPrisma.subscription.findUnique.mockResolvedValue({
        ...mockSubscription,
        tier: SubscriptionTier.STARTER
      })

      // Mock current usage at limit
      mockPrisma.usageMetric.findUnique.mockResolvedValue({
        ...mockUsageMetrics[0],
        currentValue: 3,
        limitValue: 3
      })

      const request = new NextRequest('http://localhost:3000/api/usage/track', {
        method: 'POST',
        headers: {
          'authorization': 'Bearer test-token',
          'content-type': 'application/json'
        },
        body: JSON.stringify(trackingData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('TIER_LIMIT_EXCEEDED')
      expect(data.error.details.metricType).toBe(UsageMetricType.CONNECTED_ACCOUNTS)
    })

    it('should validate request body', async () => {
      const invalidData = {
        metricType: 'invalid_metric',
        increment: -1
      }

      const request = new NextRequest('http://localhost:3000/api/usage/track', {
        method: 'POST',
        headers: {
          'authorization': 'Bearer test-token',
          'content-type': 'application/json'
        },
        body: JSON.stringify(invalidData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should handle subscription not found', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(null)

      const trackingData = {
        metricType: UsageMetricType.API_CALLS,
        increment: 1
      }

      const request = new NextRequest('http://localhost:3000/api/usage/track', {
        method: 'POST',
        headers: {
          'authorization': 'Bearer test-token',
          'content-type': 'application/json'
        },
        body: JSON.stringify(trackingData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('SUBSCRIPTION_NOT_FOUND')
    })
  })

  describe('GET /api/usage/limits', () => {
    it('should return tier limits and usage status', async () => {
      const request = new NextRequest('http://localhost:3000/api/usage/limits', {
        method: 'GET',
        headers: {
          'authorization': 'Bearer test-token'
        }
      })

      const response = await GET_LIMITS(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.subscription).toBeDefined()
      expect(data.data.limits).toBeDefined()
      expect(data.data.usage).toBeDefined()
      expect(data.data.tierComparison).toBeDefined()
      expect(data.data.subscription.tier).toBe(SubscriptionTier.GROWTH)
      expect(data.data.limits.accounts).toBe(10)
      expect(data.data.limits.balanceLimit).toBe(100000)
    })

    it('should include all tier comparison data', async () => {
      const request = new NextRequest('http://localhost:3000/api/usage/limits', {
        method: 'GET',
        headers: {
          'authorization': 'Bearer test-token'
        }
      })

      const response = await GET_LIMITS(request)
      const data = await response.json()

      expect(data.data.tierComparison.available).toHaveLength(3)
      expect(data.data.tierComparison.available[0].tier).toBe('STARTER')
      expect(data.data.tierComparison.available[1].tier).toBe('GROWTH')
      expect(data.data.tierComparison.available[2].tier).toBe('PRO')
    })

    it('should handle subscription not found gracefully', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/usage/limits', {
        method: 'GET',
        headers: {
          'authorization': 'Bearer test-token'
        }
      })

      const response = await GET_LIMITS(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('USAGE_LIMITS_FETCH_ERROR')
    })
  })

  describe('Authentication', () => {
    it('should require authentication for all endpoints', async () => {
      const requestWithoutAuth = new NextRequest('http://localhost:3000/api/usage', {
        method: 'GET'
      })

      const response = await GET(requestWithoutAuth)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('TOKEN_MISSING')
    })
  })
})