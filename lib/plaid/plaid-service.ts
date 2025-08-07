// Plaid Service Layer with API Integration

import { 
  PlaidApi, 
  Configuration, 
  PlaidEnvironments,
  LinkTokenCreateRequest,
  ItemPublicTokenExchangeRequest,
  AccountsGetRequest,
  TransactionsGetRequest,
  ItemRemoveRequest,
  PlaidError as PlaidAPIError,
  CountryCode,
  Products,
  LinkTokenCreateResponse,
  ItemPublicTokenExchangeResponse,
  AccountsGetResponse,
  TransactionsGetResponse,
  ItemRemoveResponse,
} from 'plaid';
import crypto from 'crypto';
import { getPlaidConfig } from '../config';
import { getNileClient } from '../database/nile-client';
import { encryptToken, decryptToken } from '../encryption/token-encryption';
import { 
  PlaidServiceResponse, 
  PlaidConnectionResult, 
  PlaidAccount, 
  PlaidTransaction,
  PlaidError,
  SyncResult,
  SyncOptions,
  TransactionFilters,
  PlaidConnection,
  Account,
  Transaction,
} from '../../types';

export interface PlaidServiceOptions {
  maxRetries?: number;
  retryDelayMs?: number;
  requestTimeoutMs?: number;
}

export interface TransactionOptions {
  startDate?: Date;
  endDate?: Date;
  accountIds?: string[];
  count?: number;
  offset?: number;
}

export class PlaidService {
  private client: PlaidApi;
  private config: ReturnType<typeof getPlaidConfig>;
  private options: Required<PlaidServiceOptions>;
  private dbClient = getNileClient();

  constructor(options: PlaidServiceOptions = {}) {
    this.config = getPlaidConfig();
    this.options = {
      maxRetries: options.maxRetries ?? 3,
      retryDelayMs: options.retryDelayMs ?? 1000,
      requestTimeoutMs: options.requestTimeoutMs ?? 30000,
    };

    // Initialize Plaid client
    const configuration = new Configuration({
      basePath: this.getPlaidEnvironment(),
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': this.config.clientId,
          'PLAID-SECRET': this.config.secretKey,
        },
        timeout: this.options.requestTimeoutMs,
      },
    });

    this.client = new PlaidApi(configuration);
  }

  private getPlaidEnvironment(): string {
    switch (this.config.environment) {
      case 'sandbox':
        return PlaidEnvironments.sandbox;
      case 'development':
        return PlaidEnvironments.development;
      case 'production':
        return PlaidEnvironments.production;
      default:
        return PlaidEnvironments.sandbox;
    }
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    retries: number = this.options.maxRetries
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (retries > 0 && this.isRetryableError(error)) {
        console.warn(`Plaid API operation failed, retrying... (${retries} attempts left)`, error);
        await this.delay(this.options.retryDelayMs * (this.options.maxRetries - retries + 1));
        return this.executeWithRetry(operation, retries - 1);
      }
      throw this.transformError(error);
    }
  }

  private isRetryableError(error: any): boolean {
    // Check for rate limiting and temporary errors
    if (error?.response?.status) {
      const status = error.response.status;
      return status === 429 || status >= 500;
    }

    // Check for network errors
    const retryableCodes = [
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'ENETUNREACH',
    ];

    return error.code && retryableCodes.includes(error.code);
  }

  private transformError(error: any): PlaidError {
    if (error?.response?.data?.error_code) {
      const plaidError = error.response.data as PlaidAPIError;
      return {
        error_type: plaidError.error_type,
        error_code: plaidError.error_code,
        error_message: plaidError.error_message,
        display_message: plaidError.display_message,
        request_id: plaidError.request_id,
        causes: plaidError.causes || [],
        status: error.response.status,
        documentation_url: plaidError.documentation_url,
        suggested_action: plaidError.suggested_action,
      };
    }

    // Transform generic errors
    return {
      error_type: 'API_ERROR',
      error_code: 'INTERNAL_SERVER_ERROR',
      error_message: error.message || 'An unexpected error occurred',
      display_message: 'Something went wrong. Please try again.',
      request_id: '',
      causes: [],
      status: error?.response?.status || 500,
      documentation_url: '',
      suggested_action: null,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Creates a link token for Plaid Link initialization
   * @param userId - The user ID for the link token
   * @param products - Optional array of products to enable (defaults to config products)
   * @returns Promise resolving to the link token
   */
  async createLinkToken(userId: string, products?: string[]): Promise<string> {
    const request: LinkTokenCreateRequest = {
      user: {
        client_user_id: userId,
      },
      client_name: 'Fiscus Financial Tracker',
      products: (products || this.config.products) as Products[],
      country_codes: this.config.countryCodes as CountryCode[],
      language: 'en',
    };

    const response = await this.executeWithRetry(async () => {
      const result = await this.client.linkTokenCreate(request);
      return result.data;
    });

    return response.link_token;
  }

  /**
   * Exchanges a public token for an access token and stores the connection
   * @param publicToken - The public token from Plaid Link
   * @param userId - The user ID to associate with the connection
   * @returns Promise resolving to connection result
   */
  async exchangePublicToken(publicToken: string, userId: string): Promise<PlaidConnectionResult> {
    const request: ItemPublicTokenExchangeRequest = {
      public_token: publicToken,
    };

    const exchangeResponse = await this.executeWithRetry(async () => {
      const result = await this.client.itemPublicTokenExchange(request);
      return result.data;
    });

    // Get accounts information
    const accountsResponse = await this.getAccountsFromPlaid(exchangeResponse.access_token);

    // Get institution information
    const institutionId = accountsResponse.item.institution_id!;
    const institutionName = await this.getInstitutionName(institutionId);

    // Encrypt and store the access token
    let encryptedToken: string;
    try {
      encryptedToken = encryptToken(exchangeResponse.access_token);
    } catch (error) {
      console.error('Token encryption failed:', error);
      throw new Error('Failed to encrypt access token. Please check encryption configuration.');
    }

    // Store connection in database
    await this.dbClient.transaction(async (client) => {
      // Generate a UUID for the connection
      const connectionId = crypto.randomUUID();
      
      // Insert plaid connection
      await client.query(`
        INSERT INTO plaid_connections (
          id, user_id, item_id, access_token, institution_id, institution_name, 
          accounts, status, last_sync, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW(), NOW())
        ON CONFLICT (user_id, item_id) 
        DO UPDATE SET 
          access_token = EXCLUDED.access_token,
          status = EXCLUDED.status,
          updated_at = NOW()
      `, [
        connectionId,
        userId,
        exchangeResponse.item_id,
        encryptedToken,
        institutionId,
        institutionName,
        accountsResponse.accounts.map(acc => acc.account_id),
        'active'
      ]);

      // Get the connection ID
      const connection = await client.queryOne<{ id: string }>(`
        SELECT id FROM plaid_connections 
        WHERE user_id = $1 AND item_id = $2
      `, [userId, exchangeResponse.item_id]);

      if (!connection) {
        throw new Error('Failed to retrieve stored connection');
      }

      // Store accounts
      for (const account of accountsResponse.accounts) {
        const accountId = crypto.randomUUID();
        await client.query(`
          INSERT INTO accounts (
            id, user_id, plaid_account_id, connection_id, name, official_name,
            type, subtype, balance_available, balance_current, balance_limit,
            last_updated, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW(), NOW())
          ON CONFLICT (user_id, plaid_account_id)
          DO UPDATE SET
            name = EXCLUDED.name,
            official_name = EXCLUDED.official_name,
            balance_available = EXCLUDED.balance_available,
            balance_current = EXCLUDED.balance_current,
            balance_limit = EXCLUDED.balance_limit,
            last_updated = NOW(),
            updated_at = NOW()
        `, [
          accountId,
          userId,
          account.account_id,
          connection.id,
          account.name,
          account.official_name,
          account.type,
          account.subtype,
          account.balances.available,
          account.balances.current,
          account.balances.limit
        ]);
      }
    });

    return {
      accessToken: exchangeResponse.access_token,
      itemId: exchangeResponse.item_id,
      institutionId,
      institutionName,
      accounts: accountsResponse.accounts,
    };
  }

  /**
   * Fetches accounts for a user from cached data
   * @param userId - The user ID
   * @returns Promise resolving to user's accounts
   */
  async getAccounts(userId: string): Promise<Account[]> {
    const accounts = await this.dbClient.query<Account>(`
      SELECT 
        a.id,
        a.user_id,
        a.plaid_account_id,
        a.connection_id,
        a.name,
        a.official_name,
        a.type,
        a.subtype,
        jsonb_build_object(
          'available', a.balance_available,
          'current', a.balance_current,
          'limit', a.balance_limit
        ) as balance,
        a.last_updated,
        a.created_at,
        a.updated_at
      FROM accounts a
      JOIN plaid_connections pc ON a.connection_id = pc.id
      WHERE a.user_id = $1 AND pc.status = 'active'
      ORDER BY a.created_at DESC
    `, [userId]);

    return accounts;
  }

  /**
   * Fetches accounts for a user with institution information
   * @param userId - The user ID
   * @returns Promise resolving to user's accounts with institution names
   */
  async getAccountsWithInstitution(userId: string): Promise<(Account & { institutionName: string })[]> {
    const accounts = await this.dbClient.query<Account & { institutionName: string }>(`
      SELECT 
        a.id,
        a.user_id,
        a.plaid_account_id,
        a.connection_id,
        a.name,
        a.official_name,
        a.type,
        a.subtype,
        jsonb_build_object(
          'available', a.balance_available,
          'current', a.balance_current,
          'limit', a.balance_limit
        ) as balance,
        COALESCE(a.last_updated, a.updated_at, a.created_at) as last_updated,
        a.created_at,
        a.updated_at,
        pc.institution_name as "institutionName"
      FROM accounts a
      JOIN plaid_connections pc ON a.connection_id = pc.id
      WHERE a.user_id = $1 AND pc.status = 'active'
      ORDER BY a.created_at DESC
    `, [userId]);

    return accounts;
  }

  /**
   * Fetches transactions for a user with optional filtering
   * @param userId - The user ID
   * @param options - Transaction filtering options
   * @returns Promise resolving to user's transactions
   */
  async getTransactions(userId: string, options: TransactionOptions = {}): Promise<Transaction[]> {
    const {
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      endDate = new Date(),
      accountIds,
      count = 100,
      offset = 0
    } = options;

    let query = `
      SELECT 
        t.id,
        t.user_id,
        t.account_id,
        t.plaid_transaction_id,
        t.amount,
        t.date,
        t.name,
        t.merchant_name,
        t.category,
        t.subcategory,
        t.pending,
        t.account_owner,
        t.created_at,
        t.updated_at
      FROM transactions t
      JOIN accounts a ON t.account_id = a.id
      JOIN plaid_connections pc ON a.connection_id = pc.id
      WHERE t.user_id = $1 AND pc.status = 'active'
        AND t.date >= $2 AND t.date <= $3
    `;

    const params: any[] = [userId, startDate, endDate];

    if (accountIds && accountIds.length > 0) {
      query += ` AND a.plaid_account_id = ANY($${params.length + 1})`;
      params.push(accountIds);
    }

    query += ` ORDER BY t.date DESC, t.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(count, offset);

    const transactions = await this.dbClient.query<Transaction>(query, params);
    return transactions;
  }

  /**
   * Synchronizes transaction data from Plaid API
   * @param userId - The user ID
   * @param options - Sync options
   * @returns Promise resolving to sync result
   */
  async syncTransactions(userId: string, options: SyncOptions = {}): Promise<SyncResult> {
    const {
      forceRefresh = false,
      accountIds,
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate = new Date()
    } = options;

    const result: SyncResult = {
      success: false,
      accountsUpdated: 0,
      transactionsAdded: 0,
      transactionsUpdated: 0,
      errors: [],
      lastSyncTime: new Date(),
    };

    try {
      // Get user's connections
      const connections = await this.dbClient.query<PlaidConnection>(`
        SELECT 
          id,
          user_id as "userId",
          item_id as "itemId", 
          access_token as "accessToken",
          institution_id as "institutionId",
          institution_name as "institutionName",
          accounts,
          status,
          last_sync as "lastSync",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM plaid_connections 
        WHERE user_id = $1 AND status = 'active'
      `, [userId]);

      for (const connection of connections) {
        try {
          const decryptedToken = decryptToken(connection.accessToken);
          
          // Fetch fresh account data
          const accountsResponse = await this.getAccountsFromPlaid(decryptedToken);
          
          // Update account balances
          for (const plaidAccount of accountsResponse.accounts) {
            if (!accountIds || accountIds.includes(plaidAccount.account_id)) {
              await this.dbClient.query(`
                UPDATE accounts SET
                  balance_available = $1,
                  balance_current = $2,
                  balance_limit = $3,
                  last_updated = NOW(),
                  updated_at = NOW()
                WHERE user_id = $4 AND plaid_account_id = $5
              `, [
                plaidAccount.balances.available,
                plaidAccount.balances.current,
                plaidAccount.balances.limit,
                userId,
                plaidAccount.account_id
              ]);
              result.accountsUpdated++;
            }
          }

          // Fetch transactions
          const transactionsResponse = await this.getTransactionsFromPlaid(
            decryptedToken,
            startDate,
            endDate,
            accountIds
          );

          // Store transactions
          for (const plaidTransaction of transactionsResponse.transactions) {
            try {
              const accountRecord = await this.dbClient.queryOne<{ id: string }>(`
                SELECT id FROM accounts 
                WHERE user_id = $1 AND plaid_account_id = $2
              `, [userId, plaidTransaction.account_id]);

              if (!accountRecord) {
                result.errors.push(`Account not found for transaction ${plaidTransaction.transaction_id}`);
                continue;
              }

              // Use upsert to handle duplicates gracefully
              const transactionId = crypto.randomUUID();
              const upsertResult = await this.dbClient.query(`
                INSERT INTO transactions (
                  id, user_id, account_id, plaid_transaction_id, amount, date,
                  name, merchant_name, category, subcategory, pending,
                  account_owner, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
                ON CONFLICT (user_id, plaid_transaction_id) 
                DO UPDATE SET
                  amount = EXCLUDED.amount,
                  name = EXCLUDED.name,
                  merchant_name = EXCLUDED.merchant_name,
                  category = EXCLUDED.category,
                  subcategory = EXCLUDED.subcategory,
                  pending = EXCLUDED.pending,
                  account_owner = EXCLUDED.account_owner,
                  updated_at = NOW()
                RETURNING (xmax = 0) AS inserted
              `, [
                transactionId,
                userId,
                accountRecord.id,
                plaidTransaction.transaction_id,
                plaidTransaction.amount,
                new Date(plaidTransaction.date),
                plaidTransaction.name,
                plaidTransaction.merchant_name,
                plaidTransaction.category,
                plaidTransaction.personal_finance_category?.detailed,
                plaidTransaction.pending,
                plaidTransaction.account_owner
              ]);

              // Check if it was an insert or update
              if (upsertResult.length > 0 && upsertResult[0].inserted) {
                result.transactionsAdded++;
              } else {
                result.transactionsUpdated++;
              }
            } catch (transactionError) {
              const errorMessage = `Failed to upsert transaction ${plaidTransaction.transaction_id}: ${transactionError instanceof Error ? transactionError.message : 'Unknown error'}`;
              result.errors.push(errorMessage);
              console.error(errorMessage, transactionError);
            }
          }

          // Update connection last sync time
          await this.dbClient.query(`
            UPDATE plaid_connections SET last_sync = NOW(), updated_at = NOW()
            WHERE id = $1
          `, [connection.id]);

        } catch (error) {
          const errorMessage = `Failed to sync connection ${connection.itemId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          result.errors.push(errorMessage);
          console.error(errorMessage, error);
        }
      }

      result.success = result.errors.length === 0;
      return result;

    } catch (error) {
      result.errors.push(`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('Transaction sync failed:', error);
      return result;
    }
  }

  /**
   * Revokes access to a Plaid item and removes associated data
   * @param itemId - The Plaid item ID
   * @param userId - The user ID
   * @returns Promise resolving when access is revoked
   */
  async revokeAccess(itemId: string, userId: string): Promise<void> {
    // Get the connection
    const connection = await this.dbClient.queryOne<PlaidConnection>(`
      SELECT 
        id,
        user_id as "userId",
        item_id as "itemId", 
        access_token as "accessToken",
        institution_id as "institutionId",
        institution_name as "institutionName",
        accounts,
        status,
        last_sync as "lastSync",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM plaid_connections 
      WHERE user_id = $1 AND item_id = $2
    `, [userId, itemId]);

    if (!connection) {
      throw new Error('Connection not found');
    }

    try {
      // Revoke access with Plaid
      const decryptedToken = decryptToken(connection.accessToken);
      const request: ItemRemoveRequest = {
        access_token: decryptedToken,
      };

      await this.executeWithRetry(async () => {
        await this.client.itemRemove(request);
      });
    } catch (error) {
      console.warn('Failed to revoke Plaid access, proceeding with local cleanup:', error);
    }

    // Remove data from database
    await this.dbClient.transaction(async (client) => {
      // Delete transactions
      await client.query(`
        DELETE FROM transactions 
        WHERE account_id IN (
          SELECT id FROM accounts WHERE connection_id = $1
        )
      `, [connection.id]);

      // Delete accounts
      await client.query(`
        DELETE FROM accounts WHERE connection_id = $1
      `, [connection.id]);

      // Update connection status
      await client.query(`
        UPDATE plaid_connections SET 
          status = 'disconnected',
          updated_at = NOW()
        WHERE id = $1
      `, [connection.id]);
    });
  }

  // Private helper methods

  private async getAccountsFromPlaid(accessToken: string): Promise<AccountsGetResponse> {
    const request: AccountsGetRequest = {
      access_token: accessToken,
    };

    return this.executeWithRetry(async () => {
      const result = await this.client.accountsGet(request);
      return result.data;
    });
  }

  private async getTransactionsFromPlaid(
    accessToken: string,
    startDate: Date,
    endDate: Date,
    accountIds?: string[]
  ): Promise<TransactionsGetResponse> {
    const request: TransactionsGetRequest = {
      access_token: accessToken,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      options: {
        count: 500,
        offset: 0,
        account_ids: accountIds,
        include_personal_finance_category: true,
      },
    };

    return this.executeWithRetry(async () => {
      const result = await this.client.transactionsGet(request);
      return result.data;
    });
  }

  private async getInstitutionName(institutionId: string): Promise<string> {
    try {
      const result = await this.client.institutionsGetById({
        institution_id: institutionId,
        country_codes: this.config.countryCodes as CountryCode[],
      });
      return result.data.institution.name;
    } catch (error) {
      console.warn(`Failed to get institution name for ${institutionId}:`, error);
      return 'Unknown Institution';
    }
  }
}

// Singleton instance
let plaidServiceInstance: PlaidService | null = null;

export function getPlaidService(options?: PlaidServiceOptions): PlaidService {
  if (!plaidServiceInstance) {
    plaidServiceInstance = new PlaidService(options);
  }
  return plaidServiceInstance;
}

// Export for testing
export { PlaidService as _PlaidService };