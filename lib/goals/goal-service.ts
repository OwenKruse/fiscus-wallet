// Goal Service Layer with CRUD Operations and Business Logic

import crypto from 'crypto';
import { getNileClient } from '../database/nile-client';
import {
  Goal,
  GoalProgress,
  CreateGoalRequest,
  UpdateGoalRequest,
  GoalProgressRequest,
  GoalsFilters,
  GoalValidationError,
  GoalValidationResult,
  Account
} from '../../types';

export interface GoalServiceOptions {
  maxRetries?: number;
  retryDelayMs?: number;
}

export class GoalService {
  private dbClient = getNileClient();
  private options: Required<GoalServiceOptions>;

  constructor(options: GoalServiceOptions = {}) {
    this.options = {
      maxRetries: options.maxRetries ?? 3,
      retryDelayMs: options.retryDelayMs ?? 1000,
    };
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    retries: number = this.options.maxRetries
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (retries > 0 && this.isRetryableError(error)) {
        console.warn(`Goal service operation failed, retrying... (${retries} attempts left)`, error);
        await this.delay(this.options.retryDelayMs);
        return this.executeWithRetry(operation, retries - 1);
      }
      throw error;
    }
  }

  private isRetryableError(error: any): boolean {
    // Check for database connection errors and temporary failures
    const retryableCodes = [
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'ENETUNREACH',
    ];

    const retryableMessages = [
      'connection terminated',
      'server closed the connection',
      'timeout',
      'connection refused',
    ];

    if (error.code && retryableCodes.includes(error.code)) {
      return true;
    }

    if (error.message) {
      const message = error.message.toLowerCase();
      return retryableMessages.some(msg => message.includes(msg));
    }

    return false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validates goal data before creation or update
   * @param data - Goal data to validate
   * @param isUpdate - Whether this is an update operation
   * @returns Validation result with errors if any
   */
  private validateGoalData(data: CreateGoalRequest | UpdateGoalRequest, isUpdate: boolean = false): GoalValidationResult {
    const errors: GoalValidationError[] = [];

    // Title validation
    if (!isUpdate || 'title' in data) {
      const title = (data as CreateGoalRequest).title;
      if (!title || typeof title !== 'string') {
        errors.push({
          field: 'title',
          message: 'Title is required',
          code: 'REQUIRED_FIELD'
        });
      } else if (title.length < 1 || title.length > 255) {
        errors.push({
          field: 'title',
          message: 'Title must be between 1 and 255 characters',
          code: 'INVALID_LENGTH'
        });
      }
    }

    // Target amount validation
    if (!isUpdate || 'targetAmount' in data) {
      const targetAmount = (data as CreateGoalRequest).targetAmount;
      if (targetAmount === undefined || targetAmount === null) {
        errors.push({
          field: 'targetAmount',
          message: 'Target amount is required',
          code: 'REQUIRED_FIELD'
        });
      } else if (typeof targetAmount !== 'number' || targetAmount <= 0) {
        errors.push({
          field: 'targetAmount',
          message: 'Target amount must be a positive number',
          code: 'INVALID_VALUE'
        });
      } else if (targetAmount > 999999999999.99) {
        errors.push({
          field: 'targetAmount',
          message: 'Target amount exceeds maximum allowed value',
          code: 'VALUE_TOO_LARGE'
        });
      }
    }

    // Target date validation
    if (!isUpdate || 'targetDate' in data) {
      const targetDate = (data as CreateGoalRequest).targetDate;
      if (!targetDate) {
        errors.push({
          field: 'targetDate',
          message: 'Target date is required',
          code: 'REQUIRED_FIELD'
        });
      } else {
        const date = new Date(targetDate);
        if (isNaN(date.getTime())) {
          errors.push({
            field: 'targetDate',
            message: 'Target date must be a valid date',
            code: 'INVALID_DATE'
          });
        } else if (date <= new Date()) {
          errors.push({
            field: 'targetDate',
            message: 'Target date must be in the future',
            code: 'DATE_IN_PAST'
          });
        }
      }
    }

    // Goal type validation
    if (!isUpdate || 'goalType' in data) {
      const goalType = (data as CreateGoalRequest).goalType;
      const validTypes = ['savings', 'debt_reduction', 'investment', 'purchase', 'education', 'travel'];
      if (!goalType || !validTypes.includes(goalType)) {
        errors.push({
          field: 'goalType',
          message: 'Goal type must be one of: ' + validTypes.join(', '),
          code: 'INVALID_ENUM'
        });
      }
    }

    // Priority validation (optional)
    if ('priority' in data && data.priority) {
      const validPriorities = ['high', 'medium', 'low'];
      if (!validPriorities.includes(data.priority)) {
        errors.push({
          field: 'priority',
          message: 'Priority must be one of: ' + validPriorities.join(', '),
          code: 'INVALID_ENUM'
        });
      }
    }

    // Tracking method validation (optional)
    if ('trackingMethod' in data && data.trackingMethod) {
      const validMethods = ['manual', 'account_balance', 'transaction_category'];
      if (!validMethods.includes(data.trackingMethod)) {
        errors.push({
          field: 'trackingMethod',
          message: 'Tracking method must be one of: ' + validMethods.join(', '),
          code: 'INVALID_ENUM'
        });
      }
    }

    // Current amount validation (for updates)
    if (isUpdate && 'currentAmount' in data) {
      const currentAmount = (data as UpdateGoalRequest).currentAmount;
      if (currentAmount !== undefined && (typeof currentAmount !== 'number' || currentAmount < 0)) {
        errors.push({
          field: 'currentAmount',
          message: 'Current amount must be a non-negative number',
          code: 'INVALID_VALUE'
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Creates a new goal for a user
   * @param userId - The user ID
   * @param data - Goal creation data
   * @returns Promise resolving to the created goal
   */
  async createGoal(userId: string, data: CreateGoalRequest): Promise<Goal> {
    // Validate input data
    const validation = this.validateGoalData(data, false);
    if (!validation.isValid) {
      const error = new Error('Validation failed');
      (error as any).validationErrors = validation.errors;
      throw error;
    }

    return this.executeWithRetry(async () => {
      return this.dbClient.transaction(async (client) => {
        const goalId = crypto.randomUUID();

        // Insert the goal
        await client.query(`
          INSERT INTO goals (
            id, user_id, title, description, goal_type, category,
            target_amount, current_amount, target_date, status, priority,
            is_primary, tracking_account_ids, tracking_method, tracking_config,
            created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
        `, [
          goalId,
          userId,
          data.title,
          data.description || null,
          data.goalType,
          data.category || null,
          data.targetAmount,
          0, // Initial current amount
          new Date(data.targetDate),
          'active',
          data.priority || 'medium',
          false, // Not primary by default
          data.trackingConfig?.accountIds || [],
          data.trackingMethod || 'manual',
          data.trackingConfig ? JSON.stringify(data.trackingConfig) : null
        ]);

        // Fetch and return the created goal
        const goal = await client.queryOne<Goal>(`
          SELECT 
            id,
            user_id as "userId",
            title,
            description,
            goal_type as "goalType",
            category,
            target_amount as "targetAmount",
            current_amount as "currentAmount",
            target_date as "targetDate",
            status,
            priority,
            is_primary as "isPrimary",
            tracking_account_ids as "trackingAccountIds",
            tracking_method as "trackingMethod",
            tracking_config as "trackingConfig",
            created_at as "createdAt",
            updated_at as "updatedAt"
          FROM goals
          WHERE id = $1
        `, [goalId]);

        if (!goal) {
          throw new Error('Failed to retrieve created goal');
        }

        // Parse JSON fields and convert numeric fields
        if (goal.trackingConfig && typeof goal.trackingConfig === 'string') {
          goal.trackingConfig = JSON.parse(goal.trackingConfig);
        }

        // Convert string decimals to numbers
        if (typeof goal.targetAmount === 'string') {
          goal.targetAmount = parseFloat(goal.targetAmount);
        }
        if (typeof goal.currentAmount === 'string') {
          goal.currentAmount = parseFloat(goal.currentAmount);
        }

        return goal;
      });
    });
  }

  /**
   * Updates an existing goal
   * @param goalId - The goal ID
   * @param userId - The user ID
   * @param data - Goal update data
   * @returns Promise resolving to the updated goal
   */
  async updateGoal(goalId: string, userId: string, data: UpdateGoalRequest): Promise<Goal> {
    // Validate input data
    const validation = this.validateGoalData(data, true);
    if (!validation.isValid) {
      const error = new Error('Validation failed');
      (error as any).validationErrors = validation.errors;
      throw error;
    }

    return this.executeWithRetry(async () => {
      return this.dbClient.transaction(async (client) => {
        // Check if goal exists and belongs to user
        const existingGoal = await client.queryOne<{ id: string }>(`
          SELECT id FROM goals WHERE id = $1 AND user_id = $2
        `, [goalId, userId]);

        if (!existingGoal) {
          throw new Error('Goal not found or access denied');
        }

        // Build dynamic update query
        const updateFields: string[] = [];
        const updateValues: any[] = [];
        let paramIndex = 1;

        if ('title' in data) {
          updateFields.push(`title = $${paramIndex++}`);
          updateValues.push(data.title);
        }
        if ('description' in data) {
          updateFields.push(`description = $${paramIndex++}`);
          updateValues.push(data.description || null);
        }
        if ('goalType' in data) {
          updateFields.push(`goal_type = $${paramIndex++}`);
          updateValues.push(data.goalType);
        }
        if ('category' in data) {
          updateFields.push(`category = $${paramIndex++}`);
          updateValues.push(data.category || null);
        }
        if ('targetAmount' in data) {
          updateFields.push(`target_amount = $${paramIndex++}`);
          updateValues.push(data.targetAmount);
        }
        if ('currentAmount' in data) {
          updateFields.push(`current_amount = $${paramIndex++}`);
          updateValues.push(data.currentAmount);
        }
        if ('targetDate' in data) {
          updateFields.push(`target_date = $${paramIndex++}`);
          updateValues.push(new Date(data.targetDate!));
        }
        if ('status' in data) {
          updateFields.push(`status = $${paramIndex++}`);
          updateValues.push(data.status);
        }
        if ('priority' in data) {
          updateFields.push(`priority = $${paramIndex++}`);
          updateValues.push(data.priority);
        }
        if ('isPrimary' in data) {
          updateFields.push(`is_primary = $${paramIndex++}`);
          updateValues.push(data.isPrimary);
        }
        if ('trackingMethod' in data) {
          updateFields.push(`tracking_method = $${paramIndex++}`);
          updateValues.push(data.trackingMethod);
        }
        if ('trackingConfig' in data) {
          updateFields.push(`tracking_config = $${paramIndex++}`);
          updateValues.push(data.trackingConfig ? JSON.stringify(data.trackingConfig) : null);

          // Also update tracking_account_ids if accountIds are provided
          if (data.trackingConfig?.accountIds) {
            updateFields.push(`tracking_account_ids = $${paramIndex++}`);
            updateValues.push(data.trackingConfig.accountIds);
          }
        }

        if (updateFields.length === 0) {
          throw new Error('No fields to update');
        }

        // Always update the updated_at timestamp
        updateFields.push(`updated_at = NOW()`);

        // Add WHERE clause parameters
        updateValues.push(goalId, userId);

        const updateQuery = `
          UPDATE goals SET ${updateFields.join(', ')}
          WHERE id = $${paramIndex++} AND user_id = $${paramIndex++}
        `;

        await client.query(updateQuery, updateValues);

        // Fetch and return the updated goal
        const goal = await client.queryOne<Goal>(`
          SELECT 
            id,
            user_id as "userId",
            title,
            description,
            goal_type as "goalType",
            category,
            target_amount as "targetAmount",
            current_amount as "currentAmount",
            target_date as "targetDate",
            status,
            priority,
            is_primary as "isPrimary",
            tracking_account_ids as "trackingAccountIds",
            tracking_method as "trackingMethod",
            tracking_config as "trackingConfig",
            created_at as "createdAt",
            updated_at as "updatedAt"
          FROM goals
          WHERE id = $1
        `, [goalId]);

        if (!goal) {
          throw new Error('Failed to retrieve updated goal');
        }

        // Parse JSON fields and convert numeric fields
        if (goal.trackingConfig && typeof goal.trackingConfig === 'string') {
          goal.trackingConfig = JSON.parse(goal.trackingConfig);
        }

        // Convert string decimals to numbers
        if (typeof goal.targetAmount === 'string') {
          goal.targetAmount = parseFloat(goal.targetAmount);
        }
        if (typeof goal.currentAmount === 'string') {
          goal.currentAmount = parseFloat(goal.currentAmount);
        }

        return goal;
      });
    });
  }

  /**
   * Deletes a goal and its associated progress entries
   * @param goalId - The goal ID
   * @param userId - The user ID
   * @returns Promise that resolves when the goal is deleted
   */
  async deleteGoal(goalId: string, userId: string): Promise<void> {
    return this.executeWithRetry(async () => {
      return this.dbClient.transaction(async (client) => {
        // Check if goal exists and belongs to user
        const existingGoal = await client.queryOne<{ id: string }>(`
          SELECT id FROM goals WHERE id = $1 AND user_id = $2
        `, [goalId, userId]);

        if (!existingGoal) {
          throw new Error('Goal not found or access denied');
        }

        // Delete progress entries first (foreign key constraint)
        await client.query(`
          DELETE FROM goal_progress WHERE goal_id = $1
        `, [goalId]);

        // Delete the goal
        if (!client.executeUpdate) {
          throw new Error('Database client does not support executeUpdate');
        }

        const result = await client.executeUpdate(`
          DELETE FROM goals WHERE id = $1 AND user_id = $2
        `, [goalId, userId]);

        if (result.rowCount === 0) {
          throw new Error('Failed to delete goal');
        }
      });
    });
  }

  /**
   * Retrieves goals for a user with optional filtering
   * @param userId - The user ID
   * @param filters - Optional filters to apply
   * @returns Promise resolving to filtered goals
   */
  async getGoals(userId: string, filters: GoalsFilters = {}): Promise<Goal[]> {
    return this.executeWithRetry(async () => {
      // Build dynamic query based on filters
      let query = `
        SELECT 
          id,
          user_id as "userId",
          title,
          description,
          goal_type as "goalType",
          category,
          target_amount as "targetAmount",
          current_amount as "currentAmount",
          target_date as "targetDate",
          status,
          priority,
          is_primary as "isPrimary",
          tracking_account_ids as "trackingAccountIds",
          tracking_method as "trackingMethod",
          tracking_config as "trackingConfig",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM goals
        WHERE user_id = $1
      `;

      const params: any[] = [userId];
      let paramIndex = 2;

      // Apply filters
      if (filters.status && filters.status.length > 0) {
        query += ` AND status = ANY($${paramIndex++})`;
        params.push(filters.status);
      }

      if (filters.goalType && filters.goalType.length > 0) {
        query += ` AND goal_type = ANY($${paramIndex++})`;
        params.push(filters.goalType);
      }

      if (filters.priority && filters.priority.length > 0) {
        query += ` AND priority = ANY($${paramIndex++})`;
        params.push(filters.priority);
      }

      if (filters.category && filters.category.length > 0) {
        query += ` AND category = ANY($${paramIndex++})`;
        params.push(filters.category);
      }

      if (filters.search) {
        query += ` AND (title ILIKE $${paramIndex++} OR description ILIKE $${paramIndex++})`;
        const searchPattern = `%${filters.search}%`;
        params.push(searchPattern, searchPattern);

      }

      // Apply sorting
      const sortBy = filters.sortBy || 'created_at';
      const sortOrder = filters.sortOrder || 'desc';

      let orderByClause = '';
      switch (sortBy) {
        case 'target_date':
          orderByClause = `ORDER BY target_date ${sortOrder}`;
          break;
        case 'target_amount':
          orderByClause = `ORDER BY target_amount ${sortOrder}`;
          break;
        case 'progress':
          orderByClause = `ORDER BY (current_amount / target_amount) ${sortOrder}`;
          break;
        default:
          orderByClause = `ORDER BY created_at ${sortOrder}`;
      }

      query += ` ${orderByClause}`;

      // Apply pagination
      if (filters.limit) {
        query += ` LIMIT $${paramIndex++}`;
        params.push(filters.limit);

        if (filters.page && filters.page > 1) {
          const offset = (filters.page - 1) * filters.limit;
          query += ` OFFSET $${paramIndex++}`;
          params.push(offset);
        }
      }

      const goals = await this.dbClient.query<Goal>(query, params);

      // Handle case where query returns undefined or null
      if (!goals || !Array.isArray(goals)) {
        return [];
      }

      // Parse JSON fields and convert numeric fields for each goal
      return goals.map(goal => ({
        ...goal,
        targetAmount: typeof goal.targetAmount === 'string' ? parseFloat(goal.targetAmount) : goal.targetAmount,
        currentAmount: typeof goal.currentAmount === 'string' ? parseFloat(goal.currentAmount) : goal.currentAmount,
        trackingConfig: goal.trackingConfig && typeof goal.trackingConfig === 'string'
          ? JSON.parse(goal.trackingConfig)
          : goal.trackingConfig
      }));
    });
  }

  /**
   * Retrieves a specific goal by ID
   * @param goalId - The goal ID
   * @param userId - The user ID
   * @returns Promise resolving to the goal or null if not found
   */
  async getGoal(goalId: string, userId: string): Promise<Goal | null> {
    return this.executeWithRetry(async () => {
      const goal = await this.dbClient.queryOne<Goal>(`
        SELECT 
          id,
          user_id as "userId",
          title,
          description,
          goal_type as "goalType",
          category,
          target_amount as "targetAmount",
          current_amount as "currentAmount",
          target_date as "targetDate",
          status,
          priority,
          is_primary as "isPrimary",
          tracking_account_ids as "trackingAccountIds",
          tracking_method as "trackingMethod",
          tracking_config as "trackingConfig",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM goals
        WHERE id = $1 AND user_id = $2
      `, [goalId, userId]);

      if (!goal) {
        return null;
      }

      // Parse JSON fields and convert numeric fields
      if (goal.trackingConfig && typeof goal.trackingConfig === 'string') {
        goal.trackingConfig = JSON.parse(goal.trackingConfig);
      }

      // Convert string decimals to numbers
      if (typeof goal.targetAmount === 'string') {
        goal.targetAmount = parseFloat(goal.targetAmount);
      }
      if (typeof goal.currentAmount === 'string') {
        goal.currentAmount = parseFloat(goal.currentAmount);
      }

      return goal;
    });
  }

  /**
   * Adds manual progress to a goal
   * @param goalId - The goal ID
   * @param userId - The user ID
   * @param data - Progress data
   * @returns Promise that resolves when progress is added
   */
  async addManualProgress(goalId: string, userId: string, data: GoalProgressRequest): Promise<void> {
    // Validate progress data
    if (typeof data.amount !== 'number' || isNaN(data.amount)) {
      throw new Error('Progress amount must be a valid number');
    }

    if (!['manual_add', 'manual_subtract', 'adjustment'].includes(data.progressType)) {
      throw new Error('Invalid progress type');
    }

    return this.executeWithRetry(async () => {
      return this.dbClient.transaction(async (client) => {
        // Check if goal exists and belongs to user
        const goal = await client.queryOne<{ id: string, currentAmount: number }>(`
          SELECT id, current_amount as "currentAmount" FROM goals 
          WHERE id = $1 AND user_id = $2
        `, [goalId, userId]);

        if (!goal) {
          throw new Error('Goal not found or access denied');
        }

        // Calculate new current amount
        // Ensure currentAmount is treated as a number (pg returns decimals as strings)
        const currentAmount = typeof goal.currentAmount === 'string' 
          ? parseFloat(goal.currentAmount) 
          : Number(goal.currentAmount);

        let newCurrentAmount = currentAmount;
        
        if (data.progressType === 'manual_add') {
          newCurrentAmount += data.amount;
        } else if (data.progressType === 'manual_subtract') {
          newCurrentAmount -= data.amount;
        } else if (data.progressType === 'adjustment') {
          newCurrentAmount = data.amount;
        }

        // Ensure current amount doesn't go negative
        newCurrentAmount = Math.max(0, newCurrentAmount);

        // Insert progress entry
        const progressId = crypto.randomUUID();
        await client.query(`
          INSERT INTO goal_progress (
            id, goal_id, user_id, amount, progress_type, description, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
        `, [
          progressId,
          goalId,
          userId,
          data.amount,
          data.progressType,
          data.description || null
        ]);

        // Update goal's current amount
        await client.query(`
          UPDATE goals SET 
            current_amount = $1,
            updated_at = NOW()
          WHERE id = $2
        `, [newCurrentAmount, goalId]);
      });
    });
  }

  /**
   * Retrieves progress history for a goal
   * @param goalId - The goal ID
   * @param userId - The user ID
   * @param limit - Maximum number of entries to return
   * @param offset - Number of entries to skip
   * @returns Promise resolving to progress entries
   */
  async getGoalProgress(goalId: string, userId: string, limit: number = 50, offset: number = 0): Promise<GoalProgress[]> {
    return this.executeWithRetry(async () => {
      // First verify the goal belongs to the user
      const goal = await this.dbClient.queryOne<{ id: string }>(`
        SELECT id FROM goals WHERE id = $1 AND user_id = $2
      `, [goalId, userId]);

      if (!goal) {
        throw new Error('Goal not found or access denied');
      }

      // Fetch progress entries
      const progressEntries = await this.dbClient.query<GoalProgress>(`
        SELECT 
          id,
          goal_id as "goalId",
          user_id as "userId",
          amount,
          progress_type as "progressType",
          description,
          transaction_id as "transactionId",
          created_at as "createdAt"
        FROM goal_progress
        WHERE goal_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `, [goalId, limit, offset]);

      return progressEntries;
    });
  }

  /**
   * Sets a goal as the primary goal for a user
   * Ensures only one primary goal exists per user
   * @param goalId - The goal ID to set as primary
   * @param userId - The user ID
   * @returns Promise that resolves when the primary goal is set
   */
  async setPrimaryGoal(goalId: string, userId: string): Promise<void> {
    return this.executeWithRetry(async () => {
      return this.dbClient.transaction(async (client) => {
        // First verify the goal exists and belongs to the user
        const goal = await client.queryOne<{ id: string, status: string }>(`
          SELECT id, status FROM goals WHERE id = $1 AND user_id = $2
        `, [goalId, userId]);

        if (!goal) {
          throw new Error('Goal not found or access denied');
        }

        // Validate that the goal can be set as primary
        if (goal.status !== 'active') {
          throw new Error('Only active goals can be set as primary');
        }

        // Clear any existing primary goal for this user
        await client.query(`
          UPDATE goals SET 
            is_primary = false,
            updated_at = NOW()
          WHERE user_id = $1 AND is_primary = true
        `, [userId]);

        // Set the new primary goal
      if (!client.executeUpdate) {
        throw new Error('Database client does not support executeUpdate');
      }

      const result = await client.executeUpdate(`
        UPDATE goals SET 
            is_primary = true,
            updated_at = NOW()
          WHERE id = $1 AND user_id = $2
        `, [goalId, userId]);

        if (result.rowCount === 0) {
          throw new Error('Failed to set primary goal');
        }
      });
    });
  }

  /**
   * Retrieves the current primary goal for a user
   * @param userId - The user ID
   * @returns Promise resolving to the primary goal or null if none exists
   */
  async getPrimaryGoal(userId: string): Promise<Goal | null> {
    return this.executeWithRetry(async () => {
      const goal = await this.dbClient.queryOne<Goal>(`
        SELECT 
          id,
          user_id as "userId",
          title,
          description,
          goal_type as "goalType",
          category,
          target_amount as "targetAmount",
          current_amount as "currentAmount",
          target_date as "targetDate",
          status,
          priority,
          is_primary as "isPrimary",
          tracking_account_ids as "trackingAccountIds",
          tracking_method as "trackingMethod",
          tracking_config as "trackingConfig",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM goals
        WHERE user_id = $1 AND is_primary = true AND status = 'active'
      `, [userId]);

      if (!goal) {
        return null;
      }

      // Parse JSON fields and convert numeric fields
      if (goal.trackingConfig && typeof goal.trackingConfig === 'string') {
        goal.trackingConfig = JSON.parse(goal.trackingConfig);
      }

      // Convert string decimals to numbers
      if (typeof goal.targetAmount === 'string') {
        goal.targetAmount = parseFloat(goal.targetAmount);
      }
      if (typeof goal.currentAmount === 'string') {
        goal.currentAmount = parseFloat(goal.currentAmount);
      }

      return goal;
    });
  }

  /**
   * Clears the primary goal for a user (sets no goal as primary)
   * @param userId - The user ID
   * @returns Promise that resolves when the primary goal is cleared
   */
  async clearPrimaryGoal(userId: string): Promise<void> {
    return this.executeWithRetry(async () => {
      await this.dbClient.query(`
        UPDATE goals SET 
          is_primary = false,
          updated_at = NOW()
        WHERE user_id = $1 AND is_primary = true
      `, [userId]);
    });
  }

  /**
   * Validates primary goal constraints
   * @param goalId - The goal ID to validate
   * @param userId - The user ID
   * @returns Promise resolving to validation result
   */
  async validatePrimaryGoal(goalId: string, userId: string): Promise<{ isValid: boolean; errors: string[] }> {
    return this.executeWithRetry(async () => {
      const errors: string[] = [];

      // Check if goal exists and belongs to user
      const goal = await this.dbClient.queryOne<{
        id: string,
        status: string,
        targetDate: string
      }>(`
        SELECT id, status, target_date as "targetDate" FROM goals 
        WHERE id = $1 AND user_id = $2
      `, [goalId, userId]);

      if (!goal) {
        errors.push('Goal not found or access denied');
        return { isValid: false, errors };
      }

      // Validate goal status
      if (goal.status !== 'active') {
        errors.push('Only active goals can be set as primary');
      }

      // Validate target date (should not be in the past)
      const targetDate = new Date(goal.targetDate);
      if (targetDate <= new Date()) {
        errors.push('Goals with past target dates cannot be set as primary');
      }

      return {
        isValid: errors.length === 0,
        errors
      };
    });
  }

  /**
   * Gets primary goal statistics for dashboard display
   * @param userId - The user ID
   * @returns Promise resolving to primary goal stats or null
   */
  async getPrimaryGoalStats(userId: string): Promise<{
    goal: Goal;
    progressPercentage: number;
    daysRemaining: number;
    isOnTrack: boolean;
    dailyTargetAmount: number;
  } | null> {
    return this.executeWithRetry(async () => {
      const goal = await this.getPrimaryGoal(userId);

      if (!goal) {
        return null;
      }

      // Calculate progress percentage
      const progressPercentage = goal.targetAmount > 0
        ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100)
        : 0;

      // Calculate days remaining
      const targetDate = new Date(goal.targetDate);
      const today = new Date();
      const timeDiff = targetDate.getTime() - today.getTime();
      const daysRemaining = Math.max(0, Math.ceil(timeDiff / (1000 * 3600 * 24)));

      // Calculate daily target amount needed
      const remainingAmount = Math.max(0, goal.targetAmount - goal.currentAmount);
      const dailyTargetAmount = daysRemaining > 0 ? remainingAmount / daysRemaining : remainingAmount;

      // Determine if on track (simplified calculation)
      const expectedProgress = daysRemaining > 0
        ? ((new Date().getTime() - new Date(goal.createdAt).getTime()) /
          (targetDate.getTime() - new Date(goal.createdAt).getTime())) * 100
        : 100;
      const isOnTrack = progressPercentage >= expectedProgress * 0.9; // 90% of expected progress

      return {
        goal,
        progressPercentage,
        daysRemaining,
        isOnTrack,
        dailyTargetAmount
      };
    });
  }
}

// Singleton instance
let goalServiceInstance: GoalService | null = null;

export function getGoalService(options?: GoalServiceOptions): GoalService {
  if (!goalServiceInstance) {
    goalServiceInstance = new GoalService(options);
  }
  return goalServiceInstance;
}

// Export for testing
export { GoalService as _GoalService };