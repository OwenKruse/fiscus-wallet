#!/usr/bin/env tsx
// Verify Subscription Schema

import { getNileClient } from '../lib/database/nile-client';

async function verifySchema() {
  const client = getNileClient();
  
  try {
    console.log('🔍 Verifying subscription schema...');
    
    // Check constraints
    const constraints = await client.query(`
      SELECT 
        tc.constraint_name, 
        tc.table_name, 
        kcu.column_name,
        tc.constraint_type
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_schema = 'public' 
        AND tc.table_name IN ('subscriptions', 'usage_metrics', 'billing_history')
      ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name;
    `);
    
    console.log('\n📋 Database constraints:');
    constraints.forEach(row => {
      console.log(`  ${row.table_name}.${row.column_name}: ${row.constraint_type} (${row.constraint_name})`);
    });
    
    // Check columns
    const columns = await client.query(`
      SELECT 
        table_name,
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' 
        AND table_name IN ('subscriptions', 'usage_metrics', 'billing_history')
      ORDER BY table_name, ordinal_position;
    `);
    
    console.log('\n📊 Table columns:');
    let currentTable = '';
    columns.forEach(row => {
      if (row.table_name !== currentTable) {
        currentTable = row.table_name;
        console.log(`\n  ${row.table_name}:`);
      }
      console.log(`    ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${row.column_default ? `DEFAULT ${row.column_default}` : ''}`);
    });
    
    console.log('\n✅ Schema verification completed');
    
  } catch (error) {
    console.error('❌ Schema verification failed:', error);
    process.exit(1);
  }
}

verifySchema();