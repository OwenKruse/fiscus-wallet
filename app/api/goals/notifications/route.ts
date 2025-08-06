// API endpoints for goal notifications

import { NextRequest, NextResponse } from 'next/server';
import { getGoalNotificationService } from '@/lib/goals/goal-notification-service';
import { authenticateRequest } from '@/lib/auth/api-middleware';

const notificationService = getGoalNotificationService();

/**
 * GET /api/goals/notifications - Get unread notifications for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate the request
    const authResult = await authenticateRequest(request);
    if (!authResult.success || !authResult.userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    // Get unread notifications
    const notifications = await notificationService.getUnreadNotifications(
      authResult.userId,
      Math.min(limit, 100) // Cap at 100 notifications
    );

    return NextResponse.json({
      success: true,
      notifications,
      count: notifications.length
    });

  } catch (error) {
    console.error('Failed to get goal notifications:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to retrieve notifications',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/goals/notifications - Mark all notifications as read
 */
export async function PUT(request: NextRequest) {
  try {
    // Authenticate the request
    const authResult = await authenticateRequest(request);
    if (!authResult.success || !authResult.userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Mark all notifications as read
    await notificationService.markAllNotificationsAsRead(authResult.userId);

    return NextResponse.json({
      success: true,
      message: 'All notifications marked as read'
    });

  } catch (error) {
    console.error('Failed to mark notifications as read:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to mark notifications as read',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}