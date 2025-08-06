// API endpoint for individual goal notification operations

import { NextRequest, NextResponse } from 'next/server';
import { getGoalNotificationService } from '@/lib/goals/goal-notification-service';
import { authenticateRequest } from '@/lib/auth/api-middleware';

const notificationService = getGoalNotificationService();

/**
 * PUT /api/goals/notifications/[id] - Mark a specific notification as read
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate the request
    const authResult = await authenticateRequest(request);
    if (!authResult.success || !authResult.userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const notificationId = params.id;

    if (!notificationId) {
      return NextResponse.json(
        { success: false, error: 'Notification ID is required' },
        { status: 400 }
      );
    }

    // Mark the notification as read
    await notificationService.markNotificationAsRead(notificationId, authResult.userId);

    return NextResponse.json({
      success: true,
      message: 'Notification marked as read'
    });

  } catch (error) {
    console.error('Failed to mark notification as read:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to mark notification as read',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}