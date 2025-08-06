import { NextRequest, NextResponse } from 'next/server';
import { withApiAuth, withApiLogging } from '../../../../../lib/auth/api-middleware';
import { getSettingsService } from '../../../../../lib/settings/settings-service';
import { 
  ChangePasswordRequest,
  ApiResponse 
} from '../../../../../types';

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

// POST /api/settings/privacy/password - Change user password
async function changePasswordHandler(
  request: NextRequest,
  context: any
): Promise<NextResponse> {
  try {
    const { user } = context;
    let body: ChangePasswordRequest;

    try {
      body = await request.json();
    } catch {
      return createErrorResponse('Invalid JSON payload', 400, 'INVALID_JSON');
    }

    // Basic validation
    if (!body.currentPassword || typeof body.currentPassword !== 'string') {
      return createErrorResponse('Current password is required', 400, 'VALIDATION_ERROR');
    }

    if (!body.newPassword || typeof body.newPassword !== 'string') {
      return createErrorResponse('New password is required', 400, 'VALIDATION_ERROR');
    }

    if (!body.confirmPassword || typeof body.confirmPassword !== 'string') {
      return createErrorResponse('Password confirmation is required', 400, 'VALIDATION_ERROR');
    }

    if (body.newPassword !== body.confirmPassword) {
      return createErrorResponse('New password and confirmation do not match', 400, 'VALIDATION_ERROR');
    }

    // Password strength validation
    if (body.newPassword.length < 8) {
      return createErrorResponse('New password must be at least 8 characters long', 400, 'VALIDATION_ERROR');
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(body.newPassword)) {
      return createErrorResponse(
        'New password must contain at least one lowercase letter, one uppercase letter, and one number', 
        400, 
        'VALIDATION_ERROR'
      );
    }

    if (body.currentPassword === body.newPassword) {
      return createErrorResponse('New password must be different from current password', 400, 'VALIDATION_ERROR');
    }

    const settingsService = getSettingsService();
    await settingsService.changePassword(user.id, body);

    // Log password change for security audit
    console.log(`Password changed for user ${user.id} at ${new Date().toISOString()}`);

    return createSuccessResponse(
      { success: true }, 
      'Password changed successfully'
    );

  } catch (error: any) {
    console.error('Change password error:', error);

    // Handle validation errors from service
    if (error.code === 'VALIDATION_ERROR') {
      const validationErrors = error.details?.validationErrors || [];
      const errorMessage = validationErrors.length > 0 
        ? validationErrors.map((e: any) => e.message).join(', ')
        : error.message;
      return createErrorResponse(errorMessage, 400, 'VALIDATION_ERROR');
    }

    // Handle not implemented error
    if (error.code === 'NOT_IMPLEMENTED') {
      return createErrorResponse('Password change functionality is not yet implemented', 501, 'NOT_IMPLEMENTED');
    }

    // Handle service-specific errors
    if (error.code === 'PASSWORD_CHANGE_FAILED') {
      return createErrorResponse('Failed to change password', 500, error.code);
    }

    // Handle authentication errors
    if (error.code === 'INVALID_CURRENT_PASSWORD') {
      return createErrorResponse('Current password is incorrect', 401, 'INVALID_CURRENT_PASSWORD');
    }

    // Handle database errors
    if (error.message?.includes('connection') || error.message?.includes('timeout')) {
      return createErrorResponse('Database connection error', 503, 'DATABASE_ERROR');
    }

    return createErrorResponse('Failed to change password', 500, 'INTERNAL_ERROR');
  }
}

// Apply middleware and export handlers
export const POST = withApiLogging(
  withApiAuth(changePasswordHandler, { requireAuth: true, requireTenant: false }),
  'CHANGE_PASSWORD'
);