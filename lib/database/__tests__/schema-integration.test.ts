// Schema Integration Test
// Tests the actual database schema creation and constraints

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../prisma-client';
import { ConnectionStatus, AccountType } from '../prisma-client';

describe('Database Schema Integration', () => {
  // Test data cleanup
  afterAll(async () => {
    try {
      // Clean up test data
      await prisma.transaction.deleteMany({
        where: {
          plaidTransactionId: {
            startsWith: 'test_integration_',
          },
        },
      });
      
      await prisma.account.deleteMany({
        where: {
          plaidAccountId: {
            startsWith: 'test_integration_',
          },
        },
      });
      
      await prisma.plaidConnection.deleteMany({
        where: {
          itemId: {
            startsWith: 'test_integration_',
          },
        },
      });
    } catch (error) {
      console.warn('Cleanup failed:', error);
    }
  });

  describe('PlaidConnection Model', () => {
    it('should create and retrieve a plaid connection', async () => {
      const connectionData = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        itemId: 'test_integration_item_1',
        accessToken: 'test_encrypted_token',
        institutionId: 'ins_test_123',
        institutionName: 'Test Integration Bank',
        status: ConnectionStatus.ACTIVE,
      };

      const connection = await prisma.plaidConnection.create({
        data: connectionData,
      });

      expect(connection.id).toBeDefined();
      expect(connection.userId).toBe(connectionData.userId);
      expect(connection.itemId).toBe(connectionData.itemId);
      expect(connection.status).toBe(ConnectionStatus.ACTIVE);
      expect(connection.createdAt).toBeInstanceOf(Date);
      expect(connection.updatedAt).toBeInstanceOf(Date);

      // Verify it can be retrieved
      const retrieved = await prisma.plaidConnection.findUnique({
        where: { id: connection.id },
      });

      expect(retrieved).not.toBeNull();
      expect(retrieved?.institutionName).toBe('Test Integration Bank');
    });

    it('should enforce unique constraint on userId and itemId', async () => {
      const connectionData = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        itemId: 'test_integration_duplicate',
        accessToken: 'test_token_1',
        institutionId: 'ins_test_123',
        institutionName: 'Test Bank 1',
      };

      // Create first connection
      await prisma.plaidConnection.create({
        data: connectionData,
      });

      // Try to create duplicate - should fail
      await expect(
        prisma.plaidConnection.create({
          data: {
            ...connectionData,
            accessToken: 'test_token_2', // Different token, same user+item
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('Account Model', () => {
    it('should create account with connection relationship', async () => {
      // First create a connection
      const connection = await prisma.plaidConnection.create({
        data: {
          userId: '550e8400-e29b-41d4-a716-446655440000',
          itemId: 'test_integration_item_2',
          accessToken: 'test_token',
          institutionId: 'ins_test_123',
          institutionName: 'Test Bank',
        },
      });

      const accountData = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        plaidAccountId: 'test_integration_account_1',
        connectionId: connection.id,
        name: 'Test Checking Account',
        type: AccountType.DEPOSITORY,
        subtype: 'checking',
        balanceCurrent: 1500.75,
        balanceAvailable: 1450.25,
      };

      const account = await prisma.account.create({
        data: accountData,
      });

      expect(account.id).toBeDefined();
      expect(account.connectionId).toBe(connection.id);
      expect(account.type).toBe(AccountType.DEPOSITORY);
      expect(account.balanceCurrent.toNumber()).toBe(1500.75);
      expect(account.balanceAvailable?.toNumber()).toBe(1450.25);

      // Test relationship
      const accountWithConnection = await prisma.account.findUnique({
        where: { id: account.id },
        include: { connection: true },
      });

      expect(accountWithConnection?.connection.institutionName).toBe('Test Bank');
    });

    it('should handle different account types', async () => {
      const connection = await prisma.plaidConnection.create({
        data: {
          userId: '550e8400-e29b-41d4-a716-446655440000',
          itemId: 'test_integration_item_3',
          accessToken: 'test_token',
          institutionId: 'ins_test_123',
          institutionName: 'Test Credit Union',
        },
      });

      // Test credit account
      const creditAccount = await prisma.account.create({
        data: {
          userId: '550e8400-e29b-41d4-a716-446655440000',
          plaidAccountId: 'test_integration_credit_1',
          connectionId: connection.id,
          name: 'Test Credit Card',
          type: AccountType.CREDIT,
          subtype: 'credit card',
          balanceCurrent: -250.50,
          balanceLimit: 5000.00,
        },
      });

      expect(creditAccount.type).toBe(AccountType.CREDIT);
      expect(creditAccount.balanceCurrent.toNumber()).toBe(-250.50);
      expect(creditAccount.balanceLimit?.toNumber()).toBe(5000.00);
    });
  });

  describe('Transaction Model', () => {
    it('should create transaction with account relationship', async () => {
      // Create connection and account first
      const connection = await prisma.plaidConnection.create({
        data: {
          userId: '550e8400-e29b-41d4-a716-446655440000',
          itemId: 'test_integration_item_4',
          accessToken: 'test_token',
          institutionId: 'ins_test_123',
          institutionName: 'Test Bank',
        },
      });

      const account = await prisma.account.create({
        data: {
          userId: '550e8400-e29b-41d4-a716-446655440000',
          plaidAccountId: 'test_integration_account_2',
          connectionId: connection.id,
          name: 'Test Account',
          type: AccountType.DEPOSITORY,
          subtype: 'checking',
          balanceCurrent: 1000.00,
        },
      });

      const transactionData = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        accountId: account.id,
        plaidTransactionId: 'test_integration_txn_1',
        amount: -45.67,
        date: new Date('2024-01-15'),
        name: 'Test Grocery Store',
        merchantName: 'Test Market',
        category: ['Food and Drink', 'Groceries'],
        subcategory: 'Groceries',
        pending: false,
      };

      const transaction = await prisma.transaction.create({
        data: transactionData,
      });

      expect(transaction.id).toBeDefined();
      expect(transaction.accountId).toBe(account.id);
      expect(transaction.amount.toNumber()).toBe(-45.67);
      expect(transaction.category).toEqual(['Food and Drink', 'Groceries']);
      expect(transaction.pending).toBe(false);

      // Test relationship
      const transactionWithAccount = await prisma.transaction.findUnique({
        where: { id: transaction.id },
        include: { account: true },
      });

      expect(transactionWithAccount?.account.name).toBe('Test Account');
    });

    it('should handle pending transactions', async () => {
      // Use existing account from previous test
      const account = await prisma.account.findFirst({
        where: {
          plaidAccountId: 'test_integration_account_2',
        },
      });

      expect(account).not.toBeNull();

      const pendingTransaction = await prisma.transaction.create({
        data: {
          userId: '550e8400-e29b-41d4-a716-446655440000',
          accountId: account!.id,
          plaidTransactionId: 'test_integration_txn_pending',
          amount: -25.00,
          date: new Date(),
          name: 'Pending ATM Withdrawal',
          pending: true,
        },
      });

      expect(pendingTransaction.pending).toBe(true);
      expect(pendingTransaction.amount.toNumber()).toBe(-25.00);
    });
  });

  describe('Data Relationships', () => {
    it('should cascade delete accounts when connection is deleted', async () => {
      // Create connection with account
      const connection = await prisma.plaidConnection.create({
        data: {
          userId: '550e8400-e29b-41d4-a716-446655440000',
          itemId: 'test_integration_cascade_1',
          accessToken: 'test_token',
          institutionId: 'ins_test_123',
          institutionName: 'Test Cascade Bank',
        },
      });

      const account = await prisma.account.create({
        data: {
          userId: '550e8400-e29b-41d4-a716-446655440000',
          plaidAccountId: 'test_integration_cascade_account',
          connectionId: connection.id,
          name: 'Test Cascade Account',
          type: AccountType.DEPOSITORY,
          subtype: 'checking',
          balanceCurrent: 1000.00,
        },
      });

      // Delete connection
      await prisma.plaidConnection.delete({
        where: { id: connection.id },
      });

      // Account should be deleted due to cascade
      const deletedAccount = await prisma.account.findUnique({
        where: { id: account.id },
      });

      expect(deletedAccount).toBeNull();
    });

    it('should cascade delete transactions when account is deleted', async () => {
      // Create connection, account, and transaction
      const connection = await prisma.plaidConnection.create({
        data: {
          userId: '550e8400-e29b-41d4-a716-446655440000',
          itemId: 'test_integration_cascade_2',
          accessToken: 'test_token',
          institutionId: 'ins_test_123',
          institutionName: 'Test Cascade Bank 2',
        },
      });

      const account = await prisma.account.create({
        data: {
          userId: '550e8400-e29b-41d4-a716-446655440000',
          plaidAccountId: 'test_integration_cascade_account_2',
          connectionId: connection.id,
          name: 'Test Cascade Account 2',
          type: AccountType.DEPOSITORY,
          subtype: 'checking',
          balanceCurrent: 1000.00,
        },
      });

      const transaction = await prisma.transaction.create({
        data: {
          userId: '550e8400-e29b-41d4-a716-446655440000',
          accountId: account.id,
          plaidTransactionId: 'test_integration_cascade_txn',
          amount: -50.00,
          date: new Date(),
          name: 'Test Transaction',
        },
      });

      // Delete account
      await prisma.account.delete({
        where: { id: account.id },
      });

      // Transaction should be deleted due to cascade
      const deletedTransaction = await prisma.transaction.findUnique({
        where: { id: transaction.id },
      });

      expect(deletedTransaction).toBeNull();
    });
  });
});