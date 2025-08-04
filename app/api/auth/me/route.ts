import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '../../../../lib/auth/auth-middleware';

// Create error response
function createErrorResponse(message: string, status: number = 400, code?: string) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: code || 'USER_ERROR',
        message,
        timestamp: new Date().toISOString()
      }
    },
    { status }
  );
}

// Main user profile handler
async function getUserHandler(request: NextRequest, context: AuthContext): Promise<NextResponse> {
  try {
    const { user } = context;

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        company: user.company,
        tenantId: user.tenantId,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get user error:', error);
    return createErrorResponse('Internal server error', 500, 'INTERNAL_ERROR');
  }
}

// Export GET handler with authentication middleware
export const GET = withAuth(getUserHandler, { requireAuth: true, requireTenant: true });