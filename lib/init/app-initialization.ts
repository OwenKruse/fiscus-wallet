// Application Initialization Service
// Ensures all background services are properly started

import { getDataSyncService } from '../sync/data-sync-service';

export interface AppInitializationOptions {
  enableBackgroundSync?: boolean;
  syncIntervalMs?: number;
}

export class AppInitializationService {
  private static instance: AppInitializationService | null = null;
  private initialized = false;

  private constructor() {}

  static getInstance(): AppInitializationService {
    if (!AppInitializationService.instance) {
      AppInitializationService.instance = new AppInitializationService();
    }
    return AppInitializationService.instance;
  }

  /**
   * Initialize all application services
   */
  async initialize(options: AppInitializationOptions = {}): Promise<void> {
    if (this.initialized) {
      console.log('Application services already initialized');
      return;
    }

    console.log('🚀 Initializing application services...');

    try {
      // Initialize data sync service with background sync enabled
      const syncService = getDataSyncService({
        enableBackgroundSync: options.enableBackgroundSync ?? true,
        intervalMs: options.syncIntervalMs ?? 15 * 60 * 1000, // 15 minutes
        maxConcurrentJobs: 3,
        syncWindowHours: 72 // 3 days
      });

      console.log('✅ Data sync service initialized with background sync');

      // Verify background sync is running
      const metrics = syncService.getSyncMetrics();
      console.log('📊 Initial sync metrics:', {
        totalSyncs: metrics.totalSyncs,
        activeJobs: metrics.activeJobs,
        queuedJobs: metrics.queuedJobs
      });

      this.initialized = true;
      console.log('✅ Application initialization complete');

    } catch (error) {
      console.error('❌ Application initialization failed:', error);
      throw error;
    }
  }

  /**
   * Shutdown all services gracefully
   */
  async shutdown(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    console.log('🛑 Shutting down application services...');

    try {
      const syncService = getDataSyncService();
      await syncService.shutdown();
      
      this.initialized = false;
      console.log('✅ Application shutdown complete');
    } catch (error) {
      console.error('❌ Application shutdown failed:', error);
      throw error;
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

// Singleton instance
export function getAppInitializationService(): AppInitializationService {
  return AppInitializationService.getInstance();
}

// Auto-initialize in production environments
if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
  // Server-side initialization
  const initService = getAppInitializationService();
  initService.initialize().catch(error => {
    console.error('Failed to auto-initialize application services:', error);
  });
}