#!/usr/bin/env tsx
// Verify Prisma Models

import { PrismaClient } from '@prisma/client';

async function verifyModels() {
  const prisma = new PrismaClient();
  
  try {
    console.log('✅ Prisma client imported successfully');
    
    // Get available models
    const models = Object.keys(prisma).filter(key => !key.startsWith('_') && !key.startsWith('$'));
    console.log('Available models:', models);
    
    // Test that subscription models are available
    console.log('Subscription model available:', 'subscription' in prisma);
    console.log('UsageMetric model available:', 'usageMetric' in prisma);
    console.log('BillingHistory model available:', 'billingHistory' in prisma);
    
    // Test a simple query to ensure the models work
    console.log('\n🔍 Testing model queries...');
    
    const subscriptionCount = await prisma.subscription.count();
    console.log(`Subscription count: ${subscriptionCount}`);
    
    const usageMetricCount = await prisma.usageMetric.count();
    console.log(`Usage metric count: ${usageMetricCount}`);
    
    const billingHistoryCount = await prisma.billingHistory.count();
    console.log(`Billing history count: ${billingHistoryCount}`);
    
    console.log('\n✅ All subscription models are working correctly');
    
  } catch (error) {
    console.error('❌ Error verifying models:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyModels();