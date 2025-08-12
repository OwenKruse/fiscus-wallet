import { describe, it, expect, beforeEach, vi } from 'vitest'
import { BillingHistoryService } from '../billing-history-service'
import { PrismaClient } from '@prisma/client'

// Mock Prisma
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn()
}))

describe('BillingHistoryService', () => {
  let service: BillingHistoryService
  let mockPrisma: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma = {
      billingHistory: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        aggregate: vi.fn()
      },
      $queryRaw: vi.fn()
    }
    service = new BillingHistoryService(mockPrisma as any)
  })

  describe('getBillingHistory', () => {
    it('should return billing history for a user', async () => {
      const mockRecords = [
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

      mockPrisma.billingHistory.findMany.mockResolvedValue(mockRecords)

      const result = await service.getBillingHistory('user-123', 50, 0)

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

    it('should use default pagination parameters', async () => {
      mockPrisma.billingHistory.findMany.mockResolvedValue([])

      await service.getBillingHistory('user-123')

      expect(mockPrisma.billingHistory.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: 0
      })
    })
  })

  describe('getBillingHistoryBySubscription', () => {
    it('should return billing history for a subscription', async () => {
      mockPrisma.billingHistory.findMany.mockResolvedValue([])

      await service.getBillingHistoryBySubscription('sub-123', 25, 10)

      expect(mockPrisma.billingHistory.findMany).toHaveBeenCalledWith({
        where: { subscriptionId: 'sub-123' },
        orderBy: { createdAt: 'desc' },
        take: 25,
        skip: 10
      })
    })
  })

  describe('createBillingRecord', () => {
    it('should create a new billing record', async () => {
      const createData = {
        subscriptionId: 'sub-1',
        userId: 'user-123',
        stripeInvoiceId: 'inv_123',
        amount: 5.00,
        currency: 'usd',
        status: 'paid',
        billingReason: 'subscription_cycle',
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-02-01'),
        paidAt: new Date('2024-01-01')
      }

      const mockCreatedRecord = {
        id: 'bill-1',
        ...createData,
        createdAt: new Date('2024-01-01')
      }

      mockPrisma.billingHistory.create.mockResolvedValue(mockCreatedRecord)

      const result = await service.createBillingRecord(createData)

      expect(mockPrisma.billingHistory.create).toHaveBeenCalledWith({
        data: createData
      })

      expect(result.id).toBe('bill-1')
      expect(result.amount).toBe(5.00)
    })
  })

  describe('getBillingRecord', () => {
    it('should return a billing record by ID', async () => {
      const mockRecord = {
        id: 'bill-1',
        subscriptionId: 'sub-1',
        userId: 'user-123',
        amount: 5.00,
        currency: 'usd',
        status: 'paid',
        billingReason: 'subscription_cycle',
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-02-01'),
        paidAt: new Date('2024-01-01'),
        createdAt: new Date('2024-01-01')
      }

      mockPrisma.billingHistory.findUnique.mockResolvedValue(mockRecord)

      const result = await service.getBillingRecord('bill-1')

      expect(mockPrisma.billingHistory.findUnique).toHaveBeenCalledWith({
        where: { id: 'bill-1' }
      })

      expect(result?.id).toBe('bill-1')
    })

    it('should return null if record not found', async () => {
      mockPrisma.billingHistory.findUnique.mockResolvedValue(null)

      const result = await service.getBillingRecord('nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('getTotalBillingAmount', () => {
    it('should return total billing amount for a user', async () => {
      mockPrisma.billingHistory.aggregate.mockResolvedValue({
        _sum: { amount: 150.00 }
      })

      const result = await service.getTotalBillingAmount('user-123')

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

      const result = await service.getTotalBillingAmount('user-123', startDate, endDate)

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

    it('should return 0 if no billing records found', async () => {
      mockPrisma.billingHistory.aggregate.mockResolvedValue({
        _sum: { amount: null }
      })

      const result = await service.getTotalBillingAmount('user-123')

      expect(result).toBe(0)
    })
  })

  describe('getInvoiceData', () => {
    it('should return complete invoice data', async () => {
      const mockBillingRecord = {
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
        createdAt: new Date('2024-01-01'),
        subscription: {
          id: 'sub-1',
          tier: 'GROWTH',
          billingCycle: 'MONTHLY'
        }
      }

      const mockUser = [{ id: 'user-123', email: 'test@example.com', name: 'Test User' }]

      mockPrisma.billingHistory.findUnique.mockResolvedValue(mockBillingRecord)
      mockPrisma.$queryRaw.mockResolvedValue(mockUser)

      const result = await service.getInvoiceData('bill-1')

      expect(result).toBeDefined()
      expect(result?.billingRecord.id).toBe('bill-1')
      expect(result?.subscription.tier).toBe('GROWTH')
      expect(result?.user.email).toBe('test@example.com')
      expect(result?.lineItems).toHaveLength(1)
      expect(result?.lineItems[0].description).toBe('Growth Plan - Monthly Subscription')
    })

    it('should return null if billing record not found', async () => {
      mockPrisma.billingHistory.findUnique.mockResolvedValue(null)

      const result = await service.getInvoiceData('nonexistent')

      expect(result).toBeNull()
    })

    it('should handle missing user data gracefully', async () => {
      const mockBillingRecord = {
        id: 'bill-1',
        subscriptionId: 'sub-1',
        userId: 'user-123',
        amount: 5.00,
        currency: 'usd',
        status: 'paid',
        billingReason: 'subscription_cycle',
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-02-01'),
        createdAt: new Date('2024-01-01'),
        subscription: {
          id: 'sub-1',
          tier: 'STARTER',
          billingCycle: 'YEARLY'
        }
      }

      mockPrisma.billingHistory.findUnique.mockResolvedValue(mockBillingRecord)
      mockPrisma.$queryRaw.mockResolvedValue([])

      const result = await service.getInvoiceData('bill-1')

      expect(result?.user.id).toBe('user-123')
      expect(result?.user.email).toBeUndefined()
      expect(result?.lineItems[0].description).toBe('Starter Plan - Annual Subscription')
    })
  })
})