// Prisma Database Seeder
// Creates development and test data using Prisma

import { prisma, ConnectionStatus, AccountType } from './prisma-client';

export interface SeedResult {
  success: boolean;
  message: string;
  data?: {
    connections: number;
    accounts: number;
    transactions: number;
  };
  error?: string;
}

export class PrismaSeeder {
  /**
   * Clear all test data
   */
  async clearTestData(): Promise<void> {
    console.log('Clearing test data...');
    
    try {
      // Delete in order of dependencies (transactions -> accounts -> connections)
      await prisma.transaction.deleteMany({
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

      await prisma.account.deleteMany({
        where: {
          connection: {
            institutionName: {
              startsWith: 'Test',
            },
          },
        },
      });

      await prisma.plaidConnection.deleteMany({
        where: {
          institutionName: {
            startsWith: 'Test',
          },
        },
      });

      console.log('Test data cleared successfully');
    } catch (error) {
      console.error('Failed to clear test data:', error);
      throw error;
    }
  }

  /**
   * Seed development data
   */
  async seedDevelopmentData(): Promise<SeedResult> {
    console.log('Seeding development data...');
    
    try {
      // Clear existing test data first
      await this.clearTestData();

      // Create test user ID (in real app, this would come from Nile user management)
      const testUserId = '550e8400-e29b-41d4-a716-446655440000';

      // Create Plaid connections
      const connection1 = await prisma.plaidConnection.create({
        data: {
          id: '550e8400-e29b-41d4-a716-446655440001',
          userId: testUserId,
          itemId: 'test_item_1',
          accessToken: 'encrypted_access_token_1', // Would be encrypted in real usage
          institutionId: 'ins_109508',
          institutionName: 'Test Bank 1',
          accounts: ['test_account_1', 'test_account_2'],
          status: ConnectionStatus.ACTIVE,
          lastSync: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        },
      });

      const connection2 = await prisma.plaidConnection.create({
        data: {
          id: '550e8400-e29b-41d4-a716-446655440002',
          userId: testUserId,
          itemId: 'test_item_2',
          accessToken: 'encrypted_access_token_2',
          institutionId: 'ins_109509',
          institutionName: 'Test Credit Union',
          accounts: ['test_account_3'],
          status: ConnectionStatus.ACTIVE,
          lastSync: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        },
      });

      // Create accounts
      const checkingAccount = await prisma.account.create({
        data: {
          id: '550e8400-e29b-41d4-a716-446655440010',
          userId: testUserId,
          plaidAccountId: 'test_account_1',
          connectionId: connection1.id,
          name: 'Test Checking',
          officialName: 'Test Bank Checking Account',
          type: AccountType.DEPOSITORY,
          subtype: 'checking',
          balanceAvailable: 2450.75,
          balanceCurrent: 2450.75,
          lastUpdated: new Date(Date.now() - 60 * 60 * 1000),
        },
      });

      const savingsAccount = await prisma.account.create({
        data: {
          id: '550e8400-e29b-41d4-a716-446655440011',
          userId: testUserId,
          plaidAccountId: 'test_account_2',
          connectionId: connection1.id,
          name: 'Test Savings',
          officialName: 'Test Bank High Yield Savings',
          type: AccountType.DEPOSITORY,
          subtype: 'savings',
          balanceAvailable: 15000.00,
          balanceCurrent: 15000.00,
          lastUpdated: new Date(Date.now() - 60 * 60 * 1000),
        },
      });

      const creditAccount = await prisma.account.create({
        data: {
          id: '550e8400-e29b-41d4-a716-446655440012',
          userId: testUserId,
          plaidAccountId: 'test_account_3',
          connectionId: connection2.id,
          name: 'Test Credit Card',
          officialName: 'Test Credit Union Rewards Card',
          type: AccountType.CREDIT,
          subtype: 'credit card',
          balanceAvailable: 4750.00,
          balanceCurrent: -1250.00,
          balanceLimit: 6000.00,
          lastUpdated: new Date(Date.now() - 30 * 60 * 1000),
        },
      });

      // Create transactions
      const transactions = [
        // Checking account transactions
        {
          id: '550e8400-e29b-41d4-a716-446655440020',
          userId: testUserId,
          accountId: checkingAccount.id,
          plaidTransactionId: 'test_txn_1',
          amount: -45.67,
          date: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
          name: 'Grocery Store Purchase',
          merchantName: 'Fresh Market',
          category: ['Food and Drink', 'Groceries'],
          subcategory: 'Groceries',
          pending: false,
          accountOwner: 'Test User',
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440021',
          userId: testUserId,
          accountId: checkingAccount.id,
          plaidTransactionId: 'test_txn_2',
          amount: -12.50,
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
          name: 'Coffee Shop',
          merchantName: 'Local Coffee Co',
          category: ['Food and Drink', 'Restaurants'],
          subcategory: 'Coffee Shop',
          pending: false,
          accountOwner: 'Test User',
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440022',
          userId: testUserId,
          accountId: checkingAccount.id,
          plaidTransactionId: 'test_txn_3',
          amount: 2500.00,
          date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
          name: 'Salary Deposit',
          merchantName: 'Test Company Inc',
          category: ['Deposit', 'Payroll'],
          subcategory: 'Payroll',
          pending: false,
          accountOwner: 'Test User',
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440023',
          userId: testUserId,
          accountId: checkingAccount.id,
          plaidTransactionId: 'test_txn_4',
          amount: -89.99,
          date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
          name: 'Gas Station',
          merchantName: 'Shell',
          category: ['Transportation', 'Gas Stations'],
          subcategory: 'Gas Stations',
          pending: false,
          accountOwner: 'Test User',
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440024',
          userId: testUserId,
          accountId: checkingAccount.id,
          plaidTransactionId: 'test_txn_5',
          amount: -25.00,
          date: new Date(), // Today
          name: 'Pending ATM Withdrawal',
          merchantName: 'ATM',
          category: ['Transfer', 'ATM'],
          subcategory: 'ATM',
          pending: true,
          accountOwner: 'Test User',
        },
        // Savings account transactions
        {
          id: '550e8400-e29b-41d4-a716-446655440025',
          userId: testUserId,
          accountId: savingsAccount.id,
          plaidTransactionId: 'test_txn_6',
          amount: 500.00,
          date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
          name: 'Transfer from Checking',
          category: ['Transfer', 'Internal Transfer'],
          subcategory: 'Internal Transfer',
          pending: false,
          accountOwner: 'Test User',
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440026',
          userId: testUserId,
          accountId: savingsAccount.id,
          plaidTransactionId: 'test_txn_7',
          amount: 15.25,
          date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          name: 'Interest Payment',
          merchantName: 'Test Bank',
          category: ['Deposit', 'Interest'],
          subcategory: 'Interest',
          pending: false,
          accountOwner: 'Test User',
        },
        // Credit card transactions
        {
          id: '550e8400-e29b-41d4-a716-446655440027',
          userId: testUserId,
          accountId: creditAccount.id,
          plaidTransactionId: 'test_txn_8',
          amount: -150.00,
          date: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
          name: 'Online Shopping',
          merchantName: 'Amazon',
          category: ['Shops', 'Online'],
          subcategory: 'Online',
          pending: false,
          accountOwner: 'Test User',
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440028',
          userId: testUserId,
          accountId: creditAccount.id,
          plaidTransactionId: 'test_txn_9',
          amount: -75.50,
          date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
          name: 'Restaurant',
          merchantName: 'Fine Dining',
          category: ['Food and Drink', 'Restaurants'],
          subcategory: 'Restaurants',
          pending: false,
          accountOwner: 'Test User',
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440029',
          userId: testUserId,
          accountId: creditAccount.id,
          plaidTransactionId: 'test_txn_10',
          amount: -35.00,
          date: new Date(), // Today
          name: 'Pending Gas Purchase',
          merchantName: 'Chevron',
          category: ['Transportation', 'Gas Stations'],
          subcategory: 'Gas Stations',
          pending: true,
          accountOwner: 'Test User',
        },
      ];

      // Create all transactions
      await prisma.transaction.createMany({
        data: transactions,
      });

      // Add some older transactions for testing date ranges
      const olderTransactions = [
        {
          userId: testUserId,
          accountId: checkingAccount.id,
          plaidTransactionId: 'test_txn_old_1',
          amount: -1200.00,
          date: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000), // 35 days ago
          name: 'Rent Payment',
          merchantName: 'Property Management Co',
          category: ['Payment', 'Rent'],
          subcategory: 'Rent',
          pending: false,
          accountOwner: 'Test User',
        },
        {
          userId: testUserId,
          accountId: checkingAccount.id,
          plaidTransactionId: 'test_txn_old_2',
          amount: -85.00,
          date: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000), // 40 days ago
          name: 'Utility Bill',
          merchantName: 'Electric Company',
          category: ['Payment', 'Utilities'],
          subcategory: 'Electric',
          pending: false,
          accountOwner: 'Test User',
        },
        {
          userId: testUserId,
          accountId: checkingAccount.id,
          plaidTransactionId: 'test_txn_old_3',
          amount: 2500.00,
          date: new Date(Date.now() - 33 * 24 * 60 * 60 * 1000), // 33 days ago
          name: 'Previous Salary Deposit',
          merchantName: 'Test Company Inc',
          category: ['Deposit', 'Payroll'],
          subcategory: 'Payroll',
          pending: false,
          accountOwner: 'Test User',
        },
      ];

      await prisma.transaction.createMany({
        data: olderTransactions,
      });

      // Get final counts
      const connectionCount = await prisma.plaidConnection.count({
        where: { institutionName: { startsWith: 'Test' } },
      });
      const accountCount = await prisma.account.count({
        where: { userId: testUserId },
      });
      const transactionCount = await prisma.transaction.count({
        where: { userId: testUserId },
      });

      console.log(`Development seed data created:`);
      console.log(`  - ${connectionCount} Plaid connections`);
      console.log(`  - ${accountCount} accounts`);
      console.log(`  - ${transactionCount} transactions`);

      return {
        success: true,
        message: 'Development data seeded successfully',
        data: {
          connections: connectionCount,
          accounts: accountCount,
          transactions: transactionCount,
        },
      };
    } catch (error) {
      console.error('Failed to seed development data:', error);
      return {
        success: false,
        message: 'Failed to seed development data',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Verify seed data integrity
   */
  async verifySeedData(): Promise<{
    valid: boolean;
    connections: number;
    accounts: number;
    transactions: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    
    try {
      // Count test data
      const connections = await prisma.plaidConnection.count({
        where: { institutionName: { startsWith: 'Test' } },
      });
      
      const accounts = await prisma.account.count({
        where: {
          connection: {
            institutionName: { startsWith: 'Test' },
          },
        },
      });
      
      const transactions = await prisma.transaction.count({
        where: {
          account: {
            connection: {
              institutionName: { startsWith: 'Test' },
            },
          },
        },
      });

      // Validate relationships
      if (connections > 0 && accounts === 0) {
        errors.push('Found connections but no accounts');
      }
      
      if (accounts > 0 && transactions === 0) {
        errors.push('Found accounts but no transactions');
      }

      // Validate data integrity
      const orphanedAccounts = await prisma.account.count({
        where: {
          connection: null,
        },
      });
      
      if (orphanedAccounts > 0) {
        errors.push(`Found ${orphanedAccounts} orphaned accounts`);
      }

      const orphanedTransactions = await prisma.transaction.count({
        where: {
          account: null,
        },
      });
      
      if (orphanedTransactions > 0) {
        errors.push(`Found ${orphanedTransactions} orphaned transactions`);
      }

      const valid = errors.length === 0 && connections > 0;

      return {
        valid,
        connections,
        accounts,
        transactions,
        errors,
      };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown verification error');
      
      return {
        valid: false,
        connections: 0,
        accounts: 0,
        transactions: 0,
        errors,
      };
    }
  }
}

// Convenience functions
export async function seedDevelopmentData(): Promise<SeedResult> {
  const seeder = new PrismaSeeder();
  return seeder.seedDevelopmentData();
}

export async function clearTestData(): Promise<void> {
  const seeder = new PrismaSeeder();
  return seeder.clearTestData();
}

export async function verifySeedData() {
  const seeder = new PrismaSeeder();
  return seeder.verifySeedData();
}