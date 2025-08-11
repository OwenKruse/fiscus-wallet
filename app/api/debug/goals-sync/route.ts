import { NextRequest, NextResponse } from 'next/server';
import { withApiAuth, withApiLogging } from '../../../../lib/auth/api-middleware';
import { withAppInitialization } from '../../../../lib/middleware/app-init-middleware';
import { getDataSyncService } from '../../../../lib/sync/data-sync-service';
import { getGoalsManager } from '../../../../lib/goals/goals-manager';

// Debug endpoint to check goals sync functionality
async function debugGoalsSyncHandler(
  request: NextRequest,
  context: any
): Promise<NextResponse> {
  try {
    const { user } = context;
    
    // Get services
    const syncService = getDataSyncService();
    const goalsManager = getGoalsManager();
    
    // Get sync metrics
    const metrics = syncService.getSyncMetrics();
    
    // Get user's goals
    const goals = await goalsManager.getGoals(user.id);
    const automaticGoals = goals.filter(goal => goal.trackingMethod !== 'manual');
    
    // Get goal statistics
    const stats = await goalsManager.getGoalStatistics(user.id);
    
    return NextResponse.json({
      success: true,
      data: {
        userId: user.id,
        syncMetrics: metrics,
        goalsCount: goals.length,
        automaticGoalsCount: automaticGoals.length,
        goalStatistics: {
          totalGoals: stats.totalGoals,
          activeGoals: stats.activeGoals,
          completedGoals: stats.completedGoals,
          totalTargetAmount: stats.totalTargetAmount,
          totalCurrentAmount: stats.totalCurrentAmount,
          overallProgress: stats.overallProgress
        },
        automaticGoals: automaticGoals.map(goal => ({
          id: goal.id,
          title: goal.title,
          goalType: goal.goalType,
          trackingMethod: goal.trackingMethod,
          currentAmount: goal.currentAmount,
          targetAmount: goal.targetAmount,
          progressPercentage: (goal.currentAmount / goal.targetAmount) * 100
        }))
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Debug goals sync error:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        message: error.message || 'Debug failed',
        code: 'DEBUG_ERROR'
      },
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Only enable in development
if (process.env.NODE_ENV === 'development') {
  export const GET = withAppInitialization(
    withApiLogging(
      withApiAuth(debugGoalsSyncHandler, { requireAuth: true, requireTenant: false }),
      'DEBUG_GOALS_SYNC'
    )
  );
} else {
  export const GET = () => NextResponse.json({ error: 'Not available in production' }, { status: 404 });
}