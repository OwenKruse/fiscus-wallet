import { NextRequest, NextResponse } from 'next/server';
import { withApiAuth, withApiLogging } from '../../../../../lib/auth/api-middleware';
import { getGoalService } from '../../../../../lib/goals/goal-service';
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

// PUT /api/goals/[id]/primary - Set goal as primary
async function setPrimaryGoalHandler(
  request: NextRequest,
  context: any
): Promise<NextResponse> {
  try {
    const { user, params } = context;
    const goalId = params.id;

    if (!goalId) {
      return createErrorResponse('Goal ID is required', 400, 'MISSING_PARAMETER');
    }

    const goalService = getGoalService();

    // Validate that the goal can be set as primary
    const validation = await goalService.validatePrimaryGoal(goalId, user.id);
    
    if (!validation.isValid) {
      return createErrorResponse(
        validation.errors.join(', '),
        400,
        'VALIDATION_ERROR'
      );
    }

    // Set the goal as primary
    await goalService.setPrimaryGoal(goalId, user.id);

    // Get the updated goal to return
    const updatedGoal = await goalService.getGoal(goalId, user.id);

    return createSuccessResponse(
      {
        goalId: goalId,
        isPrimary: true,
        goal: updatedGoal
      },
      'Goal set as primary successfully'
    );

  } catch (error: any) {
    console.error('Set primary goal error:', error);

    // Handle validation errors
    if (error.message?.includes('Only active goals')) {
      return createErrorResponse(
        'Only active goals can be set as primary',
        400,
        'INVALID_GOAL_STATUS'
      );
    }

    if (error.message?.includes('past target dates')) {
      return createErrorResponse(
        'Goals with past target dates cannot be set as primary',
        400,
        'INVALID_TARGET_DATE'
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

    // Handle constraint errors
    if (error.message?.includes('Failed to set primary goal')) {
      return createErrorResponse(
        'Failed to set primary goal. Please try again.',
        500,
        'PRIMARY_GOAL_UPDATE_FAILED'
      );
    }

    return createErrorResponse('Failed to set primary goal', 500, 'INTERNAL_ERROR');
  }
}

// Apply middleware and export handler
export const PUT = withApiLogging(
  withApiAuth(setPrimaryGoalHandler, { requireAuth: true, requireTenant: false }),
  'SET_PRIMARY_GOAL'
);