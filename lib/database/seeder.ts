// Database Seeder
// Handles running seed scripts for development and testing

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { getNileClient } from './nile-client';
import { NileClient } from '../../types/nile';

export interface SeedResult {
  success: boolean;
  seedName: string;
  executionTime: number;
  error?: string;
}

export class DatabaseSeeder {
  private client: NileClient;
  private seedsPath: string;

  constructor(seedsPath?: string) {
    this.client = getNileClient();
    this.seedsPath = seedsPath || join(process.cwd(), 'lib/database/seeds');
  }

  /**
   * Get list of available seed files
   */
  getAvailableSeeds(): string[] {
    try {
      const files = readdirSync(this.seedsPath);
      return files
        .filter(file => file.endsWith('.sql'))
        .sort();
    } catch (error) {
      console.error('Failed to read seeds directory:', error);
      throw error;
    }
  }

  /**
   * Execute a single seed file
   */
  async executeSeed(seedName: string): Promise<SeedResult> {
    const startTime = Date.now();
    
    try {
      console.log(`Executing seed: ${seedName}`);
      
      // Read seed file
      const seedPath = join(this.seedsPath, seedName);
      const seedSQL = readFileSync(seedPath, 'utf8');
      
      // Execute seed in a transaction
      await this.client.transaction(async (client) => {
        // Split SQL by semicolons and execute each statement
        const statements = seedSQL
          .split(';')
          .map(stmt => stmt.trim())
          .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
        
        for (const statement of statements) {
          if (statement.trim()) {
            await client.query(statement);
          }
        }
      });
      
      const executionTime = Date.now() - startTime;
      console.log(`Seed ${seedName} completed successfully in ${executionTime}ms`);
      
      return {
        success: true,
        seedName,
        executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      console.error(`Seed ${seedName} failed after ${executionTime}ms:`, error);
      
      return {
        success: false,
        seedName,
        executionTime,
        error: errorMessage,
      };
    }
  }

  /**
   * Run all seed files
   */
  async runAllSeeds(): Promise<SeedResult[]> {
    console.log('Starting seeding process...');
    
    const availableSeeds = this.getAvailableSeeds();
    
    if (availableSeeds.length === 0) {
      console.log('No seed files found');
      return [];
    }
    
    console.log(`Found ${availableSeeds.length} seed files:`, availableSeeds);
    
    const results: SeedResult[] = [];
    
    // Execute each seed
    for (const seed of availableSeeds) {
      const result = await this.executeSeed(seed);
      results.push(result);
      
      // Continue even if one fails (seeds are often independent)
      if (!result.success) {
        console.warn(`Seed ${seed} failed, continuing with remaining seeds`);
      }
    }
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`Seeding process completed: ${successful} successful, ${failed} failed`);
    
    return results;
  }

  /**
   * Run development seeds only
   */
  async runDevelopmentSeeds(): Promise<SeedResult[]> {
    const developmentSeeds = this.getAvailableSeeds()
      .filter(seed => seed.includes('development') || seed.includes('dev'));
    
    if (developmentSeeds.length === 0) {
      console.log('No development seed files found');
      return [];
    }
    
    console.log('Running development seeds:', developmentSeeds);
    
    const results: SeedResult[] = [];
    
    for (const seed of developmentSeeds) {
      const result = await this.executeSeed(seed);
      results.push(result);
    }
    
    return results;
  }

  /**
   * Run test seeds only
   */
  async runTestSeeds(): Promise<SeedResult[]> {
    const testSeeds = this.getAvailableSeeds()
      .filter(seed => seed.includes('test') || seed.includes('spec'));
    
    if (testSeeds.length === 0) {
      console.log('No test seed files found');
      return [];
    }
    
    console.log('Running test seeds:', testSeeds);
    
    const results: SeedResult[] = [];
    
    for (const seed of testSeeds) {
      const result = await this.executeSeed(seed);
      results.push(result);
    }
    
    return results;
  }

  /**
   * Clear all test data (useful for cleaning up after tests)
   */
  async clearTestData(): Promise<void> {
    console.log('Clearing test data...');
    
    try {
      await this.client.transaction(async (client) => {
        // Delete in reverse order of dependencies
        await client.query(`
          DELETE FROM transactions 
          WHERE user_id IN (
            SELECT user_id FROM plaid_connections 
            WHERE institution_name LIKE 'Test%'
          )
        `);
        
        await client.query(`
          DELETE FROM accounts 
          WHERE user_id IN (
            SELECT user_id FROM plaid_connections 
            WHERE institution_name LIKE 'Test%'
          )
        `);
        
        await client.query(`
          DELETE FROM plaid_connections 
          WHERE institution_name LIKE 'Test%'
        `);
      });
      
      console.log('Test data cleared successfully');
    } catch (error) {
      console.error('Failed to clear test data:', error);
      throw error;
    }
  }

  /**
   * Verify seed data was created correctly
   */
  async verifySeedData(): Promise<{
    valid: boolean;
    connections: number;
    accounts: number;
    transactions: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let connections = 0;
    let accounts = 0;
    let transactions = 0;
    
    try {
      // Count test connections
      const connectionResult = await this.client.queryOne<{ count: string }>(
        "SELECT COUNT(*) as count FROM plaid_connections WHERE institution_name LIKE 'Test%'"
      );
      connections = parseInt(connectionResult?.count || '0', 10);
      
      // Count test accounts
      const accountResult = await this.client.queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM accounts 
         WHERE user_id IN (
           SELECT user_id FROM plaid_connections WHERE institution_name LIKE 'Test%'
         )`
      );
      accounts = parseInt(accountResult?.count || '0', 10);
      
      // Count test transactions
      const transactionResult = await this.client.queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM transactions 
         WHERE user_id IN (
           SELECT user_id FROM plaid_connections WHERE institution_name LIKE 'Test%'
         )`
      );
      transactions = parseInt(transactionResult?.count || '0', 10);
      
      // Validate relationships
      if (connections > 0 && accounts === 0) {
        errors.push('Found connections but no accounts');
      }
      
      if (accounts > 0 && transactions === 0) {
        errors.push('Found accounts but no transactions');
      }
      
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown verification error');
    }
    
    const valid = errors.length === 0 && connections > 0;
    
    return {
      valid,
      connections,
      accounts,
      transactions,
      errors,
    };
  }
}

// Convenience functions
export async function runSeeds(seedsPath?: string): Promise<SeedResult[]> {
  const seeder = new DatabaseSeeder(seedsPath);
  return seeder.runAllSeeds();
}

export async function runDevelopmentSeeds(seedsPath?: string): Promise<SeedResult[]> {
  const seeder = new DatabaseSeeder(seedsPath);
  return seeder.runDevelopmentSeeds();
}

export async function clearTestData(seedsPath?: string): Promise<void> {
  const seeder = new DatabaseSeeder(seedsPath);
  return seeder.clearTestData();
}

export async function verifySeedData(seedsPath?: string) {
  const seeder = new DatabaseSeeder(seedsPath);
  return seeder.verifySeedData();
}