import { NextRequest, NextResponse } from 'next/server';
import { withApiAuth, withApiLogging } from '../../../../lib/auth/api-middleware';
import { getSettingsService } from '../../../../lib/settings/settings-service';
import { 
  PrivacySettings,
  UpdatePrivacySettingsRequest,
  ChangePasswordRequest,
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

// GET /api/settings/privacy - Get user privacy settings
async function getPrivacySettingsHandler(
  request: NextRequest,
  context: any
): Promise<NextResponse> {
  try {
    const { user } = context;
    
    const settingsService = getSettingsService();
    const userSettings = await settingsService.getUserSettings(user.id);
    
    return createSuccessResponse(userSettings.privacy);

  } catch (error: any) {
    console.error('Get privacy settings error:', error);

    // Handle service-specific errors
    if (error.code === 'SETTINGS_FETCH_FAILED') {
      return createErrorResponse('Failed to fetch privacy settings', 500, error.code);
    }

    // Handle database errors
    if (error.message?.includes('connection') || error.message?.includes('timeout')) {
      return createErrorResponse('Database connection error', 503, 'DATABASE_ERROR');
    }

    return createErrorResponse('Failed to fetch privacy settings', 500, 'INTERNAL_ERROR');
  }
}

// PUT /api/settings/privacy - Update user privacy settings
async function updatePrivacySettingsHandler(
  request: NextRequest,
  context: any
): Promise<NextResponse> {
  try {
    const { user } = context;
    let body: UpdatePrivacySettingsRequest;

    try {
      body = await request.json();
    } catch {
      return createErrorResponse('Invalid JSON payload', 400, 'INVALID_JSON');
    }

    // Basic validation for boolean fields
    const booleanFields = ['twoFactorEnabled', 'dataSharingAnalytics', 'dataSharingMarketing'];
    
    for (const field of booleanFields) {
      if (body[field as keyof UpdatePrivacySettingsRequest] !== undefined && 
          typeof body[field as keyof UpdatePrivacySettingsRequest] !== 'boolean') {
        return createErrorResponse(`${field} must be a boolean value`, 400, 'VALIDATION_ERROR');
      }
    }

    // Validate session timeout
    if (body.sessionTimeoutMinutes !== undefined) {
      if (typeof body.sessionTimeoutMinutes !== 'number' || 
          body.sessionTimeoutMinutes < 5 || 
          body.sessionTimeoutMinutes > 1440) {
        return createErrorResponse(
          'Session timeout must be a number between 5 and 1440 minutes', 
          400, 
          'VALIDATION_ERROR'
        );
      }
    }

    const settingsService = getSettingsService();
    const updatedPrivacy = await settingsService.updatePrivacySettings(user.id, body);

    // Log security-related changes for audit purposes
    if (body.twoFactorEnabled !== undefined) {
      console.log(`User ${user.id} ${body.twoFactorEnabled ? 'enabled' : 'disabled'} two-factor authentication`);
    }

    if (body.sessionTimeoutMinutes !== undefined) {
      console.log(`User ${user.id} changed session timeout to ${body.sessionTimeoutMinutes} minutes`);
    }

    return createSuccessResponse(
      updatedPrivacy, 
      'Privacy settings updated successfully'
    );

  } catch (error: any) {
    console.error('Update privacy settings error:', error);

    // Handle validation errors from service
    if (error.code === 'VALIDATION_ERROR') {
      const validationErrors = error.details?.validationErrors || [];
      const errorMessage = validationErrors.length > 0 
        ? validationErrors.map((e: any) => e.message).join(', ')
        : error.message;
      return createErrorResponse(errorMessage, 400, 'VALIDATION_ERROR');
    }

    // Handle service-specific errors
    if (error.code === 'PRIVACY_UPDATE_FAILED') {
      return createErrorResponse('Failed to update privacy settings', 500, error.code);
    }

    // Handle database errors
    if (error.message?.includes('connection') || error.message?.includes('timeout')) {
      return createErrorResponse('Database connection error', 503, 'DATABASE_ERROR');
    }

    return createErrorResponse('Failed to update privacy settings', 500, 'INTERNAL_ERROR');
  }
}

// Apply middleware and export handlers
export const GET = withApiLogging(
  withApiAuth(getPrivacySettingsHandler, { requireAuth: true, requireTenant: false }),
  'GET_PRIVACY_SETTINGS'
);

export const PUT = withApiLogging(
  withApiAuth(updatePrivacySettingsHandler, { requireAuth: true, requireTenant: false }),
  'UPDATE_PRIVACY_SETTINGS'
);