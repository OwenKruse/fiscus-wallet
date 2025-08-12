import { NextRequest, NextResponse } from 'next/server';
import { withApiAuth } from '@/lib/auth/api-middleware';
import type { ExportUserDataResponse } from '@/types';
import { PrismaClient } from '@prisma/client';
import { SubscriptionService } from '@/lib/subscription/subscription-service';
import { TierEnforcementService } from '@/lib/subscription/tier-enforcement-service';
import { FeatureNotAvailableError } from '@/lib/subscription/types';

/**
 * POST /api/settings/export
 * Export user data
 */
export const POST = withApiAuth(async (request: NextRequest, context) => {
  try {
    const { user } = context;

    // Check tier enforcement for data export feature
    const prisma = new PrismaClient();
    const subscriptionService = new SubscriptionService(prisma);
    const tierEnforcementService = new TierEnforcementService(prisma, subscriptionService);

    try {
      await tierEnforcementService.checkFeatureAccessWithThrow(user.id, 'csv_export');
    } catch (error) {
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
      throw error;
    }

    // Track usage for export feature
    await subscriptionService.trackUsage(user.id, 'transaction_exports', 1);

    // TODO: In a real implementation, you would:
    // 1. Gather all user data from various services
    // 2. Format it according to data export regulations (GDPR, etc.)
    // 3. Optionally create a downloadable file
    // 4. Log the export request for audit purposes

    const exportData: ExportUserDataResponse = {
      profile: {
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email,
        phone: undefined,
        profilePictureUrl: undefined,
        emailVerified: true,
      },
      preferences: {
        id: 'mock-preferences-id',
        userId: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: undefined,
        profilePictureUrl: undefined,
        theme: 'light',
        currencyFormat: 'USD',
        dateFormat: 'MM/dd/yyyy',
        timezone: 'America/New_York',
        language: 'en',
        notificationsEnabled: true,
        emailNotifications: true,
        goalNotifications: true,
        accountAlerts: true,
        systemUpdates: false,
        marketingEmails: false,
        dataSharingAnalytics: false,
        dataSharingMarketing: false,
        twoFactorEnabled: false,
        sessionTimeoutMinutes: 480,
        autoSyncEnabled: true,
        syncFrequency: 'daily',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      settings: [],
      goals: [],
      accounts: [],
      transactions: [],
      exportedAt: new Date().toISOString(),
    };

    console.log(`Data export requested for user ${user.id}`);

    return NextResponse.json({
      success: true,
      data: exportData,
    });

  } catch (error) {
    console.error('Data export error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to export user data' },
      { status: 500 }
    );
  }
});