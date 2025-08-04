import { NextRequest, NextResponse } from 'next/server';
import { withApiAuth, withApiLogging } from '../../../../../lib/auth/api-middleware';
import { getGoalService } from '../../../../../lib/goals/goal-service';
import { 
  GoalAnalyticsResponse,
  GoalAnalytics,
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

// Helper function to calculate individual goal analytics
async function calculateGoalAnalytics(goal: any, progressHistory: any[]): Promise<GoalAnalytics> {
  const now = new Date();
  const targetDate = new Date(goal.targetDate);
  const createdDate = new Date(goal.createdAt);
  
  // Calculate days remaining
  const daysRemaining = Math.max(0, Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  
  // Calculate progress percentage
  const progressPercentage = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
  
  // Calculate if on track
  const totalDays = Math.ceil((targetDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
  const daysPassed = totalDays - daysRemaining;
  const expectedProgress = totalDays > 0 ? (daysPassed / totalDays) * 100 : 0;
  const isOnTrack = progressPercentage >= expectedProgress * 0.9; // 90% of expected progress
  
  // Calculate average daily progress
  const averageDailyProgress = daysPassed > 0 ? goal.currentAmount / daysPassed : 0;
  
  // Calculate projected completion date
  const remainingAmount = Math.max(0, goal.targetAmount - goal.currentAmount);
  const projectedDays = averageDailyProgress > 0 ? Math.ceil(remainingAmount / averageDailyProgress) : daysRemaining;
  const projectedCompletion = new Date(now.getTime() + projectedDays * 24 * 60 * 60 * 1000);
  
  // Calculate milestones
  const milestones = [25, 50, 75, 100].map(percentage => {
    const milestoneAmount = (goal.targetAmount * percentage) / 100;
    const achieved = goal.currentAmount >= milestoneAmount;
    
    // Find achievement date from progress history
    let achievedDate: string | undefined;
    if (achieved && progressHistory.length > 0) {
      // Sort progress history by date
      const sortedHistory = [...progressHistory].sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      
      let runningTotal = 0;
      for (const entry of sortedHistory) {
        if (entry.progressType === 'manual_add' || entry.progressType === 'automatic') {
          runningTotal += entry.amount;
        } else if (entry.progressType === 'manual_subtract') {
          runningTotal -= entry.amount;
        } else if (entry.progressType === 'adjustment') {
          runningTotal = entry.amount;
        }
        
        if (runningTotal >= milestoneAmount) {
          achievedDate = entry.createdAt;
          break;
        }
      }
    }
    
    return {
      percentage,
      achieved,
      achievedDate
    };
  });
  
  // Calculate progress history for chart
  const sortedHistory = [...progressHistory].sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  
  const progressHistoryChart = [];
  let runningTotal = 0;
  
  for (const entry of sortedHistory) {
    if (entry.progressType === 'manual_add' || entry.progressType === 'automatic') {
      runningTotal += entry.amount;
    } else if (entry.progressType === 'manual_subtract') {
      runningTotal -= entry.amount;
    } else if (entry.progressType === 'adjustment') {
      runningTotal = entry.amount;
    }
    
    const amount = Math.max(0, runningTotal);
    const percentage = goal.targetAmount > 0 ? Math.min(100, (amount / goal.targetAmount) * 100) : 0;
    
    progressHistoryChart.push({
      date: new Date(entry.createdAt).toISOString().split('T')[0],
      amount,
      percentage
    });
  }
  
  // Add current state if no progress entries exist
  if (progressHistoryChart.length === 0) {
    progressHistoryChart.push({
      date: now.toISOString().split('T')[0],
      amount: goal.currentAmount,
      percentage: progressPercentage
    });
  }
  
  // Calculate monthly progress
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const recentProgress = progressHistory.filter(entry => new Date(entry.createdAt) >= thirtyDaysAgo);
  const monthlyProgress = recentProgress.reduce((sum, entry) => {
    if (entry.progressType === 'manual_add' || entry.progressType === 'automatic') {
      return sum + entry.amount;
    } else if (entry.progressType === 'manual_subtract') {
      return sum - entry.amount;
    }
    return sum;
  }, 0);
  
  // Calculate trends
  const last30DaysProgress = monthlyProgress;
  const last90DaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const last90DaysProgress = progressHistory
    .filter(entry => new Date(entry.createdAt) >= last90DaysAgo)
    .reduce((sum, entry) => {
      if (entry.progressType === 'manual_add' || entry.progressType === 'automatic') {
        return sum + entry.amount;
      } else if (entry.progressType === 'manual_subtract') {
        return sum - entry.amount;
      }
      return sum;
    }, 0);
  
  return {
    goalId: goal.id,
    progressHistory: progressHistoryChart,
    projectedCompletion: projectedCompletion.toISOString(),
    monthlyProgress,
    isOnTrack,
    daysRemaining,
    averageDailyProgress,
    milestones,
    trends: {
      last30Days: last30DaysProgress,
      last90Days: last90DaysProgress,
      overall: goal.currentAmount
    }
  };
}

// GET /api/goals/[id]/analytics - Get analytics for specific goal
async function getGoalAnalyticsHandler(
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
    
    // Parse optional parameters
    const includeProjections = searchParams.get('includeProjections') !== 'false'; // Default true
    const includeTrends = searchParams.get('includeTrends') !== 'false'; // Default true
    const historyLimit = parseInt(searchParams.get('historyLimit') || '100', 10);

    const goalService = getGoalService();
    
    // Get the goal
    const goal = await goalService.getGoal(goalId, user.id);
    
    if (!goal) {
      return createErrorResponse('Goal not found or access denied', 404, 'GOAL_NOT_FOUND');
    }

    // Get progress history
    const progressHistory = await goalService.getGoalProgress(goalId, user.id, historyLimit, 0);
    
    // Calculate analytics
    const analytics = await calculateGoalAnalytics(goal, progressHistory);
    
    // Optionally filter out projections or trends based on query parameters
    let filteredAnalytics = { ...analytics };
    
    if (!includeProjections) {
      delete (filteredAnalytics as any).projectedCompletion;
      delete (filteredAnalytics as any).averageDailyProgress;
    }
    
    if (!includeTrends) {
      delete (filteredAnalytics as any).trends;
      delete (filteredAnalytics as any).monthlyProgress;
    }

    const response: GoalAnalyticsResponse = {
      analytics: filteredAnalytics
    };

    return createSuccessResponse(response);

  } catch (error: any) {
    console.error('Get goal analytics error:', error);

    // Handle access denied errors
    if (error.message?.includes('access denied') || error.message?.includes('not found')) {
      return createErrorResponse('Goal not found or access denied', 404, 'GOAL_NOT_FOUND');
    }

    // Handle database errors
    if (error.message?.includes('connection') || error.message?.includes('timeout')) {
      return createErrorResponse('Database connection error', 503, 'DATABASE_ERROR');
    }

    // Handle calculation errors
    if (error.message?.includes('calculation')) {
      return createErrorResponse(
        'Failed to calculate goal analytics. Please try again later.',
        500,
        'CALCULATION_ERROR'
      );
    }

    return createErrorResponse('Failed to fetch goal analytics', 500, 'INTERNAL_ERROR');
  }
}

// Apply middleware and export handler
export const GET = withApiLogging(
  withApiAuth(getGoalAnalyticsHandler, { requireAuth: true, requireTenant: false }),
  'GET_GOAL_ANALYTICS'
);