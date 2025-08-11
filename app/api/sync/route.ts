import { NextRequest, NextResponse } from 'next/server';
import { getDataSyncService } from '../../../lib/sync/data-sync-service';
import { withApiAuth, withApiLogging } from '../../../lib/auth/api-middleware';
import { withAppInitialization } from '../../../lib/middleware/app-init-middleware';
import { SyncRequest, SyncResponse } from '../../../types';

// Create error response
function createErrorResponse(message: string, status: number = 400, code?: string) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: code || 'ERROR',
        message,
        timestamp: new Date().toISOString()
      }
    },
    { status }
  );
}

// Validate sync request body
function validateSyncRequest(body: any): SyncRequest {
  const request: SyncRequest = {};

  // Validate accountIds if provided
  if (body.accountIds) {
    if (!Array.isArray(body.accountIds)) {
      throw new Error('accountIds must be an array');
    }
    if (body.accountIds.some((id: any) => typeof id !== 'string' || !id.trim())) {
      throw new Error('accountIds must contain valid string values');
    }
    request.accountIds = body.accountIds;
  }

  // Validate forceRefresh if provided
  if (body.forceRefresh !== undefined) {
    if (typeof body.forceRefresh !== 'boolean') {
      throw new Error('forceRefresh must be a boolean');
    }
    request.forceRefresh = body.forceRefresh;
  }

  return request;
}

// Main handler for triggering data synchronization
async function syncDataHandler(
  request: NextRequest,
  context: any
): Promise<NextResponse> {
  try {
    const { user } = context;
    const syncService = getDataSyncService();

    // Parse and validate request body
    let syncRequest: SyncRequest = {};
    
    if (request.method === 'POST') {
      const contentType = request.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        const body = await request.json();
        syncRequest = validateSyncRequest(body);
      }
    }

    // Queue sync job
    const jobId = await syncService.queueSync({
      userId: user.id,
      accountIds: syncRequest.accountIds,
      forceRefresh: syncRequest.forceRefresh || false,
      priority: 'high', // Manual sync gets high priority
    });

    // Also trigger goal progress calculation after sync
    try {
      await syncService.calculateGoalProgress(user.id);
    } catch (error) {
      console.warn('Goal progress calculation failed during manual sync:', error);
      // Don't fail the entire sync if goal calculation fails
    }

    // Get initial job status
    const jobStatus = syncService.getSyncJobStatus(jobId);

    return NextResponse.json({
      success: true,
      data: {
        jobId,
        status: jobStatus?.status || 'queued',
        message: 'Sync job queued successfully',
        estimatedCompletion: jobStatus?.startedAt ? 
          new Date(jobStatus.startedAt.getTime() + 5 * 60 * 1000).toISOString() : // 5 minutes estimate
          new Date(Date.now() + 2 * 60 * 1000).toISOString(), // 2 minutes if not started
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Sync data error:', error);

    // Handle validation errors
    if (error.message?.includes('must be')) {
      return createErrorResponse(error.message, 400, 'VALIDATION_ERROR');
    }

    // Handle sync service errors
    if (error.message?.includes('sync') || error.message?.includes('queue')) {
      return createErrorResponse('Sync service error', 503, 'SYNC_ERROR');
    }

    // Handle database errors
    if (error.message?.includes('connection') || error.message?.includes('timeout')) {
      return createErrorResponse('Database connection error', 503, 'DATABASE_ERROR');
    }

    return createErrorResponse('Failed to trigger sync', 500, 'INTERNAL_ERROR');
  }
}

// Handler for checking sync job status
async function getSyncStatusHandler(
  request: NextRequest,
  context: any
): Promise<NextResponse> {
  try {
    const { user } = context;
    const syncService = getDataSyncService();
    
    const jobId = request.nextUrl.searchParams.get('jobId');
    
    if (!jobId) {
      return createErrorResponse('Job ID is required', 400, 'MISSING_JOB_ID');
    }

    const jobStatus = syncService.getSyncJobStatus(jobId);
    
    if (!jobStatus) {
      return createErrorResponse('Job not found', 404, 'JOB_NOT_FOUND');
    }

    // Verify job belongs to user
    if (jobStatus.userId !== user.id) {
      return createErrorResponse('Access denied', 403, 'ACCESS_DENIED');
    }

    return NextResponse.json({
      success: true,
      data: {
        jobId: jobStatus.id,
        status: jobStatus.status,
        createdAt: jobStatus.createdAt.toISOString(),
        startedAt: jobStatus.startedAt?.toISOString(),
        completedAt: jobStatus.completedAt?.toISOString(),
        result: jobStatus.result,
        error: jobStatus.error,
        retryCount: jobStatus.retryCount,
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Get sync status error:', error);
    return createErrorResponse('Failed to get sync status', 500, 'INTERNAL_ERROR');
  }
}

// Apply middleware and export
export const POST = withAppInitialization(
  withApiLogging(
    withApiAuth(syncDataHandler, { requireAuth: true, requireTenant: false }),
    'POST_SYNC'
  )
);

export const GET = withAppInitialization(
  withApiLogging(
    withApiAuth(getSyncStatusHandler, { requireAuth: true, requireTenant: false }),
    'GET_SYNC_STATUS'
  )
); 