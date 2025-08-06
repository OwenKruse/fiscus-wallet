import { NextRequest, NextResponse } from 'next/server';
import { withApiAuth } from '@/lib/auth/api-middleware';
import type { NotificationSettings, UpdateNotificationSettingsRequest } from '@/types';

/**
 * GET /api/settings/notifications
 * Get user notification settings
 */
export const GET = withApiAuth(async (request: NextRequest, context) => {
  try {
    // TODO: Implement actual notification settings retrieval
    // For now, return mock data
    const notificationSettings: NotificationSettings = {
      enabled: true,
      email: true,
      goalProgress: true,
      accountAlerts: true,
      systemUpdates: false,
      marketingEmails: false,
    };

    return NextResponse.json({
      success: true,
      data: notificationSettings,
    });

  } catch (error) {
    console.error('Notification settings fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notification settings' },
      { status: 500 }
    );
  }
});

/**
 * PUT /api/settings/notifications
 * Update user notification settings
 */
export const PUT = withApiAuth(async (request: NextRequest, context) => {
  try {
    const { user } = context;
    const updates: UpdateNotificationSettingsRequest = await request.json();

    // TODO: Implement actual notification settings update
    // For now, return the updated data
    const updatedNotifications: NotificationSettings = {
      enabled: updates.notificationsEnabled ?? true,
      email: updates.emailNotifications ?? true,
      goalProgress: updates.goalNotifications ?? true,
      accountAlerts: updates.accountAlerts ?? true,
      systemUpdates: updates.systemUpdates ?? false,
      marketingEmails: updates.marketingEmails ?? false,
    };

    console.log(`Notifications updated for user ${user.id}:`, updates);

    return NextResponse.json({
      success: true,
      data: updatedNotifications,
    });

  } catch (error) {
    console.error('Notification settings update error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update notification settings' },
      { status: 500 }
    );
  }
});