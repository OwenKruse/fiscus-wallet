import { NextRequest, NextResponse } from 'next/server';
import { withApiAuth, withApiLogging } from '../../../../lib/auth/api-middleware';
import { withAppInitialization } from '../../../../lib/middleware/app-init-middleware';
import { getDataSyncService } from '../../../../lib/sync/data-sync-service';
import { ApiResponse } from '../../../../types';

// Create error response helper
function createErrorResponse(message: string, status: number = 400, code?: string): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: code || 'ERROR',
        message,
        timestamp: new Date().toISOString()
      }
    } as ApiResponse,
    { status }
  );
}

// Create success response helper
function createSuccessResponse<T>(data: T, message?: string): NextResponse {
  return NextResponse.json({
    success: true,
    data,
    message,
    timestamp: new Date().toISOString()
  } as ApiResponse<T>);
}

// POST /api/goals/sync - Manually trigger goal progress calculation for all user goals
async function syncGoalsProgressHandler(
  request: NextRequest,
  context: any
): Promise<NextResponse> {
  try {
    const { user } = context;
    const syncService = getDataSyncService();

    console.log(`Manual goal progress sync requested for user ${user.id}`);

    // Trigger goal progress calculation
    const result = await syncService.calculateGoalProgress(user.id);

    return createSuccessResponse(
      {
        goalsUpdated: result.goalsUpdated,
        errors: result.errors,
        timestamp: new Date().toISOString()
      },
      `Successfully updated progress for ${result.goalsUpdated} goals`
    );

  } catch (error: any) {
    console.error('Sync goals progress error:', error);

    // Handle specific errors
    if (error.message?.includes('no goals found')) {
      return createSuccessResponse(
        { goalsUpdated: 0, errors: [], timestamp: new Date().toISOString() },
        'No goals found to update'
      );
    }

    if (error.message?.includes('calculation failed')) {
      return createErrorResponse(
        'Goal progress calculation failed. Please try again later.',
        500,
        'CALCULATION_ERROR'
      );
    }

    // Handle database errors
    if (error.message?.includes('connection') || error.message?.includes('timeout')) {
      return createErrorResponse('Database connection error', 503, 'DATABASE_ERROR');
    }

    return createErrorResponse('Failed to sync goal progress', 500, 'INTERNAL_ERROR');
  }
}

// Apply middleware and export handler
export const POST = withAppInitialization(
  withApiLogging(
    withApiAuth(syncGoalsProgressHandler, { requireAuth: true, requireTenant: false }),
    'SYNC_GOALS_PROGRESS'
  )
);