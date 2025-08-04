import { NextRequest, NextResponse } from 'next/server';
import { withApiAuth, withApiLogging } from '../../../../lib/auth/api-middleware';

// Test endpoint to verify Plaid connection without encryption
async function testConnectionHandler(
  request: NextRequest,
  context: any
): Promise<NextResponse> {
  try {
    const { user } = context;

    // Simple test response
    return NextResponse.json({
      success: true,
      data: {
        message: 'Plaid connection test successful',
        userId: user.id,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('Test connection error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'TEST_ERROR',
          message: error.message || 'Test connection failed',
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    );
  }
}

// Apply middleware and export
export const GET = withApiLogging(
  withApiAuth(testConnectionHandler, { requireAuth: true, requireTenant: false }),
  'TEST_PLAID_CONNECTION'
);