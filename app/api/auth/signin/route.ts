import { NextRequest, NextResponse } from 'next/server';
import { getNileAuthService } from '../../../../lib/auth/nile-auth-service';
import { NileUserSignInRequest } from '../../../../types/nile';
import { withRateLimit, withUnauthenticatedAuditLog } from '../../../../lib/auth/auth-middleware';

// Validation schema for sign-in request
function validateSignInRequest(body: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!body.email || typeof body.email !== 'string') {
    errors.push('Email is required and must be a string');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    errors.push('Email must be a valid email address');
  }

  if (!body.password || typeof body.password !== 'string') {
    errors.push('Password is required and must be a string');
  } else if (body.password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Create error response
function createErrorResponse(message: string, status: number = 400, code?: string) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: code || (status === 400 ? 'VALIDATION_ERROR' : 'AUTHENTICATION_ERROR'),
        message,
        timestamp: new Date().toISOString()
      }
    },
    { status }
  );
}

// Create success response with secure cookie
function createSuccessResponse(authResponse: any) {
  const response = NextResponse.json({
    success: true,
    data: {
      user: authResponse.user,
      token: authResponse.token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    },
    message: 'Sign in successful',
    timestamp: new Date().toISOString()
  });

  // Set secure HTTP-only cookie for token
  response.cookies.set('auth-token', authResponse.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: '/'
  });

  return response;
}

// Main sign-in handler
async function signInHandler(request: NextRequest): Promise<NextResponse> {
  try {
    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return createErrorResponse('Invalid JSON in request body');
    }

    // Validate request
    const validation = validateSignInRequest(body);
    if (!validation.isValid) {
      return createErrorResponse(validation.errors.join(', '));
    }

    // Prepare sign-in request
    const signInRequest: NileUserSignInRequest = {
      email: body.email.toLowerCase().trim(),
      password: body.password
    };

    // Attempt authentication
    const authService = getNileAuthService();
    console.log('Attempting sign in with email:', signInRequest.email);
    
    const authResponse = await authService.signIn(signInRequest);
    console.log('Auth service sign in response:', authResponse);

    if (!authResponse.success) {
      console.error('Sign in failed:', authResponse.error);
      return createErrorResponse(
        authResponse.error || 'Authentication failed',
        401,
        'AUTHENTICATION_FAILED'
      );
    }

    console.log('Sign in successful, creating response with user:', authResponse.user);
    // Return success response with cookie
    return createSuccessResponse(authResponse);

  } catch (error) {
    console.error('Sign in error:', error);
    return createErrorResponse('Internal server error', 500, 'INTERNAL_ERROR');
  }
}

// Apply middleware and export
export const POST = withUnauthenticatedAuditLog(signInHandler, 'USER_SIGNIN');