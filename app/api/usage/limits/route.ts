import { NextRequest, NextResponse } from 'next/server'
import { withApiAuth, withApiLogging } from '../../../../lib/auth/api-middleware'
import { SubscriptionService } from '../../../../lib/subscription/subscription-service'
import { UsageTrackingService } from '../../../../lib/subscription/usage-tracking-service'
import { PrismaClient } from '@prisma/client'
import { getTierLimits, TIER_CONFIGS } from '../../../../lib/subscription/tier-config'

const prisma = new PrismaClient()
const subscriptionService = new SubscriptionService(prisma)
const usageTrackingService = new UsageTrackingService(prisma)

// GET /api/usage/limits - Get tier limits and current usage
async function handleGetUsageLimits(request: NextRequest, context: any) {
  try {
    // Get user's current tier
    const userTier = await subscriptionService.getUserTier(context.user.id)
    const tierLimits = getTierLimits(userTier)
    
    // Get current usage status
    const usageStatus = await usageTrackingService.getUsageLimitStatus(context.user.id)
    
    // Get subscription details
    const subscription = await subscriptionService.getSubscription(context.user.id)
    
    // Format response with comprehensive limit information
    const response = {
      subscription: {
        tier: userTier,
        status: subscription?.status || 'ACTIVE',
        billingCycle: subscription?.billingCycle || 'MONTHLY',
        currentPeriodStart: subscription?.currentPeriodStart,
        currentPeriodEnd: subscription?.currentPeriodEnd
      },
      limits: {
        accounts: tierLimits.accounts,
        balanceLimit: tierLimits.balanceLimit,
        transactionHistoryMonths: tierLimits.transactionHistoryMonths,
        syncFrequency: tierLimits.syncFrequency,
        features: tierLimits.features,
        support: tierLimits.support
      },
      usage: usageStatus,
      tierComparison: {
        current: userTier,
        available: Object.keys(TIER_CONFIGS).map(tier => ({
          tier,
          limits: TIER_CONFIGS[tier as keyof typeof TIER_CONFIGS],
          pricing: getTierPricing(tier as any)
        }))
      },
      timestamp: new Date().toISOString()
    }
    
    return NextResponse.json({
      success: true,
      data: response
    })
  } catch (error) {
    console.error('Get usage limits error:', error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'USAGE_LIMITS_FETCH_ERROR',
        message: 'Failed to fetch usage limits'
      }
    }, { status: 500 })
  }
}

// Helper function to get tier pricing information
function getTierPricing(tier: string) {
  const pricing = {
    STARTER: { monthly: 0, yearly: 0 },
    GROWTH: { monthly: 5, yearly: 50 },
    PRO: { monthly: 15, yearly: 150 }
  }
  
  return pricing[tier as keyof typeof pricing] || { monthly: 0, yearly: 0 }
}

// Route handlers
export const GET = withApiLogging(
  withApiAuth(handleGetUsageLimits),
  'get-usage-limits'
)