#!/usr/bin/env tsx

// Test script to verify project setup

import { validateProjectSetup } from '../lib/validate-setup';

console.log('🔍 Testing project setup...\n');

const result = validateProjectSetup();

if (result.success) {
  console.log('\n✅ All tests passed! Project setup is complete.');
  process.exit(0);
} else {
  console.log('\n❌ Setup validation failed.');
  console.log('\nErrors:');
  result.errors.forEach(error => console.log(`  - ${error}`));
  
  if (result.warnings.length > 0) {
    console.log('\nWarnings:');
    result.warnings.forEach(warning => console.log(`  - ${warning}`));
  }
  
  process.exit(1);
}