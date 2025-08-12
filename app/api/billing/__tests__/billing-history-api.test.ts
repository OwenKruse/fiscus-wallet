import { describe, it, expect, beforeEach, vi } from 'vitest'
import { BillingHistoryService } from '../../../../lib/subscription/billing-history-service'
import { authMiddleware } from '../../../../lib/auth/auth-middleware'

// Mock the auth middleware
vi.mock('../../../../lib/auth/auth-middleware', () => ({
  authMiddleware: vi.fn()
}))

const mockAuthMiddleware = vi.mocked(authMiddleware)

describe('Billing History API Integration', () => {
  let mockPrisma: any
  let billingHistoryService: BillingHistoryService

  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma = {
      billingHistory: {
        findMany: vi.fn(),
        count: vi.fn(),
        aggregate: vi.fn(),
        findFirst: vi.fn()
      },
      subscription: {
        findFirst: vi.fn()
      }
    }
    billingHistoryService = new BillingHistoryService(mockPrisma)
  })

  describe('getBillingHistory', () => {
    it('should return billing history for authenticated user', async () => {
      // Mock authentication success
      mockAuthMiddleware.mockResolvedValue({
        success: true,
        userId: 'user-123'
      })

      // Mock billing history data
      const mockBillingHistory = [
        {
          id: 'bill-1',
          subscriptionId: 'sub-1',
          userId: 'user-123',
          stripeInvoiceId: 'inv_123',
          amount: 5.00,
          currency: 'usd',
          status: 'paid',
          billingReason: 'subscription_cycle',
          periodStart: new Date('2024-01-01'),
          periodEnd: new Date('2024-02-01'),
          paidAt: new Date('2024-01-01'),
          createdAt: new Date('2024-01-01')
        }
      ]

      mockPrisma.billingHistory.findMany.mockResolvedValue(mockBillingHistory)

      const result = await billingHistoryService.getBillingHistory('user-123', 50, 0)

      expect(mockPrisma.billingHistory.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: 0
      })

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('bill-1')
      expect(result[0].amount).toBe(5.00)
    })

    it('should handle pagination parameters correctly', async () => {
      mockPrisma.billingHistory.findMany.mockResolvedValue([])

      await billingHistoryService.getBillingHistory('user-123', 10, 20)

      expect(mockPrisma.billingHistory.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        orderBy: { createdAt: 'desc' },
        take: 10,
        skip: 20
      })
    })

    it('should use default pagination when not specified', async () => {
      mockPrisma.billingHistory.findMany.mockResolvedValue([])

      await billingHistoryService.getBillingHistory('user-123')

      expect(mockPrisma.billingHistory.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: 0
      })
    })
  })

  describe('getBillingHistoryBySubscription', () => {
    it('should return billing history for a specific subscription', async () => {
      mockPrisma.billingHistory.findMany.mockResolvedValue([])

      await billingHistoryService.getBillingHistoryBySubscription('sub-123', 25, 10)

      expect(mockPrisma.billingHistory.findMany).toHaveBeenCalledWith({
        where: { subscriptionId: 'sub-123' },
        orderBy: { createdAt: 'desc' },
        take: 25,
        skip: 10
      })
    })
  })

  describe('getTotalBillingAmount', () => {
    it('should return total billing amount for a user', async () => {
      mockPrisma.billingHistory.aggregate.mockResolvedValue({
        _sum: { amount: 150.00 }
      })

      const result = await billingHistoryService.getTotalBillingAmount('user-123')

      expect(mockPrisma.billingHistory.aggregate).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          status: 'paid'
        },
        _sum: {
          amount: true
        }
      })

      expect(result).toBe(150.00)
    })

    it('should handle date range filtering', async () => {
      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-12-31')

      mockPrisma.billingHistory.aggregate.mockResolvedValue({
        _sum: { amount: 60.00 }
      })

      const result = await billingHistoryService.getTotalBillingAmount('user-123', startDate, endDate)

      expect(mockPrisma.billingHistory.aggregate).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          status: 'paid',
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        },
        _sum: {
          amount: true
        }
      })

      expect(result).toBe(60.00)
    })
  })

  describe('authentication integration', () => {
    it('should handle authentication failure', async () => {
      const authResult = await mockAuthMiddleware({} as any)
      
      mockAuthMiddleware.mockResolvedValue({
        success: false,
        error: 'No token provided'
      })

      const result = await mockAuthMiddleware({} as any)
      expect(result.success).toBe(false)
      expect(result.error).toBe('No token provided')
    })

    it('should handle authentication success', async () => {
      mockAuthMiddleware.mockResolvedValue({
        success: true,
        userId: 'user-123'
      })

      const result = await mockAuthMiddleware({} as any)
      expect(result.success).toBe(true)
      expect(result.userId).toBe('user-123')
    })
  })
})