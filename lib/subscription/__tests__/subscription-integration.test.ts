import { describe, it, expect, beforeEach } from 'vitest'
import { SubscriptionService } from '../subscription-service'
import { 
  SubscriptionTier, 
  BillingCycle 
} from '../tier-config'
import { UsageMetricType } from '../types'

describe('SubscriptionService Integration', () => {
  let service: SubscriptionService

  beforeEach(() => {
    service = new SubscriptionService()
  })

  it('should handle complete subscription lifecycle', async () => {
    const userId = 'integration-user-1'

    // 1. Create a new subscription
    const subscription = await service.createSubscription({
      userId,
      tier: SubscriptionTier.STARTER,
      billingCycle: BillingCycle.MONTHLY
    })

    expect(subscription.userId).toBe(userId)
    expect(subscription.tier).toBe(SubscriptionTier.STARTER)

    // 2. Track some usage
    await service.trackUsage(userId, UsageMetricType.CONNECTED_ACCOUNTS, 2)
    
    // 3. Check usage is within limits
    const withinLimit = await service.checkUsageLimit(userId, UsageMetricType.CONNECTED_ACCOUNTS)
    expect(withinLimit).toBe(true)

    // 4. Get current usage
    const usage = await service.getCurrentUsage(userId)
    const accountsUsage = usage.find(m => m.metricType === UsageMetricType.CONNECTED_ACCOUNTS)
    expect(accountsUsage?.currentValue).toBe(2)
    expect(accountsUsage?.limitValue).toBe(3)

    // 5. Upgrade to Growth tier
    const upgraded = await service.updateSubscription(subscription.id, {
      tier: SubscriptionTier.GROWTH
    })

    expect(upgraded.tier).toBe(SubscriptionTier.GROWTH)

    // 6. Verify limits updated
    const updatedUsage = await service.getCurrentUsage(userId)
    const updatedAccountsUsage = updatedUsage.find(m => m.metricType === UsageMetricType.CONNECTED_ACCOUNTS)
    expect(updatedAccountsUsage?.limitValue).toBe(10)

    // 7. Check feature access
    const canExport = await service.canPerformAction(userId, 'csv_export')
    expect(canExport).toBe(true)

    // 8. Cancel subscription
    const canceled = await service.cancelSubscription(subscription.id, true)
    expect(canceled.cancelAtPeriodEnd).toBe(true)
  })

  it('should enforce tier limits correctly', async () => {
    const userId = 'integration-user-2'

    // Create starter subscription
    await service.createSubscription({
      userId,
      tier: SubscriptionTier.STARTER,
      billingCycle: BillingCycle.MONTHLY
    })

    // Track usage up to limit
    await service.trackUsage(userId, UsageMetricType.CONNECTED_ACCOUNTS, 3)
    
    // Should be at limit now
    const atLimit = await service.checkUsageLimit(userId, UsageMetricType.CONNECTED_ACCOUNTS)
    expect(atLimit).toBe(false)

    // Feature should not be available
    const canExport = await service.canPerformAction(userId, 'csv_export')
    expect(canExport).toBe(false)
  })

  it('should handle tier upgrades and downgrades', async () => {
    const userId = 'integration-user-3'

    // Start with Growth tier
    const subscription = await service.createSubscription({
      userId,
      tier: SubscriptionTier.GROWTH,
      billingCycle: BillingCycle.YEARLY
    })

    // Verify Growth tier features
    expect(await service.canPerformAction(userId, 'csv_export')).toBe(true)
    expect(await service.canPerformAction(userId, 'ai_insights')).toBe(false)

    // Upgrade to Pro
    await service.updateSubscription(subscription.id, {
      tier: SubscriptionTier.PRO
    })

    // Verify Pro tier features
    expect(await service.canPerformAction(userId, 'csv_export')).toBe(true)
    expect(await service.canPerformAction(userId, 'ai_insights')).toBe(true)

    // Downgrade back to Starter
    await service.updateSubscription(subscription.id, {
      tier: SubscriptionTier.STARTER
    })

    // Verify Starter tier limitations
    expect(await service.canPerformAction(userId, 'csv_export')).toBe(false)
    expect(await service.canPerformAction(userId, 'ai_insights')).toBe(false)
    expect(await service.canPerformAction(userId, 'basic_budgeting')).toBe(true)
  })
})