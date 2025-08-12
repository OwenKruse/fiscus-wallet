#!/usr/bin/env tsx
// Run Subscription Migration Script

import { MigrationRunner } from '../lib/database/migration-runner';

async function runSubscriptionMigration() {
  console.log('🔄 Running subscription migration...');
  
  try {
    const runner = new MigrationRunner();
    
    // Initialize migrations table
    await runner.initializeMigrationsTable();
    
    // Check if subscription migration is pending
    const pending = await runner.getPendingMigrations();
    const subscriptionMigration = pending.find(m => m.includes('007_create_subscription_tables.sql'));
    
    if (!subscriptionMigration) {
      console.log('✅ Subscription migration already executed or not found');
      return;
    }
    
    // Execute the subscription migration
    const result = await runner.executeMigration(subscriptionMigration);
    
    if (result.success) {
      console.log('✅ Subscription migration completed successfully');
      console.log(`   Execution time: ${result.executionTime}ms`);
    } else {
      console.error('❌ Subscription migration failed:', result.error);
      process.exit(1);
    }
    
    // Validate the schema
    console.log('🔍 Validating subscription schema...');
    await validateSubscriptionSchema();
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

async function validateSubscriptionSchema() {
  const { getNileClient } = await import('../lib/database/nile-client');
  const client = getNileClient();
  
  try {
    // Check if subscription tables exist
    const tables = ['subscriptions', 'usage_metrics', 'billing_history'];
    
    for (const table of tables) {
      const result = await client.queryOne(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )`,
        [table]
      );
      
      if (!result?.exists) {
        throw new Error(`Table ${table} was not created`);
      }
      console.log(`✅ Table ${table} exists`);
    }
    
    // Check if tier, status, and billing_cycle columns have proper constraints
    const constraintChecks = [
      { table: 'subscriptions', column: 'tier', values: ['STARTER', 'GROWTH', 'PRO'] },
      { table: 'subscriptions', column: 'status', values: ['ACTIVE', 'CANCELED', 'PAST_DUE', 'UNPAID', 'TRIALING'] },
      { table: 'subscriptions', column: 'billing_cycle', values: ['MONTHLY', 'YEARLY'] }
    ];
    
    for (const check of constraintChecks) {
      const result = await client.queryOne(
        `SELECT EXISTS (
          SELECT FROM information_schema.check_constraints cc
          JOIN information_schema.constraint_column_usage ccu ON cc.constraint_name = ccu.constraint_name
          WHERE ccu.table_name = $1 AND ccu.column_name = $2
        )`,
        [check.table, check.column]
      );
      
      if (!result?.exists) {
        console.warn(`⚠️  Check constraint for ${check.table}.${check.column} not found`);
      } else {
        console.log(`✅ Check constraint for ${check.table}.${check.column} exists`);
      }
    }
    
    // Check indexes
    const indexes = [
      'subscriptions_user_id_key',
      'subscriptions_stripe_customer_id_key',
      'subscriptions_stripe_subscription_id_key',
      'usage_metrics_subscription_id_metric_type_period_start_key'
    ];
    
    for (const index of indexes) {
      const result = await client.queryOne(
        `SELECT EXISTS (
          SELECT FROM pg_indexes 
          WHERE schemaname = 'public' 
          AND indexname = $1
        )`,
        [index]
      );
      
      if (!result?.exists) {
        console.warn(`⚠️  Index ${index} not found`);
      } else {
        console.log(`✅ Index ${index} exists`);
      }
    }
    
    console.log('✅ Subscription schema validation completed');
    
  } catch (error) {
    console.error('❌ Schema validation failed:', error);
    throw error;
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  runSubscriptionMigration()
    .then(() => {
      console.log('Subscription migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

export { runSubscriptionMigration, validateSubscriptionSchema };