import { describe, it, expect, beforeEach, vi } from 'vitest'
import { UsageMetricsCalculator, calculateUserTotalBalance, calculateUserConnectedAccounts } from '../usage-metrics-calculator'
import { UsageMetricType } from '../types'

// Mock PrismaClient
const mockPrisma = {
  account: {
    count: vi.fn(),
    findMany: vi.fn(),
  },
  usageMetric: {
    findFirst: vi.fn(),
  },
  plaidConnection: {
    count: vi.fn(),
  },
} as any

describe('UsageMetricsCalculator', () => {
  let calculator: UsageMetricsCalculator
  const userId = 'user-123'

  beforeEach(() => {
    vi.clearAllMocks()
    calculator = new UsageMetricsCalculator(mockPrisma)
  })

  describe('calculateConnectedAccounts', () => {
    it('should return count of connected accounts', async () => {
      mockPrisma.account.count.mockResolvedValue(5)

      const result = await calculator.calculateConnectedAccounts(userId)

      expect(result).toEqual({
        metricType: UsageMetricType.CONNECTED_ACCOUNTS,
        currentValue: 5,
        calculatedAt: expect.any(Date)
      })

      expect(mockPrisma.account.count).toHaveBeenCalledWith({
        where: { userId }
      })
    })
  })

  describe('calculateTotalBalance', () => {
    it('should calculate total balance from all accounts', async () => {
      const accounts = [
        { balanceCurrent: { toNumber: () => 1000.50 } },
        { balanceCurrent: { toNumber: () => 2500.75 } },
        { balanceCurrent: { toNumber: () => -750.25 } }, // Negative balance (credit card)
      ]

      mockPrisma.account.findMany.mockResolvedValue(accounts)

      const result = await calculator.calculateTotalBalance(userId)

      expect(result).toEqual({
        metricType: UsageMetricType.TOTAL_BALANCE,
        currentValue: 2751, // Rounded absolute value
        calculatedAt: expect.any(Date)
      })

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

      const result = await calculator.calculateTotalBalance(userId)

      expect(result.currentValue).toBe(1500)
    })
  })

  describe('calculateTransactionExports', () => {
    it('should return export count from usage metrics', async () => {
      const periodStart = new Date('2024-01-01')
      const metric = { currentValue: 3 }

      mockPrisma.usageMetric.findFirst.mockResolvedValue(metric)

      const result = await calculator.calculateTransactionExports(userId, periodStart)

      expect(result).toEqual({
        metricType: UsageMetricType.TRANSACTION_EXPORTS,
        currentValue: 3,
        calculatedAt: expect.any(Date)
      })

      expect(mockPrisma.usageMetric.findFirst).toHaveBeenCalledWith({
        where: {
          userId,
          metricType: UsageMetricType.TRANSACTION_EXPORTS,
          periodStart
        }
      })
    })

    it('should return 0 when no metric exists', async () => {
      const periodStart = new Date('2024-01-01')

      mockPrisma.usageMetric.findFirst.mockResolvedValue(null)

      const result = await calculator.calculateTransactionExports(userId, periodStart)

      expect(result.currentValue).toBe(0)
    })
  })

  describe('calculateApiCalls', () => {
    it('should return API call count from usage metrics', async () => {
      const periodStart = new Date('2024-01-01')
      const metric = { currentValue: 150 }

      mockPrisma.usageMetric.findFirst.mockResolvedValue(metric)

      const result = await calculator.calculateApiCalls(userId, periodStart)

      expect(result).toEqual({
        metricType: UsageMetricType.API_CALLS,
        currentValue: 150,
        calculatedAt: expect.any(Date)
      })
    })
  })

  describe('calculateSyncRequests', () => {
    it('should count sync requests from PlaidConnection', async () => {
      const periodStart = new Date('2024-01-01')

      mockPrisma.plaidConnection.count.mockResolvedValue(8)

      const result = await calculator.calculateSyncRequests(userId, periodStart)

      expect(result).toEqual({
        metricType: UsageMetricType.SYNC_REQUESTS,
        currentValue: 8,
        calculatedAt: expect.any(Date)
      })

      expect(mockPrisma.plaidConnection.count).toHaveBeenCalledWith({
        where: {
          userId,
          lastSync: {
            gte: periodStart
          }
        }
      })
    })
  })

  describe('calculateAllMetrics', () => {
    it('should calculate all metrics for user', async () => {
      const periodStart = new Date('2024-01-01')

      // Mock all the individual calculations
      mockPrisma.account.count.mockResolvedValue(3)
      mockPrisma.account.findMany.mockResolvedValue([
        { balanceCurrent: { toNumber: () => 5000 } }
      ])
      mockPrisma.usageMetric.findFirst
        .mockResolvedValueOnce({ currentValue: 2 }) // exports
        .mockResolvedValueOnce({ currentValue: 50 }) // api calls
      mockPrisma.plaidConnection.count.mockResolvedValue(5)

      const results = await calculator.calculateAllMetrics(userId, periodStart)

      expect(results).toHaveLength(5)
      expect(results[0].metricType).toBe(UsageMetricType.CONNECTED_ACCOUNTS)
      expect(results[1].metricType).toBe(UsageMetricType.TOTAL_BALANCE)
      expect(results[2].metricType).toBe(UsageMetricType.TRANSACTION_EXPORTS)
      expect(results[3].metricType).toBe(UsageMetricType.API_CALLS)
      expect(results[4].metricType).toBe(UsageMetricType.SYNC_REQUESTS)
    })

    it('should use current period start when no period provided', async () => {
      // Mock all the individual calculations
      mockPrisma.account.count.mockResolvedValue(1)
      mockPrisma.account.findMany.mockResolvedValue([])
      mockPrisma.usageMetric.findFirst.mockResolvedValue(null)
      mockPrisma.plaidConnection.count.mockResolvedValue(0)

      const results = await calculator.calculateAllMetrics(userId)

      expect(results).toHaveLength(5)
      // Verify that the methods were called (indicating period start was calculated)
      expect(mockPrisma.usageMetric.findFirst).toHaveBeenCalled()
      expect(mockPrisma.plaidConnection.count).toHaveBeenCalled()
    })
  })
})

describe('Utility functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('calculateUserTotalBalance', () => {
    it('should return total balance for user', async () => {
      const accounts = [
        { balanceCurrent: { toNumber: () => 2500 } }
      ]

      mockPrisma.account.findMany.mockResolvedValue(accounts)

      const result = await calculateUserTotalBalance(mockPrisma, 'user-123')

      expect(result).toBe(2500)
    })
  })

  describe('calculateUserConnectedAccounts', () => {
    it('should return connected accounts count for user', async () => {
      mockPrisma.account.count.mockResolvedValue(7)

      const result = await calculateUserConnectedAccounts(mockPrisma, 'user-123')

      expect(result).toBe(7)
    })
  })
})