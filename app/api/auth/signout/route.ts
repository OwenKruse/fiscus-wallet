import { NextRequest, NextResponse } from 'next/server';
import { getNileAuthService } from '../../../../lib/auth/nile-auth-service';
import { withAuth, AuthContext, withAuditLog } from '../../../../lib/auth/auth-middleware';

// Create error response
function createErrorResponse(message: string, status: number = 400, code?: string) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: code || 'SIGNOUT_ERROR',
        message,
        timestamp: new Date().toISOString()
      }
    },
    { status }
  );
}

// Create success response and clear cookie
function createSuccessResponse() {
  const response = NextResponse.json({
    success: true,
    message: 'Sign out successful'
  });

  // Clear the auth token cookie
  response.cookies.set('auth-token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0, // Expire immediately
    path: '/'
  });

  return response;
}

// Main sign-out handler
async function signOutHandler(request: NextRequest, context: AuthContext): Promise<NextResponse> {
  try {
    const { token } = context;

    // Invalidate the session in the database
    const authService = getNileAuthService();
    await authService.signOut(token);

    // Return success response with cleared cookie
    return createSuccessResponse();

  } catch (error) {
    console.error('Sign out error:', error);
    return createErrorResponse('Internal server error', 500, 'INTERNAL_ERROR');
  }
}

// Apply middleware and export
export const POST = withAuth(
  withAuditLog(signOutHandler, 'USER_SIGNOUT'),
  { requireAuth: true, requireTenant: false }
);