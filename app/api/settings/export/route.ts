import { NextRequest, NextResponse } from 'next/server';
import { withApiAuth, withApiLogging } from '../../../../lib/auth/api-middleware';
import { getSettingsService } from '../../../../lib/settings/settings-service';
import { 
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

// POST /api/settings/export - Export user data
async function exportUserDataHandler(
  request: NextRequest,
  context: any
): Promise<NextResponse> {
  try {
    const { user } = context;
    let body: { 
      format?: 'json' | 'csv';
      includeTransactions?: boolean;
      includeAccounts?: boolean;
      reason?: string;
    } = {};

    try {
      body = await request.json();
    } catch {
      // Body is optional, we'll use defaults
    }

    // Validate format
    const validFormats = ['json', 'csv'];
    const format = body.format || 'json';
    if (!validFormats.includes(format)) {
      return createErrorResponse(
        `Invalid format. Must be one of: ${validFormats.join(', ')}`, 
        400, 
        'VALIDATION_ERROR'
      );
    }

    // Validate boolean fields
    if (body.includeTransactions !== undefined && typeof body.includeTransactions !== 'boolean') {
      return createErrorResponse('includeTransactions must be a boolean', 400, 'VALIDATION_ERROR');
    }

    if (body.includeAccounts !== undefined && typeof body.includeAccounts !== 'boolean') {
      return createErrorResponse('includeAccounts must be a boolean', 400, 'VALIDATION_ERROR');
    }

    // Optional reason validation
    if (body.reason !== undefined && typeof body.reason !== 'string') {
      return createErrorResponse('reason must be a string', 400, 'VALIDATION_ERROR');
    }

    const settingsService = getSettingsService();
    
    // Export user data
    const exportData = await settingsService.exportUserData(user.id);

    // Log the export operation for audit purposes
    console.log(`Data export requested by user ${user.id}`, {
      format,
      includeTransactions: body.includeTransactions || false,
      includeAccounts: body.includeAccounts || false,
      reason: body.reason || 'No reason provided',
      timestamp: new Date().toISOString()
    });

    // For JSON format, return the data directly
    if (format === 'json') {
      return createSuccessResponse(
        exportData, 
        'User data exported successfully'
      );
    }

    // For CSV format, we would need to convert the data
    // This is a simplified implementation - in production you might want a more robust CSV converter
    if (format === 'csv') {
      // Convert to CSV format (simplified)
      const csvData = convertToCSV(exportData);
      
      return new NextResponse(csvData, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="user-data-${user.id}-${new Date().toISOString().split('T')[0]}.csv"`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    }

    return createErrorResponse('Unsupported export format', 400, 'UNSUPPORTED_FORMAT');

  } catch (error: any) {
    console.error('Export user data error:', error);

    // Handle service-specific errors
    if (error.code === 'DATA_EXPORT_FAILED') {
      return createErrorResponse('Failed to export user data', 500, error.code);
    }

    // Handle database errors
    if (error.message?.includes('connection') || error.message?.includes('timeout')) {
      return createErrorResponse('Database connection error', 503, 'DATABASE_ERROR');
    }

    return createErrorResponse('Failed to export user data', 500, 'INTERNAL_ERROR');
  }
}

// Helper function to convert data to CSV format
function convertToCSV(data: any): string {
  const lines: string[] = [];
  
  // Add header
  lines.push('Export Information');
  lines.push(`Export Date,${data.exportedAt}`);
  lines.push('');
  
  // Profile section
  lines.push('Profile Information');
  lines.push('Field,Value');
  lines.push(`First Name,${data.profile.firstName || ''}`);
  lines.push(`Last Name,${data.profile.lastName || ''}`);
  lines.push(`Email,${data.profile.email || ''}`);
  lines.push(`Phone,${data.profile.phone || ''}`);
  lines.push(`Email Verified,${data.profile.emailVerified ? 'Yes' : 'No'}`);
  lines.push('');
  
  // Preferences section
  lines.push('User Preferences');
  lines.push('Setting,Value');
  lines.push(`Theme,${data.preferences.theme}`);
  lines.push(`Currency Format,${data.preferences.currencyFormat}`);
  lines.push(`Date Format,${data.preferences.dateFormat}`);
  lines.push(`Timezone,${data.preferences.timezone}`);
  lines.push(`Language,${data.preferences.language}`);
  lines.push(`Notifications Enabled,${data.preferences.notificationsEnabled ? 'Yes' : 'No'}`);
  lines.push(`Email Notifications,${data.preferences.emailNotifications ? 'Yes' : 'No'}`);
  lines.push(`Goal Notifications,${data.preferences.goalNotifications ? 'Yes' : 'No'}`);
  lines.push(`Account Alerts,${data.preferences.accountAlerts ? 'Yes' : 'No'}`);
  lines.push(`System Updates,${data.preferences.systemUpdates ? 'Yes' : 'No'}`);
  lines.push(`Marketing Emails,${data.preferences.marketingEmails ? 'Yes' : 'No'}`);
  lines.push(`Data Sharing Analytics,${data.preferences.dataSharingAnalytics ? 'Yes' : 'No'}`);
  lines.push(`Data Sharing Marketing,${data.preferences.dataSharingMarketing ? 'Yes' : 'No'}`);
  lines.push(`Two Factor Enabled,${data.preferences.twoFactorEnabled ? 'Yes' : 'No'}`);
  lines.push(`Auto Sync Enabled,${data.preferences.autoSyncEnabled ? 'Yes' : 'No'}`);
  lines.push(`Sync Frequency,${data.preferences.syncFrequency}`);
  lines.push('');
  
  // Custom settings section
  if (data.settings && data.settings.length > 0) {
    lines.push('Custom Settings');
    lines.push('Category,Key,Value');
    for (const setting of data.settings) {
      const value = typeof setting.value === 'object' 
        ? JSON.stringify(setting.value) 
        : String(setting.value);
      lines.push(`${setting.category},${setting.key},"${value}"`);
    }
  }
  
  return lines.join('\n');
}

// Apply middleware and export handlers
export const POST = withApiLogging(
  withApiAuth(exportUserDataHandler, { requireAuth: true, requireTenant: false }),
  'EXPORT_USER_DATA'
);