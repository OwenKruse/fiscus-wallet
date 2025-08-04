import { NextRequest, NextResponse } from 'next/server';
import { withApiAuth, withApiLogging } from '../../../../lib/auth/api-middleware';
import { getGoalService } from '../../../../lib/goals/goal-service';
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

// GET /api/goals/primary - Get current primary goal
async function getPrimaryGoalHandler(
  request: NextRequest,
  context: any
): Promise<NextResponse> {
  try {
    const { user } = context;
    const { searchParams } = new URL(request.url);
    
    // Check if detailed stats are requested
    const includeStats = searchParams.get('includeStats') === 'true';

    const goalService = getGoalService();

    if (includeStats) {
      // Get primary goal with detailed statistics for dashboard display
      const primaryGoalStats = await goalService.getPrimaryGoalStats(user.id);
      
      if (!primaryGoalStats) {
        return createSuccessResponse(
          {
            primaryGoal: null,
            message: 'No primary goal set'
          },
          'No primary goal found'
        );
      }

      return createSuccessResponse(
        {
          primaryGoal: primaryGoalStats.goal,
          stats: {
            progressPercentage: primaryGoalStats.progressPercentage,
            daysRemaining: primaryGoalStats.daysRemaining,
            isOnTrack: primaryGoalStats.isOnTrack,
            dailyTargetAmount: primaryGoalStats.dailyTargetAmount
          }
        },
        'Primary goal retrieved successfully'
      );
    } else {
      // Get basic primary goal information
      const primaryGoal = await goalService.getPrimaryGoal(user.id);
      
      if (!primaryGoal) {
        return createSuccessResponse(
          {
            primaryGoal: null,
            message: 'No primary goal set'
          },
          'No primary goal found'
        );
      }

      return createSuccessResponse(
        {
          primaryGoal
        },
        'Primary goal retrieved successfully'
      );
    }

  } catch (error: any) {
    console.error('Get primary goal error:', error);

    // Handle database errors
    if (error.message?.includes('connection') || error.message?.includes('timeout')) {
      return createErrorResponse('Database connection error', 503, 'DATABASE_ERROR');
    }

    // Handle calculation errors for stats
    if (error.message?.includes('calculation failed')) {
      return createErrorResponse(
        'Failed to calculate goal statistics',
        500,
        'STATS_CALCULATION_ERROR'
      );
    }

    return createErrorResponse('Failed to fetch primary goal', 500, 'INTERNAL_ERROR');
  }
}

// DELETE /api/goals/primary - Clear primary goal (bonus endpoint)
async function clearPrimaryGoalHandler(
  request: NextRequest,
  context: any
): Promise<NextResponse> {
  try {
    const { user } = context;

    const goalService = getGoalService();
    await goalService.clearPrimaryGoal(user.id);

    return createSuccessResponse(
      {
        primaryGoal: null
      },
      'Primary goal cleared successfully'
    );

  } catch (error: any) {
    console.error('Clear primary goal error:', error);

    // Handle database errors
    if (error.message?.includes('connection') || error.message?.includes('timeout')) {
      return createErrorResponse('Database connection error', 503, 'DATABASE_ERROR');
    }

    return createErrorResponse('Failed to clear primary goal', 500, 'INTERNAL_ERROR');
  }
}

// Apply middleware and export handlers
export const GET = withApiAuth(
  withApiLogging(getPrimaryGoalHandler, 'GET_PRIMARY_GOAL'),
  { requireAuth: true, requireTenant: true }
);

export const DELETE = withApiAuth(
  withApiLogging(clearPrimaryGoalHandler, 'CLEAR_PRIMARY_GOAL'),
  { requireAuth: true, requireTenant: true }
);