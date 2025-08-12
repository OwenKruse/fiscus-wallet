import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as signUpHandler } from '../signup/route';
import { SubscriptionTier, BillingCycle } from '../../../../lib/subscription/tier-config';

// Mock dependencies
const mockNileAuthService = {
  signUp: vi.fn(),
};

const mockSubscriptionService = {
  createSubscription: vi.fn(),
};

const mockStripeService = {
  createCustomer: vi.fn(),
};

// Mock getNileAuthService
vi.mock('../../../../lib/auth/nile-auth-service', () => ({
  getNileAuthService: () => mockNileAuthService,
}));

// Mock SubscriptionService
vi.mock('../../../../lib/subscription/subscription-service', () => ({
  SubscriptionService: vi.fn().mockImplementation(() => mockSubscriptionService),
}));

// Mock StripeService
vi.mock('../../../../lib/stripe/stripe-service', () => ({
  StripeService: vi.fn().mockImplementation(() => mockStripeService),
}));

// Mock Prisma client
vi.mock('../../../../lib/database/prisma-client', () => ({
  prisma: {},
}));

describe('Signup with Subscription Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create subscription and Stripe customer for new user', async () => {
    // Mock successful auth response
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      tenantId: 'tenant-123',
    };

    const mockAuthResponse = {
      success: true,
      user: mockUser,
      token: 'mock-token',
    };

    mockNileAuthService.signUp.mockResolvedValue(mockAuthResponse);

    // Mock Stripe customer creation
    const mockStripeCustomer = {
      id: 'cus_123',
      email: 'test@example.com',
      name: 'John Doe',
      metadata: {},
      created: Date.now(),
    };

    mockStripeService.createCustomer.mockResolvedValue(mockStripeCustomer);

    // Mock subscription creation
    const mockSubscription = {
      id: 'sub-123',
      userId: 'user-123',
      tier: SubscriptionTier.STARTER,
      status: 'ACTIVE',
      billingCycle: BillingCycle.MONTHLY,
      stripeCustomerId: 'cus_123',
      cancelAtPeriodEnd: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockSubscriptionService.createSubscription.mockResolvedValue(mockSubscription);

    // Create request
    const requestBody = {
      email: 'test@example.com',
      password: 'TestPassword123',
      firstName: 'John',
      lastName: 'Doe',
    };

    const request = new NextRequest('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Execute signup
    const response = await signUpHandler(request);
    const responseData = await response.json();

    // Verify response
    expect(response.status).toBe(200);
    expect(responseData.success).toBe(true);
    expect(responseData.data.user).toEqual(mockUser);

    // Verify Stripe customer creation was called
    expect(mockStripeService.createCustomer).toHaveBeenCalledWith({
      userId: 'user-123',
      email: 'test@example.com',
      name: 'John Doe',
    });

    // Verify subscription creation was called
    expect(mockSubscriptionService.createSubscription).toHaveBeenCalledWith({
      userId: 'user-123',
      tier: SubscriptionTier.STARTER,
      billingCycle: BillingCycle.MONTHLY,
      stripeCustomerId: 'cus_123',
    });
  });

  it('should still succeed signup even if subscription creation fails', async () => {
    // Mock successful auth response
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      tenantId: 'tenant-123',
    };

    const mockAuthResponse = {
      success: true,
      user: mockUser,
      token: 'mock-token',
    };

    mockNileAuthService.signUp.mockResolvedValue(mockAuthResponse);

    // Mock Stripe customer creation failure
    mockStripeService.createCustomer.mockRejectedValue(new Error('Stripe API error'));

    // Create request
    const requestBody = {
      email: 'test@example.com',
      password: 'TestPassword123',
      firstName: 'John',
      lastName: 'Doe',
    };

    const request = new NextRequest('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Execute signup
    const response = await signUpHandler(request);
    const responseData = await response.json();

    // Verify response - signup should still succeed
    expect(response.status).toBe(200);
    expect(responseData.success).toBe(true);
    expect(responseData.data.user).toEqual(mockUser);

    // Verify subscription creation was attempted but failed
    expect(mockStripeService.createCustomer).toHaveBeenCalled();
    expect(mockSubscriptionService.createSubscription).not.toHaveBeenCalled();
  });

  it('should handle user with no name gracefully', async () => {
    // Mock successful auth response
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      tenantId: 'tenant-123',
    };

    const mockAuthResponse = {
      success: true,
      user: mockUser,
      token: 'mock-token',
    };

    mockNileAuthService.signUp.mockResolvedValue(mockAuthResponse);

    // Mock Stripe customer creation
    const mockStripeCustomer = {
      id: 'cus_123',
      email: 'test@example.com',
      metadata: {},
      created: Date.now(),
    };

    mockStripeService.createCustomer.mockResolvedValue(mockStripeCustomer);

    // Mock subscription creation
    const mockSubscription = {
      id: 'sub-123',
      userId: 'user-123',
      tier: SubscriptionTier.STARTER,
      status: 'ACTIVE',
      billingCycle: BillingCycle.MONTHLY,
      stripeCustomerId: 'cus_123',
      cancelAtPeriodEnd: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockSubscriptionService.createSubscription.mockResolvedValue(mockSubscription);

    // Create request without names
    const requestBody = {
      email: 'test@example.com',
      password: 'TestPassword123',
    };

    const request = new NextRequest('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Execute signup
    const response = await signUpHandler(request);
    const responseData = await response.json();

    // Verify response
    expect(response.status).toBe(200);
    expect(responseData.success).toBe(true);

    // Verify Stripe customer creation was called with empty name
    expect(mockStripeService.createCustomer).toHaveBeenCalledWith({
      userId: 'user-123',
      email: 'test@example.com',
      name: undefined,
    });
  });

  it('should create subscription with correct default values', async () => {
    // Mock successful auth response
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      tenantId: 'tenant-123',
    };

    const mockAuthResponse = {
      success: true,
      user: mockUser,
      token: 'mock-token',
    };

    mockNileAuthService.signUp.mockResolvedValue(mockAuthResponse);

    // Mock Stripe customer creation
    const mockStripeCustomer = {
      id: 'cus_123',
      email: 'test@example.com',
      name: 'John Doe',
      metadata: {},
      created: Date.now(),
    };

    mockStripeService.createCustomer.mockResolvedValue(mockStripeCustomer);

    // Mock subscription creation
    mockSubscriptionService.createSubscription.mockResolvedValue({});

    // Create request
    const requestBody = {
      email: 'test@example.com',
      password: 'TestPassword123',
      firstName: 'John',
      lastName: 'Doe',
    };

    const request = new NextRequest('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Execute signup
    await signUpHandler(request);

    // Verify subscription creation was called with correct default values
    expect(mockSubscriptionService.createSubscription).toHaveBeenCalledWith({
      userId: 'user-123',
      tier: SubscriptionTier.STARTER,
      billingCycle: BillingCycle.MONTHLY,
      stripeCustomerId: 'cus_123',
      // No stripeSubscriptionId for free tier
      // No trialEnd for free tier
    });
  });
});