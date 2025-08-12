/**
 * Example usage of the SubscriptionService
 * This file demonstrates how to use the core subscription functionality
 */

import { 
  SubscriptionService,
  SubscriptionTier,
  BillingCycle,
  UsageMetricType,
  getTierLimits,
  getTierPricing,
  isFeatureAvailable
} from './index'

async function exampleUsage() {
  const subscriptionService = new SubscriptionService()
  const userId = 'example-user-123'

  // 1. Create a new subscription for a user
  console.log('Creating new subscription...')
  const subscription = await subscriptionService.createSubscription({
    userId,
    tier: SubscriptionTier.STARTER,
    billingCycle: BillingCycle.MONTHLY
  })
  console.log('Created subscription:', subscription.id, 'for user:', userId)

  // 2. Check tier limits
  const starterLimits = getTierLimits(SubscriptionTier.STARTER)
  console.log('Starter tier limits:', starterLimits)

  // 3. Track usage
  console.log('Tracking account connections...')
  await subscriptionService.trackUsage(userId, UsageMetricType.CONNECTED_ACCOUNTS, 2)
  
  // 4. Check if user is within limits
  const withinLimit = await subscriptionService.checkUsageLimit(userId, UsageMetricType.CONNECTED_ACCOUNTS)
  console.log('Within account limit:', withinLimit)

  // 5. Get current usage
  const usage = await subscriptionService.getCurrentUsage(userId)
  console.log('Current usage:', usage.map(u => ({
    type: u.metricType,
    current: u.currentValue,
    limit: u.limitValue
  })))

  // 6. Check feature availability
  const canExport = await subscriptionService.canPerformAction(userId, 'csv_export')
  console.log('Can export CSV:', canExport)

  // 7. Upgrade to Growth tier
  console.log('Upgrading to Growth tier...')
  const upgraded = await subscriptionService.updateSubscription(subscription.id, {
    tier: SubscriptionTier.GROWTH
  })
  console.log('Upgraded to:', upgraded.tier)

  // 8. Check feature availability after upgrade
  const canExportAfterUpgrade = await subscriptionService.canPerformAction(userId, 'csv_export')
  console.log('Can export CSV after upgrade:', canExportAfterUpgrade)

  // 9. Get pricing information
  const growthMonthlyPrice = getTierPricing(SubscriptionTier.GROWTH, BillingCycle.MONTHLY)
  const growthYearlyPrice = getTierPricing(SubscriptionTier.GROWTH, BillingCycle.YEARLY)
  console.log('Growth pricing - Monthly:', growthMonthlyPrice, 'Yearly:', growthYearlyPrice)

  // 10. Check if specific features are available for tiers
  console.log('AI insights available for Growth:', isFeatureAvailable(SubscriptionTier.GROWTH, 'ai_insights'))
  console.log('AI insights available for Pro:', isFeatureAvailable(SubscriptionTier.PRO, 'ai_insights'))

  // 11. Cancel subscription
  console.log('Canceling subscription at period end...')
  const canceled = await subscriptionService.cancelSubscription(subscription.id, true)
  console.log('Subscription canceled at period end:', canceled.cancelAtPeriodEnd)
}

// Uncomment to run the example
// exampleUsage().catch(console.error)

export { exampleUsage }