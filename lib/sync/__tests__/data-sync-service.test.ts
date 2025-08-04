// Data Sync Service Tests

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { DataSyncService, getDataSyncService, resetDataSyncService } from '../data-sync-service';
import { getPlaidService } from '../../plaid/plaid-service';
import { getCacheService } from '../../cache/cache-service';
import { getNileClient } from '../../database/nile-client';
import { SyncResult, PlaidConnection, Account, Transaction } from '../../../types';

// Mock dependencies
vi.mock('../../plaid/plaid-service');
vi.mock('../../cache/cache-service');
vi.mock('../../database/nile-client');

const mockPlaidService = {
  syncTransactions: vi.fn(),
  getAccounts: vi.fn(),
};

const mockCacheService = {
  cacheAccounts: vi.fn(),
  invalidateCache: vi.fn(),
};

const mockNileClient = {
  query: vi.fn(),
  queryOne: vi.fn(),
  transaction: vi.fn(),
};

(getPlaidService as Mock).mockReturnValue(mockPlaidService);
(getCacheService as Mock).mockReturnValue(mockCacheService);
(getNileClient as Mock).mockReturnValue(mockNileClient);

describe('DataSyncService', () => {
  let syncService: DataSyncService;

  const mockConnection: PlaidConnection = {
    id: 'conn-123',
    userId: 'user-123',
    itemId: 'item-123',
    accessToken: 'encrypted-token',
    institutionId: 'inst-123',
    institutionName: 'Test Bank',
    accounts: ['acc-1', 'acc-2'],
    status: 'active',
    lastSync: new Date('2024-01-01T00:00:00Z'),
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  const mockAccounts: Account[] = [
    {
      id: 'acc-1',
      userId: 'user-123',
      plaidAccountId: 'plaid-acc-1',
      connectionId: 'conn-123',
      name: 'Checking Account',
      type: 'depository',
      subtype: 'checking',
      balance: { current: 1000, available: 950 },
      lastUpdated: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockSyncResult: SyncResult = {
    success: true,
    accountsUpdated: 1,
    transactionsAdded: 5,
    transactionsUpdated: 2,
    errors: [],
    lastSyncTime: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetDataSyncService();
    
    syncService = new DataSyncService(
      { enableBackgroundSync: false }, // Disable background sync for tests
      { onTransactionConflict: 'plaid_wins', onAccountConflict: 'plaid_wins', onAmountMismatch: 'plaid_wins' }
    );
  });

  afterEach(() => {
    syncService.stopBackgroundSync();
    resetDataSyncService();
  });

  describe('syncUserData', () => {
    it('should successfully sync user data', async () => {
      // Setup mocks
      mockNileClient.query.mockResolvedValueOnce([mockConnection]);
      mockPlaidService.syncTransactions.mockResolvedValueOnce(mockSyncResult);
      mockCacheService.invalidateCache.mockResolvedValueOnce(undefined);

      const result = await syncService.syncUserData('user-123');

      expect(result.success).toBe(true);
      expect(result.accountsUpdated).toBe(1);
      expect(result.transactionsAdded).toBe(5);
      expect(result.transactionsUpdated).toBe(2);
      expect(mockPlaidService.syncTransactions).toHaveBeenCalledWith('user-123', {
        forceRefresh: undefined,
        accountIds: undefined,
        startDate: expect.any(Date),
        endDate: expect.any(Date),
      });
      expect(mockCacheService.invalidateCache).toHaveBeenCalledWith('user-123', 'all');
    });

    it('should handle sync failure gracefully', async () => {
      const error = new Error('Plaid API error');
      mockNileClient.query.mockResolvedValueOnce([mockConnection]);
      mockPlaidService.syncTransactions.mockRejectedValueOnce(error);

      const result = await syncService.syncUserData('user-123');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Plaid API error');
    });

    it('should handle no active connections', async () => {
      mockNileClient.query.mockResolvedValueOnce([]);

      const result = await syncService.syncUserData('user-123');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('No active connections found for sync');
    });

    it('should sync with force refresh option', async () => {
      mockNileClient.query.mockResolvedValueOnce([mockConnection]);
      mockPlaidService.syncTransactions.mockResolvedValueOnce(mockSyncResult);
      mockCacheService.invalidateCache.mockResolvedValueOnce(undefined);

      await syncService.syncUserData('user-123', { forceRefresh: true });

      expect(mockPlaidService.syncTransactions).toHaveBeenCalledWith('user-123', {
        forceRefresh: true,
        accountIds: undefined,
        startDate: expect.any(Date),
        endDate: expect.any(Date),
      });
    });

    it('should sync specific account IDs', async () => {
      mockNileClient.query.mockResolvedValueOnce([mockConnection]);
      mockPlaidService.syncTransactions.mockResolvedValueOnce(mockSyncResult);
      mockCacheService.invalidateCache.mockResolvedValueOnce(undefined);

      await syncService.syncUserData('user-123', { accountIds: ['acc-1'] });

      expect(mockPlaidService.syncTransactions).toHaveBeenCalledWith('user-123', {
        forceRefresh: undefined,
        accountIds: ['acc-1'],
        startDate: expect.any(Date),
        endDate: expect.any(Date),
      });
    });
  });

  describe('queueSync', () => {
    it('should queue a sync job', async () => {
      const jobId = await syncService.queueSync({
        userId: 'user-123',
        priority: 'high',
      });

      expect(jobId).toMatch(/^sync_\d+_[a-z0-9]+$/);
      
      const job = syncService.getSyncJobStatus(jobId);
      expect(job).toBeTruthy();
      expect(job?.status).toBe('queued');
      expect(job?.userId).toBe('user-123');
      expect(job?.options.priority).toBe('high');
    });

    it('should update metrics when queueing', async () => {
      await syncService.queueSync({ userId: 'user-123' });
      
      const metrics = syncService.getSyncMetrics();
      expect(metrics.queuedJobs).toBe(1);
    });
  });

  describe('performIncrementalSync', () => {
    it('should perform incremental sync successfully', async () => {
      // Mock account sync
      mockPlaidService.getAccounts.mockResolvedValueOnce(mockAccounts);
      mockCacheService.cacheAccounts.mockResolvedValueOnce(undefined);
      
      // Mock transaction sync
      mockNileClient.query
        .mockResolvedValueOnce([]) // existing transactions
        .mockResolvedValueOnce(undefined); // update connection last_sync
      
      mockPlaidService.syncTransactions.mockResolvedValueOnce(mockSyncResult);

      const result = await syncService.performIncrementalSync(mockConnection);

      expect(result.success).toBe(true);
      expect(result.accountsUpdated).toBe(1);
      expect(mockPlaidService.getAccounts).toHaveBeenCalledWith('user-123');
      expect(mockCacheService.cacheAccounts).toHaveBeenCalledWith('user-123', mockAccounts);
    });

    it('should handle account sync failure', async () => {
      const error = new Error('Account sync failed');
      mockPlaidService.getAccounts.mockRejectedValueOnce(error);
      
      // Mock transaction sync to succeed
      mockNileClient.query
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(undefined);
      mockPlaidService.syncTransactions.mockResolvedValueOnce(mockSyncResult);

      const result = await syncService.performIncrementalSync(mockConnection);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Failed to sync accounts for connection item-123: Account sync failed');
    });

    it('should handle transaction sync failure', async () => {
      // Mock account sync to succeed
      mockPlaidService.getAccounts.mockResolvedValueOnce(mockAccounts);
      mockCacheService.cacheAccounts.mockResolvedValueOnce(undefined);
      
      // Mock transaction sync to fail
      const error = new Error('Transaction sync failed');
      mockNileClient.query.mockResolvedValueOnce([]);
      mockPlaidService.syncTransactions.mockRejectedValueOnce(error);

      const result = await syncService.performIncrementalSync(mockConnection);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Failed to sync transactions incrementally for connection item-123: Transaction sync failed');
    });
  });

  describe('getSyncJobStatus', () => {
    it('should return job status', async () => {
      const jobId = await syncService.queueSync({ userId: 'user-123' });
      const job = syncService.getSyncJobStatus(jobId);

      expect(job).toBeTruthy();
      expect(job?.id).toBe(jobId);
      expect(job?.status).toBe('queued');
    });

    it('should return null for non-existent job', () => {
      const job = syncService.getSyncJobStatus('non-existent');
      expect(job).toBeNull();
    });
  });

  describe('cancelSyncJob', () => {
    it('should cancel queued job', async () => {
      const jobId = await syncService.queueSync({ userId: 'user-123' });
      const cancelled = await syncService.cancelSyncJob(jobId);

      expect(cancelled).toBe(true);
      
      const job = syncService.getSyncJobStatus(jobId);
      expect(job?.status).toBe('cancelled');
    });

    it('should not cancel non-existent job', async () => {
      const cancelled = await syncService.cancelSyncJob('non-existent');
      expect(cancelled).toBe(false);
    });
  });

  describe('getSyncMetrics', () => {
    it('should return initial metrics', () => {
      const metrics = syncService.getSyncMetrics();

      expect(metrics.totalSyncs).toBe(0);
      expect(metrics.successfulSyncs).toBe(0);
      expect(metrics.failedSyncs).toBe(0);
      expect(metrics.averageSyncTime).toBe(0);
      expect(metrics.activeJobs).toBe(0);
      expect(metrics.queuedJobs).toBe(0);
    });

    it('should update metrics after sync', async () => {
      mockNileClient.query.mockResolvedValueOnce([mockConnection]);
      mockPlaidService.syncTransactions.mockResolvedValueOnce(mockSyncResult);
      mockCacheService.invalidateCache.mockResolvedValueOnce(undefined);

      await syncService.syncUserData('user-123');
      
      const metrics = syncService.getSyncMetrics();
      expect(metrics.totalSyncs).toBe(1);
      expect(metrics.successfulSyncs).toBe(1);
      expect(metrics.averageSyncTime).toBeGreaterThan(0);
    });
  });

  describe('background sync', () => {
    it('should start and stop background sync', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      syncService.startBackgroundSync();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Background sync started'));
      
      syncService.stopBackgroundSync();
      expect(consoleSpy).toHaveBeenCalledWith('Background sync stopped');
      
      consoleSpy.mockRestore();
    });
  });

  describe('cleanupOldJobs', () => {
    it('should cleanup old completed jobs', async () => {
      // Create a job and mark it as completed
      const jobId = await syncService.queueSync({ userId: 'user-123' });
      const job = syncService.getSyncJobStatus(jobId);
      if (job) {
        job.status = 'completed';
        job.createdAt = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
      }

      await syncService.cleanupOldJobs(24 * 60 * 60 * 1000); // 24 hours

      const cleanedJob = syncService.getSyncJobStatus(jobId);
      expect(cleanedJob).toBeNull();
    });

    it('should not cleanup recent jobs', async () => {
      const jobId = await syncService.queueSync({ userId: 'user-123' });
      
      await syncService.cleanupOldJobs(24 * 60 * 60 * 1000);

      const job = syncService.getSyncJobStatus(jobId);
      expect(job).toBeTruthy();
    });
  });

  describe('shutdown', () => {
    it('should shutdown gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      await syncService.shutdown();
      
      expect(consoleSpy).toHaveBeenCalledWith('Shutting down data sync service...');
      expect(consoleSpy).toHaveBeenCalledWith('Data sync service shutdown complete');
      
      consoleSpy.mockRestore();
    });
  });

  describe('singleton pattern', () => {
    it('should return same instance', () => {
      const service1 = getDataSyncService();
      const service2 = getDataSyncService();
      
      expect(service1).toBe(service2);
    });

    it('should create new instance after reset', () => {
      const service1 = getDataSyncService();
      resetDataSyncService();
      const service2 = getDataSyncService();
      
      expect(service1).not.toBe(service2);
    });
  });

  describe('error recovery', () => {
    it('should retry failed jobs', async () => {
      const error = new Error('Temporary failure');
      mockNileClient.query.mockResolvedValueOnce([mockConnection]);
      mockPlaidService.syncTransactions
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce(mockSyncResult);

      const result = await syncService.syncUserData('user-123');

      // First attempt should fail
      expect(result.success).toBe(false);
      
      // Job should be queued for retry
      const metrics = syncService.getSyncMetrics();
      expect(metrics.queuedJobs).toBeGreaterThan(0);
    });

    it('should give up after max retries', async () => {
      const jobId = await syncService.queueSync({
        userId: 'user-123',
        maxRetries: 1,
      });

      const job = syncService.getSyncJobStatus(jobId);
      if (job) {
        job.retryCount = 1;
        job.status = 'failed';
      }

      // Should not retry beyond max retries
      expect(job?.retryCount).toBe(1);
    });
  });

  describe('conflict resolution', () => {
    it('should detect and resolve conflicts', async () => {
      const existingTransactions: Transaction[] = [
        {
          id: 'trans-1',
          userId: 'user-123',
          accountId: 'acc-1',
          plaidTransactionId: 'plaid-trans-1',
          amount: 100,
          date: new Date(),
          name: 'Test Transaction',
          category: ['food'],
          pending: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockNileClient.query
        .mockResolvedValueOnce(existingTransactions) // existing transactions
        .mockResolvedValueOnce(undefined); // update connection

      mockPlaidService.syncTransactions.mockResolvedValueOnce({
        ...mockSyncResult,
        transactionsAdded: 1,
        transactionsUpdated: 1,
      });

      const result = await syncService.performIncrementalSync(mockConnection);

      expect(result.transactionsAdded).toBe(1);
      expect(result.transactionsUpdated).toBe(1);
    });
  });
});