// Stripe Configuration Service

import Stripe from 'stripe';
import { getStripeConfig, isProduction } from '../config';

// Initialize Stripe instance
let stripeInstance: Stripe | null = null;

export function getStripeInstance(): Stripe {
  if (!stripeInstance) {
    const config = getStripeConfig();
    
    stripeInstance = new Stripe(config.secretKey, {
      apiVersion: '2024-12-18.acacia',
      typescript: true,
      telemetry: false,
      maxNetworkRetries: 3,
      timeout: 30000,
    });
  }
  
  return stripeInstance;
}

// Stripe configuration constants
export const STRIPE_CONFIG = {
  // API Version
  API_VERSION: '2024-12-18.acacia' as const,
  
  // Currency
  DEFAULT_CURRENCY: 'usd' as const,
  
  // Webhook events we handle
  WEBHOOK_EVENTS: [
    'customer.subscription.created',
    'customer.subscription.updated',
    'customer.subscription.deleted',
    'invoice.payment_succeeded',
    'invoice.payment_failed',
    'customer.created',
    'customer.updated',
    'payment_intent.succeeded',
    'payment_intent.payment_failed',
  ] as const,
  
  // Price IDs for different tiers and billing cycles
  PRICE_IDS: {
    GROWTH: {
      MONTHLY: isProduction() ? 'price_growth_monthly_prod' : 'price_growth_monthly_test',
      YEARLY: isProduction() ? 'price_growth_yearly_prod' : 'price_growth_yearly_test',
    },
    PRO: {
      MONTHLY: isProduction() ? 'price_pro_monthly_prod' : 'price_pro_monthly_test',
      YEARLY: isProduction() ? 'price_pro_yearly_prod' : 'price_pro_yearly_test',
    },
  } as const,
  
  // Subscription metadata keys
  METADATA_KEYS: {
    USER_ID: 'user_id',
    TIER: 'tier',
    BILLING_CYCLE: 'billing_cycle',
    UPGRADED_FROM: 'upgraded_from',
    DOWNGRADED_FROM: 'downgraded_from',
  } as const,
  
  // Payment method types
  PAYMENT_METHODS: ['card'] as const,
  
  // Billing intervals
  BILLING_INTERVALS: {
    MONTHLY: 'month' as const,
    YEARLY: 'year' as const,
  },
} as const;

// Helper function to get price ID for tier and billing cycle
export function getPriceId(tier: 'GROWTH' | 'PRO', billingCycle: 'MONTHLY' | 'YEARLY'): string {
  return STRIPE_CONFIG.PRICE_IDS[tier][billingCycle];
}

// Helper function to validate webhook signature
export function validateWebhookSignature(payload: string, signature: string): Stripe.Event {
  const config = getStripeConfig();
  const stripe = getStripeInstance();
  
  try {
    return stripe.webhooks.constructEvent(payload, signature, config.webhookSecret);
  } catch (error) {
    throw new Error(`Webhook signature verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Helper function to get client-side publishable key
export function getPublishableKey(): string {
  const config = getStripeConfig();
  return config.publishableKey;
}

// Helper function to create customer metadata
export function createCustomerMetadata(userId: string, email: string): Record<string, string> {
  return {
    [STRIPE_CONFIG.METADATA_KEYS.USER_ID]: userId,
    email,
    created_by: 'finance_dashboard',
    environment: isProduction() ? 'production' : 'development',
  };
}

// Helper function to create subscription metadata
export function createSubscriptionMetadata(
  userId: string,
  tier: 'STARTER' | 'GROWTH' | 'PRO',
  billingCycle: 'MONTHLY' | 'YEARLY',
  upgradedFrom?: string
): Record<string, string> {
  const metadata: Record<string, string> = {
    [STRIPE_CONFIG.METADATA_KEYS.USER_ID]: userId,
    [STRIPE_CONFIG.METADATA_KEYS.TIER]: tier,
    [STRIPE_CONFIG.METADATA_KEYS.BILLING_CYCLE]: billingCycle,
    created_by: 'finance_dashboard',
    environment: isProduction() ? 'production' : 'development',
  };
  
  if (upgradedFrom) {
    metadata[STRIPE_CONFIG.METADATA_KEYS.UPGRADED_FROM] = upgradedFrom;
  }
  
  return metadata;
}

// Helper function to format amount for Stripe (convert to cents)
export function formatAmountForStripe(amount: number): number {
  return Math.round(amount * 100);
}

// Helper function to format amount from Stripe (convert from cents)
export function formatAmountFromStripe(amount: number): number {
  return amount / 100;
}

// Error handling for Stripe operations
export class StripeConfigError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'StripeConfigError';
  }
}

// Validate Stripe configuration on startup
export function validateStripeConfig(): void {
  try {
    const config = getStripeConfig();
    
    if (!config.publishableKey) {
      throw new StripeConfigError('STRIPE_PUBLISHABLE_KEY is required');
    }
    
    if (!config.secretKey) {
      throw new StripeConfigError('STRIPE_SECRET_KEY is required');
    }
    
    if (!config.webhookSecret) {
      throw new StripeConfigError('STRIPE_WEBHOOK_SECRET is required');
    }
    
    // Validate key formats
    if (!config.publishableKey.startsWith('pk_')) {
      throw new StripeConfigError('STRIPE_PUBLISHABLE_KEY must start with "pk_"');
    }
    
    if (!config.secretKey.startsWith('sk_')) {
      throw new StripeConfigError('STRIPE_SECRET_KEY must start with "sk_"');
    }
    
    if (!config.webhookSecret.startsWith('whsec_')) {
      throw new StripeConfigError('STRIPE_WEBHOOK_SECRET must start with "whsec_"');
    }
    
    // Test Stripe instance creation
    getStripeInstance();
    
  } catch (error) {
    if (error instanceof StripeConfigError) {
      throw error;
    }
    throw new StripeConfigError(`Failed to validate Stripe configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Export types for use in other modules
export type StripeWebhookEvent = typeof STRIPE_CONFIG.WEBHOOK_EVENTS[number];
export type StripePriceId = string;
export type StripeCustomerMetadata = ReturnType<typeof createCustomerMetadata>;
export type StripeSubscriptionMetadata = ReturnType<typeof createSubscriptionMetadata>;