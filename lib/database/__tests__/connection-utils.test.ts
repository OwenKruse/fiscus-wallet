// Unit tests for Database Connection Utilities

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { _DatabaseConnectionUtils as DatabaseConnectionUtils } from '../connection-utils';
import { NileClient } from '../../../types/nile';

// Mock the nile-client module
const mockNileClient = {
  query: vi.fn(),
  queryOne: vi.fn(),
  transaction: vi.fn(),
  close: vi.fn(),
  healthCheck: vi.fn(),
  getPoolInfo: vi.fn(),
};

vi.mock('../nile-client', () => ({
  getNileClient: vi.fn(() => mockNileClient),
  closeNileClient: vi.fn(),
}));

describe('DatabaseConnectionUtils', () => {
  let utils: DatabaseConnectionUtils;

  beforeEach(() => {
    vi.clearAllMocks();
    utils = new DatabaseConnectionUtils({
      enableLogging: false, // Disable logging for tests
    });
  });

  afterEach(async () => {
    await utils.close();
  });

  describe('executeQuery', () => {
    it('should execute query successfully', async () => {
      const mockResult = [{ id: 1, name: 'test' }];
      mockNileClient.query.mockResolvedValue(mockResult);

      const result = await utils.executeQuery('SELECT * FROM users', ['param1'], 'test-context');

      expect(mockNileClient.query).toHaveBeenCalledWith('SELECT * FROM users', ['param1']);
      expect(result).toEqual(mockResult);
    });

    it('should handle query errors with context', async () => {
      const error = new Error('Database error');
      mockNileClient.query.mockRejectedValue(error);

      await expect(
        utils.executeQuery('INVALID SQL', [], 'test-context')
      ).rejects.toThrow("Database query failed in context 'test-context': Database error");
    });

    it('should use default context when none provided', async () => {
      const error = new Error('Database error');
      mockNileClient.query.mockRejectedValue(error);

      await expect(
        utils.executeQuery('INVALID SQL')
      ).rejects.toThrow("Database query failed in context 'unknown': Database error");
    });
  });

  describe('executeQueryOne', () => {
    it('should execute single-row query successfully', async () => {
      const mockResult = { id: 1, name: 'test' };
      mockNileClient.queryOne.mockResolvedValue(mockResult);

      const result = await utils.executeQueryOne('SELECT * FROM users WHERE id = $1', [1], 'test-context');

      expect(mockNileClient.queryOne).toHaveBeenCalledWith('SELECT * FROM users WHERE id = $1', [1]);
      expect(result).toEqual(mockResult);
    });

    it('should return null when no results found', async () => {
      mockNileClient.queryOne.mockResolvedValue(null);

      const result = await utils.executeQueryOne('SELECT * FROM users WHERE id = $1', [999]);

      expect(result).toBeNull();
    });

    it('should handle single-row query errors with context', async () => {
      const error = new Error('Database error');
      mockNileClient.queryOne.mockRejectedValue(error);

      await expect(
        utils.executeQueryOne('INVALID SQL', [], 'test-context')
      ).rejects.toThrow("Database single-row query failed in context 'test-context': Database error");
    });
  });

  describe('executeTransaction', () => {
    it('should execute transaction successfully', async () => {
      const mockResult = { success: true };
      mockNileClient.transaction.mockResolvedValue(mockResult);

      const result = await utils.executeTransaction(async (client) => {
        await client.query('INSERT INTO users (name) VALUES ($1)', ['test']);
        return mockResult;
      }, 'test-transaction');

      expect(mockNileClient.transaction).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });

    it('should handle transaction errors with context', async () => {
      const error = new Error('Transaction failed');
      mockNileClient.transaction.mockRejectedValue(error);

      await expect(
        utils.executeTransaction(async () => {
          throw error;
        }, 'test-transaction')
      ).rejects.toThrow("Database transaction failed in context 'test-transaction': Transaction failed");
    });
  });

  describe('testConnection', () => {
    it('should return true when connection test passes', async () => {
      mockNileClient.query.mockResolvedValue([{ test: 1 }]);

      const result = await utils.testConnection();

      expect(result).toBe(true);
      expect(mockNileClient.query).toHaveBeenCalledWith('SELECT 1 as test', []);
    });

    it('should return false when connection test fails', async () => {
      mockNileClient.query.mockRejectedValue(new Error('Connection failed'));

      const result = await utils.testConnection();

      expect(result).toBe(false);
    });

    it('should return false when query returns unexpected result', async () => {
      mockNileClient.query.mockResolvedValue([]);

      const result = await utils.testConnection();

      expect(result).toBe(false);
    });
  });

  describe('performHealthCheck', () => {
    it('should return health check from client', async () => {
      const mockHealthCheck = {
        status: 'healthy' as const,
        timestamp: new Date(),
        services: {
          database: 'healthy' as const,
          plaid: 'healthy' as const,
          cache: 'healthy' as const,
        },
      };
      mockNileClient.healthCheck.mockResolvedValue(mockHealthCheck);

      const result = await utils.performHealthCheck();

      expect(result).toEqual(mockHealthCheck);
    });

    it('should return unhealthy status when health check fails', async () => {
      mockNileClient.healthCheck.mockRejectedValue(new Error('Health check failed'));

      const result = await utils.performHealthCheck();

      expect(result.status).toBe('unhealthy');
      expect(result.services.database).toBe('unhealthy');
    });

    it('should handle missing health check method', async () => {
      const clientWithoutHealthCheck = { ...mockNileClient };
      delete (clientWithoutHealthCheck as any).healthCheck;

      const utilsWithoutHealthCheck = new DatabaseConnectionUtils({ enableLogging: false });
      (utilsWithoutHealthCheck as any).client = clientWithoutHealthCheck;

      const result = await utilsWithoutHealthCheck.performHealthCheck();

      expect(result.status).toBe('unknown');
    });
  });

  describe('getConnectionInfo', () => {
    it('should return connection pool information', () => {
      const mockPoolInfo = {
        totalCount: 10,
        idleCount: 5,
        waitingCount: 0,
        maxConnections: 20,
      };
      mockNileClient.getPoolInfo.mockReturnValue(mockPoolInfo);

      const result = utils.getConnectionInfo();

      expect(result).toEqual(mockPoolInfo);
    });

    it('should handle missing getPoolInfo method', () => {
      const clientWithoutPoolInfo = { ...mockNileClient };
      delete (clientWithoutPoolInfo as any).getPoolInfo;

      const utilsWithoutPoolInfo = new DatabaseConnectionUtils({ enableLogging: false });
      (utilsWithoutPoolInfo as any).client = clientWithoutPoolInfo;

      const result = utilsWithoutPoolInfo.getConnectionInfo();

      expect(result.status).toBe('unknown');
      expect(result.message).toBe('Pool information not available');
    });

    it('should handle errors when getting connection info', () => {
      mockNileClient.getPoolInfo.mockImplementation(() => {
        throw new Error('Pool info error');
      });

      const result = utils.getConnectionInfo();

      expect(result.status).toBe('error');
      expect(result.message).toBe('Failed to retrieve connection information');
    });
  });

  describe('executeQueryWithPagination', () => {
    it('should execute paginated query successfully', async () => {
      const mockCountResult = { total: '25' };
      const mockDataResult = [
        { id: 1, name: 'user1' },
        { id: 2, name: 'user2' },
      ];

      mockNileClient.queryOne.mockResolvedValue(mockCountResult);
      mockNileClient.query.mockResolvedValue(mockDataResult);

      const result = await utils.executeQueryWithPagination(
        'SELECT * FROM users',
        [],
        2, // page
        10, // limit
        'pagination-test'
      );

      expect(result.data).toEqual(mockDataResult);
      expect(result.total).toBe(25);
      expect(result.hasMore).toBe(true);

      // Check count query
      expect(mockNileClient.queryOne).toHaveBeenCalledWith(
        'SELECT COUNT(*) as total FROM (SELECT * FROM users) as count_query',
        []
      );

      // Check data query with pagination
      expect(mockNileClient.query).toHaveBeenCalledWith(
        'SELECT * FROM users LIMIT $1 OFFSET $2',
        [10, 10] // limit, offset
      );
    });

    it('should handle pagination with no more results', async () => {
      const mockCountResult = { total: '12' };
      const mockDataResult = [
        { id: 11, name: 'user11' },
        { id: 12, name: 'user12' },
      ];

      mockNileClient.queryOne.mockResolvedValue(mockCountResult);
      mockNileClient.query.mockResolvedValue(mockDataResult);

      const result = await utils.executeQueryWithPagination(
        'SELECT * FROM users',
        [],
        2, // page
        10, // limit
      );

      // With total=12, page=2, limit=10: offset=10, returned 2 items
      // offset + returned (10 + 2 = 12) < total (12) = false, so hasMore should be false
      expect(result.hasMore).toBe(false);
    });

    it('should handle pagination errors', async () => {
      mockNileClient.queryOne.mockRejectedValue(new Error('Count query failed'));

      await expect(
        utils.executeQueryWithPagination('SELECT * FROM users')
      ).rejects.toThrow('Count query failed');
    });
  });

  describe('executeBatch', () => {
    it('should execute batch queries in transaction', async () => {
      const mockResults = [
        [{ id: 1 }],
        [{ id: 2 }],
      ];

      mockNileClient.transaction.mockImplementation(async (callback) => {
        const mockTransactionClient = {
          query: vi.fn()
            .mockResolvedValueOnce(mockResults[0])
            .mockResolvedValueOnce(mockResults[1]),
        };
        return await callback(mockTransactionClient as any);
      });

      const queries = [
        { sql: 'INSERT INTO users (name) VALUES ($1)', params: ['user1'], context: 'insert-user1' },
        { sql: 'INSERT INTO users (name) VALUES ($1)', params: ['user2'], context: 'insert-user2' },
      ];

      const results = await utils.executeBatch(queries, 'batch-test');

      expect(results).toEqual(mockResults);
      expect(mockNileClient.transaction).toHaveBeenCalled();
    });

    it('should handle batch execution errors', async () => {
      mockNileClient.transaction.mockRejectedValue(new Error('Batch failed'));

      const queries = [
        { sql: 'INSERT INTO users (name) VALUES ($1)', params: ['user1'] },
      ];

      await expect(
        utils.executeBatch(queries, 'batch-test')
      ).rejects.toThrow("Database transaction failed in context 'batch-test': Batch failed");
    });
  });

  describe('logging', () => {
    it('should log when logging is enabled', async () => {
      const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
      
      const loggingUtils = new DatabaseConnectionUtils({
        enableLogging: true,
        logLevel: 'debug',
      });

      mockNileClient.query.mockResolvedValue([{ id: 1 }]);

      await loggingUtils.executeQuery('SELECT * FROM users', [], 'test-context');

      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
      await loggingUtils.close();
    });

    it('should not log when logging is disabled', async () => {
      const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
      
      mockNileClient.query.mockResolvedValue([{ id: 1 }]);

      await utils.executeQuery('SELECT * FROM users', [], 'test-context');

      expect(consoleSpy).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });
});