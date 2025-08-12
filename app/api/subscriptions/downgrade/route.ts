import { NextRequest, NextResponse } from 'next/server'
import { withApiAuth, withApiLogging, withValidation } from '../../../../lib/auth/api-middleware'
import { SubscriptionService } from '../../../../lib/subscription/subscription-service'
import { PrismaClient } from '@prisma/client'
import { SubscriptionTier, BillingCycle, getPreviousTier, canAccessFeature } from '../../../../lib/subscription/tier-config'

const prisma = new PrismaClient()
const subscriptionService = new SubscriptionService(prisma)

interface DowngradeRequest {
  targetTier?: SubscriptionTier
  billingCycle?: BillingCycle
  cancelAtPeriodEnd?: boolean
  stripeSubscriptionId?: string
}

// Validation for downgrade request
function validateDowngradeRequest(body: any): { isValid: boolean; errors: string[]; data?: DowngradeRequest } {
  const errors: string[] = []
  
  if (body.targetTier && !Object.values(SubscriptionTier).includes(body.targetTier)) {
    errors.push('Invalid target tier')
  }
  
  if (body.billingCycle && !Object.values(BillingCycle).includes(body.billingCycle)) {
    errors.push('Invalid billing cycle')
  }
  
  if (body.cancelAtPeriodEnd !== undefined && typeof body.cancelAtPeriodEnd !== 'boolean') {
    errors.push('cancelAtPeriodEnd must be a boolean')
  }
  
  if (body.stripeSubscriptionId && typeof body.stripeSubscriptionId !== 'string') {
    errors.push('stripeSubscriptionId must be a string')
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    data: errors.length === 0 ? body : undefined
  }
}

// POST /api/subscriptions/downgrade - Downgrade subscription
async function handleDowngradeSubscription(request: NextRequest, context: any, body: DowngradeRequest) {
  try {
    // Get user's current subscription
    const currentSubscription = await subscriptionService.getSubscription(context.user.id)
    if (!currentSubscription) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'SUBSCRIPTION_NOT_FOUND',
          message: 'No subscription found for user'
        }
      }, { status: 404 })
    }
    
    // Determine target tier
    let targetTier = body.targetTier
    if (!targetTier) {
      // If no target tier specified, downgrade to previous tier
      targetTier = getPreviousTier(currentSubscription.tier)
      if (!targetTier) {
        return NextResponse.json({
          success: false,
          error: {
            code: 'ALREADY_MIN_TIER',
            message: 'Already on the lowest tier'
          }
        }, { status: 400 })
      }
    }
    
    // Validate that target tier is actually a downgrade (target tier should be lower)
    const tierOrder = [SubscriptionTier.STARTER, SubscriptionTier.GROWTH, SubscriptionTier.PRO]
    const currentTierIndex = tierOrder.indexOf(currentSubscription.tier)
    const targetTierIndex = tierOrder.indexOf(targetTier)
    
    if (targetTierIndex >= currentTierIndex) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_DOWNGRADE',
          message: 'Target tier must be lower than current tier'
        }
      }, { status: 400 })
    }
    
    // Check if already on target tier
    if (currentSubscription.tier === targetTier) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'ALREADY_ON_TIER',
          message: 'Already on the requested tier'
        }
      }, { status: 400 })
    }
    
    // Check current usage against target tier limits to warn user
    const currentUsage = await subscriptionService.getCurrentUsage(context.user.id)
    const warnings: string[] = []
    
    // This is a simplified check - in a real implementation, you'd want more comprehensive validation
    for (const usage of currentUsage) {
      if (usage.metricType === 'connected_accounts' && targetTier === SubscriptionTier.STARTER && usage.currentValue > 3) {
        warnings.push(`You have ${usage.currentValue} connected accounts, but Starter tier only allows 3. Some accounts may be disconnected.`)
      }
      if (usage.metricType === 'total_balance' && targetTier === SubscriptionTier.STARTER && usage.currentValue > 15000) {
        warnings.push(`Your total balance is $${usage.currentValue.toLocaleString()}, but Starter tier only tracks up to $15,000.`)
      }
    }
    
    // Prepare update data
    const updateData: any = {
      tier: targetTier
    }
    
    // Update billing cycle if provided
    if (body.billingCycle) {
      updateData.billingCycle = body.billingCycle
    }
    
    // Set cancel at period end if provided
    if (body.cancelAtPeriodEnd !== undefined) {
      updateData.cancelAtPeriodEnd = body.cancelAtPeriodEnd
    }
    
    // Update Stripe subscription ID if provided
    if (body.stripeSubscriptionId) {
      updateData.stripeSubscriptionId = body.stripeSubscriptionId
    }
    
    // Update the subscription
    const downgradedSubscription = await subscriptionService.updateSubscription(
      currentSubscription.id,
      updateData
    )
    
    return NextResponse.json({
      success: true,
      data: {
        subscription: downgradedSubscription,
        previousTier: currentSubscription.tier,
        newTier: targetTier,
        warnings: warnings.length > 0 ? warnings : undefined
      },
      message: `Successfully downgraded from ${currentSubscription.tier} to ${targetTier}${warnings.length > 0 ? ' (with warnings)' : ''}`
    })
  } catch (error) {
    console.error('Downgrade subscription error:', error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'SUBSCRIPTION_DOWNGRADE_ERROR',
        message: 'Failed to downgrade subscription'
      }
    }, { status: 500 })
  }
}

export const POST = withApiLogging(
  withApiAuth(
    withValidation(handleDowngradeSubscription, validateDowngradeRequest)
  ),
  'downgrade-subscription'
)