// Nile Database Client with Connection Pooling and Error Handling

import { Pool, PoolClient, PoolConfig } from 'pg';
import { getNileConfig } from '../config';
import { NileClient, NileConfig, HealthCheck } from '../../types/nile';

export interface NileConnectionOptions {
  maxConnections?: number;
  connectionTimeoutMillis?: number;
  idleTimeoutMillis?: number;
  maxRetries?: number;
  retryDelayMs?: number;
  healthCheckIntervalMs?: number;
}

export class NileDBClient implements NileClient {
  private pool: Pool;
  private config: NileConfig;
  private options: Required<NileConnectionOptions>;
  private healthCheckTimer?: NodeJS.Timeout;
  private lastHealthCheck?: HealthCheck;

  constructor(options: NileConnectionOptions = {}) {
    this.config = getNileConfig();
    this.options = {
      maxConnections: options.maxConnections ?? 20,
      connectionTimeoutMillis: options.connectionTimeoutMillis ?? 30000,
      idleTimeoutMillis: options.idleTimeoutMillis ?? 30000,
      maxRetries: options.maxRetries ?? 3,
      retryDelayMs: options.retryDelayMs ?? 1000,
      healthCheckIntervalMs: options.healthCheckIntervalMs ?? 60000,
    };

    this.pool = this.createPool();
    this.startHealthCheck();
  }

  private createPool(): Pool {
    const poolConfig: PoolConfig = {
      connectionString: this.config.url,
      max: this.options.maxConnections,
      connectionTimeoutMillis: this.options.connectionTimeoutMillis,
      idleTimeoutMillis: this.options.idleTimeoutMillis,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    };

    const pool = new Pool(poolConfig);

    // Handle pool errors
    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });

    pool.on('connect', (client) => {
      console.log('New client connected to Nile DB');
    });

    pool.on('remove', (client) => {
      console.log('Client removed from Nile DB pool');
    });

    return pool;
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    retries: number = this.options.maxRetries
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (retries > 0 && this.isRetryableError(error)) {
        console.warn(`Database operation failed, retrying... (${retries} attempts left)`, error);
        await this.delay(this.options.retryDelayMs);
        return this.executeWithRetry(operation, retries - 1);
      }
      throw error;
    }
  }

  private isRetryableError(error: any): boolean {
    // Check for connection errors, timeouts, and temporary failures
    const retryableCodes = [
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'ENETUNREACH',
      'EAI_AGAIN',
    ];

    const retryableMessages = [
      'connection terminated',
      'server closed the connection',
      'timeout',
      'connection refused',
    ];

    if (error.code && retryableCodes.includes(error.code)) {
      return true;
    }

    if (error.message) {
      const message = error.message.toLowerCase();
      return retryableMessages.some(msg => message.includes(msg));
    }

    return false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    return this.executeWithRetry(async () => {
      const client = await this.pool.connect();
      try {
        const result = await client.query(sql, params);
        return result.rows as T[];
      } finally {
        client.release();
      }
    });
  }

  async queryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
    const results = await this.query<T>(sql, params);
    return results.length > 0 ? results[0] : null;
  }

  async executeUpdate(sql: string, params?: any[]): Promise<{ rowCount: number }> {
    return this.executeWithRetry(async () => {
      const client = await this.pool.connect();
      try {
        const result = await client.query(sql, params);
        return { rowCount: result.rowCount };
      } finally {
        client.release();
      }
    });
  }

  async transaction<T>(callback: (client: NileClient) => Promise<T>): Promise<T> {
    return this.executeWithRetry(async () => {
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');
        
        const transactionClient: NileClient = {
          query: async <U = any>(sql: string, params?: any[]): Promise<U[]> => {
            const result = await client.query(sql, params);
            return result.rows as U[];
          },
          queryOne: async <U = any>(sql: string, params?: any[]): Promise<U | null> => {
            const result = await client.query(sql, params);
            return result.rows.length > 0 ? result.rows[0] as U : null;
          },
          transaction: async <U>(cb: (c: NileClient) => Promise<U>): Promise<U> => {
            throw new Error('Nested transactions are not supported');
          },
          close: async (): Promise<void> => {
            // No-op for transaction client
          },
          // Add a method to execute UPDATE queries and return rowCount
          executeUpdate: async (sql: string, params?: any[]): Promise<{ rowCount: number }> => {
            const result = await client.query(sql, params);
            return { rowCount: result.rowCount };
          },
        };

        const result = await callback(transactionClient);
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    });
  }

  async healthCheck(): Promise<HealthCheck> {
    const startTime = Date.now();
    let status: HealthCheck['status'] = 'healthy';
    let databaseStatus: 'healthy' | 'unhealthy' = 'healthy';

    try {
      // Test basic connectivity
      await this.query('SELECT 1 as health_check');
      
      // Check pool status
      const poolInfo = {
        totalCount: this.pool.totalCount,
        idleCount: this.pool.idleCount,
        waitingCount: this.pool.waitingCount,
      };

      // Consider unhealthy if too many waiting connections
      if (poolInfo.waitingCount > this.options.maxConnections * 0.8) {
        status = 'degraded';
      }

    } catch (error) {
      console.error('Database health check failed:', error);
      status = 'unhealthy';
      databaseStatus = 'unhealthy';
    }

    const responseTime = Date.now() - startTime;
    
    const healthCheck: HealthCheck = {
      status,
      timestamp: new Date(),
      services: {
        database: databaseStatus,
        plaid: 'healthy', // Will be updated by other services
        cache: 'healthy', // Will be updated by other services
      },
      metrics: {
        responseTime,
        activeConnections: this.pool.totalCount - this.pool.idleCount,
        memoryUsage: process.memoryUsage().heapUsed,
      },
    };

    this.lastHealthCheck = healthCheck;
    return healthCheck;
  }

  getLastHealthCheck(): HealthCheck | undefined {
    return this.lastHealthCheck;
  }

  private startHealthCheck(): void {
    if (this.options.healthCheckIntervalMs > 0) {
      this.healthCheckTimer = setInterval(async () => {
        try {
          await this.healthCheck();
        } catch (error) {
          console.error('Scheduled health check failed:', error);
        }
      }, this.options.healthCheckIntervalMs);
    }
  }

  private stopHealthCheck(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }
  }

  async close(): Promise<void> {
    this.stopHealthCheck();
    await this.pool.end();
  }

  // Connection pool information
  getPoolInfo() {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
      maxConnections: this.options.maxConnections,
    };
  }

  // Test connection without executing a query
  async testConnection(): Promise<boolean> {
    try {
      const client = await this.pool.connect();
      client.release();
      return true;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }
}

// Singleton instance
let nileClientInstance: NileDBClient | null = null;

export function getNileClient(options?: NileConnectionOptions): NileDBClient {
  if (!nileClientInstance) {
    nileClientInstance = new NileDBClient(options);
  }
  return nileClientInstance;
}

export async function closeNileClient(): Promise<void> {
  if (nileClientInstance) {
    await nileClientInstance.close();
    nileClientInstance = null;
  }
}

// Export for testing
export { NileDBClient as _NileDBClient };