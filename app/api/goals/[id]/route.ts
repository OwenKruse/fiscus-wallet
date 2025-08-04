import { NextRequest, NextResponse } from 'next/server';
import { withApiAuth, withApiLogging } from '../../../../lib/auth/api-middleware';
import { getGoalService } from '../../../../lib/goals/goal-service';
import { 
  UpdateGoalRequest,
  GoalResponse,
  ApiResponse 
} from '../../../../types';

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

// GET /api/goals/[id] - Get specific goal with progress history
async function getGoalHandler(
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
    const goal = await goalService.getGoal(goalId, user.id);

    if (!goal) {
      return createErrorResponse('Goal not found', 404, 'GOAL_NOT_FOUND');
    }

    // Get progress history for the goal
    const progressHistory = await goalService.getGoalProgress(goalId, user.id, 50, 0);

    const response: GoalResponse = {
      goal,
      progressHistory
    };

    return createSuccessResponse(response);

  } catch (error: any) {
    console.error('Get goal error:', error);

    // Handle access denied errors
    if (error.message?.includes('access denied') || error.message?.includes('not found')) {
      return createErrorResponse('Goal not found or access denied', 404, 'GOAL_NOT_FOUND');
    }

    // Handle database errors
    if (error.message?.includes('connection') || error.message?.includes('timeout')) {
      return createErrorResponse('Database connection error', 503, 'DATABASE_ERROR');
    }

    return createErrorResponse('Failed to fetch goal', 500, 'INTERNAL_ERROR');
  }
}

// PUT /api/goals/[id] - Update goal
async function updateGoalHandler(
  request: NextRequest,
  context: any
): Promise<NextResponse> {
  try {
    const { user, params } = context;
    const goalId = params.id;

    if (!goalId) {
      return createErrorResponse('Goal ID is required', 400, 'MISSING_PARAMETER');
    }

    let body: UpdateGoalRequest;

    try {
      body = await request.json();
    } catch {
      return createErrorResponse('Invalid JSON payload', 400, 'INVALID_JSON');
    }

    // Basic validation for update fields
    if ('targetAmount' in body && (typeof body.targetAmount !== 'number' || body.targetAmount! <= 0)) {
      return createErrorResponse('Target amount must be a positive number', 400, 'VALIDATION_ERROR');
    }

    if ('currentAmount' in body && (typeof body.currentAmount !== 'number' || body.currentAmount! < 0)) {
      return createErrorResponse('Current amount must be a non-negative number', 400, 'VALIDATION_ERROR');
    }

    if ('title' in body && (!body.title || typeof body.title !== 'string')) {
      return createErrorResponse('Title must be a non-empty string', 400, 'VALIDATION_ERROR');
    }

    const goalService = getGoalService();
    const updatedGoal = await goalService.updateGoal(goalId, user.id, body);

    return createSuccessResponse(updatedGoal, 'Goal updated successfully');

  } catch (error: any) {
    console.error('Update goal error:', error);

    // Handle validation errors from service
    if (error.validationErrors) {
      return createErrorResponse(
        'Validation failed: ' + error.validationErrors.map((e: any) => e.message).join(', '),
        400,
        'VALIDATION_ERROR'
      );
    }

    // Handle not found errors
    if (error.message?.includes('not found') || error.message?.includes('access denied')) {
      return createErrorResponse('Goal not found or access denied', 404, 'GOAL_NOT_FOUND');
    }

    // Handle database errors
    if (error.message?.includes('connection') || error.message?.includes('timeout')) {
      return createErrorResponse('Database connection error', 503, 'DATABASE_ERROR');
    }

    return createErrorResponse('Failed to update goal', 500, 'INTERNAL_ERROR');
  }
}

// DELETE /api/goals/[id] - Delete goal
async function deleteGoalHandler(
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
    await goalService.deleteGoal(goalId, user.id);

    return createSuccessResponse(null, 'Goal deleted successfully');

  } catch (error: any) {
    console.error('Delete goal error:', error);

    // Handle not found errors
    if (error.message?.includes('not found') || error.message?.includes('access denied')) {
      return createErrorResponse('Goal not found or access denied', 404, 'GOAL_NOT_FOUND');
    }

    // Handle database errors
    if (error.message?.includes('connection') || error.message?.includes('timeout')) {
      return createErrorResponse('Database connection error', 503, 'DATABASE_ERROR');
    }

    // Handle foreign key constraint errors
    if (error.message?.includes('foreign key') || error.message?.includes('constraint')) {
      return createErrorResponse('Cannot delete goal with associated data', 409, 'CONSTRAINT_ERROR');
    }

    return createErrorResponse('Failed to delete goal', 500, 'INTERNAL_ERROR');
  }
}

// Apply middleware and export handlers
export const GET = withApiLogging(
  withApiAuth(getGoalHandler, { requireAuth: true, requireTenant: false }),
  'GET_GOAL'
);

export const PUT = withApiLogging(
  withApiAuth(updateGoalHandler, { requireAuth: true, requireTenant: false }),
  'UPDATE_GOAL'
);

export const DELETE = withApiLogging(
  withApiAuth(deleteGoalHandler, { requireAuth: true, requireTenant: false }),
  'DELETE_GOAL'
);