// Prisma Seeder Tests
// Tests for Prisma database seeding functionality

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PrismaSeeder, seedDevelopmentData, clearTestData, verifySeedData } from '../prisma-seeder';
import { ConnectionStatus, AccountType } from '../prisma-client';

// Mock Prisma Client
const mockPrisma = {
  plaidConnection: {
    deleteMany: vi.fn(),
    create: vi.fn(),
    count: vi.fn(),
  },
  account: {
    deleteMany: vi.fn(),
    create: vi.fn(),
    count: vi.fn(),
  },
  transaction: {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
    count: vi.fn(),
  },
};

vi.mock('../prisma-client', () => ({
  prisma: mockPrisma,
  ConnectionStatus: {
    ACTIVE: 'ACTIVE',
    ERROR: 'ERROR',
    DISCONNECTED: 'DISCONNECTED',
  },
  AccountType: {
    DEPOSITORY: 'DEPOSITORY',
    CREDIT: 'CREDIT',
    LOAN: 'LOAN',
    INVESTMENT: 'INVESTMENT',
  },
}));

describe('PrismaSeeder', () => {
  let seeder: PrismaSeeder;

  beforeEach(() => {
    vi.clearAllMocks();
    seeder = new PrismaSeeder();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('clearTestData', () => {
    it('should clear test data successfully', async () => {
      mockPrisma.transaction.deleteMany.mockResolvedValueOnce({ count: 5 });
      mockPrisma.account.deleteMany.mockResolvedValueOnce({ count: 3 });
      mockPrisma.plaidConnection.deleteMany.mockResolvedValueOnce({ count: 2 });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await expect(seeder.clearTestData()).resolves.not.toThrow();

      expect(mockPrisma.transaction.deleteMany).toHaveBeenCalledWith({
        where: {
          account: {
            connection: {
              institutionName: {
                startsWith: 'Test',
              },
            },
          },
        },
      });

      expect(mockPrisma.account.deleteMany).toHaveBeenCalledWith({
        where: {
          connection: {
            institutionName: {
              startsWith: 'Test',
            },
          },
        },
      });

      expect(mockPrisma.plaidConnection.deleteMany).toHaveBeenCalledWith({
        where: {
          institutionName: {
            startsWith: 'Test',
          },
        },
      });

      expect(consoleSpy).toHaveBeenCalledWith('Test data cleared successfully');
      consoleSpy.mockRestore();
    });

    it('should handle clear data errors', async () => {
      const error = new Error('Delete failed');
      mockPrisma.transaction.deleteMany.mockRejectedValueOnce(error);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(seeder.clearTestData()).rejects.toThrow('Delete failed');
      expect(consoleSpy).toHaveBeenCalledWith('Failed to clear test data:', error);
      
      consoleSpy.mockRestore();
    });
  });

  describe('seedDevelopmentData', () => {
    it('should seed development data successfully', async () => {
      // Mock successful operations
      mockPrisma.transaction.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.account.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.plaidConnection.deleteMany.mockResolvedValue({ count: 0 });

      const mockConnection1 = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        userId: '550e8400-e29b-41d4-a716-446655440000',
        itemId: 'test_item_1',
        institutionName: 'Test Bank 1',
      };

      const mockConnection2 = {
        id: '550e8400-e29b-41d4-a716-446655440002',
        userId: '550e8400-e29b-41d4-a716-446655440000',
        itemId: 'test_item_2',
        institutionName: 'Test Credit Union',
      };

      mockPrisma.plaidConnection.create
        .mockResolvedValueOnce(mockConnection1)
        .mockResolvedValueOnce(mockConnection2);

      const mockAccounts = [
        { id: '550e8400-e29b-41d4-a716-446655440010', name: 'Test Checking' },
        { id: '550e8400-e29b-41d4-a716-446655440011', name: 'Test Savings' },
        { id: '550e8400-e29b-41d4-a716-446655440012', name: 'Test Credit Card' },
      ];

      mockPrisma.account.create
        .mockResolvedValueOnce(mockAccounts[0])
        .mockResolvedValueOnce(mockAccounts[1])
        .mockResolvedValueOnce(mockAccounts[2]);

      mockPrisma.transaction.createMany
        .mockResolvedValueOnce({ count: 10 })
        .mockResolvedValueOnce({ count: 3 });

      // Mock final counts
      mockPrisma.plaidConnection.count.mockResolvedValueOnce(2);
      mockPrisma.account.count.mockResolvedValueOnce(3);
      mockPrisma.transaction.count.mockResolvedValueOnce(13);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await seeder.seedDevelopmentData();

      expect(result.success).toBe(true);
      expect(result.message).toBe('Development data seeded successfully');
      expect(result.data).toEqual({
        connections: 2,
        accounts: 3,
        transactions: 13,
      });

      expect(mockPrisma.plaidConnection.create).toHaveBeenCalledTimes(2);
      expect(mockPrisma.account.create).toHaveBeenCalledTimes(3);
      expect(mockPrisma.transaction.createMany).toHaveBeenCalledTimes(2);

      consoleSpy.mockRestore();
    });

    it('should handle seeding errors', async () => {
      const error = new Error('Seeding failed');
      mockPrisma.transaction.deleteMany.mockRejectedValueOnce(error);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await seeder.seedDevelopmentData();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to seed development data');
      expect(result.error).toBe('Seeding failed');

      consoleSpy.mockRestore();
    });

    it('should create connections with correct data structure', async () => {
      // Setup mocks for successful flow
      mockPrisma.transaction.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.account.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.plaidConnection.deleteMany.mockResolvedValue({ count: 0 });

      const mockConnection = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        userId: '550e8400-e29b-41d4-a716-446655440000',
      };

      mockPrisma.plaidConnection.create.mockResolvedValue(mockConnection);
      mockPrisma.account.create.mockResolvedValue({ id: 'account-id' });
      mockPrisma.transaction.createMany.mockResolvedValue({ count: 0 });
      mockPrisma.plaidConnection.count.mockResolvedValue(1);
      mockPrisma.account.count.mockResolvedValue(0);
      mockPrisma.transaction.count.mockResolvedValue(0);

      await seeder.seedDevelopmentData();

      expect(mockPrisma.plaidConnection.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: '550e8400-e29b-41d4-a716-446655440000',
          itemId: 'test_item_1',
          accessToken: 'encrypted_access_token_1',
          institutionId: 'ins_109508',
          institutionName: 'Test Bank 1',
          accounts: ['test_account_1', 'test_account_2'],
          status: 'ACTIVE',
        }),
      });
    });
  });

  describe('verifySeedData', () => {
    it('should verify seed data successfully', async () => {
      mockPrisma.plaidConnection.count.mockResolvedValueOnce(2);
      mockPrisma.account.count.mockResolvedValueOnce(3);
      mockPrisma.transaction.count.mockResolvedValueOnce(10);

      const result = await seeder.verifySeedData();

      expect(result.valid).toBe(true);
      expect(result.connections).toBe(2);
      expect(result.accounts).toBe(3);
      expect(result.transactions).toBe(10);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid seed data relationships', async () => {
      mockPrisma.plaidConnection.count.mockResolvedValueOnce(1);
      mockPrisma.account.count.mockResolvedValueOnce(0); // No accounts for connections
      mockPrisma.transaction.count.mockResolvedValueOnce(0);

      const result = await seeder.verifySeedData();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Found connections but no accounts');
    });

    it('should detect orphaned data', async () => {
      mockPrisma.plaidConnection.count.mockResolvedValueOnce(1);
      mockPrisma.account.count
        .mockResolvedValueOnce(1) // Regular count
        .mockResolvedValueOnce(1); // Orphaned accounts count
      mockPrisma.transaction.count
        .mockResolvedValueOnce(1) // Regular count
        .mockResolvedValueOnce(1); // Orphaned transactions count

      const result = await seeder.verifySeedData();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Found 1 orphaned accounts');
      expect(result.errors).toContain('Found 1 orphaned transactions');
    });

    it('should handle verification errors', async () => {
      const error = new Error('Verification failed');
      mockPrisma.plaidConnection.count.mockRejectedValueOnce(error);

      const result = await seeder.verifySeedData();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Verification failed');
    });
  });
});

describe('Convenience Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('seedDevelopmentData', () => {
    it('should create seeder and run development seeding', async () => {
      mockPrisma.transaction.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.account.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.plaidConnection.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.plaidConnection.create.mockResolvedValue({ id: 'test' });
      mockPrisma.account.create.mockResolvedValue({ id: 'test' });
      mockPrisma.transaction.createMany.mockResolvedValue({ count: 0 });
      mockPrisma.plaidConnection.count.mockResolvedValue(1);
      mockPrisma.account.count.mockResolvedValue(1);
      mockPrisma.transaction.count.mockResolvedValue(1);

      const result = await seedDevelopmentData();

      expect(result.success).toBe(true);
    });
  });

  describe('clearTestData', () => {
    it('should create seeder and clear test data', async () => {
      mockPrisma.transaction.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.account.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.plaidConnection.deleteMany.mockResolvedValue({ count: 0 });

      await expect(clearTestData()).resolves.not.toThrow();
    });
  });

  describe('verifySeedData', () => {
    it('should create seeder and verify seed data', async () => {
      mockPrisma.plaidConnection.count.mockResolvedValue(1);
      mockPrisma.account.count.mockResolvedValue(1);
      mockPrisma.transaction.count.mockResolvedValue(1);

      const result = await verifySeedData();

      expect(result.valid).toBe(true);
    });
  });
});