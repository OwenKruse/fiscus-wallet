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

function isSecureRequest(request: NextRequest): boolean {
  try {
    const proto = request.nextUrl.protocol;
    const host = request.headers.get('host') || '';
    const isLocalhost = host.includes('localhost') || host.startsWith('127.0.0.1') || host.startsWith('0.0.0.0');
    return !isLocalhost && (proto === 'https:' || process.env.NODE_ENV === 'production');
  } catch {
    return process.env.NODE_ENV === 'production';
  }
}

// Create success response and clear cookie
function createSuccessResponse(request: NextRequest) {
  const response = NextResponse.json({
    success: true,
    message: 'Sign out successful'
  });

  // Clear the auth token cookie
  response.cookies.set('auth-token', '', {
    httpOnly: true,
    secure: isSecureRequest(request),
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
    return createSuccessResponse(request);

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
