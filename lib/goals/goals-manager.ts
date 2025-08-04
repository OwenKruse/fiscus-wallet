// Goals Manager - High-level service that integrates goal service and progress calculator

import { getGoalService } from './goal-service';
import { getGoalProgressCalculator } from './goal-progress-calculator';
import { getNileClient } from '../database/nile-client';
import crypto from 'crypto';
import { 
  Goal, 
  GoalProgress,
  CreateGoalRequest, 
  UpdateGoalRequest,
  GoalProgressRequest,
  GoalsFilters,
  GoalCalculationResult
} from '../../types';

export interface GoalsManagerOptions {
  maxRetries?: number;
  retryDelayMs?: number;
}

export class GoalsManager {
  private goalService = getGoalService();
  private progressCalculator = getGoalProgressCalculator();
  private dbClient = getNileClient();
  private options: Required<GoalsManagerOptions>;

  constructor(options: GoalsManagerOptions = {}) {
    this.options = {
      maxRetries: options.maxRetries ?? 3,
      retryDelayMs: options.retryDelayMs ?? 1000,
    };
  }

  // Delegate basic CRUD operations to GoalService
  async createGoal(userId: string, data: CreateGoalRequest): Promise<Goal> {
    return this.goalService.createGoal(userId, data);
  }

  async updateGoal(goalId: string, userId: string, data: UpdateGoalRequest): Promise<Goal> {
    return this.goalService.updateGoal(goalId, userId, data);
  }

  async deleteGoal(goalId: string, userId: string): Promise<void> {
    return this.goalService.deleteGoal(goalId, userId);
  }

  async getGoals(userId: string, filters?: GoalsFilters): Promise<Goal[]> {
    return this.goalService.getGoals(userId, filters);
  }

  async getGoal(goalId: string, userId: string): Promise<Goal | null> {
    return this.goalService.getGoal(goalId, userId);
  }

  async addManualProgress(goalId: string, userId: string, data: GoalProgressRequest): Promise<void> {
    return this.goalService.addManualProgress(goalId, userId, data);
  }

  async getGoalProgress(goalId: string, userId: string, limit?: number, offset?: number): Promise<GoalProgress[]> {
    return this.goalService.getGoalProgress(goalId, userId, limit, offset);
  }

  // Delegate primary goal operations to GoalService
  async setPrimaryGoal(goalId: string, userId: string): Promise<void> {
    return this.goalService.setPrimaryGoal(goalId, userId);
  }

  async getPrimaryGoal(userId: string): Promise<Goal | null> {
    return this.goalService.getPrimaryGoal(userId);
  }

  async clearPrimaryGoal(userId: string): Promise<void> {
    return this.goalService.clearPrimaryGoal(userId);
  }

  async getPrimaryGoalStats(userId: string) {
    return this.goalService.getPrimaryGoalStats(userId);
  }

  /**
   * Calculates and updates progress for a specific goal
   * @param goalId - The goal ID
   * @param userId - The user ID
   * @returns Promise resolving to the updated goal
   */
  async calculateAndUpdateGoalProgress(goalId: string, userId: string): Promise<Goal> {
    const goal = await this.goalService.getGoal(goalId, userId);
    
    if (!goal) {
      throw new Error('Goal not found or access denied');
    }

    if (goal.trackingMethod === 'manual') {
      // No automatic calculation for manual goals
      return goal;
    }

    try {
      // Calculate progress using the progress calculator
      const calculationResult = await this.progressCalculator.calculateGoalProgress(goal);

      // Update the goal with new progress
      return this.dbClient.transaction(async (client) => {
        // Update goal's current amount
        await client.query(`
          UPDATE goals SET 
            current_amount = $1,
            updated_at = NOW()
          WHERE id = $2
        `, [calculationResult.currentAmount, goalId]);

        // Add progress entries if there are any
        for (const progressEntry of calculationResult.progressEntries) {
          if (progressEntry.amount !== 0) { // Only add non-zero progress entries
            const progressId = crypto.randomUUID();
            await client.query(`
              INSERT INTO goal_progress (
                id, goal_id, user_id, amount, progress_type, description, created_at
              ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
            `, [
              progressId,
              progressEntry.goalId,
              progressEntry.userId,
              progressEntry.amount,
              progressEntry.progressType,
              progressEntry.description
            ]);
          }
        }

        // Return updated goal
        const updatedGoal = await this.goalService.getGoal(goalId, userId);
        if (!updatedGoal) {
          throw new Error('Failed to retrieve updated goal');
        }
        return updatedGoal;
      });
    } catch (error) {
      console.error(`Failed to calculate progress for goal ${goalId}:`, error);
      throw new Error(`Progress calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculates and updates progress for all active goals of a user
   * @param userId - The user ID
   * @returns Promise resolving to array of updated goals
   */
  async calculateAndUpdateAllGoalsProgress(userId: string): Promise<Goal[]> {
    // Get all active goals that support automatic tracking
    const goals = await this.goalService.getGoals(userId, {
      status: ['active']
    });

    const automaticGoals = goals.filter(goal => goal.trackingMethod !== 'manual');

    if (automaticGoals.length === 0) {
      return goals; // Return all goals if none support automatic tracking
    }

    try {
      // Calculate progress for all goals in batch
      const calculationResults = await this.progressCalculator.calculateMultipleGoalsProgress(automaticGoals);

      // Update all goals in a single transaction
      return this.dbClient.transaction(async (client) => {
        const updatedGoals: Goal[] = [];

        for (const result of calculationResults) {
          try {
            // Update goal's current amount
            await client.query(`
              UPDATE goals SET 
                current_amount = $1,
                updated_at = NOW()
              WHERE id = $2
            `, [result.currentAmount, result.goalId]);

            // Add progress entries if there are any
            for (const progressEntry of result.progressEntries) {
              if (progressEntry.amount !== 0) { // Only add non-zero progress entries
                const progressId = crypto.randomUUID();
                await client.query(`
                  INSERT INTO goal_progress (
                    id, goal_id, user_id, amount, progress_type, description, created_at
                  ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
                `, [
                  progressId,
                  progressEntry.goalId,
                  progressEntry.userId,
                  progressEntry.amount,
                  progressEntry.progressType,
                  progressEntry.description
                ]);
              }
            }

            // Get updated goal
            const updatedGoal = await this.goalService.getGoal(result.goalId, userId);
            if (updatedGoal) {
              updatedGoals.push(updatedGoal);
            }
          } catch (error) {
            console.error(`Failed to update goal ${result.goalId}:`, error);
            // Continue with other goals even if one fails
          }
        }

        // Add manual goals that weren't updated
        const manualGoals = goals.filter(goal => goal.trackingMethod === 'manual');
        updatedGoals.push(...manualGoals);

        return updatedGoals;
      });
    } catch (error) {
      console.error(`Failed to calculate progress for user ${userId}:`, error);
      throw new Error(`Batch progress calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Recalculates progress for all goals when financial data is synced
   * This method is designed to be called by the data sync service
   * @param userId - The user ID
   * @returns Promise resolving to sync result summary
   */
  async syncGoalsProgress(userId: string): Promise<{
    success: boolean;
    goalsUpdated: number;
    errors: string[];
  }> {
    const result = {
      success: false,
      goalsUpdated: 0,
      errors: [] as string[]
    };

    try {
      const updatedGoals = await this.calculateAndUpdateAllGoalsProgress(userId);
      result.goalsUpdated = updatedGoals.filter(goal => goal.trackingMethod !== 'manual').length;
      result.success = true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(errorMessage);
      console.error(`Goals progress sync failed for user ${userId}:`, error);
    }

    return result;
  }

  /**
   * Gets comprehensive goal statistics for a user
   * @param userId - The user ID
   * @returns Promise resolving to goal statistics
   */
  async getGoalStatistics(userId: string): Promise<{
    totalGoals: number;
    activeGoals: number;
    completedGoals: number;
    totalTargetAmount: number;
    totalCurrentAmount: number;
    overallProgress: number;
    primaryGoal: Goal | null;
    goalsNearDeadline: Goal[];
    recentlyCompletedGoals: Goal[];
  }> {
    const allGoals = await this.goalService.getGoals(userId);
    const primaryGoal = await this.goalService.getPrimaryGoal(userId);

    const activeGoals = allGoals.filter(goal => goal.status === 'active');
    const completedGoals = allGoals.filter(goal => goal.status === 'completed');

    const totalTargetAmount = activeGoals.reduce((sum, goal) => sum + goal.targetAmount, 0);
    const totalCurrentAmount = activeGoals.reduce((sum, goal) => sum + goal.currentAmount, 0);
    const overallProgress = totalTargetAmount > 0 ? (totalCurrentAmount / totalTargetAmount) * 100 : 0;

    // Goals with deadlines within 30 days
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const goalsNearDeadline = activeGoals.filter(goal => {
      const targetDate = new Date(goal.targetDate);
      return targetDate <= thirtyDaysFromNow;
    });

    // Goals completed in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentlyCompletedGoals = completedGoals.filter(goal => {
      const updatedDate = new Date(goal.updatedAt);
      return updatedDate >= thirtyDaysAgo;
    });

    return {
      totalGoals: allGoals.length,
      activeGoals: activeGoals.length,
      completedGoals: completedGoals.length,
      totalTargetAmount,
      totalCurrentAmount,
      overallProgress,
      primaryGoal,
      goalsNearDeadline,
      recentlyCompletedGoals
    };
  }
}

// Singleton instance
let goalsManagerInstance: GoalsManager | null = null;

export function getGoalsManager(options?: GoalsManagerOptions): GoalsManager {
  if (!goalsManagerInstance) {
    goalsManagerInstance = new GoalsManager(options);
  }
  return goalsManagerInstance;
}

// Export for testing
export { GoalsManager as _GoalsManager };