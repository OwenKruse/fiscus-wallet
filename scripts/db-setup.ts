#!/usr/bin/env tsx
// Database Setup Script
// Handles Prisma migrations and seeding for development

import { execSync } from 'child_process';
import { seedDevelopmentData, verifySeedData } from '../lib/database/prisma-seeder';

async function main() {
  const command = process.argv[2];

  try {
    switch (command) {
      case 'migrate':
        console.log('🔄 Running Prisma migrations...');
        execSync('npx prisma db push', { stdio: 'inherit' });
        console.log('✅ Migrations completed successfully');
        break;

      case 'seed':
        console.log('🌱 Seeding development data...');
        const seedResult = await seedDevelopmentData();
        if (seedResult.success) {
          console.log('✅ Seeding completed successfully');
          console.log(`   - ${seedResult.data?.connections} connections`);
          console.log(`   - ${seedResult.data?.accounts} accounts`);
          console.log(`   - ${seedResult.data?.transactions} transactions`);
        } else {
          console.error('❌ Seeding failed:', seedResult.error);
          process.exit(1);
        }
        break;

      case 'verify':
        console.log('🔍 Verifying seed data...');
        const verifyResult = await verifySeedData();
        if (verifyResult.valid) {
          console.log('✅ Data verification passed');
          console.log(`   - ${verifyResult.connections} connections`);
          console.log(`   - ${verifyResult.accounts} accounts`);
          console.log(`   - ${verifyResult.transactions} transactions`);
        } else {
          console.error('❌ Data verification failed:');
          verifyResult.errors.forEach(error => console.error(`   - ${error}`));
          process.exit(1);
        }
        break;

      case 'reset':
        console.log('🔄 Resetting database...');
        execSync('npx prisma db push --force-reset', { stdio: 'inherit' });
        console.log('🌱 Seeding fresh data...');
        const resetSeedResult = await seedDevelopmentData();
        if (resetSeedResult.success) {
          console.log('✅ Database reset and seeded successfully');
        } else {
          console.error('❌ Reset seeding failed:', resetSeedResult.error);
          process.exit(1);
        }
        break;

      case 'generate':
        console.log('🔄 Generating Prisma client...');
        execSync('npx prisma generate', { stdio: 'inherit' });
        console.log('✅ Prisma client generated successfully');
        break;

      default:
        console.log('Database Setup Script');
        console.log('');
        console.log('Usage: npm run db:setup <command>');
        console.log('');
        console.log('Commands:');
        console.log('  migrate   - Run database migrations');
        console.log('  seed      - Seed development data');
        console.log('  verify    - Verify seed data integrity');
        console.log('  reset     - Reset database and seed fresh data');
        console.log('  generate  - Generate Prisma client');
        console.log('');
        console.log('Examples:');
        console.log('  npm run db:setup migrate');
        console.log('  npm run db:setup seed');
        console.log('  npm run db:setup reset');
        break;
    }
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);