/**
 * Usage Tracking System Example
 * 
 * This file demonstrates how to use the usage tracking system
 * to monitor and enforce tier limits in the pricing system.
 */

import { PrismaClient } from '@prisma/client'
import { UsageTrackingService } from './usage-tracking-service'
import { UsageMetricsCalculator } from './usage-metrics-calculator'
import { UsageMetricType, TierLimitExceededError } from './types'
import { SubscriptionTier } from './tier-config'

// Example: Track when a user connects a new account
export async function trackAccountConnection(prisma: PrismaClient, userId: string): Promise<void> {
  const usageService = new UsageTrackingService(prisma)
  
  try {
    // Check if user can connect another account before allowing the connection
    await usageService.enforceUsageLimit(userId, UsageMetricType.CONNECTED_ACCOUNTS, 1)
    
    // If we get here, the user is within limits - proceed with account connection
    // ... account connection logic ...
    
    // Track the usage after successful connection
    await usageService.trackUsage(userId, UsageMetricType.CONNECTED_ACCOUNTS, 1)
    
    console.log('Account connected successfully and usage tracked')
  } catch (error) {
    if (error instanceof TierLimitExceededError) {
      console.log(`Account limit reached: ${error.message}`)
      // Show upgrade prompt to user
      throw new Error('Account limit reached. Please upgrade to connect more accounts.')
    }
    throw error
  }
}

// Example: Check usage status for dashboard display
export async function getUserUsageStatus(prisma: PrismaClient, userId: string) {
  const usageService = new UsageTrackingService(prisma)
  
  try {
    const usageStatus = await usageService.getUsageLimitStatus(userId)
    
    return {
      accounts: {
        current: usageStatus[UsageMetricType.CONNECTED_ACCOUNTS].current,
        limit: usageStatus[UsageMetricType.CONNECTED_ACCOUNTS].limit,
        percentage: usageStatus[UsageMetricType.CONNECTED_ACCOUNTS].percentage,
        isNearLimit: usageStatus[UsageMetricType.CONNECTED_ACCOUNTS].percentage > 80
      },
      balance: {
        current: usageStatus[UsageMetricType.TOTAL_BALANCE].current,
        limit: usageStatus[UsageMetricType.TOTAL_BALANCE].limit,
        percentage: usageStatus[UsageMetricType.TOTAL_BALANCE].percentage,
        isNearLimit: usageStatus[UsageMetricType.TOTAL_BALANCE].percentage > 80
      }
    }
  } catch (error) {
    console.error('Failed to get usage status:', error)
    return null
  }
}

// Example: Track transaction export usage
export async function trackTransactionExport(prisma: PrismaClient, userId: string): Promise<void> {
  const usageService = new UsageTrackingService(prisma)
  
  try {
    // Check if user has export feature available
    const canExport = await usageService.checkUsageLimit(userId, UsageMetricType.TRANSACTION_EXPORTS)
    
    if (!canExport) {
      throw new Error('Transaction export feature requires Growth tier or higher')
    }
    
    // Track the export
    await usageService.trackUsage(userId, UsageMetricType.TRANSACTION_EXPORTS, 1)
    
    console.log('Transaction export tracked successfully')
  } catch (error) {
    console.error('Export tracking failed:', error)
    throw error
  }
}

// Example: Refresh real-time usage metrics
export async function refreshUserMetrics(prisma: PrismaClient, userId: string): Promise<void> {
  const calculator = new UsageMetricsCalculator(prisma)
  const usageService = new UsageTrackingService(prisma)
  
  try {
    // Calculate current real-time values
    const totalBalance = await calculator.calculateTotalBalance(userId)
    const connectedAccounts = await calculator.calculateConnectedAccounts(userId)
    
    console.log(`User ${userId} metrics:`)
    console.log(`- Connected accounts: ${connectedAccounts.currentValue}`)
    console.log(`- Total balance: $${totalBalance.currentValue}`)
    
    // Get updated usage status
    const usageStatus = await usageService.getUsageLimitStatus(userId)
    
    return usageStatus
  } catch (error) {
    console.error('Failed to refresh metrics:', error)
    throw error
  }
}

// Example: Check if user should see upgrade prompts
export async function shouldShowUpgradePrompt(prisma: PrismaClient, userId: string): Promise<{
  showPrompt: boolean
  reason?: string
  suggestedTier?: SubscriptionTier
}> {
  const usageService = new UsageTrackingService(prisma)
  
  try {
    const usageStatus = await usageService.getUsageLimitStatus(userId)
    
    // Check if user is near account limit
    const accountUsage = usageStatus[UsageMetricType.CONNECTED_ACCOUNTS]
    if (accountUsage.percentage >= 100) {
      return {
        showPrompt: true,
        reason: `You've connected ${accountUsage.current}/${accountUsage.limit} accounts`,
        suggestedTier: SubscriptionTier.GROWTH
      }
    }
    
    // Check if user is near balance limit
    const balanceUsage = usageStatus[UsageMetricType.TOTAL_BALANCE]
    if (balanceUsage.percentage >= 100) {
      return {
        showPrompt: true,
        reason: `Your tracked balance ($${balanceUsage.current}) exceeds the $${balanceUsage.limit} limit`,
        suggestedTier: SubscriptionTier.GROWTH
      }
    }
    
    // Check if user is approaching limits (80% threshold)
    if (accountUsage.percentage >= 80) {
      return {
        showPrompt: true,
        reason: `You're using ${accountUsage.current}/${accountUsage.limit} accounts`,
        suggestedTier: SubscriptionTier.GROWTH
      }
    }
    
    if (balanceUsage.percentage >= 80) {
      return {
        showPrompt: true,
        reason: `Your tracked balance is approaching the limit`,
        suggestedTier: SubscriptionTier.GROWTH
      }
    }
    
    return { showPrompt: false }
  } catch (error) {
    console.error('Failed to check upgrade prompt status:', error)
    return { showPrompt: false }
  }
}

// Example usage in an API route or service
export async function exampleUsage() {
  const prisma = new PrismaClient()
  const userId = 'example-user-id'
  
  try {
    // Track account connection
    await trackAccountConnection(prisma, userId)
    
    // Get usage status for dashboard
    const usageStatus = await getUserUsageStatus(prisma, userId)
    console.log('Usage status:', usageStatus)
    
    // Check if should show upgrade prompt
    const upgradePrompt = await shouldShowUpgradePrompt(prisma, userId)
    if (upgradePrompt.showPrompt) {
      console.log('Show upgrade prompt:', upgradePrompt.reason)
    }
    
    // Refresh metrics
    await refreshUserMetrics(prisma, userId)
    
  } catch (error) {
    console.error('Example usage failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}