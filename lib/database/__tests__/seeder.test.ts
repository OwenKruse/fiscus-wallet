// Database Seeder Tests
// Tests for database seeding functionality

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DatabaseSeeder, runSeeds, runDevelopmentSeeds, clearTestData, verifySeedData } from '../seeder';

// Mock the file system operations
vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  readdirSync: vi.fn(),
}));

vi.mock('path', () => ({
  join: vi.fn((...args) => args.join('/')),
}));

// Mock the database client
const mockClient = {
  query: vi.fn(),
  queryOne: vi.fn(),
  transaction: vi.fn(),
  close: vi.fn(),
};

vi.mock('../nile-client', () => ({
  getNileClient: vi.fn(() => mockClient),
}));

describe('DatabaseSeeder', () => {
  let seeder: DatabaseSeeder;

  beforeEach(() => {
    vi.clearAllMocks();
    seeder = new DatabaseSeeder('/test/seeds');
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getAvailableSeeds', () => {
    it('should return sorted list of SQL files', () => {
      vi.mocked(readdirSync).mockReturnValueOnce([
        'test.sql',
        'development.sql',
        'readme.txt',
        'production.sql',
      ] as any);

      const result = seeder.getAvailableSeeds();

      expect(result).toEqual([
        'development.sql',
        'production.sql',
        'test.sql',
      ]);
    });

    it('should handle directory read errors', () => {
      vi.mocked(readdirSync).mockImplementationOnce(() => {
        throw new Error('Directory not found');
      });

      expect(() => seeder.getAvailableSeeds()).toThrow('Directory not found');
    });
  });

  describe('executeSeed', () => {
    it('should execute seed successfully', async () => {
      const seedSQL = `
        INSERT INTO plaid_connections (user_id, item_id, access_token, institution_id, institution_name)
        VALUES ('test-user', 'test-item', 'test-token', 'test-inst', 'Test Bank');
        
        INSERT INTO accounts (user_id, plaid_account_id, connection_id, name, type, subtype, balance_current)
        VALUES ('test-user', 'test-account', 'test-connection', 'Test Account', 'depository', 'checking', 1000.00);
      `;
      
      vi.mocked(readFileSync).mockReturnValueOnce(seedSQL);
      
      mockClient.transaction.mockImplementationOnce(async (callback) => {
        const transactionClient = {
          query: vi.fn().mockResolvedValue([]),
        };
        return callback(transactionClient);
      });

      const result = await seeder.executeSeed('development.sql');

      expect(result.success).toBe(true);
      expect(result.seedName).toBe('development.sql');
      expect(result.executionTime).toBeGreaterThan(0);
    });

    it('should handle seed execution errors', async () => {
      const seedSQL = 'INVALID SQL STATEMENT;';
      vi.mocked(readFileSync).mockReturnValueOnce(seedSQL);
      
      const error = new Error('SQL syntax error');
      mockClient.transaction.mockRejectedValueOnce(error);

      const result = await seeder.executeSeed('invalid.sql');

      expect(result.success).toBe(false);
      expect(result.error).toBe('SQL syntax error');
    });

    it('should handle file read errors', async () => {
      vi.mocked(readFileSync).mockImplementationOnce(() => {
        throw new Error('File not found');
      });

      const result = await seeder.executeSeed('nonexistent.sql');

      expect(result.success).toBe(false);
      expect(result.error).toBe('File not found');
    });

    it('should split and execute multiple SQL statements', async () => {
      const seedSQL = `
        INSERT INTO table1 VALUES (1);
        INSERT INTO table2 VALUES (2);
        -- This is a comment
        INSERT INTO table3 VALUES (3);
      `;
      
      vi.mocked(readFileSync).mockReturnValueOnce(seedSQL);
      
      const mockTransactionClient = {
        query: vi.fn().mockResolvedValue([]),
      };
      
      mockClient.transaction.mockImplementationOnce(async (callback) => {
        return callback(mockTransactionClient);
      });

      const result = await seeder.executeSeed('multi-statement.sql');

      expect(result.success).toBe(true);
      expect(mockTransactionClient.query).toHaveBeenCalledTimes(3); // 3 INSERT statements
    });
  });

  describe('runAllSeeds', () => {
    it('should run all available seeds', async () => {
      vi.mocked(readdirSync).mockReturnValueOnce([
        'development.sql',
        'test.sql',
      ] as any);

      vi.mocked(readFileSync).mockReturnValue('INSERT INTO test VALUES (1);');
      
      mockClient.transaction.mockImplementation(async (callback) => {
        const transactionClient = {
          query: vi.fn().mockResolvedValue([]),
        };
        return callback(transactionClient);
      });

      const results = await seeder.runAllSeeds();

      expect(results).toHaveLength(2);
      expect(results.every(r => r.success)).toBe(true);
    });

    it('should continue on seed failure', async () => {
      vi.mocked(readdirSync).mockReturnValueOnce([
        'development.sql',
        'test.sql',
      ] as any);

      vi.mocked(readFileSync).mockReturnValue('INSERT INTO test VALUES (1);');
      
      // First seed fails, second succeeds
      mockClient.transaction
        .mockRejectedValueOnce(new Error('First seed fails'))
        .mockImplementationOnce(async (callback) => {
          const transactionClient = {
            query: vi.fn().mockResolvedValue([]),
          };
          return callback(transactionClient);
        });

      const results = await seeder.runAllSeeds();

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(false);
      expect(results[1].success).toBe(true);
    });
  });

  describe('runDevelopmentSeeds', () => {
    it('should run only development seeds', async () => {
      vi.mocked(readdirSync).mockReturnValueOnce([
        'development.sql',
        'dev-users.sql',
        'production.sql',
        'test.sql',
      ] as any);

      vi.mocked(readFileSync).mockReturnValue('INSERT INTO test VALUES (1);');
      
      mockClient.transaction.mockImplementation(async (callback) => {
        const transactionClient = {
          query: vi.fn().mockResolvedValue([]),
        };
        return callback(transactionClient);
      });

      const results = await seeder.runDevelopmentSeeds();

      expect(results).toHaveLength(2); // Only development.sql and dev-users.sql
      expect(results.every(r => r.success)).toBe(true);
    });
  });

  describe('runTestSeeds', () => {
    it('should run only test seeds', async () => {
      vi.mocked(readdirSync).mockReturnValueOnce([
        'development.sql',
        'test.sql',
        'test-users.sql',
        'production.sql',
      ] as any);

      vi.mocked(readFileSync).mockReturnValue('INSERT INTO test VALUES (1);');
      
      mockClient.transaction.mockImplementation(async (callback) => {
        const transactionClient = {
          query: vi.fn().mockResolvedValue([]),
        };
        return callback(transactionClient);
      });

      const results = await seeder.runTestSeeds();

      expect(results).toHaveLength(2); // Only test.sql and test-users.sql
      expect(results.every(r => r.success)).toBe(true);
    });
  });

  describe('clearTestData', () => {
    it('should clear test data successfully', async () => {
      mockClient.transaction.mockImplementationOnce(async (callback) => {
        const transactionClient = {
          query: vi.fn().mockResolvedValue([]),
        };
        return callback(transactionClient);
      });

      await expect(seeder.clearTestData()).resolves.not.toThrow();
    });

    it('should handle clear data errors', async () => {
      const error = new Error('Failed to delete data');
      mockClient.transaction.mockRejectedValueOnce(error);

      await expect(seeder.clearTestData()).rejects.toThrow('Failed to delete data');
    });
  });

  describe('verifySeedData', () => {
    it('should verify seed data successfully', async () => {
      mockClient.queryOne
        .mockResolvedValueOnce({ count: '2' }) // connections
        .mockResolvedValueOnce({ count: '3' }) // accounts
        .mockResolvedValueOnce({ count: '10' }); // transactions

      const result = await seeder.verifySeedData();

      expect(result.valid).toBe(true);
      expect(result.connections).toBe(2);
      expect(result.accounts).toBe(3);
      expect(result.transactions).toBe(10);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid seed data', async () => {
      mockClient.queryOne
        .mockResolvedValueOnce({ count: '1' }) // connections
        .mockResolvedValueOnce({ count: '0' }) // accounts (should have accounts if connections exist)
        .mockResolvedValueOnce({ count: '0' }); // transactions

      const result = await seeder.verifySeedData();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Found connections but no accounts');
    });

    it('should handle verification errors', async () => {
      const error = new Error('Database query failed');
      mockClient.queryOne.mockRejectedValueOnce(error);

      const result = await seeder.verifySeedData();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Database query failed');
    });
  });
});

describe('Convenience Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('runSeeds', () => {
    it('should create seeder and run all seeds', async () => {
      vi.mocked(readdirSync).mockReturnValueOnce(['test.sql'] as any);
      vi.mocked(readFileSync).mockReturnValue('INSERT INTO test VALUES (1);');
      mockClient.transaction.mockResolvedValue(undefined);

      const results = await runSeeds('/test/path');

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
    });
  });

  describe('runDevelopmentSeeds', () => {
    it('should create seeder and run development seeds', async () => {
      vi.mocked(readdirSync).mockReturnValueOnce(['development.sql'] as any);
      vi.mocked(readFileSync).mockReturnValue('INSERT INTO test VALUES (1);');
      mockClient.transaction.mockResolvedValue(undefined);

      const results = await runDevelopmentSeeds('/test/path');

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
    });
  });

  describe('clearTestData', () => {
    it('should create seeder and clear test data', async () => {
      mockClient.transaction.mockResolvedValue(undefined);

      await expect(clearTestData('/test/path')).resolves.not.toThrow();
    });
  });

  describe('verifySeedData', () => {
    it('should create seeder and verify seed data', async () => {
      mockClient.queryOne
        .mockResolvedValueOnce({ count: '1' })
        .mockResolvedValueOnce({ count: '1' })
        .mockResolvedValueOnce({ count: '1' });

      const result = await verifySeedData('/test/path');

      expect(result.valid).toBe(true);
    });
  });
});