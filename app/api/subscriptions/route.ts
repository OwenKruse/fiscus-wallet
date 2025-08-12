import { NextRequest, NextResponse } from 'next/server'
import { withApiAuth, withApiLogging, withValidation } from '../../../lib/auth/api-middleware'
import { SubscriptionService } from '../../../lib/subscription/subscription-service'
import { PrismaClient } from '@prisma/client'
import { SubscriptionTier, BillingCycle } from '../../../lib/subscription/tier-config'
import { CreateSubscriptionData } from '../../../lib/subscription/types'

const prisma = new PrismaClient()
const subscriptionService = new SubscriptionService(prisma)

// Validation schemas
function validateCreateSubscription(body: any): { isValid: boolean; errors: string[]; data?: CreateSubscriptionData } {
  const errors: string[] = []
  
  if (!body.tier || !Object.values(SubscriptionTier).includes(body.tier)) {
    errors.push('Valid tier is required (STARTER, GROWTH, PRO)')
  }
  
  if (!body.billingCycle || !Object.values(BillingCycle).includes(body.billingCycle)) {
    errors.push('Valid billing cycle is required (MONTHLY, YEARLY)')
  }
  
  if (body.stripeCustomerId && typeof body.stripeCustomerId !== 'string') {
    errors.push('stripeCustomerId must be a string')
  }
  
  if (body.stripeSubscriptionId && typeof body.stripeSubscriptionId !== 'string') {
    errors.push('stripeSubscriptionId must be a string')
  }
  
  if (body.trialEnd && isNaN(Date.parse(body.trialEnd))) {
    errors.push('trialEnd must be a valid date')
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    data: errors.length === 0 ? {
      userId: '', // Will be set from auth context
      tier: body.tier,
      billingCycle: body.billingCycle,
      stripeCustomerId: body.stripeCustomerId,
      stripeSubscriptionId: body.stripeSubscriptionId,
      trialEnd: body.trialEnd ? new Date(body.trialEnd) : undefined
    } : undefined
  }
}

// GET /api/subscriptions - Get user's subscription
async function handleGetSubscription(request: NextRequest, context: any) {
  try {
    const subscription = await subscriptionService.getSubscription(context.user.id)
    
    if (!subscription) {
      return NextResponse.json({
        success: true,
        data: null,
        message: 'No subscription found'
      })
    }
    
    return NextResponse.json({
      success: true,
      data: subscription
    })
  } catch (error) {
    console.error('Get subscription error:', error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'SUBSCRIPTION_FETCH_ERROR',
        message: 'Failed to fetch subscription'
      }
    }, { status: 500 })
  }
}

// POST /api/subscriptions - Create new subscription
async function handleCreateSubscription(request: NextRequest, context: any, body: CreateSubscriptionData) {
  try {
    // Check if user already has a subscription
    const existingSubscription = await subscriptionService.getSubscription(context.user.id)
    if (existingSubscription) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'SUBSCRIPTION_EXISTS',
          message: 'User already has a subscription'
        }
      }, { status: 409 })
    }
    
    // Set userId from auth context
    body.userId = context.user.id
    
    const subscription = await subscriptionService.createSubscription(body)
    
    return NextResponse.json({
      success: true,
      data: subscription,
      message: 'Subscription created successfully'
    }, { status: 201 })
  } catch (error) {
    console.error('Create subscription error:', error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'SUBSCRIPTION_CREATE_ERROR',
        message: 'Failed to create subscription'
      }
    }, { status: 500 })
  }
}

// PUT /api/subscriptions - Update subscription
async function handleUpdateSubscription(request: NextRequest, context: any) {
  try {
    const body = await request.json()
    
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
    
    // Validate update data
    const allowedUpdates = ['tier', 'billingCycle', 'stripeCustomerId', 'stripeSubscriptionId', 'cancelAtPeriodEnd']
    const updates: any = {}
    
    for (const key of allowedUpdates) {
      if (body[key] !== undefined) {
        updates[key] = body[key]
      }
    }
    
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'NO_UPDATES',
          message: 'No valid updates provided'
        }
      }, { status: 400 })
    }
    
    // Validate tier if provided
    if (updates.tier && !Object.values(SubscriptionTier).includes(updates.tier)) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_TIER',
          message: 'Invalid subscription tier'
        }
      }, { status: 400 })
    }
    
    // Validate billing cycle if provided
    if (updates.billingCycle && !Object.values(BillingCycle).includes(updates.billingCycle)) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_BILLING_CYCLE',
          message: 'Invalid billing cycle'
        }
      }, { status: 400 })
    }
    
    const updatedSubscription = await subscriptionService.updateSubscription(currentSubscription.id, updates)
    
    return NextResponse.json({
      success: true,
      data: updatedSubscription,
      message: 'Subscription updated successfully'
    })
  } catch (error) {
    console.error('Update subscription error:', error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'SUBSCRIPTION_UPDATE_ERROR',
        message: 'Failed to update subscription'
      }
    }, { status: 500 })
  }
}

// DELETE /api/subscriptions - Cancel subscription
async function handleCancelSubscription(request: NextRequest, context: any) {
  try {
    const url = new URL(request.url)
    const cancelAtPeriodEnd = url.searchParams.get('cancelAtPeriodEnd') === 'true'
    
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
    
    const canceledSubscription = await subscriptionService.cancelSubscription(
      currentSubscription.id, 
      cancelAtPeriodEnd
    )
    
    return NextResponse.json({
      success: true,
      data: canceledSubscription,
      message: cancelAtPeriodEnd 
        ? 'Subscription will be canceled at the end of the current period'
        : 'Subscription canceled immediately'
    })
  } catch (error) {
    console.error('Cancel subscription error:', error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'SUBSCRIPTION_CANCEL_ERROR',
        message: 'Failed to cancel subscription'
      }
    }, { status: 500 })
  }
}

// Route handlers
export const GET = withApiLogging(
  withApiAuth(handleGetSubscription),
  'get-subscription'
)

export const POST = withApiLogging(
  withApiAuth(
    withValidation(handleCreateSubscription, validateCreateSubscription)
  ),
  'create-subscription'
)

export const PUT = withApiLogging(
  withApiAuth(handleUpdateSubscription),
  'update-subscription'
)

export const DELETE = withApiLogging(
  withApiAuth(handleCancelSubscription),
  'cancel-subscription'
)