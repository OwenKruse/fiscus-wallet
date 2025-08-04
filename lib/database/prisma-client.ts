// Prisma Client Setup for Plaid Integration
// Handles database connection and provides type-safe database operations

import { PrismaClient } from '@prisma/client';

// Global variable to store the Prisma client instance
declare global {
  var __prisma: PrismaClient | undefined;
}

// Create a singleton Prisma client instance
export const prisma = globalThis.__prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.NILEDB_URL,
    },
  },
});

// In development, store the client on the global object to prevent multiple instances
if (process.env.NODE_ENV === 'development') {
  globalThis.__prisma = prisma;
}

// Graceful shutdown (only in Node.js environment)
if (typeof process !== 'undefined' && process.on) {
  process.on('beforeExit', async () => {
    await prisma.$disconnect();
  });

  process.on('SIGINT', async () => {
    await prisma.$disconnect();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

// Export types for use in other files
export type {
  PlaidConnection,
  Account,
  Transaction,
  ConnectionStatus,
  AccountType,
} from '@prisma/client';

// Helper functions for common operations
export class PrismaHelpers {
  /**
   * Test database connection
   */
  static async testConnection(): Promise<boolean> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  }

  /**
   * Get database health information
   */
  static async getHealthInfo() {
    try {
      const startTime = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy' as const,
        responseTime,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        status: 'unhealthy' as const,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Execute raw SQL with proper error handling
   */
  static async executeRaw(sql: string, ...params: any[]) {
    try {
      return await prisma.$queryRawUnsafe(sql, ...params);
    } catch (error) {
      console.error('Raw SQL execution failed:', error);
      throw error;
    }
  }

  /**
   * Get connection statistics
   */
  static async getConnectionStats() {
    try {
      const connections = await prisma.$queryRaw`
        SELECT 
          count(*) as total_connections,
          count(*) FILTER (WHERE state = 'active') as active_connections,
          count(*) FILTER (WHERE state = 'idle') as idle_connections
        FROM pg_stat_activity 
        WHERE datname = current_database()
      ` as Array<{
        total_connections: bigint;
        active_connections: bigint;
        idle_connections: bigint;
      }>;

      return {
        total: Number(connections[0]?.total_connections || 0),
        active: Number(connections[0]?.active_connections || 0),
        idle: Number(connections[0]?.idle_connections || 0),
      };
    } catch (error) {
      console.error('Failed to get connection stats:', error);
      return {
        total: 0,
        active: 0,
        idle: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export default prisma;