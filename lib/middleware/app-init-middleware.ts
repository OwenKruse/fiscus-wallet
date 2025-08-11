// Middleware to ensure application services are initialized
import { NextRequest, NextResponse } from 'next/server';
import { getAppInitializationService } from '../init/app-initialization';

export function withAppInitialization<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    try {
      // Ensure app is initialized
      const initService = getAppInitializationService();
      if (!initService.isInitialized()) {
        await initService.initialize();
      }

      // Call the original handler
      return await handler(request, ...args);
    } catch (error) {
      console.error('App initialization middleware error:', error);
      
      // Continue with the request even if initialization fails
      // This prevents the app from being completely broken
      return await handler(request, ...args);
    }
  };
}