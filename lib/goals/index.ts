// Goals Module Exports

export { GoalService, getGoalService } from './goal-service';
export { GoalProgressCalculator, getGoalProgressCalculator } from './goal-progress-calculator';
export { GoalsManager, getGoalsManager } from './goals-manager';

// Re-export types for convenience
export type {
  Goal,
  GoalProgress,
  CreateGoalRequest,
  UpdateGoalRequest,
  GoalProgressRequest,
  GoalsFilters,
  GoalValidationError,
  GoalValidationResult,
  GoalCalculationResult,
  GoalAnalytics,
  AllGoalsAnalytics
} from '../../types';