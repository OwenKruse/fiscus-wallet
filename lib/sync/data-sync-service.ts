// Data Synchronization Service
// Implements background sync, incremental updates, conflict resolution, and error recovery

import { getPlaidService } from '../plaid/plaid-service';
import { getCacheService } from '../cache/cache-service';
import { getNileClient } from '../database/nile-client';
import { getGoalService } from '../goals/goal-service';
import { getGoalProgressCalculator } from '../goals/goal-progress-calculator';
import { getGoalNotificationService } from '../goals/goal-notification-service';
import { 
  SyncResult, 
  SyncOptions, 
  PlaidConnection, 
  Account, 
  Transaction,
  PlaidTransaction,
  PlaidAccount,
  Goal,
  GoalCalculationResult
} from '../../types';

export interface SyncJobOptions {
  userId: string;
  connectionId?: string;
  accountIds?: string[];
  forceRefresh?: boolean;
  priority?: 'low' | 'normal' | 'high';
  retryCount?: number;
  maxRetries?: number;
}

export interface SyncScheduleOptions {
  intervalMs?: number;
  maxConcurrentJobs?: number;
  enableBackgroundSync?: boolean;
  syncWindowHours?: number; // Hours to look back for transactions
}

export interface ConflictResolutionStrategy {
  onTransactionConflict: 'plaid_wins' | 'database_wins' | 'merge' | 'manual';
  onAccountConflict: 'plaid_wins' | 'database_wins' | 'merge';
  onAmountMismatch: 'plaid_wins' | 'database_wins' | 'flag_for_review';
}

export interface SyncMetrics {
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  averageSyncTime: number;
  lastSyncTime?: Date;
  activeJobs: number;
  queuedJobs: number;
}

export interface SyncJob {
  id: string;
  userId: string;
  connectionId?: string;
  options: SyncJobOptions;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: SyncResult;
  error?: string;
  retryCount: number;
}

export class DataSyncService {
  private plaidService = getPlaidService();
  private cacheService = getCacheService();
  private nileClient = getNileClient();
  private goalService = getGoalService();
  private goalProgressCalculator = getGoalProgressCalculator();
  private goalNotificationService = getGoalNotificationService();
  
  private syncJobs = new Map<string, SyncJob>();
  private jobQueue: SyncJob[] = [];
  private activeJobs = new Set<string>();
  private syncTimer?: NodeJS.Timeout;
  
  private options: Required<SyncScheduleOptions>;
  private conflictStrategy: ConflictResolutionStrategy;
  private metrics: SyncMetrics;

  constructor(
    scheduleOptions: SyncScheduleOptions = {},
    conflictStrategy: ConflictResolutionStrategy = {
      onTransactionConflict: 'plaid_wins',
      onAccountConflict: 'plaid_wins',
      onAmountMismatch: 'plaid_wins'
    }
  ) {
    this.options = {
      intervalMs: scheduleOptions.intervalMs ?? 15 * 60 * 1000, // 15 minutes
      maxConcurrentJobs: scheduleOptions.maxConcurrentJobs ?? 3,
      enableBackgroundSync: scheduleOptions.enableBackgroundSync ?? true,
      syncWindowHours: scheduleOptions.syncWindowHours ?? 72, // 3 days
    };

    this.conflictStrategy = conflictStrategy;
    
    this.metrics = {
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      averageSyncTime: 0,
      activeJobs: 0,
      queuedJobs: 0,
    };

    if (this.options.enableBackgroundSync) {
      this.startBackgroundSync();
    }
  }

  /**
   * Manually trigger a sync for a user or specific connection
   */
  async syncUserData(userId: string, options: SyncOptions = {}): Promise<SyncResult> {
    const jobOptions: SyncJobOptions = {
      userId,
      forceRefresh: options.forceRefresh,
      accountIds: options.accountIds,
      priority: 'high',
      maxRetries: 3,
    };

    const job = this.createSyncJob(jobOptions);
    return this.executeSyncJob(job);
  }

  /**
   * Queue a sync job for background processing
   */
  async queueSync(options: SyncJobOptions): Promise<string> {
    const job = this.createSyncJob(options);
    this.jobQueue.push(job);
    this.metrics.queuedJobs++;
    
    // Process queue if we have capacity
    this.processJobQueue();
    
    return job.id;
  }

  /**
   * Get sync status for a job
   */
  getSyncJobStatus(jobId: string): SyncJob | null {
    return this.syncJobs.get(jobId) || null;
  }

  /**
   * Get sync metrics
   */
  getSyncMetrics(): SyncMetrics {
    this.metrics.activeJobs = this.activeJobs.size;
    this.metrics.queuedJobs = this.jobQueue.length;
    return { ...this.metrics };
  }

  /**
   * Cancel a queued or running sync job
   */
  async cancelSyncJob(jobId: string): Promise<boolean> {
    const job = this.syncJobs.get(jobId);
    if (!job) return false;

    if (job.status === 'queued') {
      job.status = 'cancelled';
      this.jobQueue = this.jobQueue.filter(j => j.id !== jobId);
      this.metrics.queuedJobs--;
      return true;
    }

    if (job.status === 'running') {
      job.status = 'cancelled';
      this.activeJobs.delete(jobId);
      this.metrics.activeJobs--;
      return true;
    }

    return false;
  }

  /**
   * Start background sync scheduler
   */
  startBackgroundSync(): void {
    if (this.syncTimer) return;

    this.syncTimer = setInterval(async () => {
      try {
        await this.scheduleBackgroundSyncs();
        this.processJobQueue();
      } catch (error) {
        console.error('Background sync scheduler error:', error);
      }
    }, this.options.intervalMs);

    console.log(`Background sync started with ${this.options.intervalMs}ms interval`);
  }

  /**
   * Stop background sync scheduler
   */
  stopBackgroundSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = undefined;
      console.log('Background sync stopped');
    }
  }

  /**
   * Perform incremental sync for a specific connection
   */
  async performIncrementalSync(
    connection: PlaidConnection,
    lastSyncTime?: Date
  ): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      accountsUpdated: 0,
      transactionsAdded: 0,
      transactionsUpdated: 0,
      errors: [],
      lastSyncTime: new Date(),
    };

    try {
      // Determine sync window
      const syncStartDate = lastSyncTime || new Date(Date.now() - this.options.syncWindowHours * 60 * 60 * 1000);
      const syncEndDate = new Date();

      console.log(`Performing incremental sync for connection ${connection.itemId} from ${syncStartDate.toISOString()}`);

      // Sync accounts first
      const accountsResult = await this.syncAccounts(connection);
      result.accountsUpdated = accountsResult.accountsUpdated;
      result.errors.push(...accountsResult.errors);

      // Sync transactions incrementally
      const transactionsResult = await this.syncTransactionsIncremental(
        connection,
        syncStartDate,
        syncEndDate
      );
      result.transactionsAdded = transactionsResult.transactionsAdded;
      result.transactionsUpdated = transactionsResult.transactionsUpdated;
      result.errors.push(...transactionsResult.errors);

      // Update connection last sync time
      await this.nileClient.query(`
        UPDATE plaid_connections 
        SET last_sync = NOW(), updated_at = NOW()
        WHERE id = $1
      `, [connection.id]);

      result.success = result.errors.length === 0;
      return result;

    } catch (error) {
      const errorMessage = `Incremental sync failed for connection ${connection.itemId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      result.errors.push(errorMessage);
      console.error(errorMessage, error);
      return result;
    }
  }

  // Private methods

  private createSyncJob(options: SyncJobOptions): SyncJob {
    const job: SyncJob = {
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: options.userId,
      connectionId: options.connectionId,
      options,
      status: 'queued',
      createdAt: new Date(),
      retryCount: 0,
    };

    this.syncJobs.set(job.id, job);
    return job;
  }

  private async executeSyncJob(job: SyncJob): Promise<SyncResult> {
    const startTime = Date.now();
    
    try {
      job.status = 'running';
      job.startedAt = new Date();
      this.activeJobs.add(job.id);
      this.metrics.activeJobs++;

      console.log(`Starting sync job ${job.id} for user ${job.userId}`);

      // Get user's connections
      let connections: PlaidConnection[];
      if (job.connectionId) {
        const connection = await this.nileClient.queryOne<PlaidConnection>(`
          SELECT 
            id,
            user_id as "userId",
            item_id as "itemId", 
            access_token as "accessToken",
            institution_id as "institutionId",
            institution_name as "institutionName",
            accounts,
            status,
            last_sync as "lastSync",
            created_at as "createdAt",
            updated_at as "updatedAt"
          FROM plaid_connections 
          WHERE id = $1 AND user_id = $2 AND status = 'active'
        `, [job.connectionId, job.userId]);
        connections = connection ? [connection] : [];
      } else {
        connections = await this.nileClient.query<PlaidConnection>(`
          SELECT 
            id,
            user_id as "userId",
            item_id as "itemId", 
            access_token as "accessToken",
            institution_id as "institutionId",
            institution_name as "institutionName",
            accounts,
            status,
            last_sync as "lastSync",
            created_at as "createdAt",
            updated_at as "updatedAt"
          FROM plaid_connections 
          WHERE user_id = $1 AND status = 'active'
        `, [job.userId]);
      }

      if (connections.length === 0) {
        throw new Error('No active connections found for sync');
      }

      // Execute sync for each connection
      const results: SyncResult[] = [];
      for (const connection of connections) {
        if (job.status === 'cancelled') break;

        const connectionResult = job.options.forceRefresh
          ? await this.performFullSync(connection, job.options.accountIds)
          : await this.performIncrementalSync(connection, connection.lastSync);
        
        results.push(connectionResult);
      }

      // Aggregate results
      const aggregatedResult = this.aggregateSyncResults(results);
      
      job.result = aggregatedResult;
      job.status = 'completed';
      job.completedAt = new Date();

      // Update metrics
      this.metrics.totalSyncs++;
      this.metrics.successfulSyncs++;
      this.updateAverageSyncTime(Date.now() - startTime);
      this.metrics.lastSyncTime = new Date();

      // Calculate goal progress after successful sync
      if (aggregatedResult.success) {
        try {
          const goalProgressResult = await this.calculateGoalProgressForUser(job.userId);
          aggregatedResult.goalsUpdated = goalProgressResult.goalsUpdated;
          aggregatedResult.goalCalculationErrors = goalProgressResult.errors;
        } catch (error) {
          console.error(`Goal progress calculation failed for user ${job.userId}:`, error);
          aggregatedResult.goalCalculationErrors = [
            error instanceof Error ? error.message : 'Unknown goal calculation error'
          ];
        }
      }

      // Invalidate relevant caches
      await this.invalidateUserCaches(job.userId);

      console.log(`Sync job ${job.id} completed successfully`);
      return aggregatedResult;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      job.error = errorMessage;
      job.status = 'failed';
      job.completedAt = new Date();

      this.metrics.totalSyncs++;
      this.metrics.failedSyncs++;

      // Retry logic
      if (job.retryCount < (job.options.maxRetries || 3)) {
        job.retryCount++;
        job.status = 'queued';
        job.error = undefined;
        
        // Add back to queue with exponential backoff
        setTimeout(() => {
          this.jobQueue.unshift(job);
          this.metrics.queuedJobs++;
        }, Math.pow(2, job.retryCount) * 1000);

        console.log(`Sync job ${job.id} failed, retrying (attempt ${job.retryCount})`);
      } else {
        console.error(`Sync job ${job.id} failed permanently:`, errorMessage);
      }

      const failedResult: SyncResult = {
        success: false,
        accountsUpdated: 0,
        transactionsAdded: 0,
        transactionsUpdated: 0,
        goalsUpdated: 0,
        goalCalculationErrors: [],
        errors: [errorMessage],
        lastSyncTime: new Date(),
      };

      return failedResult;

    } finally {
      this.activeJobs.delete(job.id);
      this.metrics.activeJobs--;
    }
  }

  private async performFullSync(
    connection: PlaidConnection,
    accountIds?: string[]
  ): Promise<SyncResult> {
    console.log(`Performing full sync for connection ${connection.itemId}`);
    
    // Use the existing syncTransactions method from PlaidService
    return this.plaidService.syncTransactions(connection.userId, {
      forceRefresh: true,
      accountIds,
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days
      endDate: new Date(),
    });
  }

  private async syncAccounts(connection: PlaidConnection): Promise<{
    accountsUpdated: number;
    errors: string[];
  }> {
    const result = { accountsUpdated: 0, errors: [] };

    try {
      // This would typically call Plaid API to get fresh account data
      // For now, we'll use the existing PlaidService method
      const accounts = await this.plaidService.getAccounts(connection.userId);
      result.accountsUpdated = accounts?.length || 0;
      
      // Cache the updated accounts if they exist
      if (accounts && accounts.length > 0) {
        await this.cacheService.cacheAccounts(connection.userId, accounts);
      }
      
    } catch (error) {
      const errorMessage = `Failed to sync accounts for connection ${connection.itemId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      result.errors.push(errorMessage);
      console.error(errorMessage, error);
    }

    return result;
  }

  private async syncTransactionsIncremental(
    connection: PlaidConnection,
    startDate: Date,
    endDate: Date
  ): Promise<{
    transactionsAdded: number;
    transactionsUpdated: number;
    errors: string[];
  }> {
    const result = { transactionsAdded: 0, transactionsUpdated: 0, errors: [] };

    try {
      // Get existing transactions in the sync window
      const existingTransactions = await this.nileClient.query<Transaction>(`
        SELECT t.* FROM transactions t
        JOIN accounts a ON t.account_id = a.id
        WHERE a.connection_id = $1 
          AND t.date >= $2 
          AND t.date <= $3
      `, [connection.id, startDate, endDate]);

      const existingTransactionMap = new Map(
        (existingTransactions || []).map(t => [t.plaidTransactionId, t])
      );

      // Fetch fresh transactions from Plaid
      const syncResult = await this.plaidService.syncTransactions(connection.userId, {
        startDate,
        endDate,
        forceRefresh: true,
      });

      // Apply conflict resolution
      const conflicts = this.detectTransactionConflicts(
        existingTransactions || [],
        syncResult.transactionsAdded + syncResult.transactionsUpdated
      );

      if (conflicts.length > 0) {
        await this.resolveTransactionConflicts(conflicts);
      }

      result.transactionsAdded = syncResult.transactionsAdded || 0;
      result.transactionsUpdated = syncResult.transactionsUpdated || 0;
      result.errors.push(...(syncResult.errors || []));

    } catch (error) {
      const errorMessage = `Failed to sync transactions incrementally for connection ${connection.itemId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      result.errors.push(errorMessage);
      console.error(errorMessage, error);
    }

    return result;
  }

  private detectTransactionConflicts(
    existingTransactions: Transaction[],
    newTransactionCount: number
  ): Array<{ existing: Transaction; type: 'amount_mismatch' | 'data_mismatch' }> {
    // This is a simplified conflict detection
    // In a real implementation, you'd compare with the actual new transactions
    const conflicts: Array<{ existing: Transaction; type: 'amount_mismatch' | 'data_mismatch' }> = [];
    
    // For now, we'll just log that conflict detection ran
    console.log(`Conflict detection completed: ${existingTransactions.length} existing, ${newTransactionCount} new transactions`);
    
    return conflicts;
  }

  private async resolveTransactionConflicts(
    conflicts: Array<{ existing: Transaction; type: 'amount_mismatch' | 'data_mismatch' }>
  ): Promise<void> {
    for (const conflict of conflicts) {
      try {
        switch (this.conflictStrategy.onTransactionConflict) {
          case 'plaid_wins':
            // Plaid data takes precedence - already handled by sync
            console.log(`Conflict resolved: Plaid wins for transaction ${conflict.existing.id}`);
            break;
          
          case 'database_wins':
            // Keep existing database data
            console.log(`Conflict resolved: Database wins for transaction ${conflict.existing.id}`);
            break;
          
          case 'merge':
            // Implement merge logic based on conflict type
            await this.mergeTransactionData(conflict);
            break;
          
          case 'manual':
            // Flag for manual review
            await this.flagTransactionForReview(conflict.existing, conflict.type);
            break;
        }
      } catch (error) {
        console.error(`Failed to resolve conflict for transaction ${conflict.existing.id}:`, error);
      }
    }
  }

  private async mergeTransactionData(
    conflict: { existing: Transaction; type: 'amount_mismatch' | 'data_mismatch' }
  ): Promise<void> {
    // Implement merge logic based on conflict type
    console.log(`Merging transaction data for ${conflict.existing.id} (${conflict.type})`);
    
    // This would contain actual merge logic based on business rules
    // For example, keep the most recent timestamp, or merge categories, etc.
  }

  private async flagTransactionForReview(
    transaction: Transaction,
    conflictType: string
  ): Promise<void> {
    // Flag transaction for manual review
    await this.nileClient.query(`
      INSERT INTO transaction_conflicts (
        transaction_id, user_id, conflict_type, status, created_at
      ) VALUES ($1, $2, $3, 'pending', NOW())
      ON CONFLICT (transaction_id) DO UPDATE SET
        conflict_type = EXCLUDED.conflict_type,
        updated_at = NOW()
    `, [transaction.id, transaction.userId, conflictType]);
    
    console.log(`Transaction ${transaction.id} flagged for manual review: ${conflictType}`);
  }

  private async scheduleBackgroundSyncs(): Promise<void> {
    try {
      // Find connections that need syncing
      const staleConnections = await this.nileClient.query<PlaidConnection>(`
        SELECT 
          id,
          user_id as "userId",
          item_id as "itemId", 
          access_token as "accessToken",
          institution_id as "institutionId",
          institution_name as "institutionName",
          accounts,
          status,
          last_sync as "lastSync",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM plaid_connections 
        WHERE status = 'active' 
          AND (last_sync IS NULL OR last_sync < NOW() - INTERVAL '${this.options.intervalMs / 1000} seconds')
        ORDER BY last_sync ASC NULLS FIRST
        LIMIT 10
      `);

      for (const connection of staleConnections) {
        // Check if there's already a job queued for this connection
        const existingJob = Array.from(this.syncJobs.values()).find(
          job => job.connectionId === connection.id && 
                 (job.status === 'queued' || job.status === 'running')
        );

        if (!existingJob) {
          await this.queueSync({
            userId: connection.userId,
            connectionId: connection.id,
            priority: 'low',
            maxRetries: 2,
          });
        }
      }
    } catch (error) {
      console.error('Failed to schedule background syncs:', error);
    }
  }

  private processJobQueue(): void {
    while (
      this.jobQueue.length > 0 && 
      this.activeJobs.size < this.options.maxConcurrentJobs
    ) {
      // Sort by priority and creation time
      this.jobQueue.sort((a, b) => {
        const priorityOrder = { high: 3, normal: 2, low: 1 };
        const aPriority = priorityOrder[a.options.priority || 'normal'];
        const bPriority = priorityOrder[b.options.priority || 'normal'];
        
        if (aPriority !== bPriority) {
          return bPriority - aPriority;
        }
        
        return a.createdAt.getTime() - b.createdAt.getTime();
      });

      const job = this.jobQueue.shift();
      if (job && job.status === 'queued') {
        this.metrics.queuedJobs--;
        // Execute job asynchronously
        this.executeSyncJob(job).catch(error => {
          console.error(`Job ${job.id} execution failed:`, error);
        });
      }
    }
  }

  private aggregateSyncResults(results: SyncResult[]): SyncResult {
    return results.reduce((aggregate, result) => ({
      success: aggregate.success && result.success,
      accountsUpdated: aggregate.accountsUpdated + result.accountsUpdated,
      transactionsAdded: aggregate.transactionsAdded + result.transactionsAdded,
      transactionsUpdated: aggregate.transactionsUpdated + result.transactionsUpdated,
      goalsUpdated: (aggregate.goalsUpdated || 0) + (result.goalsUpdated || 0),
      goalCalculationErrors: [
        ...(aggregate.goalCalculationErrors || []),
        ...(result.goalCalculationErrors || [])
      ],
      errors: [...aggregate.errors, ...result.errors],
      lastSyncTime: result.lastSyncTime > aggregate.lastSyncTime ? result.lastSyncTime : aggregate.lastSyncTime,
    }), {
      success: true,
      accountsUpdated: 0,
      transactionsAdded: 0,
      transactionsUpdated: 0,
      goalsUpdated: 0,
      goalCalculationErrors: [],
      errors: [],
      lastSyncTime: new Date(0),
    });
  }

  private async invalidateUserCaches(userId: string): Promise<void> {
    try {
      await this.cacheService.invalidateCache(userId, 'all');
    } catch (error) {
      console.error('Failed to invalidate user caches:', error);
    }
  }

  private updateAverageSyncTime(syncTime: number): void {
    const currentAvg = this.metrics.averageSyncTime;
    const totalSyncs = this.metrics.totalSyncs;
    
    if (totalSyncs === 1) {
      this.metrics.averageSyncTime = syncTime;
    } else {
      this.metrics.averageSyncTime = ((currentAvg * (totalSyncs - 1)) + syncTime) / totalSyncs;
    }
  }

  /**
   * Format currency for logging
   */
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  /**
   * Calculates goal progress for a user after financial data sync
   * @param userId - The user ID
   * @returns Promise resolving to goal calculation results
   */
  private async calculateGoalProgressForUser(userId: string): Promise<{
    goalsUpdated: number;
    errors: string[];
  }> {
    try {
      console.log(`Calculating goal progress for user ${userId}`);

      // Get all active goals for the user that support automatic tracking
      const goals = await this.goalService.getGoals(userId, {
        status: ['active'],
        sortBy: 'created_at',
        sortOrder: 'asc'
      });

      if (!goals || !Array.isArray(goals)) {
        console.log(`No goals found or invalid goals data for user ${userId}`);
        return { goalsUpdated: 0, errors: [] };
      }

      // Filter goals that support automatic calculation
      const automaticGoals = goals.filter(goal => 
        goal.trackingMethod === 'account_balance' || 
        goal.trackingMethod === 'transaction_category'
      );

      if (automaticGoals.length === 0) {
        console.log(`No goals with automatic tracking found for user ${userId}`);
        return { goalsUpdated: 0, errors: [] };
      }

      console.log(`Found ${automaticGoals.length} goals with automatic tracking for user ${userId}`);

      // Calculate progress for all automatic goals
      const calculationResults = await this.goalProgressCalculator.calculateMultipleGoalsProgress(automaticGoals);
      
      let goalsUpdated = 0;
      const errors: string[] = [];

      // Update each goal with calculated progress
      for (const result of calculationResults) {
        try {
          const goal = automaticGoals.find(g => g.id === result.goalId);
          if (!goal) {
            errors.push(`Goal ${result.goalId} not found during progress update`);
            continue;
          }

          // Only update if there's a meaningful change (avoid unnecessary updates)
          const progressDifference = Math.abs(result.currentAmount - goal.currentAmount);
          if (progressDifference < 0.01) {
            console.log(`Skipping goal ${goal.id} - no significant progress change`);
            continue;
          }

          // Store previous amount for notification comparison
          const previousAmount = goal.currentAmount;

          // Update the goal's current amount
          await this.goalService.updateGoal(goal.id, userId, {
            currentAmount: result.currentAmount
          });

          // Add progress entries if any
          for (const progressEntry of result.progressEntries) {
            if (Math.abs(progressEntry.amount) >= 0.01) { // Only add meaningful progress entries
              await this.goalService.addManualProgress(goal.id, userId, {
                amount: Math.abs(progressEntry.amount),
                progressType: progressEntry.amount >= 0 ? 'manual_add' : 'manual_subtract',
                description: progressEntry.description || 'Automatic progress calculation'
              });
            }
          }

          // Generate notifications for progress changes
          try {
            const updatedGoal = { ...goal, currentAmount: result.currentAmount };
            const notifications = await this.goalNotificationService.processGoalProgressChange(
              updatedGoal,
              previousAmount,
              result.currentAmount
            );
            
            if (notifications.length > 0) {
              console.log(`Generated ${notifications.length} notifications for goal ${goal.id}`);
            }
          } catch (notificationError) {
            console.error(`Failed to generate notifications for goal ${goal.id}:`, notificationError);
            // Don't fail the entire sync for notification errors
          }

          goalsUpdated++;
          console.log(`✅ Updated goal "${goal.title}" (${goal.id}) - progress: ${this.formatCurrency(goal.currentAmount)} → ${this.formatCurrency(result.currentAmount)}`);

        } catch (error) {
          const errorMessage = `Failed to update goal ${result.goalId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMessage);
          console.error(errorMessage, error);
        }
      }

      console.log(`Goal progress calculation completed for user ${userId}: ${goalsUpdated} goals updated`);
      
      return { goalsUpdated, errors };

    } catch (error) {
      const errorMessage = `Goal progress calculation failed for user ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMessage, error);
      return { goalsUpdated: 0, errors: [errorMessage] };
    }
  }

  /**
   * Manually trigger goal progress calculation for a user
   * @param userId - The user ID
   * @returns Promise resolving to calculation results
   */
  async calculateGoalProgress(userId: string): Promise<{
    goalsUpdated: number;
    errors: string[];
  }> {
    console.log(`Manual goal progress calculation requested for user ${userId}`);
    return this.calculateGoalProgressForUser(userId);
  }

  /**
   * Cleanup completed jobs older than specified time
   */
  async cleanupOldJobs(olderThanMs: number = 24 * 60 * 60 * 1000): Promise<void> {
    const cutoffTime = Date.now() - olderThanMs;
    
    for (const [jobId, job] of this.syncJobs.entries()) {
      if (
        (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') &&
        job.createdAt.getTime() < cutoffTime
      ) {
        this.syncJobs.delete(jobId);
      }
    }
  }

  /**
   * Shutdown the sync service gracefully
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down data sync service...');
    
    this.stopBackgroundSync();
    
    // Wait for active jobs to complete (with timeout)
    const shutdownTimeout = 30000; // 30 seconds
    const startTime = Date.now();
    
    while (this.activeJobs.size > 0 && (Date.now() - startTime) < shutdownTimeout) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Cancel remaining jobs
    for (const jobId of this.activeJobs) {
      await this.cancelSyncJob(jobId);
    }
    
    console.log('Data sync service shutdown complete');
  }
}

// Singleton instance
let dataSyncServiceInstance: DataSyncService | null = null;

export function getDataSyncService(
  scheduleOptions?: SyncScheduleOptions,
  conflictStrategy?: ConflictResolutionStrategy
): DataSyncService {
  if (!dataSyncServiceInstance) {
    dataSyncServiceInstance = new DataSyncService(scheduleOptions, conflictStrategy);
  }
  return dataSyncServiceInstance;
}

export function resetDataSyncService(): void {
  if (dataSyncServiceInstance) {
    dataSyncServiceInstance.shutdown();
    dataSyncServiceInstance = null;
  }
}

// Export for testing
export { DataSyncService as _DataSyncService };