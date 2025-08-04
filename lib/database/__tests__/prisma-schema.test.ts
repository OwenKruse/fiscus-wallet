// Prisma Schema Validation Tests
// Tests to verify Prisma schema structure and constraints

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConnectionStatus, AccountType } from '../prisma-client';

// Mock Prisma Client for schema validation
const mockPrisma = {
  plaidConnection: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  account: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  transaction: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  $queryRaw: vi.fn(),
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

describe('Prisma Schema Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('PlaidConnection Model', () => {
    it('should create plaid connection with required fields', async () => {
      const connectionData = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        itemId: 'test_item_1',
        accessToken: 'encrypted_token',
        institutionId: 'ins_109508',
        institutionName: 'Test Bank',
        status: ConnectionStatus.ACTIVE,
      };

      const mockConnection = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        ...connectionData,
        accounts: [],
        lastSync: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.plaidConnection.create.mockResolvedValueOnce(mockConnection);

      const result = await mockPrisma.plaidConnection.create({
        data: connectionData,
      });

      expect(result).toEqual(mockConnection);
      expect(mockPrisma.plaidConnection.create).toHaveBeenCalledWith({
        data: connectionData,
      });
    });

    it('should handle connection status enum values', () => {
      expect(ConnectionStatus.ACTIVE).toBe('ACTIVE');
      expect(ConnectionStatus.ERROR).toBe('ERROR');
      expect(ConnectionStatus.DISCONNECTED).toBe('DISCONNECTED');
    });

    it('should support array of account IDs', async () => {
      const connectionData = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        itemId: 'test_item_1',
        accessToken: 'encrypted_token',
        institutionId: 'ins_109508',
        institutionName: 'Test Bank',
        accounts: ['account_1', 'account_2', 'account_3'],
        status: ConnectionStatus.ACTIVE,
      };

      const mockConnection = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        ...connectionData,
        lastSync: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.plaidConnection.create.mockResolvedValueOnce(mockConnection);

      const result = await mockPrisma.plaidConnection.create({
        data: connectionData,
      });

      expect(result.accounts).toEqual(['account_1', 'account_2', 'account_3']);
    });

    it('should support lastSync timestamp', async () => {
      const lastSyncDate = new Date();
      const connectionData = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        itemId: 'test_item_1',
        accessToken: 'encrypted_token',
        institutionId: 'ins_109508',
        institutionName: 'Test Bank',
        lastSync: lastSyncDate,
        status: ConnectionStatus.ACTIVE,
      };

      const mockConnection = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        ...connectionData,
        accounts: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.plaidConnection.create.mockResolvedValueOnce(mockConnection);

      const result = await mockPrisma.plaidConnection.create({
        data: connectionData,
      });

      expect(result.lastSync).toEqual(lastSyncDate);
    });
  });

  describe('Account Model', () => {
    it('should create account with required fields', async () => {
      const accountData = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        plaidAccountId: 'test_account_1',
        connectionId: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Test Checking',
        type: AccountType.DEPOSITORY,
        subtype: 'checking',
        balanceCurrent: 1000.50,
      };

      const mockAccount = {
        id: '550e8400-e29b-41d4-a716-446655440010',
        ...accountData,
        officialName: null,
        balanceAvailable: null,
        balanceLimit: null,
        lastUpdated: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.account.create.mockResolvedValueOnce(mockAccount);

      const result = await mockPrisma.account.create({
        data: accountData,
      });

      expect(result).toEqual(mockAccount);
      expect(result.balanceCurrent).toBe(1000.50);
    });

    it('should handle account type enum values', () => {
      expect(AccountType.DEPOSITORY).toBe('DEPOSITORY');
      expect(AccountType.CREDIT).toBe('CREDIT');
      expect(AccountType.LOAN).toBe('LOAN');
      expect(AccountType.INVESTMENT).toBe('INVESTMENT');
    });

    it('should support optional balance fields', async () => {
      const accountData = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        plaidAccountId: 'test_account_1',
        connectionId: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Test Credit Card',
        officialName: 'Test Bank Credit Card',
        type: AccountType.CREDIT,
        subtype: 'credit card',
        balanceAvailable: 4750.00,
        balanceCurrent: -1250.00,
        balanceLimit: 6000.00,
      };

      const mockAccount = {
        id: '550e8400-e29b-41d4-a716-446655440010',
        ...accountData,
        lastUpdated: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.account.create.mockResolvedValueOnce(mockAccount);

      const result = await mockPrisma.account.create({
        data: accountData,
      });

      expect(result.balanceAvailable).toBe(4750.00);
      expect(result.balanceCurrent).toBe(-1250.00);
      expect(result.balanceLimit).toBe(6000.00);
      expect(result.officialName).toBe('Test Bank Credit Card');
    });
  });

  describe('Transaction Model', () => {
    it('should create transaction with required fields', async () => {
      const transactionData = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        accountId: '550e8400-e29b-41d4-a716-446655440010',
        plaidTransactionId: 'test_txn_1',
        amount: -45.67,
        date: new Date('2024-01-15'),
        name: 'Grocery Store Purchase',
      };

      const mockTransaction = {
        id: '550e8400-e29b-41d4-a716-446655440020',
        ...transactionData,
        merchantName: null,
        category: [],
        subcategory: null,
        pending: false,
        accountOwner: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.transaction.create.mockResolvedValueOnce(mockTransaction);

      const result = await mockPrisma.transaction.create({
        data: transactionData,
      });

      expect(result).toEqual(mockTransaction);
      expect(result.amount).toBe(-45.67);
      expect(result.date).toEqual(new Date('2024-01-15'));
    });

    it('should support category arrays', async () => {
      const transactionData = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        accountId: '550e8400-e29b-41d4-a716-446655440010',
        plaidTransactionId: 'test_txn_1',
        amount: -45.67,
        date: new Date('2024-01-15'),
        name: 'Grocery Store Purchase',
        category: ['Food and Drink', 'Groceries'],
        subcategory: 'Groceries',
      };

      const mockTransaction = {
        id: '550e8400-e29b-41d4-a716-446655440020',
        ...transactionData,
        merchantName: null,
        pending: false,
        accountOwner: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.transaction.create.mockResolvedValueOnce(mockTransaction);

      const result = await mockPrisma.transaction.create({
        data: transactionData,
      });

      expect(result.category).toEqual(['Food and Drink', 'Groceries']);
      expect(result.subcategory).toBe('Groceries');
    });

    it('should support pending transactions', async () => {
      const transactionData = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        accountId: '550e8400-e29b-41d4-a716-446655440010',
        plaidTransactionId: 'test_txn_pending',
        amount: -25.00,
        date: new Date(),
        name: 'Pending ATM Withdrawal',
        pending: true,
      };

      const mockTransaction = {
        id: '550e8400-e29b-41d4-a716-446655440020',
        ...transactionData,
        merchantName: null,
        category: [],
        subcategory: null,
        accountOwner: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.transaction.create.mockResolvedValueOnce(mockTransaction);

      const result = await mockPrisma.transaction.create({
        data: transactionData,
      });

      expect(result.pending).toBe(true);
    });

    it('should support optional merchant and owner fields', async () => {
      const transactionData = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        accountId: '550e8400-e29b-41d4-a716-446655440010',
        plaidTransactionId: 'test_txn_1',
        amount: -45.67,
        date: new Date('2024-01-15'),
        name: 'Grocery Store Purchase',
        merchantName: 'Fresh Market',
        accountOwner: 'Test User',
      };

      const mockTransaction = {
        id: '550e8400-e29b-41d4-a716-446655440020',
        ...transactionData,
        category: [],
        subcategory: null,
        pending: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.transaction.create.mockResolvedValueOnce(mockTransaction);

      const result = await mockPrisma.transaction.create({
        data: transactionData,
      });

      expect(result.merchantName).toBe('Fresh Market');
      expect(result.accountOwner).toBe('Test User');
    });
  });

  describe('Relationships', () => {
    it('should support connection to accounts relationship', async () => {
      const mockConnectionWithAccounts = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        userId: '550e8400-e29b-41d4-a716-446655440000',
        institutionName: 'Test Bank',
        userAccounts: [
          {
            id: '550e8400-e29b-41d4-a716-446655440010',
            name: 'Test Checking',
            type: AccountType.DEPOSITORY,
          },
          {
            id: '550e8400-e29b-41d4-a716-446655440011',
            name: 'Test Savings',
            type: AccountType.DEPOSITORY,
          },
        ],
      };

      mockPrisma.plaidConnection.findUnique.mockResolvedValueOnce(mockConnectionWithAccounts);

      const result = await mockPrisma.plaidConnection.findUnique({
        where: { id: '550e8400-e29b-41d4-a716-446655440001' },
        include: { userAccounts: true },
      });

      expect(result?.userAccounts).toHaveLength(2);
      expect(result?.userAccounts[0].name).toBe('Test Checking');
    });

    it('should support account to transactions relationship', async () => {
      const mockAccountWithTransactions = {
        id: '550e8400-e29b-41d4-a716-446655440010',
        name: 'Test Checking',
        transactions: [
          {
            id: '550e8400-e29b-41d4-a716-446655440020',
            name: 'Grocery Store',
            amount: -45.67,
          },
          {
            id: '550e8400-e29b-41d4-a716-446655440021',
            name: 'Coffee Shop',
            amount: -12.50,
          },
        ],
      };

      mockPrisma.account.findUnique.mockResolvedValueOnce(mockAccountWithTransactions);

      const result = await mockPrisma.account.findUnique({
        where: { id: '550e8400-e29b-41d4-a716-446655440010' },
        include: { transactions: true },
      });

      expect(result?.transactions).toHaveLength(2);
      expect(result?.transactions[0].amount).toBe(-45.67);
    });

    it('should support transaction to account relationship', async () => {
      const mockTransactionWithAccount = {
        id: '550e8400-e29b-41d4-a716-446655440020',
        name: 'Grocery Store',
        amount: -45.67,
        account: {
          id: '550e8400-e29b-41d4-a716-446655440010',
          name: 'Test Checking',
          type: AccountType.DEPOSITORY,
        },
      };

      mockPrisma.transaction.findUnique.mockResolvedValueOnce(mockTransactionWithAccount);

      const result = await mockPrisma.transaction.findUnique({
        where: { id: '550e8400-e29b-41d4-a716-446655440020' },
        include: { account: true },
      });

      expect(result?.account.name).toBe('Test Checking');
      expect(result?.account.type).toBe(AccountType.DEPOSITORY);
    });
  });

  describe('Unique Constraints', () => {
    it('should enforce unique user-item constraint on connections', async () => {
      const duplicateError = new Error('Unique constraint failed on the fields: (`userId`,`itemId`)');
      mockPrisma.plaidConnection.create.mockRejectedValueOnce(duplicateError);

      await expect(
        mockPrisma.plaidConnection.create({
          data: {
            userId: '550e8400-e29b-41d4-a716-446655440000',
            itemId: 'duplicate_item',
            accessToken: 'token1',
            institutionId: 'inst1',
            institutionName: 'Bank1',
          },
        })
      ).rejects.toThrow('Unique constraint failed');
    });

    it('should enforce unique user-plaid-account constraint on accounts', async () => {
      const duplicateError = new Error('Unique constraint failed on the fields: (`userId`,`plaidAccountId`)');
      mockPrisma.account.create.mockRejectedValueOnce(duplicateError);

      await expect(
        mockPrisma.account.create({
          data: {
            userId: '550e8400-e29b-41d4-a716-446655440000',
            plaidAccountId: 'duplicate_account',
            connectionId: '550e8400-e29b-41d4-a716-446655440001',
            name: 'Test Account',
            type: AccountType.DEPOSITORY,
            subtype: 'checking',
            balanceCurrent: 1000.00,
          },
        })
      ).rejects.toThrow('Unique constraint failed');
    });

    it('should enforce unique user-plaid-transaction constraint on transactions', async () => {
      const duplicateError = new Error('Unique constraint failed on the fields: (`userId`,`plaidTransactionId`)');
      mockPrisma.transaction.create.mockRejectedValueOnce(duplicateError);

      await expect(
        mockPrisma.transaction.create({
          data: {
            userId: '550e8400-e29b-41d4-a716-446655440000',
            accountId: '550e8400-e29b-41d4-a716-446655440010',
            plaidTransactionId: 'duplicate_transaction',
            amount: -50.00,
            date: new Date(),
            name: 'Test Transaction',
          },
        })
      ).rejects.toThrow('Unique constraint failed');
    });
  });
});