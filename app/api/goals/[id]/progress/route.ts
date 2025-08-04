import { NextRequest, NextResponse } from 'next/server';
import { withApiAuth, withApiLogging } from '../../../../../lib/auth/api-middleware';
import { getGoalService } from '../../../../../lib/goals/goal-service';
import { 
  GoalProgressRequest,
  GoalProgressResponse,
  ApiResponse 
} from '../../../../../types';

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

// GET /api/goals/[id]/progress - Get progress history
async function getProgressHandler(
  request: NextRequest,
  context: any
): Promise<NextResponse> {
  try {
    const { user, params } = context;
    const goalId = params.id;

    if (!goalId) {
      return createErrorResponse('Goal ID is required', 400, 'MISSING_PARAMETER');
    }

    const { searchParams } = new URL(request.url);
    
    // Parse pagination parameters
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = (page - 1) * limit;

    // Validate pagination parameters
    if (page < 1) {
      return createErrorResponse('Page must be a positive integer', 400, 'VALIDATION_ERROR');
    }

    if (limit < 1 || limit > 100) {
      return createErrorResponse('Limit must be between 1 and 100', 400, 'VALIDATION_ERROR');
    }

    const goalService = getGoalService();
    const progress = await goalService.getGoalProgress(goalId, user.id, limit, offset);

    // Create pagination info
    const pagination = {
      page,
      limit,
      total: progress.length, // This is not accurate - in production you'd want a separate count query
      totalPages: Math.ceil(progress.length / limit),
      hasNext: progress.length === limit,
      hasPrev: page > 1
    };

    const response: GoalProgressResponse = {
      progress,
      pagination
    };

    return createSuccessResponse(response);

  } catch (error: any) {
    console.error('Get goal progress error:', error);

    // Handle access denied errors
    if (error.message?.includes('access denied') || error.message?.includes('not found')) {
      return createErrorResponse('Goal not found or access denied', 404, 'GOAL_NOT_FOUND');
    }

    // Handle database errors
    if (error.message?.includes('connection') || error.message?.includes('timeout')) {
      return createErrorResponse('Database connection error', 503, 'DATABASE_ERROR');
    }

    return createErrorResponse('Failed to fetch goal progress', 500, 'INTERNAL_ERROR');
  }
}

// POST /api/goals/[id]/progress - Add manual progress entry
async function addProgressHandler(
  request: NextRequest,
  context: any
): Promise<NextResponse> {
  try {
    const { user, params } = context;
    const goalId = params.id;

    if (!goalId) {
      return createErrorResponse('Goal ID is required', 400, 'MISSING_PARAMETER');
    }

    let body: GoalProgressRequest;

    try {
      body = await request.json();
    } catch {
      return createErrorResponse('Invalid JSON payload', 400, 'INVALID_JSON');
    }

    // Validate required fields
    if (typeof body.amount !== 'number') {
      return createErrorResponse('Amount is required and must be a number', 400, 'VALIDATION_ERROR');
    }

    if (!body.progressType) {
      return createErrorResponse('Progress type is required', 400, 'VALIDATION_ERROR');
    }

    // Validate progress type
    const validProgressTypes = ['manual_add', 'manual_subtract', 'adjustment'];
    if (!validProgressTypes.includes(body.progressType)) {
      return createErrorResponse(
        `Progress type must be one of: ${validProgressTypes.join(', ')}`,
        400,
        'VALIDATION_ERROR'
      );
    }

    // Validate amount based on progress type
    if (body.progressType !== 'adjustment' && body.amount <= 0) {
      return createErrorResponse('Amount must be positive for add/subtract operations', 400, 'VALIDATION_ERROR');
    }

    if (body.progressType === 'adjustment' && body.amount < 0) {
      return createErrorResponse('Amount must be non-negative for adjustment operations', 400, 'VALIDATION_ERROR');
    }

    const goalService = getGoalService();
    await goalService.addManualProgress(goalId, user.id, body);

    return createSuccessResponse(null, 'Progress added successfully');

  } catch (error: any) {
    console.error('Add goal progress error:', error);

    // Handle validation errors from service
    if (error.message?.includes('Progress amount must be a number')) {
      return createErrorResponse('Invalid progress amount', 400, 'VALIDATION_ERROR');
    }

    if (error.message?.includes('Invalid progress type')) {
      return createErrorResponse('Invalid progress type', 400, 'VALIDATION_ERROR');
    }

    // Handle access denied errors
    if (error.message?.includes('access denied') || error.message?.includes('not found')) {
      return createErrorResponse('Goal not found or access denied', 404, 'GOAL_NOT_FOUND');
    }

    // Handle database errors
    if (error.message?.includes('connection') || error.message?.includes('timeout')) {
      return createErrorResponse('Database connection error', 503, 'DATABASE_ERROR');
    }

    return createErrorResponse('Failed to add progress', 500, 'INTERNAL_ERROR');
  }
}

// Apply middleware and export handlers
export const GET = withApiLogging(
  withApiAuth(getProgressHandler, { requireAuth: true, requireTenant: false }),
  'GET_GOAL_PROGRESS'
);

export const POST = withApiLogging(
  withApiAuth(addProgressHandler, { requireAuth: true, requireTenant: false }),
  'ADD_GOAL_PROGRESS'
);