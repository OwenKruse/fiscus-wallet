#!/usr/bin/env tsx

import { readFileSync } from 'fs';
import { getNileClient } from '../lib/database/nile-client';

async function runSQLMigration() {
  try {
    console.log('🔄 Running SQL migration...');
    
    // Read the migration file
    const migrationSQL = readFileSync('lib/database/migrations/001_create_plaid_tables_minimal.sql', 'utf8');
    
    // Get database client
    const client = getNileClient();
    
    // Execute the migration
    await client.query(migrationSQL);
    
    console.log('✅ SQL migration completed successfully');
    
  } catch (error) {
    console.error('❌ SQL migration failed:', error);
    process.exit(1);
  }
}

runSQLMigration();