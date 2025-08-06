// Test for goal progress calculation integration with sync service

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getDataSyncService, resetDataSyncService } from '../data-sync-service';

// Mock the dependencies
vi.mock('../../database/nile-client', () => ({
  getNileClient: () => ({
    query: vi.fn().mockResolvedValue([]),
    queryOne: vi.fn().mockResolvedValue(null),
    transaction: vi.fn().mockImplementation((callback) => callback({
      query: vi.fn().mockResolvedValue([]),
      queryOne: vi.fn().mockResolvedValue(null),
      executeUpdate: vi.fn().mockResolvedValue({ rowCount: 1 })
    }))
  })
}));

vi.mock('../../plaid/plaid-service', () => ({
  getPlaidService: () => ({
    syncTransactions: vi.fn().mockResolvedValue({
      success: true,
      accountsUpdated: 1,
      transactionsAdded: 5,
      transactionsUpdated: 2,
      errors: [],
      lastSyncTime: new Date()
    }),
    getAccounts: vi.fn().mockResolvedValue([]),
    getAccountsWithInstitution: vi.fn().mockResolvedValue([]),
    getTransactions: vi.fn().mockResolvedValue([])
  })
}));

vi.mock('../../cache/cache-service', () => ({
  getCacheService: () => ({
    invalidateCache: vi.fn().mockResolvedValue(undefined),
    cacheAccounts: vi.fn().mockResolvedValue(undefined)
  })
}));

vi.mock('../../goals/goal-service', () => ({
  getGoalService: () => ({
    getGoals: vi.fn().mockResolvedValue([]),
    updateGoal: vi.fn().mockResolvedValue({}),
    addManualProgress: vi.fn().mockResolvedValue(undefined)
  })
}));

vi.mock('../../goals/goal-progress-calculator', () => ({
  getGoalProgressCalculator: () => ({
    calculateMultipleGoalsProgress: vi.fn().mockResolvedValue([])
  })
}));

describe('Goal Progress Integration with Sync Service', () => {
  let syncService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    resetDataSyncService();
    syncService = getDataSyncService({
      enableBackgroundSync: false
    });
  });

  afterEach(() => {
    if (syncService) {
      syncService.shutdown();
    }
    resetDataSyncService();
  });

  it('should have calculateGoalProgress method', () => {
    expect(typeof syncService.calculateGoalProgress).toBe('function');
  });

  it('should calculate goal progress for user', async () => {
    const result = await syncService.calculateGoalProgress('user-123');
    
    expect(result).toHaveProperty('goalsUpdated');
    expect(result).toHaveProperty('errors');
    expect(typeof result.goalsUpdated).toBe('number');
    expect(Array.isArray(result.errors)).toBe(true);
  });

  it('should handle empty goals gracefully', async () => {
    const result = await syncService.calculateGoalProgress('user-123');
    
    expect(result.goalsUpdated).toBe(0);
    expect(result.errors).toEqual([]);
  });
});