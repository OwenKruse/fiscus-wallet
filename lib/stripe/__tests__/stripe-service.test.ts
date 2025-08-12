// Stripe Service Unit Tests

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Stripe from 'stripe';
import { StripeService } from '../stripe-service';
import { SubscriptionTier, BillingCycle, PaymentFailedError, SubscriptionUpdateError } from '../../../types/subscription';
import * as stripeConfig from '../stripe-config';

// Mock Stripe
vi.mock('stripe');
vi.mock('../stripe-config');

describe('StripeService', () => {
  let stripeService: StripeService;
  let mockStripe: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock Stripe instance
    mockStripe = {
      customers: {
        create: vi.fn(),
        retrieve: vi.fn(),
        update: vi.fn(),
      },
      subscriptions: {
        create: vi.fn(),
        retrieve: vi.fn(),
        update: vi.fn(),
        cancel: vi.fn(),
      },
      paymentIntents: {
        create: vi.fn(),
        retrieve: vi.fn(),
      },
      billingPortal: {
        sessions: {
          create: vi.fn(),
        },
      },
      paymentMethods: {
        list: vi.fn(),
      },
    };

    // Mock stripe config functions
    vi.mocked(stripeConfig.getStripeInstance).mockReturnValue(mockStripe);
    vi.mocked(stripeConfig.getPriceId).mockReturnValue('price_test_123');
    vi.mocked(stripeConfig.createCustomerMetadata).mockReturnValue({
      user_id: 'user-123',
      email: 'test@example.com',
      created_by: 'finance_dashboard',
      environment: 'test',
    });
    vi.mocked(stripeConfig.createSubscriptionMetadata).mockReturnValue({
      user_id: 'user-123',
      tier: 'GROWTH',
      billing_cycle: 'MONTHLY',
      created_by: 'finance_dashboard',
      environment: 'test',
    });
    vi.mocked(stripeConfig.formatAmountForStripe).mockImplementation((amount) => amount * 100);
    vi.mocked(stripeConfig.formatAmountFromStripe).mockImplementation((amount) => amount / 100);

    stripeService = new StripeService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createCustomer', () => {
    it('should create a customer successfully', async () => {
      const mockCustomer = {
        id: 'cus_test123',
        email: 'test@example.com',
        name: 'Test User',
        phone: '+1234567890',
        metadata: { user_id: 'user-123' },
        created: 1640995200,
      };

      mockStripe.customers.create.mockResolvedValue(mockCustomer);

      const result = await stripeService.createCustomer({
        userId: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        phone: '+1234567890',
      });

      expect(mockStripe.customers.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        name: 'Test User',
        phone: '+1234567890',
        metadata: {
          user_id: 'user-123',
          email: 'test@example.com',
          created_by: 'finance_dashboard',
          environment: 'test',
        },
      });

      expect(result).toEqual({
        id: 'cus_test123',
        email: 'test@example.com',
        name: 'Test User',
        phone: '+1234567890',
        metadata: { user_id: 'user-123' },
        created: 1640995200,
      });
    });

    it('should throw PaymentFailedError on Stripe error', async () => {
      mockStripe.customers.create.mockRejectedValue(new Error('Stripe error'));

      await expect(
        stripeService.createCustomer({
          userId: 'user-123',
          email: 'test@example.com',
        })
      ).rejects.toThrow(PaymentFailedError);
    });
  });

  describe('getCustomer', () => {
    it('should retrieve a customer successfully', async () => {
      const mockCustomer = {
        id: 'cus_test123',
        email: 'test@example.com',
        name: 'Test User',
        phone: null,
        metadata: { user_id: 'user-123' },
        created: 1640995200,
        deleted: false,
      };

      mockStripe.customers.retrieve.mockResolvedValue(mockCustomer);

      const result = await stripeService.getCustomer('cus_test123');

      expect(mockStripe.customers.retrieve).toHaveBeenCalledWith('cus_test123');
      expect(result).toEqual({
        id: 'cus_test123',
        email: 'test@example.com',
        name: 'Test User',
        phone: undefined,
        metadata: { user_id: 'user-123' },
        created: 1640995200,
      });
    });

    it('should throw error for deleted customer', async () => {
      mockStripe.customers.retrieve.mockResolvedValue({ deleted: true });

      await expect(stripeService.getCustomer('cus_test123')).rejects.toThrow(PaymentFailedError);
    });
  });

  describe('updateCustomer', () => {
    it('should update a customer successfully', async () => {
      const mockCustomer = {
        id: 'cus_test123',
        email: 'updated@example.com',
        name: 'Updated User',
        phone: null,
        metadata: { user_id: 'user-123' },
        created: 1640995200,
      };

      mockStripe.customers.update.mockResolvedValue(mockCustomer);

      const result = await stripeService.updateCustomer('cus_test123', {
        email: 'updated@example.com',
        name: 'Updated User',
      });

      expect(mockStripe.customers.update).toHaveBeenCalledWith('cus_test123', {
        email: 'updated@example.com',
        name: 'Updated User',
        phone: undefined,
      });

      expect(result.email).toBe('updated@example.com');
      expect(result.name).toBe('Updated User');
    });
  });

  describe('createSubscription', () => {
    it('should create a subscription successfully', async () => {
      const mockSubscription = {
        id: 'sub_test123',
        customer: 'cus_test123',
        status: 'active',
        current_period_start: 1640995200,
        current_period_end: 1643673600,
        cancel_at_period_end: false,
        trial_end: null,
        metadata: { user_id: 'user-123' },
        items: {
          data: [
            {
              id: 'si_test123',
              price: { id: 'price_test123' },
              quantity: 1,
            },
          ],
        },
      };

      mockStripe.subscriptions.create.mockResolvedValue(mockSubscription);

      const result = await stripeService.createSubscription({
        customerId: 'cus_test123',
        tier: SubscriptionTier.GROWTH,
        billingCycle: BillingCycle.MONTHLY,
        userId: 'user-123',
      });

      expect(mockStripe.subscriptions.create).toHaveBeenCalledWith({
        customer: 'cus_test123',
        items: [{ price: 'price_test_123' }],
        metadata: {
          user_id: 'user-123',
          tier: 'GROWTH',
          billing_cycle: 'MONTHLY',
          created_by: 'finance_dashboard',
          environment: 'test',
        },
        payment_behavior: 'default_incomplete',
        payment_settings: {
          save_default_payment_method: 'on_subscription',
        },
        expand: ['latest_invoice.payment_intent'],
      });

      expect(result).toEqual({
        id: 'sub_test123',
        customerId: 'cus_test123',
        status: 'active',
        currentPeriodStart: 1640995200,
        currentPeriodEnd: 1643673600,
        cancelAtPeriodEnd: false,
        trialEnd: undefined,
        metadata: { user_id: 'user-123' },
        items: [
          {
            id: 'si_test123',
            priceId: 'price_test123',
            quantity: 1,
          },
        ],
      });
    });

    it('should throw error for STARTER tier', async () => {
      await expect(
        stripeService.createSubscription({
          customerId: 'cus_test123',
          tier: SubscriptionTier.STARTER,
          billingCycle: BillingCycle.MONTHLY,
          userId: 'user-123',
        })
      ).rejects.toThrow(SubscriptionUpdateError);
    });

    it('should include trial period when specified', async () => {
      const mockSubscription = {
        id: 'sub_test123',
        customer: 'cus_test123',
        status: 'trialing',
        current_period_start: 1640995200,
        current_period_end: 1643673600,
        cancel_at_period_end: false,
        trial_end: 1642204800,
        metadata: { user_id: 'user-123' },
        items: { data: [{ id: 'si_test123', price: { id: 'price_test123' }, quantity: 1 }] },
      };

      mockStripe.subscriptions.create.mockResolvedValue(mockSubscription);

      await stripeService.createSubscription({
        customerId: 'cus_test123',
        tier: SubscriptionTier.GROWTH,
        billingCycle: BillingCycle.MONTHLY,
        userId: 'user-123',
        trialPeriodDays: 14,
      });

      expect(mockStripe.subscriptions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          trial_period_days: 14,
        })
      );
    });
  });

  describe('getSubscription', () => {
    it('should retrieve a subscription successfully', async () => {
      const mockSubscription = {
        id: 'sub_test123',
        customer: 'cus_test123',
        status: 'active',
        current_period_start: 1640995200,
        current_period_end: 1643673600,
        cancel_at_period_end: false,
        trial_end: null,
        metadata: { user_id: 'user-123' },
        items: {
          data: [
            {
              id: 'si_test123',
              price: { id: 'price_test123' },
              quantity: 1,
            },
          ],
        },
      };

      mockStripe.subscriptions.retrieve.mockResolvedValue(mockSubscription);

      const result = await stripeService.getSubscription('sub_test123');

      expect(mockStripe.subscriptions.retrieve).toHaveBeenCalledWith('sub_test123', {
        expand: ['items.data.price'],
      });

      expect(result.id).toBe('sub_test123');
      expect(result.status).toBe('active');
    });
  });

  describe('updateSubscription', () => {
    it('should update subscription tier and billing cycle', async () => {
      const mockCurrentSubscription = {
        id: 'sub_test123',
        items: {
          data: [{ id: 'si_test123' }],
        },
      };

      const mockUpdatedSubscription = {
        id: 'sub_test123',
        customer: 'cus_test123',
        status: 'active',
        current_period_start: 1640995200,
        current_period_end: 1643673600,
        cancel_at_period_end: false,
        trial_end: null,
        metadata: { user_id: 'user-123' },
        items: {
          data: [
            {
              id: 'si_test123',
              price: { id: 'price_test456' },
              quantity: 1,
            },
          ],
        },
      };

      mockStripe.subscriptions.retrieve.mockResolvedValue(mockCurrentSubscription);
      mockStripe.subscriptions.update.mockResolvedValue(mockUpdatedSubscription);

      const result = await stripeService.updateSubscription({
        subscriptionId: 'sub_test123',
        newTier: SubscriptionTier.PRO,
        newBillingCycle: BillingCycle.YEARLY,
        prorationBehavior: 'create_prorations',
      });

      expect(mockStripe.subscriptions.update).toHaveBeenCalledWith('sub_test123', {
        items: [
          {
            id: 'si_test123',
            price: 'price_test_123',
          },
        ],
        proration_behavior: 'create_prorations',
      });

      expect(result.id).toBe('sub_test123');
    });

    it('should update cancel at period end setting', async () => {
      const mockSubscription = {
        id: 'sub_test123',
        customer: 'cus_test123',
        status: 'active',
        current_period_start: 1640995200,
        current_period_end: 1643673600,
        cancel_at_period_end: true,
        trial_end: null,
        metadata: { user_id: 'user-123' },
        items: { data: [{ id: 'si_test123', price: { id: 'price_test123' }, quantity: 1 }] },
      };

      mockStripe.subscriptions.update.mockResolvedValue(mockSubscription);

      const result = await stripeService.updateSubscription({
        subscriptionId: 'sub_test123',
        cancelAtPeriodEnd: true,
      });

      expect(mockStripe.subscriptions.update).toHaveBeenCalledWith('sub_test123', {
        cancel_at_period_end: true,
      });

      expect(result.cancelAtPeriodEnd).toBe(true);
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel subscription at period end by default', async () => {
      const mockSubscription = {
        id: 'sub_test123',
        customer: 'cus_test123',
        status: 'active',
        current_period_start: 1640995200,
        current_period_end: 1643673600,
        cancel_at_period_end: true,
        trial_end: null,
        metadata: { user_id: 'user-123' },
        items: { data: [{ id: 'si_test123', price: { id: 'price_test123' }, quantity: 1 }] },
      };

      mockStripe.subscriptions.update.mockResolvedValue(mockSubscription);

      const result = await stripeService.cancelSubscription('sub_test123');

      expect(mockStripe.subscriptions.update).toHaveBeenCalledWith('sub_test123', {
        cancel_at_period_end: true,
      });

      expect(result.cancelAtPeriodEnd).toBe(true);
    });

    it('should cancel subscription immediately when specified', async () => {
      const mockSubscription = {
        id: 'sub_test123',
        customer: 'cus_test123',
        status: 'canceled',
        current_period_start: 1640995200,
        current_period_end: 1643673600,
        cancel_at_period_end: false,
        trial_end: null,
        metadata: { user_id: 'user-123' },
        items: { data: [{ id: 'si_test123', price: { id: 'price_test123' }, quantity: 1 }] },
      };

      mockStripe.subscriptions.cancel.mockResolvedValue(mockSubscription);

      const result = await stripeService.cancelSubscription('sub_test123', false);

      expect(mockStripe.subscriptions.cancel).toHaveBeenCalledWith('sub_test123');
      expect(result.status).toBe('canceled');
    });
  });

  describe('createPaymentIntent', () => {
    it('should create a payment intent successfully', async () => {
      const mockPaymentIntent = {
        id: 'pi_test123',
        client_secret: 'pi_test123_secret',
        status: 'requires_payment_method',
        amount: 1000,
        currency: 'usd',
        customer: 'cus_test123',
        metadata: { order_id: 'order_123' },
      };

      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      const result = await stripeService.createPaymentIntent({
        amount: 10.00,
        customerId: 'cus_test123',
        description: 'Test payment',
        metadata: { order_id: 'order_123' },
      });

      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith({
        amount: 1000,
        currency: 'usd',
        customer: 'cus_test123',
        description: 'Test payment',
        metadata: { order_id: 'order_123' },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      expect(result).toEqual({
        id: 'pi_test123',
        clientSecret: 'pi_test123_secret',
        status: 'requires_payment_method',
        amount: 10.00,
        currency: 'usd',
        customerId: 'cus_test123',
        metadata: { order_id: 'order_123' },
      });
    });
  });

  describe('getPaymentIntent', () => {
    it('should retrieve a payment intent successfully', async () => {
      const mockPaymentIntent = {
        id: 'pi_test123',
        client_secret: 'pi_test123_secret',
        status: 'succeeded',
        amount: 1000,
        currency: 'usd',
        customer: 'cus_test123',
        metadata: { order_id: 'order_123' },
      };

      mockStripe.paymentIntents.retrieve.mockResolvedValue(mockPaymentIntent);

      const result = await stripeService.getPaymentIntent('pi_test123');

      expect(mockStripe.paymentIntents.retrieve).toHaveBeenCalledWith('pi_test123');
      expect(result.status).toBe('succeeded');
      expect(result.amount).toBe(10.00);
    });
  });

  describe('createPortalSession', () => {
    it('should create a portal session successfully', async () => {
      const mockSession = {
        url: 'https://billing.stripe.com/session/test123',
      };

      mockStripe.billingPortal.sessions.create.mockResolvedValue(mockSession);

      const result = await stripeService.createPortalSession('cus_test123', 'https://example.com/return');

      expect(mockStripe.billingPortal.sessions.create).toHaveBeenCalledWith({
        customer: 'cus_test123',
        return_url: 'https://example.com/return',
      });

      expect(result).toBe('https://billing.stripe.com/session/test123');
    });
  });

  describe('listPaymentMethods', () => {
    it('should list payment methods successfully', async () => {
      const mockPaymentMethods = {
        data: [
          {
            id: 'pm_test123',
            type: 'card',
            card: {
              brand: 'visa',
              last4: '4242',
            },
          },
        ],
      };

      mockStripe.paymentMethods.list.mockResolvedValue(mockPaymentMethods);

      const result = await stripeService.listPaymentMethods('cus_test123');

      expect(mockStripe.paymentMethods.list).toHaveBeenCalledWith({
        customer: 'cus_test123',
        type: 'card',
      });

      expect(result).toEqual(mockPaymentMethods.data);
    });
  });

  describe('handleWebhook', () => {
    it('should handle subscription events', async () => {
      const mockEvent = {
        id: 'evt_test123',
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_test123',
            customer: 'cus_test123',
          },
        },
      } as Stripe.Event;

      // Should not throw
      await expect(stripeService.handleWebhook(mockEvent)).resolves.toBeUndefined();
    });

    it('should handle invoice events', async () => {
      const mockEvent = {
        id: 'evt_test123',
        type: 'invoice.payment_succeeded',
        data: {
          object: {
            id: 'in_test123',
            customer: 'cus_test123',
          },
        },
      } as Stripe.Event;

      // Should not throw
      await expect(stripeService.handleWebhook(mockEvent)).resolves.toBeUndefined();
    });

    it('should handle customer events', async () => {
      const mockEvent = {
        id: 'evt_test123',
        type: 'customer.created',
        data: {
          object: {
            id: 'cus_test123',
            email: 'test@example.com',
          },
        },
      } as Stripe.Event;

      // Should not throw
      await expect(stripeService.handleWebhook(mockEvent)).resolves.toBeUndefined();
    });

    it('should handle payment intent events', async () => {
      const mockEvent = {
        id: 'evt_test123',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test123',
            customer: 'cus_test123',
          },
        },
      } as Stripe.Event;

      // Should not throw
      await expect(stripeService.handleWebhook(mockEvent)).resolves.toBeUndefined();
    });

    it('should log unhandled event types', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const mockEvent = {
        id: 'evt_test123',
        type: 'unknown.event.type',
        data: { object: {} },
      } as Stripe.Event;

      await stripeService.handleWebhook(mockEvent);

      expect(consoleSpy).toHaveBeenCalledWith('Unhandled webhook event type: unknown.event.type');

      consoleSpy.mockRestore();
    });
  });
});