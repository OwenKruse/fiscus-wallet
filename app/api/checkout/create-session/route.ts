import { NextRequest, NextResponse } from 'next/server'
import { withApiAuth, withApiLogging, withValidation } from '../../../../lib/auth/api-middleware'
import { stripeService } from '../../../../lib/stripe/stripe-service'
import { SubscriptionService } from '../../../../lib/subscription/subscription-service'
import { PrismaClient } from '@prisma/client'
import { SubscriptionTier, BillingCycle } from '../../../../lib/subscription/tier-config'

const prisma = new PrismaClient()
const subscriptionService = new SubscriptionService(prisma)

interface CreateCheckoutSessionRequest {
  tier: SubscriptionTier
  billingCycle: BillingCycle
  successUrl?: string
  cancelUrl?: string
}

// Validation for checkout session request
function validateCheckoutSessionRequest(body: any): { isValid: boolean; errors: string[]; data?: CreateCheckoutSessionRequest } {
  const errors: string[] = []
  
  if (!body.tier || !Object.values(SubscriptionTier).includes(body.tier)) {
    errors.push('Valid tier is required')
  }
  
  if (!body.billingCycle || !Object.values(BillingCycle).includes(body.billingCycle)) {
    errors.push('Valid billing cycle is required')
  }
  
  if (body.tier === SubscriptionTier.STARTER) {
    errors.push('Cannot create checkout session for free tier')
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    data: errors.length === 0 ? body : undefined
  }
}

// POST /api/checkout/create-session - Create Stripe checkout session (Mock for testing)
async function handleCreateCheckoutSession(request: NextRequest, context: any, body: CreateCheckoutSessionRequest) {
  try {
    const userId = context.user.id
    
    // For testing purposes, we'll directly upgrade the subscription
    // In production, this would create a real Stripe checkout session
    
    // Check if user already has a subscription
    let subscription = await subscriptionService.getSubscription(userId)
    
    if (!subscription) {
      // Create a new subscription
      subscription = await subscriptionService.createSubscription({
        userId,
        tier: body.tier,
        billingCycle: body.billingCycle,
        stripeCustomerId: `cus_mock_${userId}`,
        stripeSubscriptionId: `sub_mock_${userId}_${Date.now()}`
      })
    } else {
      // Update existing subscription
      subscription = await subscriptionService.updateSubscription(subscription.id, {
        tier: body.tier,
        billingCycle: body.billingCycle,
        stripeSubscriptionId: subscription.stripeSubscriptionId || `sub_mock_${userId}_${Date.now()}`
      })
    }
    
    // For testing, we'll return a mock success URL that redirects to settings
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const successUrl = body.successUrl || `${baseUrl}/settings?tab=subscription&success=true`
    
    return NextResponse.json({
      success: true,
      data: {
        sessionId: `cs_mock_${Date.now()}`,
        url: successUrl,
        customerId: subscription.stripeCustomerId,
        subscription: {
          id: subscription.id,
          tier: subscription.tier,
          billingCycle: subscription.billingCycle
        }
      },
      message: `Successfully upgraded to ${body.tier} (${body.billingCycle})`
    })
  } catch (error) {
    console.error('Create checkout session error:', error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'CHECKOUT_SESSION_ERROR',
        message: 'Failed to create checkout session'
      }
    }, { status: 500 })
  }
}

export const POST = withApiLogging(
  withApiAuth(
    withValidation(handleCreateCheckoutSession, validateCheckoutSessionRequest)
  ),
  'create-checkout-session'
)