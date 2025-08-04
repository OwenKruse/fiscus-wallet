import { NextRequest, NextResponse } from 'next/server';
import { getNileAuthService } from '../../../../lib/auth/nile-auth-service';

// Extract token from request
function extractToken(request: NextRequest): string | null {
  // Check Authorization header (Bearer token)
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check cookie (for browser requests)
  const cookieToken = request.cookies.get('auth-token')?.value;
  if (cookieToken) {
    return cookieToken;
  }

  // Check X-Auth-Token header
  const headerToken = request.headers.get('x-auth-token');
  if (headerToken) {
    return headerToken;
  }

  return null;
}

// Create error response
function createErrorResponse(message: string, status: number = 400, code?: string) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: code || 'VALIDATION_ERROR',
        message,
        timestamp: new Date().toISOString()
      }
    },
    { status }
  );
}

// Main session validation handler
async function validateSessionHandler(request: NextRequest): Promise<NextResponse> {
  try {
    // Extract token from request
    const token = extractToken(request);

    if (!token) {
      return createErrorResponse('Authentication token required', 401, 'TOKEN_MISSING');
    }

    // Validate session
    const authService = getNileAuthService();
    const isValid = await authService.validateSession(token);

    if (!isValid) {
      return createErrorResponse('Invalid or expired session', 401, 'SESSION_INVALID');
    }

    // Get user information
    const user = await authService.getCurrentUser(token);

    if (!user) {
      return createErrorResponse('User not found', 401, 'USER_NOT_FOUND');
    }

    return NextResponse.json({
      success: true,
      valid: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        tenantId: user.tenantId
      }
    });

  } catch (error) {
    console.error('Session validation error:', error);
    return createErrorResponse('Internal server error', 500, 'INTERNAL_ERROR');
  }
}

// Export GET handler
export const GET = validateSessionHandler;