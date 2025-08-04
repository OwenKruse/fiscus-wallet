import { NextRequest, NextResponse } from 'next/server';
import { withApiAuth, withApiLogging } from '../../../../lib/auth/api-middleware';
import { getGoalService } from '../../../../lib/goals/goal-service';
import { getGoalsManager } from '../../../../lib/goals/goals-manager';
import { 
  AllGoalsAnalyticsResponse,
  AllGoalsAnalytics,
  GoalAnalytics,
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

// Helper function to calculate goal analytics
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
      let runningTotal = 0;
      for (const entry of progressHistory.reverse()) {
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
  const progressHistoryChart = progressHistory.map(entry => {
    const date = new Date(entry.createdAt);
    let amount = 0;
    
    // Calculate cumulative amount up to this point
    const entriesUpToDate = progressHistory.filter(e => new Date(e.createdAt) <= date);
    for (const e of entriesUpToDate) {
      if (e.progressType === 'manual_add' || e.progressType === 'automatic') {
        amount += e.amount;
      } else if (e.progressType === 'manual_subtract') {
        amount -= e.amount;
      } else if (e.progressType === 'adjustment') {
        amount = e.amount;
      }
    }
    
    return {
      date: date.toISOString().split('T')[0],
      amount: Math.max(0, amount),
      percentage: goal.targetAmount > 0 ? Math.min(100, (amount / goal.targetAmount) * 100) : 0
    };
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  // Calculate monthly progress (simplified)
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

// GET /api/goals/analytics - Get analytics for all goals
async function getAllGoalsAnalyticsHandler(
  request: NextRequest,
  context: any
): Promise<NextResponse> {
  try {
    const { user } = context;
    const { searchParams } = new URL(request.url);
    
    // Parse filters
    const status = searchParams.get('status');
    const goalType = searchParams.get('goalType');
    const dateRange = searchParams.get('dateRange'); // e.g., '30d', '90d', '1y'
    
    const goalService = getGoalService();
    const goalsManager = getGoalsManager();
    
    // Get all goals with optional filtering
    const filters: any = {};
    if (status) {
      filters.status = status.split(',');
    }
    if (goalType) {
      filters.goalType = goalType.split(',');
    }
    
    const goals = await goalService.getGoals(user.id, filters);
    
    // Get goal statistics
    const stats = await goalsManager.getGoalStatistics(user.id);
    
    // Calculate analytics for each goal
    const goalAnalytics: GoalAnalytics[] = [];
    
    for (const goal of goals) {
      const progressHistory = await goalService.getGoalProgress(goal.id, user.id, 100, 0);
      const analytics = await calculateGoalAnalytics(goal, progressHistory);
      goalAnalytics.push(analytics);
    }
    
    // Calculate goals by type
    const goalsByType: AllGoalsAnalytics['goalsByType'] = {
      savings: { count: 0, totalTarget: 0, totalCurrent: 0, averageProgress: 0 },
      debt_reduction: { count: 0, totalTarget: 0, totalCurrent: 0, averageProgress: 0 },
      investment: { count: 0, totalTarget: 0, totalCurrent: 0, averageProgress: 0 },
      purchase: { count: 0, totalTarget: 0, totalCurrent: 0, averageProgress: 0 },
      education: { count: 0, totalTarget: 0, totalCurrent: 0, averageProgress: 0 },
      travel: { count: 0, totalTarget: 0, totalCurrent: 0, averageProgress: 0 }
    };
    
    goals.forEach(goal => {
      const type = goal.goalType;
      if (goalsByType[type]) {
        goalsByType[type].count++;
        goalsByType[type].totalTarget += goal.targetAmount;
        goalsByType[type].totalCurrent += goal.currentAmount;
      }
    });
    
    // Calculate average progress for each type
    Object.keys(goalsByType).forEach(type => {
      const typeData = goalsByType[type as keyof typeof goalsByType];
      typeData.averageProgress = typeData.totalTarget > 0 
        ? (typeData.totalCurrent / typeData.totalTarget) * 100 
        : 0;
    });
    
    // Calculate goals by priority
    const goalsByPriority: AllGoalsAnalytics['goalsByPriority'] = {
      high: { count: 0, averageProgress: 0 },
      medium: { count: 0, averageProgress: 0 },
      low: { count: 0, averageProgress: 0 }
    };
    
    goals.forEach(goal => {
      const priority = goal.priority;
      if (goalsByPriority[priority]) {
        goalsByPriority[priority].count++;
      }
    });
    
    // Calculate average progress for each priority
    Object.keys(goalsByPriority).forEach(priority => {
      const priorityGoals = goals.filter(g => g.priority === priority);
      const totalProgress = priorityGoals.reduce((sum, goal) => {
        return sum + (goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0);
      }, 0);
      goalsByPriority[priority as keyof typeof goalsByPriority].averageProgress = 
        priorityGoals.length > 0 ? totalProgress / priorityGoals.length : 0;
    });
    
    // Calculate upcoming deadlines
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const upcomingDeadlines = goals
      .filter(goal => goal.status === 'active' && new Date(goal.targetDate) <= thirtyDaysFromNow)
      .map(goal => {
        const daysRemaining = Math.max(0, Math.ceil((new Date(goal.targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));
        const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
        
        return {
          goalId: goal.id,
          title: goal.title,
          targetDate: goal.targetDate,
          daysRemaining,
          progress
        };
      })
      .sort((a, b) => a.daysRemaining - b.daysRemaining);
    
    // Calculate recent milestones (simplified)
    const recentMilestones = goalAnalytics
      .flatMap(analytics => 
        analytics.milestones
          .filter(m => m.achieved && m.achievedDate)
          .map(m => ({
            goalId: analytics.goalId,
            title: goals.find(g => g.id === analytics.goalId)?.title || 'Unknown Goal',
            milestone: m.percentage,
            achievedDate: m.achievedDate!
          }))
      )
      .sort((a, b) => new Date(b.achievedDate).getTime() - new Date(a.achievedDate).getTime())
      .slice(0, 10); // Last 10 milestones
    
    // Count goals by tracking status
    const goalsOnTrack = goalAnalytics.filter(a => a.isOnTrack).length;
    const goalsBehindSchedule = goalAnalytics.filter(a => !a.isOnTrack && a.daysRemaining > 0).length;
    const goalsAheadOfSchedule = goalAnalytics.filter(a => a.isOnTrack && a.daysRemaining > 0).length;
    
    const allGoalsAnalytics: AllGoalsAnalytics = {
      totalGoals: stats.totalGoals,
      activeGoals: stats.activeGoals,
      completedGoals: stats.completedGoals,
      totalTargetAmount: stats.totalTargetAmount,
      totalCurrentAmount: stats.totalCurrentAmount,
      overallProgress: stats.overallProgress,
      goalsOnTrack,
      goalsBehindSchedule,
      goalsAheadOfSchedule,
      goalsByType,
      goalsByPriority,
      upcomingDeadlines,
      recentMilestones
    };
    
    const response: AllGoalsAnalyticsResponse = {
      analytics: allGoalsAnalytics,
      goalAnalytics
    };
    
    return createSuccessResponse(response);
    
  } catch (error: any) {
    console.error('Get all goals analytics error:', error);
    
    // Handle database errors
    if (error.message?.includes('connection') || error.message?.includes('timeout')) {
      return createErrorResponse('Database connection error', 503, 'DATABASE_ERROR');
    }
    
    return createErrorResponse('Failed to fetch goals analytics', 500, 'INTERNAL_ERROR');
  }
}

// Apply middleware and export handler
export const GET = withApiLogging(
  withApiAuth(getAllGoalsAnalyticsHandler, { requireAuth: true, requireTenant: false }),
  'GET_ALL_GOALS_ANALYTICS'
);