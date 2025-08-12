// Stripe Integration Service

import Stripe from 'stripe';
import { 
  getStripeInstance, 
  getPriceId, 
  createCustomerMetadata, 
  createSubscriptionMetadata,
  formatAmountForStripe,
  formatAmountFromStripe,
  STRIPE_CONFIG 
} from './stripe-config';
import { 
  SubscriptionTier, 
  BillingCycle, 
  PaymentFailedError, 
  SubscriptionUpdateError 
} from '../../types/subscription';

export interface CreateCustomerParams {
  userId: string;
  email: string;
  name?: string;
  phone?: string;
}

export interface CreateSubscriptionParams {
  customerId: string;
  tier: SubscriptionTier;
  billingCycle: BillingCycle;
  userId: string;
  trialPeriodDays?: number;
  upgradedFrom?: SubscriptionTier;
}

export interface UpdateSubscriptionParams {
  subscriptionId: string;
  newTier?: SubscriptionTier;
  newBillingCycle?: BillingCycle;
  cancelAtPeriodEnd?: boolean;
  prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice';
}

export interface CreatePaymentIntentParams {
  amount: number;
  currency?: string;
  customerId: string;
  description?: string;
  metadata?: Record<string, string>;
  automaticPaymentMethods?: boolean;
}

export interface StripeCustomerResult {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  metadata: Record<string, string>;
  created: number;
}

export interface StripeSubscriptionResult {
  id: string;
  customerId: string;
  status: string;
  currentPeriodStart: number;
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
  trialEnd?: number;
  metadata: Record<string, string>;
  items: Array<{
    id: string;
    priceId: string;
    quantity: number;
  }>;
}

export interface StripePaymentIntentResult {
  id: string;
  clientSecret: string;
  status: string;
  amount: number;
  currency: string;
  customerId?: string;
  metadata: Record<string, string>;
}

export class StripeService {
  private stripe: Stripe;

  constructor() {
    this.stripe = getStripeInstance();
  }

  /**
   * Create a new Stripe customer
   */
  async createCustomer(params: CreateCustomerParams): Promise<StripeCustomerResult> {
    try {
      const customer = await this.stripe.customers.create({
        email: params.email,
        name: params.name,
        phone: params.phone,
        metadata: createCustomerMetadata(params.userId, params.email),
      });

      return {
        id: customer.id,
        email: customer.email!,
        name: customer.name || undefined,
        phone: customer.phone || undefined,
        metadata: customer.metadata,
        created: customer.created,
      };
    } catch (error) {
      throw new PaymentFailedError(
        `Failed to create customer: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    }
  }

  /**
   * Retrieve a Stripe customer by ID
   */
  async getCustomer(customerId: string): Promise<StripeCustomerResult> {
    try {
      const customer = await this.stripe.customers.retrieve(customerId);
      
      if (customer.deleted) {
        throw new Error('Customer has been deleted');
      }

      return {
        id: customer.id,
        email: customer.email!,
        name: customer.name || undefined,
        phone: customer.phone || undefined,
        metadata: customer.metadata,
        created: customer.created,
      };
    } catch (error) {
      throw new PaymentFailedError(
        `Failed to retrieve customer: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    }
  }

  /**
   * Update a Stripe customer
   */
  async updateCustomer(
    customerId: string, 
    updates: Partial<Pick<CreateCustomerParams, 'email' | 'name' | 'phone'>>
  ): Promise<StripeCustomerResult> {
    try {
      const customer = await this.stripe.customers.update(customerId, {
        email: updates.email,
        name: updates.name,
        phone: updates.phone,
      });

      return {
        id: customer.id,
        email: customer.email!,
        name: customer.name || undefined,
        phone: customer.phone || undefined,
        metadata: customer.metadata,
        created: customer.created,
      };
    } catch (error) {
      throw new PaymentFailedError(
        `Failed to update customer: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    }
  }

  /**
   * Create a new subscription
   */
  async createSubscription(params: CreateSubscriptionParams): Promise<StripeSubscriptionResult> {
    try {
      // Skip Stripe subscription creation for STARTER tier
      if (params.tier === SubscriptionTier.STARTER) {
        throw new Error('STARTER tier does not require Stripe subscription');
      }

      const priceId = getPriceId(
        params.tier as 'GROWTH' | 'PRO', 
        params.billingCycle
      );

      const subscriptionParams: Stripe.SubscriptionCreateParams = {
        customer: params.customerId,
        items: [{ price: priceId }],
        metadata: createSubscriptionMetadata(
          params.userId,
          params.tier,
          params.billingCycle,
          params.upgradedFrom
        ),
        payment_behavior: 'default_incomplete',
        payment_settings: {
          save_default_payment_method: 'on_subscription',
        },
        expand: ['latest_invoice.payment_intent'],
      };

      if (params.trialPeriodDays && params.trialPeriodDays > 0) {
        subscriptionParams.trial_period_days = params.trialPeriodDays;
      }

      const subscription = await this.stripe.subscriptions.create(subscriptionParams);

      return this.formatSubscriptionResult(subscription);
    } catch (error) {
      throw new SubscriptionUpdateError(
        `Failed to create subscription: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'new'
      );
    }
  }

  /**
   * Retrieve a subscription by ID
   */
  async getSubscription(subscriptionId: string): Promise<StripeSubscriptionResult> {
    try {
      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['items.data.price'],
      });

      return this.formatSubscriptionResult(subscription);
    } catch (error) {
      throw new SubscriptionUpdateError(
        `Failed to retrieve subscription: ${error instanceof Error ? error.message : 'Unknown error'}`,
        subscriptionId
      );
    }
  }

  /**
   * Update an existing subscription
   */
  async updateSubscription(params: UpdateSubscriptionParams): Promise<StripeSubscriptionResult> {
    try {
      const updateParams: Stripe.SubscriptionUpdateParams = {};

      // Handle tier change
      if (params.newTier && params.newBillingCycle) {
        const currentSubscription = await this.stripe.subscriptions.retrieve(params.subscriptionId);
        const newPriceId = getPriceId(
          params.newTier as 'GROWTH' | 'PRO',
          params.newBillingCycle
        );

        updateParams.items = [
          {
            id: currentSubscription.items.data[0].id,
            price: newPriceId,
          },
        ];

        updateParams.proration_behavior = params.prorationBehavior || 'create_prorations';
      }

      // Handle cancellation setting
      if (params.cancelAtPeriodEnd !== undefined) {
        updateParams.cancel_at_period_end = params.cancelAtPeriodEnd;
      }

      const subscription = await this.stripe.subscriptions.update(
        params.subscriptionId,
        updateParams
      );

      return this.formatSubscriptionResult(subscription);
    } catch (error) {
      throw new SubscriptionUpdateError(
        `Failed to update subscription: ${error instanceof Error ? error.message : 'Unknown error'}`,
        params.subscriptionId
      );
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(
    subscriptionId: string, 
    cancelAtPeriodEnd: boolean = true
  ): Promise<StripeSubscriptionResult> {
    try {
      let subscription: Stripe.Subscription;

      if (cancelAtPeriodEnd) {
        // Cancel at period end
        subscription = await this.stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true,
        });
      } else {
        // Cancel immediately
        subscription = await this.stripe.subscriptions.cancel(subscriptionId);
      }

      return this.formatSubscriptionResult(subscription);
    } catch (error) {
      throw new SubscriptionUpdateError(
        `Failed to cancel subscription: ${error instanceof Error ? error.message : 'Unknown error'}`,
        subscriptionId
      );
    }
  }

  /**
   * Create a payment intent
   */
  async createPaymentIntent(params: CreatePaymentIntentParams): Promise<StripePaymentIntentResult> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: formatAmountForStripe(params.amount),
        currency: params.currency || STRIPE_CONFIG.DEFAULT_CURRENCY,
        customer: params.customerId,
        description: params.description,
        metadata: params.metadata || {},
        automatic_payment_methods: {
          enabled: params.automaticPaymentMethods !== false,
        },
      });

      return {
        id: paymentIntent.id,
        clientSecret: paymentIntent.client_secret!,
        status: paymentIntent.status,
        amount: formatAmountFromStripe(paymentIntent.amount),
        currency: paymentIntent.currency,
        customerId: paymentIntent.customer as string,
        metadata: paymentIntent.metadata,
      };
    } catch (error) {
      throw new PaymentFailedError(
        `Failed to create payment intent: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    }
  }

  /**
   * Retrieve a payment intent
   */
  async getPaymentIntent(paymentIntentId: string): Promise<StripePaymentIntentResult> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

      return {
        id: paymentIntent.id,
        clientSecret: paymentIntent.client_secret!,
        status: paymentIntent.status,
        amount: formatAmountFromStripe(paymentIntent.amount),
        currency: paymentIntent.currency,
        customerId: paymentIntent.customer as string,
        metadata: paymentIntent.metadata,
      };
    } catch (error) {
      throw new PaymentFailedError(
        `Failed to retrieve payment intent: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    }
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(event: Stripe.Event): Promise<void> {
    try {
      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          await this.handleSubscriptionEvent(event);
          break;

        case 'invoice.payment_succeeded':
        case 'invoice.payment_failed':
          await this.handleInvoiceEvent(event);
          break;

        case 'customer.created':
        case 'customer.updated':
          await this.handleCustomerEvent(event);
          break;

        case 'payment_intent.succeeded':
        case 'payment_intent.payment_failed':
          await this.handlePaymentIntentEvent(event);
          break;

        default:
          console.log(`Unhandled webhook event type: ${event.type}`);
      }
    } catch (error) {
      console.error(`Error handling webhook event ${event.id}:`, error);
      throw error;
    }
  }

  /**
   * Get subscription portal URL for customer self-service
   */
  async createPortalSession(customerId: string, returnUrl: string): Promise<string> {
    try {
      const session = await this.stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });

      return session.url;
    } catch (error) {
      throw new PaymentFailedError(
        `Failed to create portal session: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    }
  }

  /**
   * List customer's payment methods
   */
  async listPaymentMethods(customerId: string): Promise<Stripe.PaymentMethod[]> {
    try {
      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });

      return paymentMethods.data;
    } catch (error) {
      throw new PaymentFailedError(
        `Failed to list payment methods: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    }
  }

  /**
   * Private helper methods
   */
  private formatSubscriptionResult(subscription: Stripe.Subscription): StripeSubscriptionResult {
    return {
      id: subscription.id,
      customerId: subscription.customer as string,
      status: subscription.status,
      currentPeriodStart: subscription.current_period_start,
      currentPeriodEnd: subscription.current_period_end,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      trialEnd: subscription.trial_end || undefined,
      metadata: subscription.metadata,
      items: subscription.items.data.map(item => ({
        id: item.id,
        priceId: item.price.id,
        quantity: item.quantity || 1,
      })),
    };
  }

  private async handleSubscriptionEvent(event: Stripe.Event): Promise<void> {
    const subscription = event.data.object as Stripe.Subscription;
    console.log(`Handling subscription event: ${event.type} for subscription ${subscription.id}`);
    
    // This would typically update the local database
    // Implementation will be handled by the webhook endpoint
  }

  private async handleInvoiceEvent(event: Stripe.Event): Promise<void> {
    const invoice = event.data.object as Stripe.Invoice;
    console.log(`Handling invoice event: ${event.type} for invoice ${invoice.id}`);
    
    // This would typically update billing history
    // Implementation will be handled by the webhook endpoint
  }

  private async handleCustomerEvent(event: Stripe.Event): Promise<void> {
    const customer = event.data.object as Stripe.Customer;
    console.log(`Handling customer event: ${event.type} for customer ${customer.id}`);
    
    // This would typically update customer information
    // Implementation will be handled by the webhook endpoint
  }

  private async handlePaymentIntentEvent(event: Stripe.Event): Promise<void> {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    console.log(`Handling payment intent event: ${event.type} for payment intent ${paymentIntent.id}`);
    
    // This would typically update payment status
    // Implementation will be handled by the webhook endpoint
  }
}

// Export singleton instance
export const stripeService = new StripeService();