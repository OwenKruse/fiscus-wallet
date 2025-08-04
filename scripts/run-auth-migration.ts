#!/usr/bin/env tsx
// Run Auth Migration Script

import { MigrationRunner } from '../lib/database/migration-runner';

async function main() {
  console.log('🔄 Running auth migration...');
  
  try {
    const runner = new MigrationRunner();
    
    // Initialize migrations table
    await runner.initializeMigrationsTable();
    
    // Run the auth migration specifically
    const result = await runner.executeMigration('002_create_auth_tables.sql');
    
    if (result.success) {
      console.log('✅ Auth migration completed successfully');
      console.log(`   Execution time: ${result.executionTime}ms`);
    } else {
      console.error('❌ Auth migration failed:', result.error);
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Migration script failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);