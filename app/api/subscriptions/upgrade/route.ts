import { NextRequest, NextResponse } from 'next/server'
import { withApiAuth, withApiLogging, withValidation } from '../../../../lib/auth/api-middleware'
import { SubscriptionService } from '../../../../lib/subscription/subscription-service'
import { PrismaClient } from '@prisma/client'
import { SubscriptionTier, BillingCycle, getNextTier, canAccessFeature } from '../../../../lib/subscription/tier-config'

const prisma = new PrismaClient()
const subscriptionService = new SubscriptionService(prisma)

interface UpgradeRequest {
  targetTier?: SubscriptionTier
  billingCycle?: BillingCycle
  stripeSubscriptionId?: string
}

// Validation for upgrade request
function validateUpgradeRequest(body: any): { isValid: boolean; errors: string[]; data?: UpgradeRequest } {
  const errors: string[] = []
  
  if (body.targetTier && !Object.values(SubscriptionTier).includes(body.targetTier)) {
    errors.push('Invalid target tier')
  }
  
  if (body.billingCycle && !Object.values(BillingCycle).includes(body.billingCycle)) {
    errors.push('Invalid billing cycle')
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

// POST /api/subscriptions/upgrade - Upgrade subscription
async function handleUpgradeSubscription(request: NextRequest, context: any, body: UpgradeRequest) {
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
      // If no target tier specified, upgrade to next tier
      targetTier = getNextTier(currentSubscription.tier)
      if (!targetTier) {
        return NextResponse.json({
          success: false,
          error: {
            code: 'ALREADY_MAX_TIER',
            message: 'Already on the highest tier'
          }
        }, { status: 400 })
      }
    }
    
    // Validate that target tier is actually an upgrade (target tier should be higher)
    const tierOrder = [SubscriptionTier.STARTER, SubscriptionTier.GROWTH, SubscriptionTier.PRO]
    const currentTierIndex = tierOrder.indexOf(currentSubscription.tier)
    const targetTierIndex = tierOrder.indexOf(targetTier)
    
    if (targetTierIndex <= currentTierIndex) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_UPGRADE',
          message: 'Target tier must be higher than current tier'
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
    
    // Prepare update data
    const updateData: any = {
      tier: targetTier
    }
    
    // Update billing cycle if provided
    if (body.billingCycle) {
      updateData.billingCycle = body.billingCycle
    }
    
    // Update Stripe subscription ID if provided
    if (body.stripeSubscriptionId) {
      updateData.stripeSubscriptionId = body.stripeSubscriptionId
    }
    
    // Update the subscription
    const upgradedSubscription = await subscriptionService.updateSubscription(
      currentSubscription.id,
      updateData
    )
    
    return NextResponse.json({
      success: true,
      data: {
        subscription: upgradedSubscription,
        previousTier: currentSubscription.tier,
        newTier: targetTier
      },
      message: `Successfully upgraded from ${currentSubscription.tier} to ${targetTier}`
    })
  } catch (error) {
    console.error('Upgrade subscription error:', error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'SUBSCRIPTION_UPGRADE_ERROR',
        message: 'Failed to upgrade subscription'
      }
    }, { status: 500 })
  }
}

export const POST = withApiLogging(
  withApiAuth(
    withValidation(handleUpgradeSubscription, validateUpgradeRequest)
  ),
  'upgrade-subscription'
)