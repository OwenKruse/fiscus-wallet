// Validate Stripe Configuration Script

import { validateStripeConfig } from '../lib/stripe/stripe-config';

try {
  validateStripeConfig();
  console.log('✅ Stripe configuration is valid');
  process.exit(0);
} catch (error) {
  console.error('❌ Stripe configuration error:', error instanceof Error ? error.message : 'Unknown error');
  process.exit(1);
}