import { NextRequest, NextResponse } from 'next/server';
import { withApiAuth, withApiLogging } from '../../../../lib/auth/api-middleware';
import { getSettingsService } from '../../../../lib/settings/settings-service';
import { 
  ProfileSettings,
  UpdateProfileSettingsRequest,
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

// GET /api/settings/profile - Get user profile settings
async function getProfileSettingsHandler(
  request: NextRequest,
  context: any
): Promise<NextResponse> {
  try {
    const { user } = context;
    
    const settingsService = getSettingsService();
    const userSettings = await settingsService.getUserSettings(user.id);
    
    return createSuccessResponse(userSettings.profile);

  } catch (error: any) {
    console.error('Get profile settings error:', error);

    // Handle service-specific errors
    if (error.code === 'SETTINGS_FETCH_FAILED') {
      return createErrorResponse('Failed to fetch profile settings', 500, error.code);
    }

    // Handle database errors
    if (error.message?.includes('connection') || error.message?.includes('timeout')) {
      return createErrorResponse('Database connection error', 503, 'DATABASE_ERROR');
    }

    return createErrorResponse('Failed to fetch profile settings', 500, 'INTERNAL_ERROR');
  }
}

// PUT /api/settings/profile - Update user profile settings
async function updateProfileSettingsHandler(
  request: NextRequest,
  context: any
): Promise<NextResponse> {
  try {
    const { user } = context;
    let body: UpdateProfileSettingsRequest;

    try {
      body = await request.json();
    } catch {
      return createErrorResponse('Invalid JSON payload', 400, 'INVALID_JSON');
    }

    // Basic validation for required fields
    if (body.firstName !== undefined && (typeof body.firstName !== 'string' || body.firstName.trim().length === 0)) {
      return createErrorResponse('First name must be a non-empty string', 400, 'VALIDATION_ERROR');
    }

    if (body.lastName !== undefined && (typeof body.lastName !== 'string' || body.lastName.trim().length === 0)) {
      return createErrorResponse('Last name must be a non-empty string', 400, 'VALIDATION_ERROR');
    }

    if (body.phone !== undefined && body.phone !== null && typeof body.phone !== 'string') {
      return createErrorResponse('Phone must be a string', 400, 'VALIDATION_ERROR');
    }

    if (body.profilePictureUrl !== undefined && body.profilePictureUrl !== null && typeof body.profilePictureUrl !== 'string') {
      return createErrorResponse('Profile picture URL must be a string', 400, 'VALIDATION_ERROR');
    }

    const settingsService = getSettingsService();
    const updatedProfile = await settingsService.updateProfileSettings(user.id, body);

    return createSuccessResponse(updatedProfile, 'Profile settings updated successfully');

  } catch (error: any) {
    console.error('Update profile settings error:', error);

    // Handle validation errors from service
    if (error.code === 'VALIDATION_ERROR') {
      const validationErrors = error.details?.validationErrors || [];
      const errorMessage = validationErrors.length > 0 
        ? validationErrors.map((e: any) => e.message).join(', ')
        : error.message;
      return createErrorResponse(errorMessage, 400, 'VALIDATION_ERROR');
    }

    // Handle service-specific errors
    if (error.code === 'PROFILE_UPDATE_FAILED') {
      return createErrorResponse('Failed to update profile settings', 500, error.code);
    }

    // Handle database errors
    if (error.message?.includes('connection') || error.message?.includes('timeout')) {
      return createErrorResponse('Database connection error', 503, 'DATABASE_ERROR');
    }

    // Handle unique constraint violations (e.g., duplicate phone numbers)
    if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
      return createErrorResponse('Profile information conflicts with existing data', 409, 'DUPLICATE_ERROR');
    }

    return createErrorResponse('Failed to update profile settings', 500, 'INTERNAL_ERROR');
  }
}

// Apply middleware and export handlers
export const GET = withApiLogging(
  withApiAuth(getProfileSettingsHandler, { requireAuth: true, requireTenant: false }),
  'GET_PROFILE_SETTINGS'
);

export const PUT = withApiLogging(
  withApiAuth(updateProfileSettingsHandler, { requireAuth: true, requireTenant: false }),
  'UPDATE_PROFILE_SETTINGS'
);