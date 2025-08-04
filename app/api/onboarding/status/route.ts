import { NextRequest, NextResponse } from 'next/server';
import { getCacheService } from '../../../../lib/cache/cache-service';
import { withApiAuth, withApiLogging } from '../../../../lib/auth/api-middleware';

// Create error response
function createErrorResponse(message: string, status: number = 400, code?: string) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: code || 'ERROR',
        message,
        timestamp: new Date().toISOString()
      }
    },
    { status }
  );
}

// Main handler for checking onboarding status
async function getOnboardingStatusHandler(
  request: NextRequest,
  context: any
): Promise<NextResponse> {
  try {
    const { user } = context;
    const cacheService = getCacheService();

    // Get accounts from cache service
    const accountsResponse = await cacheService.getAccounts(user.id);
    const accountCount = accountsResponse.accounts.length;

    return NextResponse.json({
      success: true,
      data: {
        needsOnboarding: accountCount === 0,
        accountCount,
        hasConnectedAccounts: accountCount > 0,
        userId: user.id
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Get onboarding status error:', error);

    // Handle database errors
    if (error.message?.includes('connection') || error.message?.includes('timeout')) {
      return createErrorResponse('Database connection error', 503, 'DATABASE_ERROR');
    }

    // Handle cache errors
    if (error.message?.includes('cache')) {
      return createErrorResponse('Cache service error', 503, 'CACHE_ERROR');
    }

    return createErrorResponse('Failed to check onboarding status', 500, 'INTERNAL_ERROR');
  }
}

// Apply middleware and export
export const GET = withApiLogging(
  withApiAuth(getOnboardingStatusHandler, { requireAuth: true, requireTenant: false }),
  'GET_ONBOARDING_STATUS'
);