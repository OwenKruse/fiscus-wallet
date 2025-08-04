#!/usr/bin/env tsx
// Script to verify the goals system database schema

import { getNileClient } from '../lib/database/nile-client';

async function main() {
  try {
    console.log('Verifying goals system database schema...');
    
    const client = getNileClient();
    
    // Check if goals table exists and has correct structure
    const goalsTableInfo = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'goals'
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📋 Goals table structure:');
    goalsTableInfo.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : '(NULLABLE)'}`);
    });
    
    // Check if goal_progress table exists and has correct structure
    const progressTableInfo = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'goal_progress'
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📊 Goal Progress table structure:');
    progressTableInfo.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : '(NULLABLE)'}`);
    });
    
    // Check indexes
    const indexes = await client.query(`
      SELECT indexname, tablename 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND (tablename = 'goals' OR tablename = 'goal_progress')
      ORDER BY tablename, indexname;
    `);
    
    console.log('\n🔍 Created indexes:');
    indexes.forEach(idx => {
      console.log(`  - ${idx.tablename}.${idx.indexname}`);
    });
    
    // Check constraints
    const constraints = await client.query(`
      SELECT constraint_name, table_name, constraint_type
      FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND (table_name = 'goals' OR table_name = 'goal_progress')
      ORDER BY table_name, constraint_name;
    `);
    
    console.log('\n🔒 Created constraints:');
    constraints.forEach(con => {
      console.log(`  - ${con.table_name}.${con.constraint_name} (${con.constraint_type})`);
    });
    
    console.log('\n✅ Goals system database schema verification completed successfully!');
    
  } catch (error) {
    console.error('❌ Schema verification failed:', error);
    process.exit(1);
  }
}

main();