#!/usr/bin/env tsx

import { getNileClient } from '../lib/database/nile-client';
import { readFileSync } from 'fs';
import { join } from 'path';

async function createSettingsTables() {
  console.log('🚀 Creating user settings tables...');
  
  const client = getNileClient();
  
  try {
    // Read the simplified migration SQL
    const sqlPath = join(__dirname, '..', 'lib', 'database', 'migrations', '006_create_user_settings_tables_simple.sql');
    const sql = readFileSync(sqlPath, 'utf8');
    
    // Remove comments first
    const cleanSql = sql
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n');
    
    // Split the SQL into individual statements
    const statements = cleanSql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.match(/^\s*$/));
    
    // Sort statements to ensure CREATE TABLE comes before CREATE INDEX
    const createTableStatements = statements.filter(stmt => stmt.toUpperCase().includes('CREATE TABLE'));
    const createIndexStatements = statements.filter(stmt => stmt.toUpperCase().includes('CREATE INDEX'));
    const otherStatements = statements.filter(stmt => 
      !stmt.toUpperCase().includes('CREATE TABLE') && 
      !stmt.toUpperCase().includes('CREATE INDEX')
    );
    
    const orderedStatements = [...createTableStatements, ...otherStatements, ...createIndexStatements];
    
    console.log(`📝 Found ${createTableStatements.length} CREATE TABLE, ${otherStatements.length} other, ${createIndexStatements.length} CREATE INDEX statements`);
    console.log(`📝 Executing ${orderedStatements.length} SQL statements...`);
    
    // Debug: show first few statements
    console.log('First 3 statements:');
    orderedStatements.slice(0, 3).forEach((stmt, i) => {
      console.log(`  ${i + 1}: ${stmt.substring(0, 80)}...`);
    });
    
    // Execute each statement individually
    for (let i = 0; i < orderedStatements.length; i++) {
      const statement = orderedStatements[i];
      if (statement.trim()) {
        console.log(`   ${i + 1}/${statements.length}: ${statement.substring(0, 50)}...`);
        try {
          await client.query(statement);
        } catch (error) {
          console.error(`❌ Failed to execute statement ${i + 1}:`, error);
          throw error;
        }
      }
    }
    
    // Verify tables were created
    console.log('🔍 Verifying tables...');
    
    const tables = ['user_settings', 'user_preferences', 'user_settings_audit'];
    for (const tableName of tables) {
      const result = await client.queryOne(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `, [tableName]);
      
      if (result?.exists) {
        console.log(`✅ Table ${tableName} created successfully`);
      } else {
        throw new Error(`Table ${tableName} was not created`);
      }
    }
    
    console.log('🎉 User settings tables created successfully!');
    
  } catch (error) {
    console.error('❌ Failed to create settings tables:', error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  createSettingsTables()
    .then(() => {
      console.log('Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

export { createSettingsTables };