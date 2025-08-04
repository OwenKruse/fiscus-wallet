#!/usr/bin/env tsx
// Script to run only the goals system migration

import { MigrationRunner } from '../lib/database/migration-runner';
import { join } from 'path';

async function main() {
  try {
    console.log('Running goals system migration...');
    
    const runner = new MigrationRunner();
    
    // Initialize migrations table
    await runner.initializeMigrationsTable();
    
    // Check if goals migration is pending
    const pending = await runner.getPendingMigrations();
    const goalsMigration = pending.find(m => m.includes('004_create_goals_tables.sql'));
    
    if (!goalsMigration) {
      console.log('Goals migration already executed or not found');
      return;
    }
    
    console.log(`Found goals migration: ${goalsMigration}`);
    
    // Execute only the goals migration
    const result = await runner.executeMigration(goalsMigration);
    
    if (result.success) {
      console.log(`✅ ${result.migrationName} completed in ${result.executionTime}ms`);
      console.log('Goals system database schema created successfully!');
    } else {
      console.error(`❌ ${result.migrationName} failed: ${result.error}`);
      process.exit(1);
    }
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

main();