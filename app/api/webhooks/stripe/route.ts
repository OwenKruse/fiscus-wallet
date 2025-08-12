// Stripe Webhook Handler

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { validateWebhookSignature, STRIPE_CONFIG } from '../../../../lib/stripe/stripe-config';
import { SubscriptionService } from '../../../../lib/subscription/subscription-service';
import { prisma } from '../../../../lib/database/prisma-client';
import { SubscriptionTier, SubscriptionStatus, BillingCycle } from '../../../../lib/subscription/tier-config';
import { BillingHistoryData } from '../../../../types/subscription';

// Disable body parsing for webhook
export const runtime = 'nodejs';

// Initialize services
const subscriptionService = new SubscriptionService(prisma);

export async function POST(request: NextRequest) {
  try {
    // Get the raw body
    const body = await request.text();
    
    // Get the signature from headers
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');
    
    if (!signature) {
      console.error('Missing stripe-signature header');
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }
    
    // Validate and construct the event
    let event: Stripe.Event;
    try {
      event = validateWebhookSignature(body, signature);
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 400 }
      );
    }
    
    // Log the event for debugging
    console.log(`Received Stripe webhook: ${event.type}`, {
      eventId: event.id,
      created: event.created,
      livemode: event.livemode,
    });
    
    // Handle the event based on type
    try {
      await handleWebhookEvent(event);
    } catch (error) {
      console.error(`Error handling webhook event ${event.type}:`, error);
      return NextResponse.json(
        { error: 'Error processing webhook event' },
        { status: 500 }
      );
    }
    
    // Return success response
    return NextResponse.json({ received: true }, { status: 200 });
    
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle different webhook event types
async function handleWebhookEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'customer.subscription.created':
      await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
      break;
      
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;
      
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;
      
    case 'invoice.payment_succeeded':
      await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
      break;
      
    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object as Stripe.Invoice);
      break;
      
    case 'customer.created':
      await handleCustomerCreated(event.data.object as Stripe.Customer);
      break;
      
    case 'customer.updated':
      await handleCustomerUpdated(event.data.object as Stripe.Customer);
      break;
      
    case 'payment_intent.succeeded':
      await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
      break;
      
    case 'payment_intent.payment_failed':
      await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
      break;
      
    default:
      console.log(`Unhandled webhook event type: ${event.type}`);
  }
}

// Webhook event handlers
async function handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
  console.log('Handling subscription created:', subscription.id);
  
  const userId = subscription.metadata?.user_id;
  if (!userId) {
    console.error('No user_id in subscription metadata');
    return;
  }
  
  try {
    // Map Stripe subscription status to our status
    const status = mapStripeStatusToSubscriptionStatus(subscription.status);
    const tier = mapStripePriceToTier(subscription.items.data[0]?.price?.id);
    const billingCycle = mapStripePriceToBillingCycle(subscription.items.data[0]?.price?.id);
    
    // Create or update subscription in database
    const existingSubscription = await subscriptionService.getSubscription(userId);
    
    if (existingSubscription) {
      // Update existing subscription
      await subscriptionService.updateSubscription(existingSubscription.id, {
        stripeSubscriptionId: subscription.id,
        tier,
        status,
        billingCycle,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : undefined,
      });
    } else {
      // Create new subscription
      await subscriptionService.createSubscription({
        userId,
        tier,
        billingCycle,
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: subscription.customer as string,
        trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : undefined,
      });
    }
    
    console.log(`Successfully created/updated subscription ${subscription.id} for user ${userId}`);
  } catch (error) {
    console.error(`Error handling subscription created for user ${userId}:`, error);
    throw error;
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  console.log('Handling subscription updated:', subscription.id);
  
  const userId = subscription.metadata?.user_id;
  if (!userId) {
    console.error('No user_id in subscription metadata');
    return;
  }
  
  try {
    // Find existing subscription
    const existingSubscription = await subscriptionService.getSubscription(userId);
    if (!existingSubscription) {
      console.error(`No existing subscription found for user ${userId}`);
      return;
    }
    
    // Map Stripe data to our format
    const status = mapStripeStatusToSubscriptionStatus(subscription.status);
    const tier = mapStripePriceToTier(subscription.items.data[0]?.price?.id);
    const billingCycle = mapStripePriceToBillingCycle(subscription.items.data[0]?.price?.id);
    
    // Update subscription in database
    await subscriptionService.updateSubscription(existingSubscription.id, {
      tier,
      status,
      billingCycle,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : undefined,
    });
    
    console.log(`Successfully updated subscription ${subscription.id} for user ${userId}`);
  } catch (error) {
    console.error(`Error handling subscription updated for user ${userId}:`, error);
    throw error;
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  console.log('Handling subscription deleted:', subscription.id);
  
  const userId = subscription.metadata?.user_id;
  if (!userId) {
    console.error('No user_id in subscription metadata');
    return;
  }
  
  try {
    // Find existing subscription
    const existingSubscription = await subscriptionService.getSubscription(userId);
    if (!existingSubscription) {
      console.error(`No existing subscription found for user ${userId}`);
      return;
    }
    
    // Update subscription to cancelled and downgrade to starter tier
    await subscriptionService.updateSubscription(existingSubscription.id, {
      status: SubscriptionStatus.CANCELED,
      tier: SubscriptionTier.STARTER,
      cancelAtPeriodEnd: false,
      stripeSubscriptionId: null,
    });
    
    console.log(`Successfully cancelled subscription ${subscription.id} for user ${userId}`);
  } catch (error) {
    console.error(`Error handling subscription deleted for user ${userId}:`, error);
    throw error;
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
  console.log('Handling payment succeeded:', invoice.id);
  
  const customerId = invoice.customer as string;
  const subscriptionId = invoice.subscription as string;
  
  if (!subscriptionId) {
    console.log('Invoice not associated with subscription, skipping');
    return;
  }
  
  try {
    // Find user by Stripe customer ID
    const subscription = await prisma.subscription.findFirst({
      where: { stripeCustomerId: customerId },
      select: { id: true, userId: true }
    });
    
    if (!subscription) {
      console.error(`No subscription found for customer ${customerId}`);
      return;
    }
    
    // Record payment in billing history
    await prisma.billingHistory.create({
      data: {
        subscriptionId: subscription.id,
        userId: subscription.userId,
        stripeInvoiceId: invoice.id,
        amount: (invoice.amount_paid || 0) / 100, // Convert from cents
        currency: invoice.currency || 'usd',
        status: 'paid',
        billingReason: invoice.billing_reason || 'subscription_cycle',
        periodStart: new Date((invoice.period_start || 0) * 1000),
        periodEnd: new Date((invoice.period_end || 0) * 1000),
        paidAt: new Date(),
      }
    });
    
    // Update subscription status to active if it was past due
    await prisma.subscription.updateMany({
      where: {
        id: subscription.id,
        status: {
          in: [SubscriptionStatus.PAST_DUE, SubscriptionStatus.UNPAID]
        }
      },
      data: {
        status: SubscriptionStatus.ACTIVE,
        updatedAt: new Date(),
      }
    });
    
    console.log(`Successfully recorded payment for invoice ${invoice.id}, user ${subscription.userId}`);
  } catch (error) {
    console.error(`Error handling payment succeeded for invoice ${invoice.id}:`, error);
    throw error;
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  console.log('Handling payment failed:', invoice.id);
  
  const customerId = invoice.customer as string;
  const subscriptionId = invoice.subscription as string;
  
  if (!subscriptionId) {
    console.log('Invoice not associated with subscription, skipping');
    return;
  }
  
  try {
    // Find user by Stripe customer ID
    const subscription = await prisma.subscription.findFirst({
      where: { stripeCustomerId: customerId },
      select: { id: true, userId: true }
    });
    
    if (!subscription) {
      console.error(`No subscription found for customer ${customerId}`);
      return;
    }
    
    // Record failed payment in billing history
    await prisma.billingHistory.create({
      data: {
        subscriptionId: subscription.id,
        userId: subscription.userId,
        stripeInvoiceId: invoice.id,
        amount: (invoice.amount_due || 0) / 100, // Convert from cents
        currency: invoice.currency || 'usd',
        status: 'failed',
        billingReason: invoice.billing_reason || 'subscription_cycle',
        periodStart: new Date((invoice.period_start || 0) * 1000),
        periodEnd: new Date((invoice.period_end || 0) * 1000),
        paidAt: null,
      }
    });
    
    // Update subscription status to past due
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: SubscriptionStatus.PAST_DUE,
        updatedAt: new Date(),
      }
    });
    
    console.log(`Successfully recorded failed payment for invoice ${invoice.id}, user ${subscription.userId}`);
  } catch (error) {
    console.error(`Error handling payment failed for invoice ${invoice.id}:`, error);
    throw error;
  }
}

async function handleCustomerCreated(customer: Stripe.Customer): Promise<void> {
  console.log('Handling customer created:', customer.id);
  
  const userId = customer.metadata?.user_id;
  if (!userId) {
    console.error('No user_id in customer metadata');
    return;
  }
  
  try {
    // Update user's subscription record with Stripe customer ID
    const existingSubscription = await subscriptionService.getSubscription(userId);
    
    if (existingSubscription) {
      await subscriptionService.updateSubscription(existingSubscription.id, {
        stripeCustomerId: customer.id,
      });
    } else {
      // Create a starter subscription for the user
      await subscriptionService.createSubscription({
        userId,
        tier: SubscriptionTier.STARTER,
        billingCycle: BillingCycle.MONTHLY,
        stripeCustomerId: customer.id,
      });
    }
    
    console.log(`Successfully linked customer ${customer.id} to user ${userId}`);
  } catch (error) {
    console.error(`Error handling customer created for user ${userId}:`, error);
    throw error;
  }
}

async function handleCustomerUpdated(customer: Stripe.Customer): Promise<void> {
  console.log('Handling customer updated:', customer.id);
  
  const userId = customer.metadata?.user_id;
  if (!userId) {
    console.error('No user_id in customer metadata');
    return;
  }
  
  try {
    // Find subscription by customer ID and update if needed
    const subscription = await prisma.subscription.findFirst({
      where: { stripeCustomerId: customer.id },
      select: { id: true }
    });
    
    if (subscription) {
      // Update subscription record with any customer changes
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { updatedAt: new Date() }
      });
    }
    
    console.log(`Successfully handled customer update for ${customer.id}, user ${userId}`);
  } catch (error) {
    console.error(`Error handling customer updated for user ${userId}:`, error);
    throw error;
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
  console.log('Handling payment intent succeeded:', paymentIntent.id);
  
  const customerId = paymentIntent.customer as string;
  
  if (!customerId) {
    console.log('Payment intent not associated with customer, skipping');
    return;
  }
  
  try {
    // Find user by Stripe customer ID
    const subscription = await prisma.subscription.findFirst({
      where: { stripeCustomerId: customerId },
      select: { id: true, userId: true }
    });
    
    if (!subscription) {
      console.log(`No subscription found for customer ${customerId}`);
      return;
    }
    
    // Log successful payment intent (this might be for one-time payments or setup)
    console.log(`Payment intent ${paymentIntent.id} succeeded for user ${subscription.userId}`);
    
    // If this is related to subscription setup, the subscription webhook will handle the main logic
  } catch (error) {
    console.error(`Error handling payment intent succeeded for ${paymentIntent.id}:`, error);
    throw error;
  }
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
  console.log('Handling payment intent failed:', paymentIntent.id);
  
  const customerId = paymentIntent.customer as string;
  
  if (!customerId) {
    console.log('Payment intent not associated with customer, skipping');
    return;
  }
  
  try {
    // Find user by Stripe customer ID
    const subscription = await prisma.subscription.findFirst({
      where: { stripeCustomerId: customerId },
      select: { id: true, userId: true }
    });
    
    if (!subscription) {
      console.log(`No subscription found for customer ${customerId}`);
      return;
    }
    
    // Log failed payment intent
    console.error(`Payment intent ${paymentIntent.id} failed for user ${subscription.userId}:`, paymentIntent.last_payment_error?.message);
    
    // The invoice.payment_failed webhook will handle subscription status updates
  } catch (error) {
    console.error(`Error handling payment intent failed for ${paymentIntent.id}:`, error);
    throw error;
  }
}

// Helper functions to map Stripe data to our internal types
function mapStripeStatusToSubscriptionStatus(stripeStatus: string): SubscriptionStatus {
  switch (stripeStatus) {
    case 'active':
      return SubscriptionStatus.ACTIVE;
    case 'canceled':
      return SubscriptionStatus.CANCELED;
    case 'past_due':
      return SubscriptionStatus.PAST_DUE;
    case 'unpaid':
      return SubscriptionStatus.UNPAID;
    case 'trialing':
      return SubscriptionStatus.TRIALING;
    default:
      return SubscriptionStatus.ACTIVE;
  }
}

function mapStripePriceToTier(priceId?: string): SubscriptionTier {
  if (!priceId) return SubscriptionTier.STARTER;
  
  // This would need to match your actual Stripe price IDs
  // For now, using a simple mapping based on common patterns
  if (priceId.includes('growth') || priceId.includes('basic')) {
    return SubscriptionTier.GROWTH;
  } else if (priceId.includes('pro') || priceId.includes('premium')) {
    return SubscriptionTier.PRO;
  }
  
  return SubscriptionTier.STARTER;
}

function mapStripePriceToBillingCycle(priceId?: string): BillingCycle {
  if (!priceId) return BillingCycle.MONTHLY;
  
  // This would need to match your actual Stripe price IDs
  if (priceId.includes('year') || priceId.includes('annual')) {
    return BillingCycle.YEARLY;
  }
  
  return BillingCycle.MONTHLY;
}