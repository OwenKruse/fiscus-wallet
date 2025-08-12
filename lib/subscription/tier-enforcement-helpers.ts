import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { SubscriptionService } from './subscription-service';
import { TierEnforcementService } from './tier-enforcement-service';
import { TierLimitExceededError, FeatureNotAvailableError } from './types';

/**
 * Helper function to create tier enforcement error responses
 */
export function createTierErrorResponse(error: TierLimitExceededError | FeatureNotAvailableError): NextResponse {
  if (error instanceof TierLimitExceededError) {
    return NextResponse.json({
      success: false,
      error: {
        code: 'TIER_LIMIT_EXCEEDED',
        message: error.message,
        limitType: error.limitType,
        currentValue: error.currentValue,
        limitValue: error.limitValue,
        requiredTier: error.requiredTier,
        upgradeRequired: true
      }
    }, { status: 403 });
  }

  if (error instanceof FeatureNotAvailableError) {
    return NextResponse.json({
      success: false,
      error: {
        code: 'FEATURE_NOT_AVAILABLE',
        message: error.message,
        feature: error.feature,
        requiredTier: error.requiredTier,
        upgradeRequired: true
      }
    }, { status: 403 });
  }

  // Fallback for unknown error types
  return NextResponse.json({
    success: false,
    error: {
      code: 'TIER_ENFORCEMENT_ERROR',
      message: error.message,
      upgradeRequired: true
    }
  }, { status: 403 });
}

/**
 * Helper function to get tier enforcement service instance
 */
export function getTierEnforcementService(): {
  prisma: PrismaClient;
  subscriptionService: SubscriptionService;
  tierEnforcementService: TierEnforcementService;
} {
  const prisma = new PrismaClient();
  const subscriptionService = new SubscriptionService(prisma);
  const tierEnforcementService = new TierEnforcementService(prisma, subscriptionService);

  return {
    prisma,
    subscriptionService,
    tierEnforcementService
  };
}

/**
 * Helper function to check feature access with proper error handling
 */
export async function checkFeatureAccess(userId: string, feature: string): Promise<NextResponse | null> {
  try {
    const { tierEnforcementService } = getTierEnforcementService();
    await tierEnforcementService.checkFeatureAccessWithThrow(userId, feature);
    return null; // No error, access granted
  } catch (error) {
    if (error instanceof FeatureNotAvailableError) {
      return createTierErrorResponse(error);
    }
    throw error; // Re-throw non-tier errors
  }
}

/**
 * Helper function to check account limit with proper error handling
 */
export async function checkAccountLimit(userId: string): Promise<NextResponse | null> {
  try {
    const { tierEnforcementService } = getTierEnforcementService();
    await tierEnforcementService.checkAccountLimitWithThrow(userId);
    return null; // No error, limit not exceeded
  } catch (error) {
    if (error instanceof TierLimitExceededError) {
      return createTierErrorResponse(error);
    }
    throw error; // Re-throw non-tier errors
  }
}

/**
 * Helper function to check balance limit with proper error handling
 */
export async function checkBalanceLimit(userId: string, totalBalance: number): Promise<NextResponse | null> {
  try {
    const { tierEnforcementService } = getTierEnforcementService();
    await tierEnforcementService.checkBalanceLimitWithThrow(userId, totalBalance);
    return null; // No error, limit not exceeded
  } catch (error) {
    if (error instanceof TierLimitExceededError) {
      return createTierErrorResponse(error);
    }
    throw error; // Re-throw non-tier errors
  }
}

/**
 * Helper function to track usage metrics safely
 */
export async function trackUsage(userId: string, metricType: string, value: number): Promise<void> {
  try {
    const { subscriptionService } = getTierEnforcementService();
    await subscriptionService.trackUsage(userId, metricType, value);
  } catch (error) {
    console.warn(`Failed to track usage for ${metricType}:`, error);
    // Don't throw - usage tracking failures shouldn't break functionality
  }
}

/**
 * Helper function to add tier information to API responses
 */
export async function addTierInfoToResponse(userId: string, data: any): Promise<any> {
  try {
    const { subscriptionService, tierEnforcementService } = getTierEnforcementService();
    
    const userTier = await subscriptionService.getUserTier(userId);
    const usageSummary = await tierEnforcementService.getUsageSummary(userId);
    const availableFeatures = await tierEnforcementService.getAvailableFeatures(userId);

    return {
      ...data,
      tierInfo: {
        currentTier: userTier,
        limits: usageSummary.limits,
        usage: usageSummary.usage,
        availableFeatures
      }
    };
  } catch (error) {
    console.warn('Failed to add tier info to response:', error);
    return data; // Return original data if tier info fails
  }
}

/**
 * Helper function to enforce sync frequency limits
 */
export async function checkSyncFrequency(userId: string): Promise<{
  allowed: boolean;
  nextAllowedSync?: Date;
  error?: NextResponse;
}> {
  try {
    const { subscriptionService, tierEnforcementService } = getTierEnforcementService();
    
    const userTier = await subscriptionService.getUserTier(userId);
    const syncFrequency = await tierEnforcementService.enforceSyncFrequency(userId);

    // Only enforce frequency limits for Starter tier (daily sync)
    if (syncFrequency === 'daily') {
      // This would need to be implemented with actual sync tracking
      // For now, we'll return allowed for simplicity
      return { allowed: true };
    }

    return { allowed: true };
  } catch (error) {
    console.warn('Failed to check sync frequency:', error);
    return { allowed: true }; // Allow sync if check fails
  }
}

/**
 * Helper function to get transaction history limit
 */
export async function getTransactionHistoryLimit(userId: string): Promise<{
  limitMonths: number | 'unlimited';
  effectiveStartDate?: Date;
}> {
  try {
    const { tierEnforcementService } = getTierEnforcementService();
    
    const limitMonths = await tierEnforcementService.enforceTransactionHistory(userId);
    
    if (limitMonths === -1) {
      return { limitMonths: 'unlimited' };
    }

    const effectiveStartDate = new Date();
    effectiveStartDate.setMonth(effectiveStartDate.getMonth() - limitMonths);

    return {
      limitMonths,
      effectiveStartDate
    };
  } catch (error) {
    console.warn('Failed to get transaction history limit:', error);
    return { limitMonths: 'unlimited' }; // Default to unlimited if check fails
  }
}

/**
 * Helper function to check if user is approaching limits
 */
export async function checkApproachingLimits(userId: string): Promise<{
  approaching: boolean;
  warnings: string[];
  suggestions?: {
    shouldUpgrade: boolean;
    suggestedTier: string | null;
    reasons: string[];
  };
}> {
  try {
    const { tierEnforcementService } = getTierEnforcementService();
    
    const approachingLimits = await tierEnforcementService.isApproachingLimits(userId);
    const upgradeSuggestions = await tierEnforcementService.getUpgradeSuggestions(userId);

    return {
      approaching: approachingLimits.approaching,
      warnings: approachingLimits.warnings,
      suggestions: upgradeSuggestions
    };
  } catch (error) {
    console.warn('Failed to check approaching limits:', error);
    return {
      approaching: false,
      warnings: []
    };
  }
}