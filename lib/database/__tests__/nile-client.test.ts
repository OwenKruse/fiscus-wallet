// Unit tests for Nile DB Client

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import { Pool } from 'pg';
import { _NileDBClient as NileDBClient } from '../nile-client';

// Mock pg module
vi.mock('pg', () => ({
  Pool: vi.fn().mockImplementation(() => ({
    connect: vi.fn(),
    end: vi.fn(),
    query: vi.fn(),
    on: vi.fn(),
    totalCount: 10,
    idleCount: 5,
    waitingCount: 0,
  })),
}));

// Mock config
vi.mock('../../config', () => ({
  getNileConfig: vi.fn(() => ({
    url: 'postgres://test:test@localhost:5432/test_db',
    apiUrl: 'https://test.api.thenile.dev/v2/databases/test',
    user: 'test_user',
    password: 'test_password',
    database: 'test_db',
  })),
}));

describe('NileDBClient', () => {
  let client: NileDBClient;
  let mockPool: any;
  let mockPoolClient: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Setup mock pool client
    mockPoolClient = {
      query: vi.fn(),
      release: vi.fn(),
    };

    // Setup mock pool
    mockPool = {
      connect: vi.fn().mockResolvedValue(mockPoolClient),
      end: vi.fn().mockResolvedValue(undefined),
      query: vi.fn(),
      on: vi.fn(),
      totalCount: 10,
      idleCount: 5,
      waitingCount: 0,
    };

    // Mock Pool constructor to return our mock
    (Pool as any).mockImplementation(() => mockPool);

    // Create client instance
    client = new NileDBClient({
      maxConnections: 5,
      connectionTimeoutMillis: 5000,
      maxRetries: 2,
      retryDelayMs: 100,
      healthCheckIntervalMs: 0, // Disable for tests
    });
  });

  afterEach(async () => {
    await client.close();
  });

  describe('constructor', () => {
    it('should create a client with default options', () => {
      const defaultClient = new NileDBClient();
      expect(defaultClient).toBeInstanceOf(NileDBClient);
    });

    it('should create a client with custom options', () => {
      const customClient = new NileDBClient({
        maxConnections: 15,
        connectionTimeoutMillis: 10000,
      });
      expect(customClient).toBeInstanceOf(NileDBClient);
    });

    it('should setup pool event handlers', () => {
      expect(mockPool.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockPool.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockPool.on).toHaveBeenCalledWith('remove', expect.any(Function));
    });
  });

  describe('query', () => {
    it('should execute a query successfully', async () => {
      const mockResult = { rows: [{ id: 1, name: 'test' }] };
      mockPoolClient.query.mockResolvedValue(mockResult);

      const result = await client.query('SELECT * FROM users', ['param1']);

      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockPoolClient.query).toHaveBeenCalledWith('SELECT * FROM users', ['param1']);
      expect(mockPoolClient.release).toHaveBeenCalled();
      expect(result).toEqual(mockResult.rows);
    });

    it('should handle query errors', async () => {
      const error = new Error('Database connection failed');
      mockPoolClient.query.mockRejectedValue(error);

      await expect(client.query('SELECT * FROM users')).rejects.toThrow('Database connection failed');
      expect(mockPoolClient.release).toHaveBeenCalled();
    });

    it('should retry on retryable errors', async () => {
      const retryableError = new Error('connection terminated');
      retryableError.code = 'ECONNRESET';
      
      mockPoolClient.query
        .mockRejectedValueOnce(retryableError)
        .mockResolvedValue({ rows: [{ id: 1 }] });

      const result = await client.query('SELECT * FROM users');

      expect(mockPoolClient.query).toHaveBeenCalledTimes(2);
      expect(result).toEqual([{ id: 1 }]);
    });

    it('should not retry on non-retryable errors', async () => {
      const nonRetryableError = new Error('Syntax error');
      mockPoolClient.query.mockRejectedValue(nonRetryableError);

      await expect(client.query('INVALID SQL')).rejects.toThrow('Syntax error');
      expect(mockPoolClient.query).toHaveBeenCalledTimes(1);
    });

    it('should stop retrying after max attempts', async () => {
      const retryableError = new Error('connection terminated');
      retryableError.code = 'ECONNRESET';
      
      mockPoolClient.query.mockRejectedValue(retryableError);

      await expect(client.query('SELECT * FROM users')).rejects.toThrow('connection terminated');
      expect(mockPoolClient.query).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });

  describe('queryOne', () => {
    it('should return first row when results exist', async () => {
      const mockResult = { rows: [{ id: 1, name: 'test' }, { id: 2, name: 'test2' }] };
      mockPoolClient.query.mockResolvedValue(mockResult);

      const result = await client.queryOne('SELECT * FROM users LIMIT 1');

      expect(result).toEqual({ id: 1, name: 'test' });
    });

    it('should return null when no results exist', async () => {
      const mockResult = { rows: [] };
      mockPoolClient.query.mockResolvedValue(mockResult);

      const result = await client.queryOne('SELECT * FROM users WHERE id = 999');

      expect(result).toBeNull();
    });
  });

  describe('transaction', () => {
    it('should execute transaction successfully', async () => {
      mockPoolClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // User query
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const result = await client.transaction(async (transactionClient) => {
        const queryResult = await transactionClient.query('INSERT INTO users (name) VALUES ($1)', ['test']);
        return queryResult;
      });

      expect(mockPoolClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockPoolClient.query).toHaveBeenCalledWith('INSERT INTO users (name) VALUES ($1)', ['test']);
      expect(mockPoolClient.query).toHaveBeenCalledWith('COMMIT');
      expect(result).toEqual([{ id: 1 }]);
    });

    it('should rollback transaction on error', async () => {
      const error = new Error('Transaction failed');
      mockPoolClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockRejectedValueOnce(error) // User query fails
        .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      await expect(client.transaction(async (transactionClient) => {
        await transactionClient.query('INVALID SQL');
      })).rejects.toThrow('Transaction failed');

      expect(mockPoolClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockPoolClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should not allow nested transactions', async () => {
      mockPoolClient.query.mockResolvedValue({ rows: [] });

      await expect(client.transaction(async (transactionClient) => {
        await transactionClient.transaction(async () => {
          return 'nested';
        });
      })).rejects.toThrow('Nested transactions are not supported');
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when database is accessible', async () => {
      mockPoolClient.query.mockResolvedValue({ rows: [{ health_check: 1 }] });

      const healthCheck = await client.healthCheck();

      expect(healthCheck.status).toBe('healthy');
      expect(healthCheck.services.database).toBe('healthy');
      expect(healthCheck.timestamp).toBeInstanceOf(Date);
      expect(healthCheck.metrics).toBeDefined();
      expect(healthCheck.metrics!.responseTime).toBeGreaterThanOrEqual(0);
    });

    it('should return unhealthy status when database is not accessible', async () => {
      mockPoolClient.query.mockRejectedValue(new Error('Connection failed'));

      const healthCheck = await client.healthCheck();

      expect(healthCheck.status).toBe('unhealthy');
      expect(healthCheck.services.database).toBe('unhealthy');
    });

    it('should return degraded status when too many connections are waiting', async () => {
      mockPool.waitingCount = 10; // High waiting count
      mockPoolClient.query.mockResolvedValue({ rows: [{ health_check: 1 }] });

      const healthCheck = await client.healthCheck();

      expect(healthCheck.status).toBe('degraded');
    });
  });

  describe('testConnection', () => {
    it('should return true when connection is successful', async () => {
      const result = await client.testConnection();
      expect(result).toBe(true);
      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockPoolClient.release).toHaveBeenCalled();
    });

    it('should return false when connection fails', async () => {
      mockPool.connect.mockRejectedValue(new Error('Connection failed'));

      const result = await client.testConnection();
      expect(result).toBe(false);
    });
  });

  describe('getPoolInfo', () => {
    it('should return pool information', () => {
      const poolInfo = client.getPoolInfo();

      expect(poolInfo).toEqual({
        totalCount: 10,
        idleCount: 5,
        waitingCount: 0,
        maxConnections: 5,
      });
    });
  });

  describe('close', () => {
    it('should close the pool', async () => {
      await client.close();
      expect(mockPool.end).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should identify retryable errors correctly', () => {
      const retryableCodes = ['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND'];
      
      retryableCodes.forEach(code => {
        const error = new Error('Test error');
        error.code = code;
        expect((client as any).isRetryableError(error)).toBe(true);
      });
    });

    it('should identify retryable error messages correctly', () => {
      const retryableMessages = [
        'connection terminated',
        'server closed the connection',
        'timeout occurred',
        'connection refused',
      ];
      
      retryableMessages.forEach(message => {
        const error = new Error(message);
        expect((client as any).isRetryableError(error)).toBe(true);
      });
    });

    it('should not identify non-retryable errors as retryable', () => {
      const nonRetryableError = new Error('Syntax error');
      expect((client as any).isRetryableError(nonRetryableError)).toBe(false);
    });
  });
});