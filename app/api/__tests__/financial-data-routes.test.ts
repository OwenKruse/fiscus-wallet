// Integration tests for Financial Data API routes

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getTransactions } from '../transactions/route';
import { GET as getAccounts } from '../accounts/route';
import { POST as syncData, GET as getSyncStatus } from '../sync/route';

// Mock the services
vi.mock('../../../lib/auth/nile-auth-service', () => ({
  getNileAuthService: vi.fn(() => ({
    getCurrentUser: vi.fn(),
    validateSession: vi.fn()
  }))
}));

vi.mock('../../../lib/cache/cache-service', () => ({
  getCacheService: vi.fn(() => ({
    getTransactions: vi.fn(),
    getAccounts: vi.fn()
  }))
}));

vi.mock('../../../lib/sync/data-sync-service', () => ({
  getDataSyncService: vi.fn(() => ({
    queueSync: vi.fn(),
    getSyncJobStatus: vi.fn()
  }))
}));

// Test user data
const testUser = {
  id: 'test-user-123',
  email: 'financial-test@example.com',
  tenantId: 'test-tenant-123'
};

// Mock financial data
const mockTransactions = {
  transactions: [
    {
      id: 'txn-1',
      accountId: 'acc-1',
      amount: -50.00,
      date: '2024-01-15',
      name: 'Coffee Shop',
      merchantName: 'Starbucks',
      category: ['Food and Drink', 'Restaurants'],
      subcategory: 'Coffee Shop',
      pending: false,
      accountName: 'Checking Account'
    },
    {
      id: 'txn-2',
      accountId: 'acc-1',
      amount: 1000.00,
      date: '2024-01-14',
      name: 'Salary Deposit',
      merchantName: 'Employer Inc',
      category: ['Transfer', 'Payroll'],
      subcategory: 'Salary',
      pending: false,
      accountName: 'Checking Account'
    }
  ],
  pagination: {
    page: 1,
    limit: 50,
    total: 2,
    totalPages: 1,
    hasNext: false,
    hasPrev: false
  }
};

const mockAccounts = {
  accounts: [
    {
      id: 'acc-1',
      name: 'Checking Account',
      officialName: 'Primary Checking Account',
      type: 'depository',
      subtype: 'checking',
      balance: {
        available: 950.00,
        current: 950.00,
        limit: null
      },
      institutionName: 'Test Bank',
      lastUpdated: '2024-01-15T10:00:00Z'
    },
    {
      id: 'acc-2',
      name: 'Savings Account',
      officialName: 'High Yield Savings',
      type: 'depository',
      subtype: 'savings',
      balance: {
        available: 5000.00,
        current: 5000.00,
        limit: null
      },
      institutionName: 'Test Bank',
      lastUpdated: '2024-01-15T10:00:00Z'
    }
  ]
};

const mockSyncJob = {
  id: 'sync-job-123',
  userId: testUser.id,
  status: 'queued',
  createdAt: new Date('2024-01-15T10:00:00Z'),
  retryCount: 0
};

// Helper function to create authenticated request
function createAuthenticatedRequest(
  method: string,
  url: string,
  body?: any,
  token?: string
): NextRequest {
  const headers = new Headers({
    'Content-Type': 'application/json'
  });

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return new NextRequest(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
}

// Helper function to extract JSON from response
async function getResponseJson(response: Response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { error: 'Invalid JSON response', text };
  }
}

describe('Financial Data API Routes', () => {
  let mockCacheService: any;
  let mockSyncService: any;
  let mockAuthService: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Setup mock services
    mockCacheService = {
      getTransactions: vi.fn(),
      getAccounts: vi.fn()
    };

    mockSyncService = {
      queueSync: vi.fn(),
      getSyncJobStatus: vi.fn()
    };

    mockAuthService = {
      getCurrentUser: vi.fn(),
      validateSession: vi.fn()
    };

    // Setup default mock implementations
    const { getCacheService } = require('../../../lib/cache/cache-service');
    const { getDataSyncService } = require('../../../lib/sync/data-sync-service');
    const { getNileAuthService } = require('../../../lib/auth/nile-auth-service');

    getCacheService.mockReturnValue(mockCacheService);
    getDataSyncService.mockReturnValue(mockSyncService);
    getNileAuthService.mockReturnValue(mockAuthService);

    // Mock authentication middleware
    mockAuthService.validateSession.mockResolvedValue({
      user: testUser,
      tenantId: testUser.tenantId
    });
  });

  describe('GET /api/transactions', () => {
    it('should return transactions with default pagination', async () => {
      mockCacheService.getTransactions.mockResolvedValue(mockTransactions);

      const request = createAuthenticatedRequest('GET', '/api/transactions');
      const response = await getTransactions(request, { user: testUser });
      const data = await getResponseJson(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockTransactions);
      expect(mockCacheService.getTransactions).toHaveBeenCalledWith(
        testUser.id,
        expect.objectContaining({
          page: 1,
          limit: 50
        })
      );
    });

    it('should handle filtering by account IDs', async () => {
      mockCacheService.getTransactions.mockResolvedValue(mockTransactions);

      const request = createAuthenticatedRequest(
        'GET',
        '/api/transactions?accountIds=acc-1,acc-2'
      );
      const response = await getTransactions(request, { user: testUser });
      const data = await getResponseJson(response);

      expect(response.status).toBe(200);
      expect(mockCacheService.getTransactions).toHaveBeenCalledWith(
        testUser.id,
        expect.objectContaining({
          accountIds: ['acc-1', 'acc-2']
        })
      );
    });

    it('should handle date range filtering', async () => {
      mockCacheService.getTransactions.mockResolvedValue(mockTransactions);

      const request = createAuthenticatedRequest(
        'GET',
        '/api/transactions?startDate=2024-01-01&endDate=2024-01-31'
      );
      const response = await getTransactions(request, { user: testUser });
      const data = await getResponseJson(response);

      expect(response.status).toBe(200);
      expect(mockCacheService.getTransactions).toHaveBeenCalledWith(
        testUser.id,
        expect.objectContaining({
          startDate: expect.any(Date),
          endDate: expect.any(Date)
        })
      );
    });

    it('should handle amount filtering', async () => {
      mockCacheService.getTransactions.mockResolvedValue(mockTransactions);

      const request = createAuthenticatedRequest(
        'GET',
        '/api/transactions?minAmount=10&maxAmount=100'
      );
      const response = await getTransactions(request, { user: testUser });
      const data = await getResponseJson(response);

      expect(response.status).toBe(200);
      expect(mockCacheService.getTransactions).toHaveBeenCalledWith(
        testUser.id,
        expect.objectContaining({
          minAmount: 10,
          maxAmount: 100
        })
      );
    });

    it('should handle search term', async () => {
      mockCacheService.getTransactions.mockResolvedValue(mockTransactions);

      const request = createAuthenticatedRequest(
        'GET',
        '/api/transactions?search=coffee'
      );
      const response = await getTransactions(request, { user: testUser });
      const data = await getResponseJson(response);

      expect(response.status).toBe(200);
      expect(mockCacheService.getTransactions).toHaveBeenCalledWith(
        testUser.id,
        expect.objectContaining({
          search: 'coffee'
        })
      );
    });

    it('should validate pagination parameters', async () => {
      const request = createAuthenticatedRequest(
        'GET',
        '/api/transactions?page=0&limit=200'
      );
      const response = await getTransactions(request, { user: testUser });
      const data = await getResponseJson(response);

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_PAGE');
    });

    it('should handle database errors', async () => {
      mockCacheService.getTransactions.mockRejectedValue(
        new Error('Database connection timeout')
      );

      const request = createAuthenticatedRequest('GET', '/api/transactions');
      const response = await getTransactions(request, { user: testUser });
      const data = await getResponseJson(response);

      expect(response.status).toBe(503);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('DATABASE_ERROR');
    });
  });

  describe('GET /api/accounts', () => {
    it('should return user accounts', async () => {
      mockCacheService.getAccounts.mockResolvedValue(mockAccounts);

      const request = createAuthenticatedRequest('GET', '/api/accounts');
      const response = await getAccounts(request, { user: testUser });
      const data = await getResponseJson(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockAccounts);
      expect(mockCacheService.getAccounts).toHaveBeenCalledWith(testUser.id);
    });

    it('should handle cache service errors', async () => {
      mockCacheService.getAccounts.mockRejectedValue(
        new Error('Cache service unavailable')
      );

      const request = createAuthenticatedRequest('GET', '/api/accounts');
      const response = await getAccounts(request, { user: testUser });
      const data = await getResponseJson(response);

      expect(response.status).toBe(503);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('CACHE_ERROR');
    });
  });

  describe('POST /api/sync', () => {
    it('should queue sync job successfully', async () => {
      mockSyncService.queueSync.mockResolvedValue('sync-job-123');
      mockSyncService.getSyncJobStatus.mockReturnValue(mockSyncJob);

      const request = createAuthenticatedRequest(
        'POST',
        '/api/sync',
        { forceRefresh: true }
      );
      const response = await syncData(request, { user: testUser });
      const data = await getResponseJson(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.jobId).toBe('sync-job-123');
      expect(data.data.status).toBe('queued');
      expect(mockSyncService.queueSync).toHaveBeenCalledWith({
        userId: testUser.id,
        accountIds: undefined,
        forceRefresh: true,
        priority: 'high'
      });
    });

    it('should handle account-specific sync', async () => {
      mockSyncService.queueSync.mockResolvedValue('sync-job-456');
      mockSyncService.getSyncJobStatus.mockReturnValue(mockSyncJob);

      const request = createAuthenticatedRequest(
        'POST',
        '/api/sync',
        { accountIds: ['acc-1', 'acc-2'] }
      );
      const response = await syncData(request, { user: testUser });
      const data = await getResponseJson(response);

      expect(response.status).toBe(200);
      expect(mockSyncService.queueSync).toHaveBeenCalledWith({
        userId: testUser.id,
        accountIds: ['acc-1', 'acc-2'],
        forceRefresh: false,
        priority: 'high'
      });
    });

    it('should validate request body', async () => {
      const request = createAuthenticatedRequest(
        'POST',
        '/api/sync',
        { accountIds: 'invalid-array', forceRefresh: 'not-boolean' }
      );
      const response = await syncData(request, { user: testUser });
      const data = await getResponseJson(response);

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle sync service errors', async () => {
      mockSyncService.queueSync.mockRejectedValue(
        new Error('Sync service unavailable')
      );

      const request = createAuthenticatedRequest('POST', '/api/sync');
      const response = await syncData(request, { user: testUser });
      const data = await getResponseJson(response);

      expect(response.status).toBe(503);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('SYNC_ERROR');
    });
  });

  describe('GET /api/sync', () => {
    it('should return sync job status', async () => {
      const completedJob = {
        ...mockSyncJob,
        status: 'completed',
        startedAt: new Date('2024-01-15T10:01:00Z'),
        completedAt: new Date('2024-01-15T10:02:00Z'),
        result: {
          accountsUpdated: 2,
          transactionsAdded: 10,
          transactionsUpdated: 0,
          errors: []
        }
      };

      mockSyncService.getSyncJobStatus.mockReturnValue(completedJob);

      const request = createAuthenticatedRequest(
        'GET',
        '/api/sync?jobId=sync-job-123'
      );
      const response = await getSyncStatus(request, { user: testUser });
      const data = await getResponseJson(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.jobId).toBe('sync-job-123');
      expect(data.data.status).toBe('completed');
      expect(data.data.result).toEqual(completedJob.result);
    });

    it('should require job ID parameter', async () => {
      const request = createAuthenticatedRequest('GET', '/api/sync');
      const response = await getSyncStatus(request, { user: testUser });
      const data = await getResponseJson(response);

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('MISSING_JOB_ID');
    });

    it('should handle job not found', async () => {
      mockSyncService.getSyncJobStatus.mockReturnValue(null);

      const request = createAuthenticatedRequest(
        'GET',
        '/api/sync?jobId=non-existent'
      );
      const response = await getSyncStatus(request, { user: testUser });
      const data = await getResponseJson(response);

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('JOB_NOT_FOUND');
    });

    it('should prevent access to other users jobs', async () => {
      const otherUserJob = {
        ...mockSyncJob,
        userId: 'other-user-456'
      };

      mockSyncService.getSyncJobStatus.mockReturnValue(otherUserJob);

      const request = createAuthenticatedRequest(
        'GET',
        '/api/sync?jobId=sync-job-123'
      );
      const response = await getSyncStatus(request, { user: testUser });
      const data = await getResponseJson(response);

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('ACCESS_DENIED');
    });
  });
}); 