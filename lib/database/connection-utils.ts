// Database Connection Utilities with Error Handling and Retry Logic

import { getNileClient, closeNileClient, NileConnectionOptions } from './nile-client';
import { NileClient, HealthCheck } from '../../types/nile';

export interface ConnectionUtilsOptions extends NileConnectionOptions {
  enableLogging?: boolean;
  logLevel?: 'error' | 'warn' | 'info' | 'debug';
}

export class DatabaseConnectionUtils {
  private client: NileClient;
  private options: ConnectionUtilsOptions;

  constructor(options: ConnectionUtilsOptions = {}) {
    this.options = {
      enableLogging: options.enableLogging ?? true,
      logLevel: options.logLevel ?? 'info',
      ...options,
    };
    
    this.client = getNileClient(options);
  }

  private log(level: 'error' | 'warn' | 'info' | 'debug', message: string, ...args: any[]): void {
    if (!this.options.enableLogging) return;

    const levels = ['error', 'warn', 'info', 'debug'];
    const currentLevelIndex = levels.indexOf(this.options.logLevel!);
    const messageLevelIndex = levels.indexOf(level);

    if (messageLevelIndex <= currentLevelIndex) {
      console[level](`[DatabaseConnectionUtils] ${message}`, ...args);
    }
  }

  /**
   * Execute a database query with automatic error handling and logging
   */
  async executeQuery<T = any>(
    sql: string, 
    params?: any[], 
    context?: string
  ): Promise<T[]> {
    const startTime = Date.now();
    const queryContext = context || 'unknown';

    try {
      this.log('debug', `Executing query [${queryContext}]:`, sql, params);
      
      const result = await this.client.query<T>(sql, params);
      const duration = Date.now() - startTime;
      
      this.log('debug', `Query completed [${queryContext}] in ${duration}ms, returned ${result.length} rows`);
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.log('error', `Query failed [${queryContext}] after ${duration}ms:`, error);
      
      // Enhance error with context
      const enhancedError = new Error(
        `Database query failed in context '${queryContext}': ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      enhancedError.cause = error;
      
      throw enhancedError;
    }
  }

  /**
   * Execute a query that returns a single row
   */
  async executeQueryOne<T = any>(
    sql: string, 
    params?: any[], 
    context?: string
  ): Promise<T | null> {
    const startTime = Date.now();
    const queryContext = context || 'unknown';

    try {
      this.log('debug', `Executing single-row query [${queryContext}]:`, sql, params);
      
      const result = await this.client.queryOne<T>(sql, params);
      const duration = Date.now() - startTime;
      
      this.log('debug', `Single-row query completed [${queryContext}] in ${duration}ms, returned ${result ? '1' : '0'} row`);
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.log('error', `Single-row query failed [${queryContext}] after ${duration}ms:`, error);
      
      const enhancedError = new Error(
        `Database single-row query failed in context '${queryContext}': ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      enhancedError.cause = error;
      
      throw enhancedError;
    }
  }

  /**
   * Execute multiple queries in a transaction
   */
  async executeTransaction<T>(
    callback: (client: NileClient) => Promise<T>,
    context?: string
  ): Promise<T> {
    const startTime = Date.now();
    const transactionContext = context || 'unknown';

    try {
      this.log('info', `Starting transaction [${transactionContext}]`);
      
      const result = await this.client.transaction(callback);
      const duration = Date.now() - startTime;
      
      this.log('info', `Transaction completed [${transactionContext}] in ${duration}ms`);
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.log('error', `Transaction failed [${transactionContext}] after ${duration}ms:`, error);
      
      const enhancedError = new Error(
        `Database transaction failed in context '${transactionContext}': ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      enhancedError.cause = error;
      
      throw enhancedError;
    }
  }

  /**
   * Test database connectivity
   */
  async testConnection(): Promise<boolean> {
    try {
      this.log('info', 'Testing database connection...');
      
      const result = await this.executeQuery('SELECT 1 as test', [], 'connection-test');
      const isConnected = result.length > 0 && result[0].test === 1;
      
      this.log('info', `Database connection test ${isConnected ? 'passed' : 'failed'}`);
      
      return isConnected;
    } catch (error) {
      this.log('error', 'Database connection test failed:', error);
      return false;
    }
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(): Promise<HealthCheck> {
    try {
      this.log('info', 'Performing database health check...');
      
      const healthCheck = await (this.client as any).healthCheck?.() || {
        status: 'unknown' as const,
        timestamp: new Date(),
        services: {
          database: 'unknown' as const,
          plaid: 'unknown' as const,
          cache: 'unknown' as const,
        },
      };
      
      this.log('info', `Health check completed with status: ${healthCheck.status}`);
      
      return healthCheck;
    } catch (error) {
      this.log('error', 'Health check failed:', error);
      
      return {
        status: 'unhealthy',
        timestamp: new Date(),
        services: {
          database: 'unhealthy',
          plaid: 'unknown',
          cache: 'unknown',
        },
      };
    }
  }

  /**
   * Get connection pool information
   */
  getConnectionInfo(): any {
    try {
      return (this.client as any).getPoolInfo?.() || {
        status: 'unknown',
        message: 'Pool information not available',
      };
    } catch (error) {
      this.log('error', 'Failed to get connection info:', error);
      return {
        status: 'error',
        message: 'Failed to retrieve connection information',
      };
    }
  }

  /**
   * Execute a query with pagination support
   */
  async executeQueryWithPagination<T = any>(
    baseQuery: string,
    params: any[] = [],
    page: number = 1,
    limit: number = 50,
    context?: string
  ): Promise<{ data: T[]; total: number; hasMore: boolean }> {
    const offset = (page - 1) * limit;
    const queryContext = context || 'paginated-query';

    try {
      // Get total count
      const countQuery = `SELECT COUNT(*) as total FROM (${baseQuery}) as count_query`;
      const countResult = await this.executeQueryOne<{ total: string }>(
        countQuery, 
        params, 
        `${queryContext}-count`
      );
      const total = parseInt(countResult?.total || '0', 10);

      // Get paginated data
      const dataQuery = `${baseQuery} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      const dataParams = [...params, limit, offset];
      const data = await this.executeQuery<T>(dataQuery, dataParams, `${queryContext}-data`);

      const hasMore = offset + data.length < total;

      this.log('debug', `Paginated query [${queryContext}] returned ${data.length} of ${total} total rows`);

      return { data, total, hasMore };
    } catch (error) {
      this.log('error', `Paginated query failed [${queryContext}]:`, error);
      throw error;
    }
  }

  /**
   * Execute a batch of queries in a single transaction
   */
  async executeBatch(
    queries: Array<{ sql: string; params?: any[]; context?: string }>,
    transactionContext?: string
  ): Promise<any[]> {
    return this.executeTransaction(async (client) => {
      const results: any[] = [];
      
      for (const query of queries) {
        const result = await client.query(query.sql, query.params);
        results.push(result);
        
        this.log('debug', `Batch query completed [${query.context || 'unknown'}]: ${result.length} rows affected`);
      }
      
      return results;
    }, transactionContext || 'batch-execution');
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    try {
      this.log('info', 'Closing database connection...');
      await closeNileClient();
      this.log('info', 'Database connection closed successfully');
    } catch (error) {
      this.log('error', 'Failed to close database connection:', error);
      throw error;
    }
  }
}

// Singleton instance for convenience
let connectionUtilsInstance: DatabaseConnectionUtils | null = null;

export function getConnectionUtils(options?: ConnectionUtilsOptions): DatabaseConnectionUtils {
  if (!connectionUtilsInstance) {
    connectionUtilsInstance = new DatabaseConnectionUtils(options);
  }
  return connectionUtilsInstance;
}

export async function closeConnectionUtils(): Promise<void> {
  if (connectionUtilsInstance) {
    await connectionUtilsInstance.close();
    connectionUtilsInstance = null;
  }
}

// Utility functions for common database operations
export async function withDatabase<T>(
  operation: (utils: DatabaseConnectionUtils) => Promise<T>,
  options?: ConnectionUtilsOptions
): Promise<T> {
  const utils = new DatabaseConnectionUtils(options);
  try {
    return await operation(utils);
  } finally {
    await utils.close();
  }
}

export async function withTransaction<T>(
  operation: (client: NileClient) => Promise<T>,
  context?: string,
  options?: ConnectionUtilsOptions
): Promise<T> {
  const utils = new DatabaseConnectionUtils(options);
  try {
    return await utils.executeTransaction(operation, context);
  } finally {
    await utils.close();
  }
}

// Export for testing
export { DatabaseConnectionUtils as _DatabaseConnectionUtils };