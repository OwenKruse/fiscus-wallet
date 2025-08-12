import { PrismaClient } from '@prisma/client'
import { 
  SubscriptionTier, 
  getTierLimits, 
  isFeatureAvailable,
  canAccessFeature 
} from './tier-config'
import { 
  TierLimitExceededError, 
  FeatureNotAvailableError,
  SubscriptionNotFoundError,
  UsageMetricType 
} from './types'
import { ISubscriptionService } from './subscription-service'

export interface ITierEnforcementService {
  enforceAccountLimit(userId: string): Promise<boolean>
  enforceBalanceLimit(userId: string, totalBalance: number): Promise<boolean>
  enforceFeatureAccess(userId: string, feature: string): Promise<boolean>
  enforceSyncFrequency(userId: string): Promise<string>
  enforceTransactionHistory(userId: string): Promise<number>
  checkAccountLimitWithThrow(userId: string): Promise<void>
  checkBalanceLimitWithThrow(userId: string, totalBalance: number): Promise<void>
  checkFeatureAccessWithThrow(userId: string, feature: string): Promise<void>
  getUserTierLimits(userId: string): Promise<any>
  canAddAccount(userId: string): Promise<boolean>
  canTrackBalance(userId: string, additionalBalance: number): Promise<boolean>
  getUpgradeSuggestions(userId: string): Promise<{
    shouldUpgrade: boolean
    reasons: string[]
    suggestedTier: SubscriptionTier | null
  }>
  getUsageSummary(userId: string): Promise<{
    tier: SubscriptionTier
    limits: any
    usage: {
      accounts: { current: number; limit: number | 'unlimited'; percentage: number }
      balance: { current: number; limit: number | 'unlimited'; percentage: number }
    }
  }>
  isApproachingLimits(userId: string): Promise<{
    approaching: boolean
    warnings: string[]
  }>
  getAvailableFeatures(userId: string): Promise<string[]>
  canPerformActions(userId: string, actions: string[]): Promise<{
    [action: string]: boolean
  }>
}

export class TierEnforcementService implements ITierEnforcementService {
  constructor(
    private prisma: PrismaClient,
    private subscriptionService: ISubscriptionService
  ) {}

  /**
   * Check if user can add more accounts within their tier limit
   */
  async enforceAccountLimit(userId: string): Promise<boolean> {
    const userTier = await this.subscriptionService.getUserTier(userId)
    const limits = getTierLimits(userTier)
    
    if (limits.accounts === 'unlimited') {
      return true
    }

    // Get current account count from usage metrics
    const currentUsage = await this.subscriptionService.getCurrentUsage(userId)
    const accountUsage = currentUsage.find(u => u.metricType === UsageMetricType.CONNECTED_ACCOUNTS)
    
    if (!accountUsage) {
      // If no usage metric exists, assume 0 accounts
      return true
    }

    return accountUsage.currentValue < limits.accounts
  }

  /**
   * Check if user can track additional balance within their tier limit
   */
  async enforceBalanceLimit(userId: string, totalBalance: number): Promise<boolean> {
    const userTier = await this.subscriptionService.getUserTier(userId)
    const limits = getTierLimits(userTier)
    
    if (limits.balanceLimit === 'unlimited') {
      return true
    }

    return totalBalance <= limits.balanceLimit
  }

  /**
   * Check if user has access to a specific feature based on their tier
   */
  async enforceFeatureAccess(userId: string, feature: string): Promise<boolean> {
    const userTier = await this.subscriptionService.getUserTier(userId)
    return isFeatureAvailable(userTier, feature)
  }

  /**
   * Get the sync frequency allowed for the user's tier
   */
  async enforceSyncFrequency(userId: string): Promise<string> {
    const userTier = await this.subscriptionService.getUserTier(userId)
    const limits = getTierLimits(userTier)
    return limits.syncFrequency
  }

  /**
   * Get the transaction history limit in months for the user's tier
   */
  async enforceTransactionHistory(userId: string): Promise<number> {
    const userTier = await this.subscriptionService.getUserTier(userId)
    const limits = getTierLimits(userTier)
    
    if (limits.transactionHistoryMonths === 'unlimited') {
      return -1 // -1 indicates unlimited
    }
    
    return limits.transactionHistoryMonths
  }

  /**
   * Check account limit and throw error if exceeded
   */
  async checkAccountLimitWithThrow(userId: string): Promise<void> {
    const canAdd = await this.enforceAccountLimit(userId)
    
    if (!canAdd) {
      const userTier = await this.subscriptionService.getUserTier(userId)
      const limits = getTierLimits(userTier)
      const currentUsage = await this.subscriptionService.getCurrentUsage(userId)
      const accountUsage = currentUsage.find(u => u.metricType === UsageMetricType.CONNECTED_ACCOUNTS)
      
      const requiredTier = userTier === SubscriptionTier.STARTER 
        ? SubscriptionTier.GROWTH 
        : SubscriptionTier.PRO
      
      throw new TierLimitExceededError(
        'Connected accounts',
        accountUsage?.currentValue || 0,
        limits.accounts as number,
        requiredTier
      )
    }
  }

  /**
   * Check balance limit and throw error if exceeded
   */
  async checkBalanceLimitWithThrow(userId: string, totalBalance: number): Promise<void> {
    const canTrack = await this.enforceBalanceLimit(userId, totalBalance)
    
    if (!canTrack) {
      const userTier = await this.subscriptionService.getUserTier(userId)
      const limits = getTierLimits(userTier)
      
      const requiredTier = userTier === SubscriptionTier.STARTER 
        ? SubscriptionTier.GROWTH 
        : SubscriptionTier.PRO
      
      throw new TierLimitExceededError(
        'Total balance tracking',
        totalBalance,
        limits.balanceLimit as number,
        requiredTier
      )
    }
  }

  /**
   * Check feature access and throw error if not available
   */
  async checkFeatureAccessWithThrow(userId: string, feature: string): Promise<void> {
    const hasAccess = await this.enforceFeatureAccess(userId, feature)
    
    if (!hasAccess) {
      const requiredTier = this.getRequiredTierForFeature(feature)
      throw new FeatureNotAvailableError(feature, requiredTier)
    }
  }

  /**
   * Get user's tier limits
   */
  async getUserTierLimits(userId: string): Promise<any> {
    const userTier = await this.subscriptionService.getUserTier(userId)
    return getTierLimits(userTier)
  }

  /**
   * Check if user can add another account
   */
  async canAddAccount(userId: string): Promise<boolean> {
    return this.enforceAccountLimit(userId)
  }

  /**
   * Check if user can track additional balance
   */
  async canTrackBalance(userId: string, additionalBalance: number): Promise<boolean> {
    // Get current total balance from usage metrics
    const currentUsage = await this.subscriptionService.getCurrentUsage(userId)
    const balanceUsage = currentUsage.find(u => u.metricType === UsageMetricType.TOTAL_BALANCE)
    
    const currentBalance = balanceUsage?.currentValue || 0
    const newTotalBalance = currentBalance + additionalBalance
    
    return this.enforceBalanceLimit(userId, newTotalBalance)
  }

  /**
   * Get upgrade suggestions based on current usage and limits
   */
  async getUpgradeSuggestions(userId: string): Promise<{
    shouldUpgrade: boolean
    reasons: string[]
    suggestedTier: SubscriptionTier | null
  }> {
    const userTier = await this.subscriptionService.getUserTier(userId)
    const currentUsage = await this.subscriptionService.getCurrentUsage(userId)
    const limits = getTierLimits(userTier)
    
    const reasons: string[] = []
    let shouldUpgrade = false
    let suggestedTier: SubscriptionTier | null = null

    // Check account limit
    const accountUsage = currentUsage.find(u => u.metricType === UsageMetricType.CONNECTED_ACCOUNTS)
    if (accountUsage && limits.accounts !== 'unlimited') {
      const usagePercentage = (accountUsage.currentValue / (limits.accounts as number)) * 100
      if (usagePercentage >= 80) {
        reasons.push(`You're using ${accountUsage.currentValue}/${limits.accounts} accounts (${Math.round(usagePercentage)}%)`)
        shouldUpgrade = true
      }
    }

    // Check balance limit
    const balanceUsage = currentUsage.find(u => u.metricType === UsageMetricType.TOTAL_BALANCE)
    if (balanceUsage && limits.balanceLimit !== 'unlimited') {
      const usagePercentage = (balanceUsage.currentValue / (limits.balanceLimit as number)) * 100
      if (usagePercentage >= 80) {
        reasons.push(`Your tracked balance is ${Math.round(usagePercentage)}% of your limit`)
        shouldUpgrade = true
      }
    }

    // Suggest appropriate tier
    if (shouldUpgrade) {
      if (userTier === SubscriptionTier.STARTER) {
        suggestedTier = SubscriptionTier.GROWTH
      } else if (userTier === SubscriptionTier.GROWTH) {
        suggestedTier = SubscriptionTier.PRO
      }
    }

    return {
      shouldUpgrade,
      reasons,
      suggestedTier
    }
  }

  /**
   * Get usage summary for a user
   */
  async getUsageSummary(userId: string): Promise<{
    tier: SubscriptionTier
    limits: any
    usage: {
      accounts: { current: number; limit: number | 'unlimited'; percentage: number }
      balance: { current: number; limit: number | 'unlimited'; percentage: number }
    }
  }> {
    const userTier = await this.subscriptionService.getUserTier(userId)
    const limits = getTierLimits(userTier)
    const currentUsage = await this.subscriptionService.getCurrentUsage(userId)

    const accountUsage = currentUsage.find(u => u.metricType === UsageMetricType.CONNECTED_ACCOUNTS)
    const balanceUsage = currentUsage.find(u => u.metricType === UsageMetricType.TOTAL_BALANCE)

    const accountCurrent = accountUsage?.currentValue || 0
    const balanceCurrent = balanceUsage?.currentValue || 0

    const accountPercentage = limits.accounts === 'unlimited' 
      ? 0 
      : Math.round((accountCurrent / (limits.accounts as number)) * 100)
    
    const balancePercentage = limits.balanceLimit === 'unlimited' 
      ? 0 
      : Math.round((balanceCurrent / (limits.balanceLimit as number)) * 100)

    return {
      tier: userTier,
      limits,
      usage: {
        accounts: {
          current: accountCurrent,
          limit: limits.accounts,
          percentage: accountPercentage
        },
        balance: {
          current: balanceCurrent,
          limit: limits.balanceLimit,
          percentage: balancePercentage
        }
      }
    }
  }

  /**
   * Check if user is approaching any limits (80% threshold)
   */
  async isApproachingLimits(userId: string): Promise<{
    approaching: boolean
    warnings: string[]
  }> {
    const summary = await this.getUsageSummary(userId)
    const warnings: string[] = []
    let approaching = false

    if (summary.usage.accounts.percentage >= 80 && summary.usage.accounts.limit !== 'unlimited') {
      warnings.push(`Account limit: ${summary.usage.accounts.current}/${summary.usage.accounts.limit} (${summary.usage.accounts.percentage}%)`)
      approaching = true
    }

    if (summary.usage.balance.percentage >= 80 && summary.usage.balance.limit !== 'unlimited') {
      warnings.push(`Balance limit: $${summary.usage.balance.current.toLocaleString()}/$${(summary.usage.balance.limit as number).toLocaleString()} (${summary.usage.balance.percentage}%)`)
      approaching = true
    }

    return {
      approaching,
      warnings
    }
  }

  /**
   * Get all available features for a user's tier
   */
  async getAvailableFeatures(userId: string): Promise<string[]> {
    const userTier = await this.subscriptionService.getUserTier(userId)
    const limits = getTierLimits(userTier)
    return limits.features
  }

  /**
   * Check if user can perform multiple actions at once
   */
  async canPerformActions(userId: string, actions: string[]): Promise<{
    [action: string]: boolean
  }> {
    const results: { [action: string]: boolean } = {}
    
    for (const action of actions) {
      results[action] = await this.enforceFeatureAccess(userId, action)
    }
    
    return results
  }

  /**
   * Helper method to determine required tier for a feature
   */
  private getRequiredTierForFeature(feature: string): SubscriptionTier {
    // Check which tier first includes this feature
    if (isFeatureAvailable(SubscriptionTier.STARTER, feature)) {
      return SubscriptionTier.STARTER
    }
    if (isFeatureAvailable(SubscriptionTier.GROWTH, feature)) {
      return SubscriptionTier.GROWTH
    }
    return SubscriptionTier.PRO
  }
}