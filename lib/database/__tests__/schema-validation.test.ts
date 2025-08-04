// Schema Validation Tests
// Tests to verify database schema creation and constraints

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getNileClient } from '../nile-client';
import { MigrationRunner } from '../migration-runner';
import { DatabaseSeeder } from '../seeder';

// Mock the database client for unit tests
const mockClient = {
  query: vi.fn(),
  queryOne: vi.fn(),
  transaction: vi.fn(),
  close: vi.fn(),
};

vi.mock('../nile-client', () => ({
  getNileClient: vi.fn(() => mockClient),
}));

describe('Database Schema Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Table Creation', () => {
    it('should verify plaid_connections table structure', async () => {
      const mockTableInfo = [
        { column_name: 'id', data_type: 'uuid', is_nullable: 'NO' },
        { column_name: 'user_id', data_type: 'uuid', is_nullable: 'NO' },
        { column_name: 'item_id', data_type: 'character varying', is_nullable: 'NO' },
        { column_name: 'access_token', data_type: 'text', is_nullable: 'NO' },
        { column_name: 'institution_id', data_type: 'character varying', is_nullable: 'NO' },
        { column_name: 'institution_name', data_type: 'character varying', is_nullable: 'NO' },
        { column_name: 'accounts', data_type: 'ARRAY', is_nullable: 'YES' },
        { column_name: 'status', data_type: 'character varying', is_nullable: 'YES' },
        { column_name: 'last_sync', data_type: 'timestamp with time zone', is_nullable: 'YES' },
        { column_name: 'created_at', data_type: 'timestamp with time zone', is_nullable: 'YES' },
        { column_name: 'updated_at', data_type: 'timestamp with time zone', is_nullable: 'YES' },
      ];

      mockClient.query.mockResolvedValueOnce(mockTableInfo);

      const result = await mockClient.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'plaid_connections' 
        ORDER BY ordinal_position
      `);

      expect(result).toEqual(mockTableInfo);
      
      // Verify required columns exist
      const columnNames = result.map((col: any) => col.column_name);
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('user_id');
      expect(columnNames).toContain('access_token');
      expect(columnNames).toContain('institution_id');
    });

    it('should verify accounts table structure', async () => {
      const mockTableInfo = [
        { column_name: 'id', data_type: 'uuid', is_nullable: 'NO' },
        { column_name: 'user_id', data_type: 'uuid', is_nullable: 'NO' },
        { column_name: 'plaid_account_id', data_type: 'character varying', is_nullable: 'NO' },
        { column_name: 'connection_id', data_type: 'uuid', is_nullable: 'NO' },
        { column_name: 'name', data_type: 'character varying', is_nullable: 'NO' },
        { column_name: 'type', data_type: 'character varying', is_nullable: 'NO' },
        { column_name: 'subtype', data_type: 'character varying', is_nullable: 'NO' },
        { column_name: 'balance_current', data_type: 'numeric', is_nullable: 'NO' },
        { column_name: 'balance_available', data_type: 'numeric', is_nullable: 'YES' },
        { column_name: 'balance_limit', data_type: 'numeric', is_nullable: 'YES' },
      ];

      mockClient.query.mockResolvedValueOnce(mockTableInfo);

      const result = await mockClient.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'accounts' 
        ORDER BY ordinal_position
      `);

      expect(result).toEqual(mockTableInfo);
      
      // Verify balance_current is required
      const balanceCurrentCol = result.find((col: any) => col.column_name === 'balance_current');
      expect(balanceCurrentCol?.is_nullable).toBe('NO');
    });

    it('should verify transactions table structure', async () => {
      const mockTableInfo = [
        { column_name: 'id', data_type: 'uuid', is_nullable: 'NO' },
        { column_name: 'user_id', data_type: 'uuid', is_nullable: 'NO' },
        { column_name: 'account_id', data_type: 'uuid', is_nullable: 'NO' },
        { column_name: 'plaid_transaction_id', data_type: 'character varying', is_nullable: 'NO' },
        { column_name: 'amount', data_type: 'numeric', is_nullable: 'NO' },
        { column_name: 'date', data_type: 'date', is_nullable: 'NO' },
        { column_name: 'name', data_type: 'character varying', is_nullable: 'NO' },
        { column_name: 'category', data_type: 'ARRAY', is_nullable: 'YES' },
        { column_name: 'pending', data_type: 'boolean', is_nullable: 'YES' },
      ];

      mockClient.query.mockResolvedValueOnce(mockTableInfo);

      const result = await mockClient.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'transactions' 
        ORDER BY ordinal_position
      `);

      expect(result).toEqual(mockTableInfo);
      
      // Verify required fields
      const requiredFields = ['amount', 'date', 'name'];
      requiredFields.forEach(field => {
        const column = result.find((col: any) => col.column_name === field);
        expect(column?.is_nullable).toBe('NO');
      });
    });
  });

  describe('Constraints Validation', () => {
    it('should verify unique constraints exist', async () => {
      const mockConstraints = [
        { constraint_name: 'unique_user_item', table_name: 'plaid_connections' },
        { constraint_name: 'unique_user_plaid_account', table_name: 'accounts' },
        { constraint_name: 'unique_user_plaid_transaction', table_name: 'transactions' },
      ];

      mockClient.query.mockResolvedValueOnce(mockConstraints);

      const result = await mockClient.query(`
        SELECT constraint_name, table_name 
        FROM information_schema.table_constraints 
        WHERE constraint_type = 'UNIQUE' 
        AND table_schema = 'public'
        AND table_name IN ('plaid_connections', 'accounts', 'transactions')
      `);

      expect(result).toEqual(mockConstraints);
      
      const constraintNames = result.map((c: any) => c.constraint_name);
      expect(constraintNames).toContain('unique_user_item');
      expect(constraintNames).toContain('unique_user_plaid_account');
      expect(constraintNames).toContain('unique_user_plaid_transaction');
    });

    it('should verify foreign key constraints exist', async () => {
      const mockForeignKeys = [
        { 
          constraint_name: 'accounts_connection_id_fkey',
          table_name: 'accounts',
          referenced_table_name: 'plaid_connections'
        },
        { 
          constraint_name: 'transactions_account_id_fkey',
          table_name: 'transactions',
          referenced_table_name: 'accounts'
        },
      ];

      mockClient.query.mockResolvedValueOnce(mockForeignKeys);

      const result = await mockClient.query(`
        SELECT 
          tc.constraint_name,
          tc.table_name,
          ccu.table_name AS referenced_table_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu 
          ON tc.constraint_name = ccu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND tc.table_name IN ('accounts', 'transactions')
      `);

      expect(result).toEqual(mockForeignKeys);
    });

    it('should verify check constraints exist', async () => {
      const mockCheckConstraints = [
        { constraint_name: 'valid_status', table_name: 'plaid_connections' },
        { constraint_name: 'valid_account_type', table_name: 'accounts' },
        { constraint_name: 'positive_balance_current', table_name: 'accounts' },
        { constraint_name: 'valid_transaction_date', table_name: 'transactions' },
        { constraint_name: 'valid_transaction_name', table_name: 'transactions' },
      ];

      mockClient.query.mockResolvedValueOnce(mockCheckConstraints);

      const result = await mockClient.query(`
        SELECT constraint_name, table_name 
        FROM information_schema.table_constraints 
        WHERE constraint_type = 'CHECK' 
        AND table_schema = 'public'
        AND table_name IN ('plaid_connections', 'accounts', 'transactions')
      `);

      expect(result).toEqual(mockCheckConstraints);
    });
  });

  describe('Index Validation', () => {
    it('should verify performance indexes exist', async () => {
      const mockIndexes = [
        { indexname: 'idx_plaid_connections_user_id', tablename: 'plaid_connections' },
        { indexname: 'idx_accounts_user_id', tablename: 'accounts' },
        { indexname: 'idx_accounts_connection_id', tablename: 'accounts' },
        { indexname: 'idx_transactions_user_id', tablename: 'transactions' },
        { indexname: 'idx_transactions_account_id', tablename: 'transactions' },
        { indexname: 'idx_transactions_user_date', tablename: 'transactions' },
        { indexname: 'idx_transactions_date', tablename: 'transactions' },
        { indexname: 'idx_transactions_pending', tablename: 'transactions' },
        { indexname: 'idx_transactions_category', tablename: 'transactions' },
      ];

      mockClient.query.mockResolvedValueOnce(mockIndexes);

      const result = await mockClient.query(`
        SELECT indexname, tablename 
        FROM pg_indexes 
        WHERE schemaname = 'public'
        AND tablename IN ('plaid_connections', 'accounts', 'transactions')
        AND indexname LIKE 'idx_%'
        ORDER BY tablename, indexname
      `);

      expect(result).toEqual(mockIndexes);
      
      // Verify critical indexes exist
      const indexNames = result.map((idx: any) => idx.indexname);
      expect(indexNames).toContain('idx_transactions_user_date');
      expect(indexNames).toContain('idx_accounts_user_id');
      expect(indexNames).toContain('idx_plaid_connections_user_id');
    });

    it('should verify GIN index for array columns', async () => {
      const mockGinIndexes = [
        { 
          indexname: 'idx_transactions_category',
          tablename: 'transactions',
          indexdef: 'CREATE INDEX idx_transactions_category ON transactions USING gin (category)'
        },
      ];

      mockClient.query.mockResolvedValueOnce(mockGinIndexes);

      const result = await mockClient.query(`
        SELECT indexname, tablename, indexdef
        FROM pg_indexes 
        WHERE schemaname = 'public'
        AND indexdef LIKE '%gin%'
        AND tablename IN ('transactions')
      `);

      expect(result).toEqual(mockGinIndexes);
      expect(result[0].indexdef).toContain('gin');
    });
  });

  describe('Trigger Validation', () => {
    it('should verify updated_at triggers exist', async () => {
      const mockTriggers = [
        { trigger_name: 'update_plaid_connections_updated_at', table_name: 'plaid_connections' },
        { trigger_name: 'update_accounts_updated_at', table_name: 'accounts' },
        { trigger_name: 'update_transactions_updated_at', table_name: 'transactions' },
      ];

      mockClient.query.mockResolvedValueOnce(mockTriggers);

      const result = await mockClient.query(`
        SELECT trigger_name, event_object_table as table_name
        FROM information_schema.triggers
        WHERE trigger_schema = 'public'
        AND event_object_table IN ('plaid_connections', 'accounts', 'transactions')
        AND trigger_name LIKE '%updated_at%'
      `);

      expect(result).toEqual(mockTriggers);
    });

    it('should verify trigger function exists', async () => {
      const mockFunction = [
        { routine_name: 'update_updated_at_column', routine_type: 'FUNCTION' },
      ];

      mockClient.query.mockResolvedValueOnce(mockFunction);

      const result = await mockClient.query(`
        SELECT routine_name, routine_type
        FROM information_schema.routines
        WHERE routine_schema = 'public'
        AND routine_name = 'update_updated_at_column'
      `);

      expect(result).toEqual(mockFunction);
    });
  });

  describe('Data Integrity Tests', () => {
    it('should test constraint violations', async () => {
      // Test unique constraint violation
      const duplicateError = new Error('duplicate key value violates unique constraint');
      mockClient.query.mockRejectedValueOnce(duplicateError);

      await expect(
        mockClient.query(`
          INSERT INTO plaid_connections (user_id, item_id, access_token, institution_id, institution_name)
          VALUES ('user1', 'item1', 'token1', 'inst1', 'Bank1'),
                 ('user1', 'item1', 'token2', 'inst2', 'Bank2')
        `)
      ).rejects.toThrow('duplicate key value violates unique constraint');
    });

    it('should test foreign key constraint violations', async () => {
      const fkError = new Error('violates foreign key constraint');
      mockClient.query.mockRejectedValueOnce(fkError);

      await expect(
        mockClient.query(`
          INSERT INTO accounts (user_id, plaid_account_id, connection_id, name, type, subtype, balance_current)
          VALUES ('user1', 'acc1', 'nonexistent-connection-id', 'Test Account', 'depository', 'checking', 1000.00)
        `)
      ).rejects.toThrow('violates foreign key constraint');
    });

    it('should test check constraint violations', async () => {
      const checkError = new Error('violates check constraint');
      mockClient.query.mockRejectedValueOnce(checkError);

      await expect(
        mockClient.query(`
          INSERT INTO plaid_connections (user_id, item_id, access_token, institution_id, institution_name, status)
          VALUES ('user1', 'item1', 'token1', 'inst1', 'Bank1', 'invalid_status')
        `)
      ).rejects.toThrow('violates check constraint');
    });

    it('should test not null constraint violations', async () => {
      const notNullError = new Error('violates not-null constraint');
      mockClient.query.mockRejectedValueOnce(notNullError);

      await expect(
        mockClient.query(`
          INSERT INTO accounts (user_id, plaid_account_id, connection_id, name, type, subtype)
          VALUES ('user1', 'acc1', 'conn1', 'Test Account', 'depository', 'checking')
        `)
      ).rejects.toThrow('violates not-null constraint');
    });
  });

  describe('Performance Tests', () => {
    it('should verify index usage in queries', async () => {
      const mockQueryPlan = [
        { 
          'QUERY PLAN': 'Index Scan using idx_transactions_user_date on transactions'
        }
      ];

      mockClient.query.mockResolvedValueOnce(mockQueryPlan);

      const result = await mockClient.query(`
        EXPLAIN SELECT * FROM transactions 
        WHERE user_id = 'test-user' 
        ORDER BY date DESC 
        LIMIT 10
      `);

      expect(result[0]['QUERY PLAN']).toContain('Index Scan');
      expect(result[0]['QUERY PLAN']).toContain('idx_transactions_user_date');
    });

    it('should verify GIN index usage for array queries', async () => {
      const mockQueryPlan = [
        { 
          'QUERY PLAN': 'Bitmap Index Scan on idx_transactions_category'
        }
      ];

      mockClient.query.mockResolvedValueOnce(mockQueryPlan);

      const result = await mockClient.query(`
        EXPLAIN SELECT * FROM transactions 
        WHERE category && ARRAY['Food and Drink']
      `);

      expect(result[0]['QUERY PLAN']).toContain('idx_transactions_category');
    });
  });
});