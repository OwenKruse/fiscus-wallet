#!/usr/bin/env tsx

/**
 * User Settings Migration Runner
 * 
 * This script applies the user settings database migration and validates the schema.
 * It can be run standalone or as part of the broader migration process.
 */

import { MigrationRunner } from '../lib/database/migration-runner';
import { getNileClient } from '../lib/database/nile-client';

async function runUserSettingsMigration() {
  console.log('🚀 Starting user settings migration...');
  
  try {
    // Initialize migration runner
    const runner = new MigrationRunner();
    
    // Check current migration status
    console.log('📊 Checking migration status...');
    const status = await runner.getMigrationStatus();
    
    console.log(`Total migrations available: ${status.total}`);
    console.log(`Executed migrations: ${status.executed.length}`);
    console.log(`Pending migrations: ${status.pending.length}`);
    
    if (status.pending.length === 0) {
      console.log('✅ No pending migrations found');
      return;
    }
    
    // Check if user settings migration is pending
    const userSettingsMigration = '006_create_user_settings_tables.sql';
    const isUserSettingsPending = status.pending.includes(userSettingsMigration);
    
    if (!isUserSettingsPending) {
      console.log(`ℹ️  User settings migration (${userSettingsMigration}) already executed`);
      
      // Show executed migrations
      const executedUserSettings = status.executed.find(m => m.name === userSettingsMigration);
      if (executedUserSettings) {
        console.log(`   Executed at: ${executedUserSettings.executed_at}`);
        console.log(`   Execution time: ${executedUserSettings.execution_time_ms}ms`);
      }
      return;
    }
    
    console.log(`🔄 Executing user settings migration: ${userSettingsMigration}`);
    
    // Execute the specific migration
    const result = await runner.executeMigration(userSettingsMigration);
    
    if (result.success) {
      console.log(`✅ Migration completed successfully in ${result.executionTime}ms`);
    } else {
      console.error(`❌ Migration failed: ${result.error}`);
      process.exit(1);
    }
    
    // Validate the schema after migration
    console.log('🔍 Validating database schema...');
    await validateUserSettingsSchema();
    
    console.log('🎉 User settings migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed with error:', error);
    process.exit(1);
  }
}

async function validateUserSettingsSchema() {
  const client = getNileClient();
  
  try {
    // Check if user_settings table exists with correct structure
    console.log('   Checking user_settings table...');
    const userSettingsTable = await client.queryOne(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_settings'
      )
    `);
    
    if (!userSettingsTable?.exists) {
      throw new Error('user_settings table not found');
    }
    
    // Check if user_preferences table exists
    console.log('   Checking user_preferences table...');
    const userPreferencesTable = await client.queryOne(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_preferences'
      )
    `);
    
    if (!userPreferencesTable?.exists) {
      throw new Error('user_preferences table not found');
    }
    
    // Check if user_settings_audit table exists
    console.log('   Checking user_settings_audit table...');
    const auditTable = await client.queryOne(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_settings_audit'
      )
    `);
    
    if (!auditTable?.exists) {
      throw new Error('user_settings_audit table not found');
    }
    
    // Check critical indexes
    const expectedIndexes = [
      'idx_user_settings_user_id',
      'idx_user_settings_category',
      'idx_user_settings_user_category',
      'idx_user_preferences_user_id',
      'idx_user_settings_audit_user_id'
    ];
    
    console.log('   Checking indexes...');
    for (const indexName of expectedIndexes) {
      const indexExists = await client.queryOne(`
        SELECT EXISTS (
          SELECT FROM pg_indexes 
          WHERE schemaname = 'public' 
          AND indexname = $1
        )
      `, [indexName]);
      
      if (!indexExists?.exists) {
        throw new Error(`Index ${indexName} not found`);
      }
    }
    
    // Check critical functions
    const expectedFunctions = [
      'initialize_user_preferences',
      'get_user_settings_by_category',
      'upsert_user_setting',
      'reset_user_preferences_to_defaults'
    ];
    
    console.log('   Checking functions...');
    for (const functionName of expectedFunctions) {
      const functionExists = await client.queryOne(`
        SELECT EXISTS (
          SELECT FROM pg_proc p
          JOIN pg_namespace n ON p.pronamespace = n.oid
          WHERE n.nspname = 'public'
          AND p.proname = $1
        )
      `, [functionName]);
      
      if (!functionExists?.exists) {
        throw new Error(`Function ${functionName} not found`);
      }
    }
    
    // Test basic functionality
    console.log('   Testing basic functionality...');
    
    // Test that we can query the tables (should return empty results)
    await client.query('SELECT COUNT(*) FROM user_settings');
    await client.query('SELECT COUNT(*) FROM user_preferences');
    await client.query('SELECT COUNT(*) FROM user_settings_audit');
    
    console.log('✅ Schema validation completed successfully');
    
  } catch (error) {
    console.error('❌ Schema validation failed:', error);
    throw error;
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  runUserSettingsMigration()
    .then(() => {
      console.log('Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

export { runUserSettingsMigration, validateUserSettingsSchema };