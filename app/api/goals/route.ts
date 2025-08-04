import { NextRequest, NextResponse } from 'next/server';
import { withApiAuth, withApiLogging } from '../../../lib/auth/api-middleware';
import { getGoalService } from '../../../lib/goals/goal-service';
import { 
  CreateGoalRequest, 
  UpdateGoalRequest, 
  GoalsFilters,
  GoalsResponse,
  ApiResponse 
} from '../../../types';

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

// GET /api/goals - List user's goals with filtering
async function getGoalsHandler(
  request: NextRequest,
  context: any
): Promise<NextResponse> {
  try {
    const { user } = context;
    const { searchParams } = new URL(request.url);

    // Parse query parameters for filtering
    const filters: GoalsFilters = {};

    // Status filter
    const status = searchParams.get('status');
    if (status) {
      filters.status = status.split(',') as GoalsFilters['status'];
    }

    // Goal type filter
    const goalType = searchParams.get('goalType');
    if (goalType) {
      filters.goalType = goalType.split(',') as GoalsFilters['goalType'];
    }

    // Priority filter
    const priority = searchParams.get('priority');
    if (priority) {
      filters.priority = priority.split(',') as GoalsFilters['priority'];
    }

    // Category filter
    const category = searchParams.get('category');
    if (category) {
      filters.category = category.split(',');
    }

    // Search filter
    const search = searchParams.get('search');
    if (search) {
      filters.search = search;
    }

    // Sorting
    const sortBy = searchParams.get('sortBy');
    if (sortBy) {
      filters.sortBy = sortBy as GoalsFilters['sortBy'];
    }

    const sortOrder = searchParams.get('sortOrder');
    if (sortOrder) {
      filters.sortOrder = sortOrder as GoalsFilters['sortOrder'];
    }

    // Pagination
    const page = searchParams.get('page');
    if (page) {
      filters.page = parseInt(page, 10);
    }

    const limit = searchParams.get('limit');
    if (limit) {
      filters.limit = parseInt(limit, 10);
    }

    const goalService = getGoalService();
    const goals = await goalService.getGoals(user.id, filters);

    // If pagination was requested, we need to get total count
    let pagination;
    if (filters.limit) {
      // For now, we'll return basic pagination info
      // In a production app, you'd want to optimize this with a separate count query
      pagination = {
        page: filters.page || 1,
        limit: filters.limit,
        total: goals.length, // This is not accurate for paginated results
        totalPages: Math.ceil(goals.length / filters.limit),
        hasNext: goals.length === filters.limit,
        hasPrev: (filters.page || 1) > 1
      };
    }

    const response: GoalsResponse = {
      goals,
      pagination
    };

    return createSuccessResponse(response);

  } catch (error: any) {
    console.error('Get goals error:', error);

    // Handle validation errors
    if (error.validationErrors) {
      return createErrorResponse(
        'Validation failed: ' + error.validationErrors.map((e: any) => e.message).join(', '),
        400,
        'VALIDATION_ERROR'
      );
    }

    // Handle database errors
    if (error.message?.includes('connection') || error.message?.includes('timeout')) {
      return createErrorResponse('Database connection error', 503, 'DATABASE_ERROR');
    }

    return createErrorResponse('Failed to fetch goals', 500, 'INTERNAL_ERROR');
  }
}

// POST /api/goals - Create new goal
async function createGoalHandler(
  request: NextRequest,
  context: any
): Promise<NextResponse> {
  try {
    const { user } = context;
    let body: CreateGoalRequest;

    try {
      body = await request.json();
    } catch {
      return createErrorResponse('Invalid JSON payload', 400, 'INVALID_JSON');
    }

    // Basic validation
    if (!body.title || typeof body.title !== 'string') {
      return createErrorResponse('Title is required and must be a string', 400, 'VALIDATION_ERROR');
    }

    if (!body.targetAmount || typeof body.targetAmount !== 'number' || body.targetAmount <= 0) {
      return createErrorResponse('Target amount is required and must be a positive number', 400, 'VALIDATION_ERROR');
    }

    if (!body.targetDate) {
      return createErrorResponse('Target date is required', 400, 'VALIDATION_ERROR');
    }

    if (!body.goalType) {
      return createErrorResponse('Goal type is required', 400, 'VALIDATION_ERROR');
    }

    const goalService = getGoalService();
    const goal = await goalService.createGoal(user.id, body);

    return createSuccessResponse(goal, 'Goal created successfully');

  } catch (error: any) {
    console.error('Create goal error:', error);

    // Handle validation errors from service
    if (error.validationErrors) {
      return createErrorResponse(
        'Validation failed: ' + error.validationErrors.map((e: any) => e.message).join(', '),
        400,
        'VALIDATION_ERROR'
      );
    }

    // Handle database errors
    if (error.message?.includes('connection') || error.message?.includes('timeout')) {
      return createErrorResponse('Database connection error', 503, 'DATABASE_ERROR');
    }

    // Handle duplicate errors
    if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
      return createErrorResponse('A goal with similar details already exists', 409, 'DUPLICATE_ERROR');
    }

    return createErrorResponse('Failed to create goal', 500, 'INTERNAL_ERROR');
  }
}

// Apply middleware and export handlers
export const GET = withApiLogging(
  withApiAuth(getGoalsHandler, { requireAuth: true, requireTenant: false }),
  'GET_GOALS'
);

export const POST = withApiLogging(
  withApiAuth(createGoalHandler, { requireAuth: true, requireTenant: false }),
  'CREATE_GOAL'
);