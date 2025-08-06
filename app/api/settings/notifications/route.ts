import { NextRequest, NextResponse } from 'next/server';
import { withApiAuth, withApiLogging } from '../../../../lib/auth/api-middleware';
import { getSettingsService } from '../../../../lib/settings/settings-service';
import { 
  NotificationSettings,
  UpdateNotificationSettingsRequest,
  ApiResponse 
} from '../../../../types';

// Create error response helper
function createErrorResponse(message: string, status: number = 400, code?: string): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: code || 'ERROR',
        message,
        timestamp: new Date().toISOString()
      }
    } as ApiResponse,
    { status }
  );
}

// Create success response helper
function createSuccessResponse<T>(data: T, message?: string): NextResponse {
  return NextResponse.json({
    success: true,
    data,
    message,
    timestamp: new Date().toISOString()
  } as ApiResponse<T>);
}

// GET /api/settings/notifications - Get user notification settings
async function getNotificationSettingsHandler(
  request: NextRequest,
  context: any
): Promise<NextResponse> {
  try {
    const { user } = context;
    
    const settingsService = getSettingsService();
    const userSettings = await settingsService.getUserSettings(user.id);
    
    return createSuccessResponse(userSettings.notifications);

  } catch (error: any) {
    console.error('Get notification settings error:', error);

    // Handle service-specific errors
    if (error.code === 'SETTINGS_FETCH_FAILED') {
      return createErrorResponse('Failed to fetch notification settings', 500, error.code);
    }

    // Handle database errors
    if (error.message?.includes('connection') || error.message?.includes('timeout')) {
      return createErrorResponse('Database connection error', 503, 'DATABASE_ERROR');
    }

    return createErrorResponse('Failed to fetch notification settings', 500, 'INTERNAL_ERROR');
  }
}

// PUT /api/settings/notifications - Update user notification settings
async function updateNotificationSettingsHandler(
  request: NextRequest,
  context: any
): Promise<NextResponse> {
  try {
    const { user } = context;
    let body: UpdateNotificationSettingsRequest;

    try {
      body = await request.json();
    } catch {
      return createErrorResponse('Invalid JSON payload', 400, 'INVALID_JSON');
    }

    // Basic validation for boolean fields
    const booleanFields = [
      'notificationsEnabled', 
      'emailNotifications', 
      'goalNotifications', 
      'accountAlerts', 
      'systemUpdates', 
      'marketingEmails'
    ];

    for (const field of booleanFields) {
      if (body[field as keyof UpdateNotificationSettingsRequest] !== undefined && 
          typeof body[field as keyof UpdateNotificationSettingsRequest] !== 'boolean') {
        return createErrorResponse(`${field} must be a boolean value`, 400, 'VALIDATION_ERROR');
      }
    }

    // Special handling for email notifications - if enabling email notifications,
    // ensure the main notifications are also enabled
    if (body.emailNotifications === true && body.notificationsEnabled === false) {
      return createErrorResponse(
        'Cannot enable email notifications while notifications are disabled', 
        400, 
        'VALIDATION_ERROR'
      );
    }

    const settingsService = getSettingsService();
    const updatedNotifications = await settingsService.updateNotificationSettings(user.id, body);

    // If email notifications were enabled, we might want to send a confirmation email
    // This is a placeholder for future email confirmation logic
    if (body.emailNotifications === true) {
      console.log(`Email notifications enabled for user ${user.id} - confirmation email should be sent`);
      // TODO: Implement email confirmation workflow
      // await sendEmailNotificationConfirmation(user.email);
    }

    return createSuccessResponse(
      updatedNotifications, 
      'Notification settings updated successfully'
    );

  } catch (error: any) {
    console.error('Update notification settings error:', error);

    // Handle validation errors from service
    if (error.code === 'VALIDATION_ERROR') {
      const validationErrors = error.details?.validationErrors || [];
      const errorMessage = validationErrors.length > 0 
        ? validationErrors.map((e: any) => e.message).join(', ')
        : error.message;
      return createErrorResponse(errorMessage, 400, 'VALIDATION_ERROR');
    }

    // Handle service-specific errors
    if (error.code === 'NOTIFICATIONS_UPDATE_FAILED') {
      return createErrorResponse('Failed to update notification settings', 500, error.code);
    }

    // Handle database errors
    if (error.message?.includes('connection') || error.message?.includes('timeout')) {
      return createErrorResponse('Database connection error', 503, 'DATABASE_ERROR');
    }

    return createErrorResponse('Failed to update notification settings', 500, 'INTERNAL_ERROR');
  }
}

// Apply middleware and export handlers
export const GET = withApiLogging(
  withApiAuth(getNotificationSettingsHandler, { requireAuth: true, requireTenant: false }),
  'GET_NOTIFICATION_SETTINGS'
);

export const PUT = withApiLogging(
  withApiAuth(updateNotificationSettingsHandler, { requireAuth: true, requireTenant: false }),
  'UPDATE_NOTIFICATION_SETTINGS'
);