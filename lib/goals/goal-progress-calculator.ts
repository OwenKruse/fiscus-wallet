// Goal Progress Calculation Service for Automatic Progress Tracking

import { getNileClient } from '../database/nile-client';
import { getPlaidService } from '../plaid/plaid-service';
import { 
  Goal, 
  GoalProgress,
  Account,
  Transaction,
  GoalCalculationResult
} from '../../types';

export interface ProgressCalculatorOptions {
  maxRetries?: number;
  retryDelayMs?: number;
  lookbackDays?: number;
}

export class GoalProgressCalculator {
  private dbClient = getNileClient();
  private plaidService = getPlaidService();
  private options: Required<ProgressCalculatorOptions>;

  constructor(options: ProgressCalculatorOptions = {}) {
    this.options = {
      maxRetries: options.maxRetries ?? 3,
      retryDelayMs: options.retryDelayMs ?? 1000,
      lookbackDays: options.lookbackDays ?? 90, // Look back 90 days for calculation baseline
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
        console.warn(`Progress calculation failed, retrying... (${retries} attempts left)`, error);
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
   * Calculates progress for savings goals based on account balance changes
   * @param goal - The savings goal
   * @param accounts - User's accounts
   * @returns Promise resolving to calculation result
   */
  async calculateSavingsGoalProgress(goal: Goal, accounts: Account[]): Promise<GoalCalculationResult> {
    return this.executeWithRetry(async () => {
      // Get tracking accounts or all savings/checking accounts if none specified
      let trackingAccounts = accounts;
      
      if (goal.trackingAccountIds && goal.trackingAccountIds.length > 0) {
        trackingAccounts = accounts.filter(account => 
          goal.trackingAccountIds.includes(account.plaidAccountId || account.id)
        );
      } else {
        // Default to savings and checking accounts
        trackingAccounts = accounts.filter(account => 
          account.type === 'depository' && 
          (account.subtype === 'savings' || account.subtype === 'checking')
        );
      }

      if (trackingAccounts.length === 0) {
        throw new Error('No suitable accounts found for savings goal tracking');
      }

      // Get baseline balance from when goal was created or lookback period
      const lookbackDate = new Date();
      lookbackDate.setDate(lookbackDate.getDate() - this.options.lookbackDays);
      const goalCreatedDate = new Date(goal.createdAt);
      const baselineDate = goalCreatedDate > lookbackDate ? goalCreatedDate : lookbackDate;

      // Calculate current total balance
      const currentBalance = trackingAccounts.reduce((total, account) => {
        return total + (account.balance?.current || 0);
      }, 0);

      // Get historical balance data to calculate progress
      const historicalBalance = await this.getHistoricalAccountBalance(
        goal.userId,
        trackingAccounts.map(acc => acc.id),
        baselineDate
      );

      // Calculate progress as the difference from baseline
      const progressAmount = Math.max(0, currentBalance - historicalBalance);
      const newCurrentAmount = Math.min(progressAmount, goal.targetAmount);

      // Create progress entry for automatic calculation
      const progressEntries: Omit<GoalProgress, 'id' | 'createdAt'>[] = [{
        goalId: goal.id,
        userId: goal.userId,
        amount: newCurrentAmount - goal.currentAmount,
        progressType: 'automatic',
        description: `Automatic calculation from account balances: ${trackingAccounts.map(acc => acc.name).join(', ')}`,
        transactionId: undefined
      }];

      return {
        currentAmount: newCurrentAmount,
        progressEntries,
        lastCalculated: new Date().toISOString()
      };
    });
  }

  /**
   * Calculates progress for debt reduction goals based on debt balance decreases
   * @param goal - The debt reduction goal
   * @param accounts - User's accounts
   * @returns Promise resolving to calculation result
   */
  async calculateDebtReductionProgress(goal: Goal, accounts: Account[]): Promise<GoalCalculationResult> {
    return this.executeWithRetry(async () => {
      // Get tracking accounts or all credit/loan accounts if none specified
      let trackingAccounts = accounts;
      
      if (goal.trackingAccountIds && goal.trackingAccountIds.length > 0) {
        trackingAccounts = accounts.filter(account => 
          goal.trackingAccountIds.includes(account.plaidAccountId || account.id)
        );
      } else {
        // Default to credit and loan accounts
        trackingAccounts = accounts.filter(account => 
          account.type === 'credit' || account.type === 'loan'
        );
      }

      if (trackingAccounts.length === 0) {
        throw new Error('No suitable accounts found for debt reduction goal tracking');
      }

      // Get baseline debt balance from when goal was created or lookback period
      const lookbackDate = new Date();
      lookbackDate.setDate(lookbackDate.getDate() - this.options.lookbackDays);
      const goalCreatedDate = new Date(goal.createdAt);
      const baselineDate = goalCreatedDate > lookbackDate ? goalCreatedDate : lookbackDate;

      // Calculate current total debt balance (positive values for debt)
      const currentDebtBalance = trackingAccounts.reduce((total, account) => {
        // For credit accounts, current balance is typically negative (debt)
        // For loan accounts, current balance is typically positive (remaining debt)
        const balance = account.balance?.current || 0;
        return total + Math.abs(balance);
      }, 0);

      // Get historical debt balance to calculate reduction
      const historicalDebtBalance = await this.getHistoricalAccountBalance(
        goal.userId,
        trackingAccounts.map(acc => acc.id),
        baselineDate,
        true // Calculate as debt (absolute values)
      );

      // Calculate progress as debt reduction (historical - current)
      const debtReduction = Math.max(0, historicalDebtBalance - currentDebtBalance);
      const newCurrentAmount = Math.min(debtReduction, goal.targetAmount);

      // Create progress entry for automatic calculation
      const progressEntries: Omit<GoalProgress, 'id' | 'createdAt'>[] = [{
        goalId: goal.id,
        userId: goal.userId,
        amount: newCurrentAmount - goal.currentAmount,
        progressType: 'automatic',
        description: `Automatic debt reduction calculation from accounts: ${trackingAccounts.map(acc => acc.name).join(', ')}`,
        transactionId: undefined
      }];

      return {
        currentAmount: newCurrentAmount,
        progressEntries,
        lastCalculated: new Date().toISOString()
      };
    });
  }

  /**
   * Calculates progress for investment goals based on investment account growth
   * @param goal - The investment goal
   * @param accounts - User's accounts
   * @returns Promise resolving to calculation result
   */
  async calculateInvestmentGoalProgress(goal: Goal, accounts: Account[]): Promise<GoalCalculationResult> {
    return this.executeWithRetry(async () => {
      // Get tracking accounts or all investment accounts if none specified
      let trackingAccounts = accounts;
      
      if (goal.trackingAccountIds && goal.trackingAccountIds.length > 0) {
        trackingAccounts = accounts.filter(account => 
          goal.trackingAccountIds.includes(account.plaidAccountId || account.id)
        );
      } else {
        // Default to investment accounts
        trackingAccounts = accounts.filter(account => 
          account.type === 'investment'
        );
      }

      if (trackingAccounts.length === 0) {
        throw new Error('No suitable accounts found for investment goal tracking');
      }

      // Get baseline investment balance from when goal was created or lookback period
      const lookbackDate = new Date();
      lookbackDate.setDate(lookbackDate.getDate() - this.options.lookbackDays);
      const goalCreatedDate = new Date(goal.createdAt);
      const baselineDate = goalCreatedDate > lookbackDate ? goalCreatedDate : lookbackDate;

      // Calculate current total investment balance
      const currentInvestmentBalance = trackingAccounts.reduce((total, account) => {
        return total + (account.balance?.current || 0);
      }, 0);

      // Get historical investment balance to calculate growth
      const historicalInvestmentBalance = await this.getHistoricalAccountBalance(
        goal.userId,
        trackingAccounts.map(acc => acc.id),
        baselineDate
      );

      // Calculate progress as investment growth
      const investmentGrowth = Math.max(0, currentInvestmentBalance - historicalInvestmentBalance);
      const newCurrentAmount = Math.min(investmentGrowth, goal.targetAmount);

      // Create progress entry for automatic calculation
      const progressEntries: Omit<GoalProgress, 'id' | 'createdAt'>[] = [{
        goalId: goal.id,
        userId: goal.userId,
        amount: newCurrentAmount - goal.currentAmount,
        progressType: 'automatic',
        description: `Automatic investment growth calculation from accounts: ${trackingAccounts.map(acc => acc.name).join(', ')}`,
        transactionId: undefined
      }];

      return {
        currentAmount: newCurrentAmount,
        progressEntries,
        lastCalculated: new Date().toISOString()
      };
    });
  }

  /**
   * Calculates progress based on transaction categories (for purchase, education, travel goals)
   * @param goal - The goal
   * @param transactions - User's transactions
   * @returns Promise resolving to calculation result
   */
  async calculateTransactionBasedProgress(goal: Goal, transactions: Transaction[]): Promise<GoalCalculationResult> {
    return this.executeWithRetry(async () => {
      const trackingConfig = goal.trackingConfig;
      
      if (!trackingConfig || !trackingConfig.categoryFilters) {
        throw new Error('Transaction-based tracking requires category filters in tracking config');
      }

      // Filter transactions based on tracking configuration
      let relevantTransactions = transactions;

      // Filter by categories
      if (trackingConfig.categoryFilters && trackingConfig.categoryFilters.length > 0) {
        relevantTransactions = relevantTransactions.filter(transaction => {
          const transactionCategories = Array.isArray(transaction.category) 
            ? transaction.category 
            : [transaction.category];
          
          return trackingConfig.categoryFilters!.some(filter => 
            transactionCategories.some(cat => 
              cat && cat.toLowerCase().includes(filter.toLowerCase())
            )
          );
        });
      }

      // Filter by transaction types if specified
      if (trackingConfig.transactionTypes && trackingConfig.transactionTypes.length > 0) {
        relevantTransactions = relevantTransactions.filter(transaction => {
          // This would depend on how transaction types are stored
          // For now, we'll assume all transactions are valid
          return true;
        });
      }

      // Filter by accounts if specified
      if (trackingConfig.accountIds && trackingConfig.accountIds.length > 0) {
        relevantTransactions = relevantTransactions.filter(transaction => 
          trackingConfig.accountIds!.includes(transaction.accountId)
        );
      }

      // Filter transactions since goal creation
      const goalCreatedDate = new Date(goal.createdAt);
      relevantTransactions = relevantTransactions.filter(transaction => 
        new Date(transaction.date) >= goalCreatedDate
      );

      // Calculate total spending in relevant categories (use absolute values for spending)
      const totalSpending = relevantTransactions.reduce((total, transaction) => {
        return total + Math.abs(transaction.amount);
      }, 0);

      const newCurrentAmount = Math.min(totalSpending, goal.targetAmount);

      // Create progress entry for automatic calculation
      const progressEntries: Omit<GoalProgress, 'id' | 'createdAt'>[] = [{
        goalId: goal.id,
        userId: goal.userId,
        amount: newCurrentAmount - goal.currentAmount,
        progressType: 'automatic',
        description: `Automatic calculation from ${relevantTransactions.length} transactions in categories: ${trackingConfig.categoryFilters.join(', ')}`,
        transactionId: undefined
      }];

      return {
        currentAmount: newCurrentAmount,
        progressEntries,
        lastCalculated: new Date().toISOString()
      };
    });
  }

  /**
   * Calculates progress for any goal type based on its tracking method
   * @param goal - The goal to calculate progress for
   * @returns Promise resolving to calculation result
   */
  async calculateGoalProgress(goal: Goal): Promise<GoalCalculationResult> {
    return this.executeWithRetry(async () => {
      // Get user's accounts for balance-based calculations
      const accounts = await this.plaidService.getAccountsWithInstitution(goal.userId);

      switch (goal.goalType) {
        case 'savings':
          return this.calculateSavingsGoalProgress(goal, accounts);
          
        case 'debt_reduction':
          return this.calculateDebtReductionProgress(goal, accounts);
          
        case 'investment':
          return this.calculateInvestmentGoalProgress(goal, accounts);
          
        case 'purchase':
        case 'education':
        case 'travel':
          // These goals can use either account balance or transaction-based tracking
          if (goal.trackingMethod === 'account_balance') {
            return this.calculateSavingsGoalProgress(goal, accounts);
          } else if (goal.trackingMethod === 'transaction_category') {
            // Get recent transactions for category-based tracking
            const endDate = new Date();
            const startDate = new Date(goal.createdAt);
            const transactions = await this.plaidService.getTransactions(goal.userId, {
              startDate,
              endDate,
              accountIds: goal.trackingAccountIds.length > 0 ? goal.trackingAccountIds : undefined
            });
            return this.calculateTransactionBasedProgress(goal, transactions);
          } else {
            // Manual tracking - no automatic calculation
            return {
              currentAmount: goal.currentAmount,
              progressEntries: [],
              lastCalculated: new Date().toISOString()
            };
          }
          
        default:
          throw new Error(`Unsupported goal type for automatic calculation: ${goal.goalType}`);
      }
    });
  }

  /**
   * Calculates progress for multiple goals in batch
   * @param goals - Array of goals to calculate progress for
   * @returns Promise resolving to array of calculation results
   */
  async calculateMultipleGoalsProgress(goals: Goal[]): Promise<(GoalCalculationResult & { goalId: string })[]> {
    const results: (GoalCalculationResult & { goalId: string })[] = [];
    
    // Process goals in batches to avoid overwhelming the system
    const batchSize = 5;
    for (let i = 0; i < goals.length; i += batchSize) {
      const batch = goals.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (goal) => {
        try {
          const result = await this.calculateGoalProgress(goal);
          return { ...result, goalId: goal.id };
        } catch (error) {
          console.error(`Failed to calculate progress for goal ${goal.id}:`, error);
          // Return current state if calculation fails
          return {
            goalId: goal.id,
            currentAmount: goal.currentAmount,
            progressEntries: [],
            lastCalculated: new Date().toISOString()
          };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Small delay between batches to prevent overwhelming the database
      if (i + batchSize < goals.length) {
        await this.delay(100);
      }
    }
    
    return results;
  }

  /**
   * Gets historical account balance for baseline calculations
   * @param userId - The user ID
   * @param accountIds - Array of account IDs
   * @param baselineDate - Date to get historical balance from
   * @param asDebt - Whether to calculate as debt (absolute values)
   * @returns Promise resolving to historical balance
   */
  private async getHistoricalAccountBalance(
    userId: string, 
    accountIds: string[], 
    baselineDate: Date,
    asDebt: boolean = false
  ): Promise<number> {
    // This is a simplified implementation. In a real system, you might want to:
    // 1. Store daily balance snapshots
    // 2. Calculate from transaction history
    // 3. Use Plaid's balance history API if available
    
    // For now, we'll estimate based on transaction history
    const transactions = await this.plaidService.getTransactions(userId, {
      startDate: baselineDate,
      endDate: new Date(),
      accountIds: accountIds
    });

    // Get current balances
    const accounts = await this.plaidService.getAccounts(userId);
    const relevantAccounts = accounts.filter(acc => accountIds.includes(acc.id));
    
    let currentBalance = relevantAccounts.reduce((total, account) => {
      const balance = account.balance?.current || 0;
      return total + (asDebt ? Math.abs(balance) : balance);
    }, 0);

    // Estimate historical balance by subtracting net transactions since baseline
    const netTransactions = transactions.reduce((total, transaction) => {
      if (accountIds.includes(transaction.accountId)) {
        return total + transaction.amount;
      }
      return total;
    }, 0);

    const historicalBalance = currentBalance - netTransactions;
    return asDebt ? Math.abs(historicalBalance) : historicalBalance;
  }
}

// Singleton instance
let progressCalculatorInstance: GoalProgressCalculator | null = null;

export function getGoalProgressCalculator(options?: ProgressCalculatorOptions): GoalProgressCalculator {
  if (!progressCalculatorInstance) {
    progressCalculatorInstance = new GoalProgressCalculator(options);
  }
  return progressCalculatorInstance;
}

// Export for testing
export { GoalProgressCalculator as _GoalProgressCalculator };