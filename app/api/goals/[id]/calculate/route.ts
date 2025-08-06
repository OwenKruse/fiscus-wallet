import { NextRequest, NextResponse } from 'next/server';
import { withApiAuth, withApiLogging } from '../../../../../lib/auth/api-middleware';
import { getGoalsManager } from '../../../../../lib/goals/goals-manager';
import { ApiResponse } from '../../../../../types';

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

// PUT /api/goals/[id]/calculate - Trigger automatic progress calculation
async function calculateProgressHandler(
  request: NextRequest,
  context: any
): Promise<NextResponse> {
  try {
    const { user, params } = context;
    const goalId = params.id;

    if (!goalId) {
      return createErrorResponse('Goal ID is required', 400, 'MISSING_PARAMETER');
    }

    const goalsManager = getGoalsManager();
    
    // First, verify the goal exists and belongs to the user
    const goal = await goalsManager.getGoal(goalId, user.id);
    
    if (!goal) {
      return createErrorResponse('Goal not found or access denied', 404, 'GOAL_NOT_FOUND');
    }

    // Check if the goal supports automatic calculation
    if (goal.trackingMethod === 'manual') {
      return createErrorResponse(
        'Goal is set to manual tracking. Automatic calculation is not available.',
        400,
        'MANUAL_TRACKING_ONLY'
      );
    }

    // Trigger automatic progress calculation
    const updatedGoal = await goalsManager.calculateAndUpdateGoalProgress(goalId, user.id);

    return createSuccessResponse(
      {
        goalId: goalId,
        currentAmount: updatedGoal.currentAmount || 0,
        progressPercentage: Math.min(100, (updatedGoal.currentAmount / updatedGoal.targetAmount) * 100),
        lastCalculated: new Date().toISOString()
      },
      'Progress calculated successfully'
    );

  } catch (error: any) {
    console.error('Calculate goal progress error:', error);

    // Handle specific calculation errors
    if (error.message?.includes('tracking method')) {
      return createErrorResponse(
        'Goal tracking method does not support automatic calculation',
        400,
        'UNSUPPORTED_TRACKING_METHOD'
      );
    }

    if (error.message?.includes('no accounts configured')) {
      return createErrorResponse(
        'No tracking accounts configured for this goal',
        400,
        'NO_TRACKING_ACCOUNTS'
      );
    }

    if (error.message?.includes('account data not available')) {
      return createErrorResponse(
        'Account data is not available for calculation. Please sync your financial data first.',
        400,
        'ACCOUNT_DATA_UNAVAILABLE'
      );
    }

    // Handle access denied errors
    if (error.message?.includes('access denied') || error.message?.includes('not found')) {
      return createErrorResponse('Goal not found or access denied', 404, 'GOAL_NOT_FOUND');
    }

    // Handle database errors
    if (error.message?.includes('connection') || error.message?.includes('timeout')) {
      return createErrorResponse('Database connection error', 503, 'DATABASE_ERROR');
    }

    // Handle calculation service errors
    if (error.message?.includes('calculation failed')) {
      return createErrorResponse(
        'Progress calculation failed. Please try again later.',
        500,
        'CALCULATION_ERROR'
      );
    }

    return createErrorResponse('Failed to calculate progress', 500, 'INTERNAL_ERROR');
  }
}

// Apply middleware and export handler
export const PUT = withApiLogging(
  withApiAuth(calculateProgressHandler, { requireAuth: true, requireTenant: false }),
  'CALCULATE_GOAL_PROGRESS'
);