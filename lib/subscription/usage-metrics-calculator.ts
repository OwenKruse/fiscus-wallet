import { PrismaClient } from '@prisma/client'
import { UsageMetricType } from './types'

export interface UsageCalculationResult {
  metricType: UsageMetricType
  currentValue: number
  calculatedAt: Date
}

export interface IUsageMetricsCalculator {
  calculateConnectedAccounts(userId: string): Promise<UsageCalculationResult>
  calculateTotalBalance(userId: string): Promise<UsageCalculationResult>
  calculateTransactionExports(userId: string, periodStart: Date): Promise<UsageCalculationResult>
  calculateApiCalls(userId: string, periodStart: Date): Promise<UsageCalculationResult>
  calculateSyncRequests(userId: string, periodStart: Date): Promise<UsageCalculationResult>
  calculateAllMetrics(userId: string, periodStart?: Date): Promise<UsageCalculationResult[]>
}

export class UsageMetricsCalculator implements IUsageMetricsCalculator {
  constructor(private prisma: PrismaClient) {}

  async calculateConnectedAccounts(userId: string): Promise<UsageCalculationResult> {
    const count = await this.prisma.account.count({
      where: { userId }
    })

    return {
      metricType: UsageMetricType.CONNECTED_ACCOUNTS,
      currentValue: count,
      calculatedAt: new Date()
    }
  }

  async calculateTotalBalance(userId: string): Promise<UsageCalculationResult> {
    const accounts = await this.prisma.account.findMany({
      where: { userId },
      select: { balanceCurrent: true }
    })

    const totalBalance = accounts.reduce((total, account) => {
      return total + (account.balanceCurrent?.toNumber() || 0)
    }, 0)

    return {
      metricType: UsageMetricType.TOTAL_BALANCE,
      currentValue: Math.round(Math.abs(totalBalance)), // Use absolute value and round
      calculatedAt: new Date()
    }
  }

  async calculateTransactionExports(userId: string, periodStart: Date): Promise<UsageCalculationResult> {
    // This would typically track export events from an audit log or usage tracking table
    // For now, we'll return 0 as this needs to be tracked when exports happen
    const exportCount = await this.getUsageMetricValue(userId, UsageMetricType.TRANSACTION_EXPORTS, periodStart)

    return {
      metricType: UsageMetricType.TRANSACTION_EXPORTS,
      currentValue: exportCount,
      calculatedAt: new Date()
    }
  }

  async calculateApiCalls(userId: string, periodStart: Date): Promise<UsageCalculationResult> {
    // This would typically track API calls from an audit log or usage tracking table
    // For now, we'll return 0 as this needs to be tracked when API calls happen
    const apiCallCount = await this.getUsageMetricValue(userId, UsageMetricType.API_CALLS, periodStart)

    return {
      metricType: UsageMetricType.API_CALLS,
      currentValue: apiCallCount,
      calculatedAt: new Date()
    }
  }

  async calculateSyncRequests(userId: string, periodStart: Date): Promise<UsageCalculationResult> {
    // This could track sync requests from PlaidConnection lastSync timestamps
    const syncCount = await this.prisma.plaidConnection.count({
      where: {
        userId,
        lastSync: {
          gte: periodStart
        }
      }
    })

    return {
      metricType: UsageMetricType.SYNC_REQUESTS,
      currentValue: syncCount,
      calculatedAt: new Date()
    }
  }

  async calculateAllMetrics(userId: string, periodStart?: Date): Promise<UsageCalculationResult[]> {
    const currentPeriodStart = periodStart || this.getCurrentPeriodStart()
    
    const results = await Promise.all([
      this.calculateConnectedAccounts(userId),
      this.calculateTotalBalance(userId),
      this.calculateTransactionExports(userId, currentPeriodStart),
      this.calculateApiCalls(userId, currentPeriodStart),
      this.calculateSyncRequests(userId, currentPeriodStart)
    ])

    return results
  }

  // Helper methods
  private async getUsageMetricValue(userId: string, metricType: UsageMetricType, periodStart: Date): Promise<number> {
    const metric = await this.prisma.usageMetric.findFirst({
      where: {
        userId,
        metricType,
        periodStart
      }
    })

    return metric?.currentValue || 0
  }

  private getCurrentPeriodStart(): Date {
    // Default to start of current month
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  }
}

// Utility functions for common calculations
export async function calculateUserTotalBalance(prisma: PrismaClient, userId: string): Promise<number> {
  const calculator = new UsageMetricsCalculator(prisma)
  const result = await calculator.calculateTotalBalance(userId)
  return result.currentValue
}

export async function calculateUserConnectedAccounts(prisma: PrismaClient, userId: string): Promise<number> {
  const calculator = new UsageMetricsCalculator(prisma)
  const result = await calculator.calculateConnectedAccounts(userId)
  return result.currentValue
}

export async function refreshUsageMetrics(prisma: PrismaClient, userId: string): Promise<UsageCalculationResult[]> {
  const calculator = new UsageMetricsCalculator(prisma)
  return calculator.calculateAllMetrics(userId)
}