// Database Migration Runner
// Handles running SQL migration scripts with proper error handling and logging

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { getNileClient } from './nile-client';
import { NileClient } from '../../types/nile';

export interface MigrationResult {
  success: boolean;
  migrationName: string;
  executionTime: number;
  error?: string;
}

export interface MigrationStatus {
  id: string;
  name: string;
  executed_at: Date;
  execution_time_ms: number;
}

export class MigrationRunner {
  private client: NileClient;
  private migrationsPath: string;

  constructor(migrationsPath?: string) {
    this.client = getNileClient();
    this.migrationsPath = migrationsPath || join(process.cwd(), 'lib/database/migrations');
  }

  /**
   * Initialize the migrations table to track executed migrations
   */
  async initializeMigrationsTable(): Promise<void> {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        execution_time_ms INTEGER NOT NULL
      );
      
      CREATE INDEX IF NOT EXISTS idx_schema_migrations_name ON schema_migrations(name);
      CREATE INDEX IF NOT EXISTS idx_schema_migrations_executed_at ON schema_migrations(executed_at);
    `;

    try {
      await this.client.query(createTableSQL);
      console.log('Migrations table initialized successfully');
    } catch (error) {
      console.error('Failed to initialize migrations table:', error);
      throw error;
    }
  }

  /**
   * Get list of executed migrations
   */
  async getExecutedMigrations(): Promise<MigrationStatus[]> {
    try {
      const result = await this.client.query<MigrationStatus>(
        'SELECT name, executed_at, execution_time_ms FROM schema_migrations ORDER BY executed_at ASC'
      );
      return result;
    } catch (error) {
      console.error('Failed to get executed migrations:', error);
      throw error;
    }
  }

  /**
   * Get list of available migration files
   */
  getAvailableMigrations(): string[] {
    try {
      const files = readdirSync(this.migrationsPath);
      return files
        .filter(file => file.endsWith('.sql'))
        .sort(); // Ensure migrations run in order
    } catch (error) {
      console.error('Failed to read migrations directory:', error);
      throw error;
    }
  }

  /**
   * Get pending migrations that haven't been executed
   */
  async getPendingMigrations(): Promise<string[]> {
    const available = this.getAvailableMigrations();
    const executed = await this.getExecutedMigrations();
    const executedNames = new Set(executed.map(m => m.name));
    
    return available.filter(migration => !executedNames.has(migration));
  }

  /**
   * Execute a single migration file
   */
  async executeMigration(migrationName: string): Promise<MigrationResult> {
    const startTime = Date.now();
    
    try {
      console.log(`Executing migration: ${migrationName}`);
      
      // Read migration file
      const migrationPath = join(this.migrationsPath, migrationName);
      const migrationSQL = readFileSync(migrationPath, 'utf8');
      
      // Execute migration in a transaction
      await this.client.transaction(async (client) => {
        // Execute the migration SQL
        await client.query(migrationSQL);
        
        // Record the migration as executed
        const executionTime = Date.now() - startTime;
        await client.query(
          'INSERT INTO schema_migrations (name, execution_time_ms) VALUES ($1, $2)',
          [migrationName, executionTime]
        );
      });
      
      const executionTime = Date.now() - startTime;
      console.log(`Migration ${migrationName} completed successfully in ${executionTime}ms`);
      
      return {
        success: true,
        migrationName,
        executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      console.error(`Migration ${migrationName} failed after ${executionTime}ms:`, error);
      
      return {
        success: false,
        migrationName,
        executionTime,
        error: errorMessage,
      };
    }
  }

  /**
   * Run all pending migrations
   */
  async runPendingMigrations(): Promise<MigrationResult[]> {
    console.log('Starting migration process...');
    
    // Initialize migrations table
    await this.initializeMigrationsTable();
    
    // Get pending migrations
    const pendingMigrations = await this.getPendingMigrations();
    
    if (pendingMigrations.length === 0) {
      console.log('No pending migrations found');
      return [];
    }
    
    console.log(`Found ${pendingMigrations.length} pending migrations:`, pendingMigrations);
    
    const results: MigrationResult[] = [];
    
    // Execute each migration
    for (const migration of pendingMigrations) {
      const result = await this.executeMigration(migration);
      results.push(result);
      
      // Stop on first failure
      if (!result.success) {
        console.error(`Migration process stopped due to failure in: ${migration}`);
        break;
      }
    }
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`Migration process completed: ${successful} successful, ${failed} failed`);
    
    return results;
  }

  /**
   * Rollback a specific migration (if rollback script exists)
   */
  async rollbackMigration(migrationName: string): Promise<MigrationResult> {
    const startTime = Date.now();
    
    try {
      // Look for rollback file
      const rollbackName = migrationName.replace('.sql', '.rollback.sql');
      const rollbackPath = join(this.migrationsPath, rollbackName);
      
      let rollbackSQL: string;
      try {
        rollbackSQL = readFileSync(rollbackPath, 'utf8');
      } catch (error) {
        throw new Error(`Rollback file not found: ${rollbackName}`);
      }
      
      console.log(`Rolling back migration: ${migrationName}`);
      
      // Execute rollback in a transaction
      await this.client.transaction(async (client) => {
        // Execute the rollback SQL
        await client.query(rollbackSQL);
        
        // Remove the migration record
        await client.query(
          'DELETE FROM schema_migrations WHERE name = $1',
          [migrationName]
        );
      });
      
      const executionTime = Date.now() - startTime;
      console.log(`Migration ${migrationName} rolled back successfully in ${executionTime}ms`);
      
      return {
        success: true,
        migrationName,
        executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      console.error(`Rollback of ${migrationName} failed after ${executionTime}ms:`, error);
      
      return {
        success: false,
        migrationName,
        executionTime,
        error: errorMessage,
      };
    }
  }

  /**
   * Get migration status summary
   */
  async getMigrationStatus(): Promise<{
    executed: MigrationStatus[];
    pending: string[];
    total: number;
  }> {
    const executed = await this.getExecutedMigrations();
    const pending = await this.getPendingMigrations();
    const total = this.getAvailableMigrations().length;
    
    return {
      executed,
      pending,
      total,
    };
  }

  /**
   * Validate database schema against expected structure
   */
  async validateSchema(): Promise<{
    valid: boolean;
    missingTables: string[];
    missingIndexes: string[];
    errors: string[];
  }> {
    const expectedTables = ['plaid_connections', 'accounts', 'transactions', 'schema_migrations'];
    const expectedIndexes = [
      'idx_plaid_connections_user_id',
      'idx_accounts_user_id',
      'idx_transactions_user_id',
      'idx_transactions_user_date',
    ];
    
    const missingTables: string[] = [];
    const missingIndexes: string[] = [];
    const errors: string[] = [];
    
    try {
      // Check tables
      for (const table of expectedTables) {
        const result = await this.client.queryOne(
          `SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          )`,
          [table]
        );
        
        if (!result?.exists) {
          missingTables.push(table);
        }
      }
      
      // Check indexes
      for (const index of expectedIndexes) {
        const result = await this.client.queryOne(
          `SELECT EXISTS (
            SELECT FROM pg_indexes 
            WHERE schemaname = 'public' 
            AND indexname = $1
          )`,
          [index]
        );
        
        if (!result?.exists) {
          missingIndexes.push(index);
        }
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown validation error');
    }
    
    const valid = missingTables.length === 0 && missingIndexes.length === 0 && errors.length === 0;
    
    return {
      valid,
      missingTables,
      missingIndexes,
      errors,
    };
  }
}

// Convenience functions
export async function runMigrations(migrationsPath?: string): Promise<MigrationResult[]> {
  const runner = new MigrationRunner(migrationsPath);
  return runner.runPendingMigrations();
}

export async function getMigrationStatus(migrationsPath?: string) {
  const runner = new MigrationRunner(migrationsPath);
  return runner.getMigrationStatus();
}

export async function validateDatabaseSchema(migrationsPath?: string) {
  const runner = new MigrationRunner(migrationsPath);
  return runner.validateSchema();
}