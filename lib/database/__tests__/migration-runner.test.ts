// Migration Runner Tests
// Tests for database migration functionality

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MigrationRunner, runMigrations, getMigrationStatus, validateDatabaseSchema } from '../migration-runner';
import { getNileClient } from '../nile-client';

// Mock the file system operations
const mockReadFileSync = vi.fn();
const mockReaddirSync = vi.fn();

vi.mock('fs', () => ({
  readFileSync: mockReadFileSync,
  readdirSync: mockReaddirSync,
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

describe('MigrationRunner', () => {
  let migrationRunner: MigrationRunner;

  beforeEach(() => {
    vi.clearAllMocks();
    migrationRunner = new MigrationRunner('/test/migrations');
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('initializeMigrationsTable', () => {
    it('should create migrations table successfully', async () => {
      mockClient.query.mockResolvedValueOnce([]);

      await migrationRunner.initializeMigrationsTable();

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS schema_migrations')
      );
    });

    it('should handle database errors', async () => {
      const error = new Error('Database connection failed');
      mockClient.query.mockRejectedValueOnce(error);

      await expect(migrationRunner.initializeMigrationsTable()).rejects.toThrow(
        'Database connection failed'
      );
    });
  });

  describe('getExecutedMigrations', () => {
    it('should return list of executed migrations', async () => {
      const mockMigrations = [
        { name: '001_create_tables.sql', executed_at: new Date(), execution_time_ms: 100 },
        { name: '002_add_indexes.sql', executed_at: new Date(), execution_time_ms: 50 },
      ];
      mockClient.query.mockResolvedValueOnce(mockMigrations);

      const result = await migrationRunner.getExecutedMigrations();

      expect(result).toEqual(mockMigrations);
      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT name, executed_at, execution_time_ms FROM schema_migrations ORDER BY executed_at ASC'
      );
    });
  });

  describe('getAvailableMigrations', () => {
    it('should return sorted list of SQL files', () => {
      mockReaddirSync.mockReturnValueOnce([
        '002_add_indexes.sql',
        '001_create_tables.sql',
        'readme.txt',
        '003_seed_data.sql',
      ] as any);

      const result = migrationRunner.getAvailableMigrations();

      expect(result).toEqual([
        '001_create_tables.sql',
        '002_add_indexes.sql',
        '003_seed_data.sql',
      ]);
    });

    it('should handle directory read errors', () => {
      mockReaddirSync.mockImplementationOnce(() => {
        throw new Error('Directory not found');
      });

      expect(() => migrationRunner.getAvailableMigrations()).toThrow('Directory not found');
    });
  });

  describe('getPendingMigrations', () => {
    it('should return migrations not yet executed', async () => {
      mockReaddirSync.mockReturnValueOnce([
        '001_create_tables.sql',
        '002_add_indexes.sql',
        '003_seed_data.sql',
      ] as any);

      mockClient.query.mockResolvedValueOnce([
        { name: '001_create_tables.sql', executed_at: new Date(), execution_time_ms: 100 },
      ]);

      const result = await migrationRunner.getPendingMigrations();

      expect(result).toEqual(['002_add_indexes.sql', '003_seed_data.sql']);
    });
  });

  describe('executeMigration', () => {
    it('should execute migration successfully', async () => {
      const migrationSQL = 'CREATE TABLE test (id SERIAL PRIMARY KEY);';
      mockReadFileSync.mockReturnValueOnce(migrationSQL);
      
      mockClient.transaction.mockImplementationOnce(async (callback) => {
        const transactionClient = {
          query: vi.fn().mockResolvedValue([]),
        };
        return callback(transactionClient);
      });

      const result = await migrationRunner.executeMigration('001_create_tables.sql');

      expect(result.success).toBe(true);
      expect(result.migrationName).toBe('001_create_tables.sql');
      expect(result.executionTime).toBeGreaterThan(0);
    });

    it('should handle migration execution errors', async () => {
      const migrationSQL = 'INVALID SQL;';
      mockReadFileSync.mockReturnValueOnce(migrationSQL);
      
      const error = new Error('SQL syntax error');
      mockClient.transaction.mockRejectedValueOnce(error);

      const result = await migrationRunner.executeMigration('001_invalid.sql');

      expect(result.success).toBe(false);
      expect(result.error).toBe('SQL syntax error');
    });

    it('should handle file read errors', async () => {
      mockReadFileSync.mockImplementationOnce(() => {
        throw new Error('File not found');
      });

      const result = await migrationRunner.executeMigration('nonexistent.sql');

      expect(result.success).toBe(false);
      expect(result.error).toBe('File not found');
    });
  });

  describe('runPendingMigrations', () => {
    it('should run all pending migrations', async () => {
      // Mock available migrations
      vi.mocked(readdirSync).mockReturnValueOnce([
        '001_create_tables.sql',
        '002_add_indexes.sql',
      ] as any);

      // Mock no executed migrations
      mockClient.query.mockResolvedValueOnce([]);

      // Mock successful migration execution
      vi.mocked(readFileSync).mockReturnValue('CREATE TABLE test (id SERIAL);');
      mockClient.transaction.mockImplementation(async (callback) => {
        const transactionClient = {
          query: vi.fn().mockResolvedValue([]),
        };
        return callback(transactionClient);
      });

      const results = await migrationRunner.runPendingMigrations();

      expect(results).toHaveLength(2);
      expect(results.every(r => r.success)).toBe(true);
    });

    it('should stop on first migration failure', async () => {
      vi.mocked(readdirSync).mockReturnValueOnce([
        '001_create_tables.sql',
        '002_add_indexes.sql',
      ] as any);

      mockClient.query.mockResolvedValueOnce([]);

      // First migration succeeds, second fails
      vi.mocked(readFileSync).mockReturnValue('CREATE TABLE test (id SERIAL);');
      mockClient.transaction
        .mockResolvedValueOnce(undefined) // First migration succeeds
        .mockRejectedValueOnce(new Error('Second migration fails')); // Second fails

      const results = await migrationRunner.runPendingMigrations();

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
    });
  });

  describe('validateSchema', () => {
    it('should validate schema successfully', async () => {
      // Mock table existence checks
      mockClient.queryOne
        .mockResolvedValueOnce({ exists: true }) // plaid_connections
        .mockResolvedValueOnce({ exists: true }) // accounts
        .mockResolvedValueOnce({ exists: true }) // transactions
        .mockResolvedValueOnce({ exists: true }) // schema_migrations
        .mockResolvedValueOnce({ exists: true }) // idx_plaid_connections_user_id
        .mockResolvedValueOnce({ exists: true }) // idx_accounts_user_id
        .mockResolvedValueOnce({ exists: true }) // idx_transactions_user_id
        .mockResolvedValueOnce({ exists: true }); // idx_transactions_user_date

      const result = await migrationRunner.validateSchema();

      expect(result.valid).toBe(true);
      expect(result.missingTables).toHaveLength(0);
      expect(result.missingIndexes).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing tables and indexes', async () => {
      // Mock missing table and index
      mockClient.queryOne
        .mockResolvedValueOnce({ exists: true }) // plaid_connections
        .mockResolvedValueOnce({ exists: false }) // accounts (missing)
        .mockResolvedValueOnce({ exists: true }) // transactions
        .mockResolvedValueOnce({ exists: true }) // schema_migrations
        .mockResolvedValueOnce({ exists: true }) // idx_plaid_connections_user_id
        .mockResolvedValueOnce({ exists: false }) // idx_accounts_user_id (missing)
        .mockResolvedValueOnce({ exists: true }) // idx_transactions_user_id
        .mockResolvedValueOnce({ exists: true }); // idx_transactions_user_date

      const result = await migrationRunner.validateSchema();

      expect(result.valid).toBe(false);
      expect(result.missingTables).toContain('accounts');
      expect(result.missingIndexes).toContain('idx_accounts_user_id');
    });
  });
});

describe('Convenience Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('runMigrations', () => {
    it('should create runner and run migrations', async () => {
      vi.mocked(readdirSync).mockReturnValueOnce(['001_test.sql'] as any);
      mockClient.query.mockResolvedValue([]);
      vi.mocked(readFileSync).mockReturnValue('CREATE TABLE test (id SERIAL);');
      mockClient.transaction.mockResolvedValue(undefined);

      const results = await runMigrations('/test/path');

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
    });
  });

  describe('getMigrationStatus', () => {
    it('should return migration status', async () => {
      vi.mocked(readdirSync).mockReturnValueOnce(['001_test.sql', '002_test.sql'] as any);
      mockClient.query.mockResolvedValueOnce([
        { name: '001_test.sql', executed_at: new Date(), execution_time_ms: 100 },
      ]);

      const status = await getMigrationStatus('/test/path');

      expect(status.total).toBe(2);
      expect(status.executed).toHaveLength(1);
      expect(status.pending).toHaveLength(1);
    });
  });

  describe('validateDatabaseSchema', () => {
    it('should validate database schema', async () => {
      mockClient.queryOne.mockResolvedValue({ exists: true });

      const result = await validateDatabaseSchema('/test/path');

      expect(result.valid).toBe(true);
    });
  });
});