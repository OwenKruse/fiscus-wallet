#!/usr/bin/env tsx

/**
 * Script to verify tier enforcement integration in API endpoints
 * This script checks that tier enforcement has been properly integrated
 * into the existing API endpoints.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

interface IntegrationCheck {
  endpoint: string;
  file: string;
  checks: {
    imports: string[];
    tierEnforcementCalls: string[];
    errorHandling: string[];
  };
}

const INTEGRATION_CHECKS: IntegrationCheck[] = [
  {
    endpoint: 'POST /api/plaid/exchange-token',
    file: 'app/api/plaid/exchange-token/route.ts',
    checks: {
      imports: [
        'TierEnforcementService',
        'SubscriptionService',
        'TierLimitExceededError'
      ],
      tierEnforcementCalls: [
        'checkAccountLimitWithThrow',
        'trackUsage'
      ],
      errorHandling: [
        'ACCOUNT_LIMIT_EXCEEDED',
        'upgradeRequired: true'
      ]
    }
  },
  {
    endpoint: 'POST /api/sync',
    file: 'app/api/sync/route.ts',
    checks: {
      imports: [
        'TierEnforcementService',
        'SubscriptionService',
        'SubscriptionTier'
      ],
      tierEnforcementCalls: [
        'enforceSyncFrequency',
        'getUserTier'
      ],
      errorHandling: [
        'SYNC_FREQUENCY_LIMIT_EXCEEDED',
        'upgradeRequired: true'
      ]
    }
  },
  {
    endpoint: 'POST /api/settings/export',
    file: 'app/api/settings/export/route.ts',
    checks: {
      imports: [
        'TierEnforcementService',
        'SubscriptionService',
        'FeatureNotAvailableError'
      ],
      tierEnforcementCalls: [
        'checkFeatureAccessWithThrow',
        'trackUsage'
      ],
      errorHandling: [
        'FEATURE_NOT_AVAILABLE',
        'upgradeRequired: true'
      ]
    }
  },
  {
    endpoint: 'GET /api/transactions',
    file: 'app/api/transactions/route.ts',
    checks: {
      imports: [
        'TierEnforcementService',
        'SubscriptionService'
      ],
      tierEnforcementCalls: [
        'enforceTransactionHistory'
      ],
      errorHandling: []
    }
  },
  {
    endpoint: 'GET /api/accounts',
    file: 'app/api/accounts/route.ts',
    checks: {
      imports: [
        'TierEnforcementService',
        'SubscriptionService'
      ],
      tierEnforcementCalls: [
        'enforceBalanceLimit',
        'trackUsage'
      ],
      errorHandling: []
    }
  },
  {
    endpoint: 'GET /api/transactions/export',
    file: 'app/api/transactions/export/route.ts',
    checks: {
      imports: [
        'TierEnforcementService',
        'SubscriptionService',
        'FeatureNotAvailableError'
      ],
      tierEnforcementCalls: [
        'checkFeatureAccessWithThrow',
        'enforceTransactionHistory',
        'trackUsage'
      ],
      errorHandling: [
        'FEATURE_NOT_AVAILABLE',
        'upgradeRequired: true'
      ]
    }
  },
  {
    endpoint: 'GET /api/investments',
    file: 'app/api/investments/route.ts',
    checks: {
      imports: [
        'TierEnforcementService',
        'SubscriptionService',
        'FeatureNotAvailableError'
      ],
      tierEnforcementCalls: [
        'checkFeatureAccessWithThrow'
      ],
      errorHandling: [
        'FEATURE_NOT_AVAILABLE',
        'upgradeRequired: true'
      ]
    }
  },
  {
    endpoint: 'GET /api/analytics/insights',
    file: 'app/api/analytics/insights/route.ts',
    checks: {
      imports: [
        'TierEnforcementService',
        'SubscriptionService',
        'FeatureNotAvailableError'
      ],
      tierEnforcementCalls: [
        'checkFeatureAccessWithThrow'
      ],
      errorHandling: [
        'FEATURE_NOT_AVAILABLE',
        'upgradeRequired: true'
      ]
    }
  },
  {
    endpoint: 'POST /api/plaid/sync',
    file: 'app/api/plaid/sync/route.ts',
    checks: {
      imports: [
        'TierEnforcementService',
        'SubscriptionService',
        'TierLimitExceededError'
      ],
      tierEnforcementCalls: [
        'checkBalanceLimitWithThrow',
        'trackUsage'
      ],
      errorHandling: [
        'BALANCE_LIMIT_EXCEEDED',
        'upgradeRequired: true'
      ]
    }
  }
];

function checkFileExists(filePath: string): boolean {
  try {
    readFileSync(filePath, 'utf8');
    return true;
  } catch {
    return false;
  }
}

function checkFileContent(filePath: string, checks: IntegrationCheck['checks']): {
  passed: boolean;
  results: {
    imports: { item: string; found: boolean }[];
    tierEnforcementCalls: { item: string; found: boolean }[];
    errorHandling: { item: string; found: boolean }[];
  };
} {
  try {
    const content = readFileSync(filePath, 'utf8');
    
    const results = {
      imports: checks.imports.map(item => ({
        item,
        found: content.includes(item)
      })),
      tierEnforcementCalls: checks.tierEnforcementCalls.map(item => ({
        item,
        found: content.includes(item)
      })),
      errorHandling: checks.errorHandling.map(item => ({
        item,
        found: content.includes(item)
      }))
    };

    const allPassed = [
      ...results.imports,
      ...results.tierEnforcementCalls,
      ...results.errorHandling
    ].every(result => result.found);

    return {
      passed: allPassed,
      results
    };
  } catch (error) {
    return {
      passed: false,
      results: {
        imports: checks.imports.map(item => ({ item, found: false })),
        tierEnforcementCalls: checks.tierEnforcementCalls.map(item => ({ item, found: false })),
        errorHandling: checks.errorHandling.map(item => ({ item, found: false }))
      }
    };
  }
}

function main() {
  console.log('🔍 Verifying Tier Enforcement Integration\n');

  let totalChecks = 0;
  let passedChecks = 0;
  const failedEndpoints: string[] = [];

  for (const check of INTEGRATION_CHECKS) {
    totalChecks++;
    console.log(`📋 Checking ${check.endpoint}`);
    console.log(`   File: ${check.file}`);

    // Check if file exists
    if (!checkFileExists(check.file)) {
      console.log(`   ❌ File not found`);
      failedEndpoints.push(check.endpoint);
      continue;
    }

    // Check file content
    const contentCheck = checkFileContent(check.file, check.checks);
    
    if (contentCheck.passed) {
      console.log(`   ✅ All checks passed`);
      passedChecks++;
    } else {
      console.log(`   ❌ Some checks failed:`);
      
      // Show failed imports
      const failedImports = contentCheck.results.imports.filter(r => !r.found);
      if (failedImports.length > 0) {
        console.log(`      Missing imports: ${failedImports.map(r => r.item).join(', ')}`);
      }
      
      // Show failed tier enforcement calls
      const failedCalls = contentCheck.results.tierEnforcementCalls.filter(r => !r.found);
      if (failedCalls.length > 0) {
        console.log(`      Missing tier enforcement calls: ${failedCalls.map(r => r.item).join(', ')}`);
      }
      
      // Show failed error handling
      const failedErrors = contentCheck.results.errorHandling.filter(r => !r.found);
      if (failedErrors.length > 0) {
        console.log(`      Missing error handling: ${failedErrors.map(r => r.item).join(', ')}`);
      }
      
      failedEndpoints.push(check.endpoint);
    }
    
    console.log('');
  }

  // Summary
  console.log('📊 Summary:');
  console.log(`   Total endpoints checked: ${totalChecks}`);
  console.log(`   Passed: ${passedChecks}`);
  console.log(`   Failed: ${totalChecks - passedChecks}`);
  
  if (failedEndpoints.length > 0) {
    console.log(`\n❌ Failed endpoints:`);
    failedEndpoints.forEach(endpoint => {
      console.log(`   - ${endpoint}`);
    });
  }

  // Check helper files
  console.log('\n🔧 Checking helper files:');
  
  const helperFiles = [
    'lib/subscription/tier-enforcement-helpers.ts',
    'lib/subscription/__tests__/tier-enforcement-integration.test.ts'
  ];

  for (const file of helperFiles) {
    if (checkFileExists(file)) {
      console.log(`   ✅ ${file}`);
    } else {
      console.log(`   ❌ ${file} - Missing`);
    }
  }

  if (passedChecks === totalChecks) {
    console.log('\n🎉 All tier enforcement integrations are working correctly!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tier enforcement integrations need attention.');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}