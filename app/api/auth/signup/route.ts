import { NextRequest, NextResponse } from 'next/server';
import { getNileAuthService } from '../../../../lib/auth/nile-auth-service';
import { NileUserCreateRequest } from '../../../../types/nile';
import { withRateLimit, withUnauthenticatedAuditLog } from '../../../../lib/auth/auth-middleware';
import { SubscriptionService } from '../../../../lib/subscription/subscription-service';
import { StripeService } from '../../../../lib/stripe/stripe-service';
import { SubscriptionTier, BillingCycle } from '../../../../lib/subscription/tier-config';
import { prisma } from '../../../../lib/database/prisma-client';

// --- Validation Schema ---
// No changes here. Your validation logic is solid and specific.
function validateSignUpRequest(body: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Email validation
  if (!body.email || typeof body.email !== 'string') {
    errors.push('Email is required and must be a string');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    errors.push('Email must be a valid email address');
  }

  // Password validation
  if (!body.password || typeof body.password !== 'string') {
    errors.push('Password is required and must be a string');
  } else {
    if (body.password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    if (!/(?=.*[a-z])/.test(body.password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/(?=.*[A-Z])/.test(body.password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/(?=.*\d)/.test(body.password)) {
      errors.push('Password must contain at least one number');
    }
  }

  // Optional field validation
  if (body.firstName && typeof body.firstName !== 'string') {
    errors.push('First name must be a string');
  }
  if (body.lastName && typeof body.lastName !== 'string') {
    errors.push('Last name must be a string');
  }
  if (body.phone && typeof body.phone !== 'string') {
    errors.push('Phone must be a string');
  } else if (body.phone && !/^\+?[\d\s\-\(\)]+$/.test(body.phone)) {
    errors.push('Phone must be a valid phone number');
  }
  if (body.company && typeof body.company !== 'string') {
    errors.push('Company must be a string');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}


function createErrorResponse(
  message: string,
  status: number = 400,
  code: string = 'BAD_REQUEST',
) {
  return NextResponse.json(
    { success: false, error: { code, message, timestamp: new Date().toISOString() } },
    { status },
  );
}

function createSuccessResponse(authResponse: any) {
  if (!authResponse.user || !authResponse.token) {
    console.error('[CRITICAL] authResponse missing user or token', authResponse);
    return createErrorResponse('Internal configuration error', 500, 'INTERNAL_SERVER_ERROR');
  }

  const res = NextResponse.json({
    success: true,
    data: {
      user: authResponse.user,
      token: authResponse.token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    },
    message: 'Account created successfully',
    timestamp: new Date().toISOString()
  });

  res.cookies.set('auth-token', authResponse.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });

  return res;
}

/* ───────────────────────────── subscription creation logic ───────────────────────────── */

async function createUserSubscription(userId: string, email: string, name: string): Promise<void> {
  const subscriptionService = new SubscriptionService(prisma);
  const stripeService = new StripeService();

  try {
    // Create Stripe customer for the user
    const stripeCustomer = await stripeService.createCustomer({
      userId,
      email,
      name: name || undefined,
    });

    console.log('Stripe customer created:', stripeCustomer.id);

    // Create default Starter subscription
    await subscriptionService.createSubscription({
      userId,
      tier: SubscriptionTier.STARTER,
      billingCycle: BillingCycle.MONTHLY,
      stripeCustomerId: stripeCustomer.id,
      // No stripeSubscriptionId for free tier
      // No trialEnd for free tier
    });

    console.log('Starter subscription created for user:', userId);
  } catch (error) {
    console.error('Error creating user subscription:', error);
    throw error;
  }
}

/* ───────────────────────────── main sign-up logic ───────────────────────────── */

async function signUpHandler(req: NextRequest): Promise<NextResponse> {
  let body: any;

  try {
    body = await req.json();
  } catch {
    return createErrorResponse('Invalid JSON payload', 400, 'INVALID_JSON');
  }

  const { isValid, errors } = validateSignUpRequest(body);
  if (!isValid) return createErrorResponse(errors.join(', '), 400, 'VALIDATION_ERROR');

  const payload: NileUserCreateRequest = {
    email: body.email.toLowerCase().trim(),
    password: body.password,
    firstName: body.firstName?.trim(),
    lastName: body.lastName?.trim(),
    phone: body.phone?.trim(),
    company: body.company?.trim(),
  };

  const authService = getNileAuthService();
  console.log('Attempting sign up with payload:', { email: payload.email, firstName: payload.firstName });
  
  const authResponse = await authService.signUp(payload);
  console.log('Auth service response:', authResponse);

  if (!authResponse.success) {
    const errorMessage = authResponse.error || 'Registration failed';
    const code = errorMessage.includes('already exists') ? 'USER_ALREADY_EXISTS' : 'REGISTRATION_FAILED';
    const status = code === 'USER_ALREADY_EXISTS' ? 409 : 400;
    console.error('Sign up failed:', { code, errorMessage, status });
    return createErrorResponse(errorMessage, status, code);
  }

  console.log('Sign up successful, creating subscription for user:', authResponse.user);
  
  // Create subscription and Stripe customer for new user
  try {
    await createUserSubscription(authResponse.user.id, payload.email, `${payload.firstName || ''} ${payload.lastName || ''}`.trim());
    console.log('Subscription created successfully for user:', authResponse.user.id);
  } catch (subscriptionError) {
    console.error('Failed to create subscription for user:', authResponse.user.id, subscriptionError);
    // Don't fail the signup if subscription creation fails, but log the error
    // The user can still use the app and subscription can be created later
  }

  console.log('Sign up successful, creating response with user:', authResponse.user);
  return createSuccessResponse(authResponse);
}

/* ───────────────────────────── middleware composition ───────────────────────────── */
export const POST = withUnauthenticatedAuditLog(
  withRateLimit(signUpHandler, { maxRequests: 20, windowMs: 60_000 }),
  'USER_SIGNUP',
);