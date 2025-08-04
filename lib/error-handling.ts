import { ApiError } from './api-client';

// Error categories for different types of errors
export enum ErrorCategory {
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  VALIDATION = 'validation',
  AUTHORIZATION = 'authorization',
  RATE_LIMIT = 'rate_limit',
  SERVER = 'server',
  PLaid = 'plaid',
  UNKNOWN = 'unknown',
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// Error information structure
export interface ErrorInfo {
  message: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  retryable: boolean;
  retryDelay?: number;
  code?: string;
  details?: any;
}

// Error handling utilities
export class ErrorHandler {
  // Categorize error based on error type and code
  static categorizeError(error: unknown): ErrorCategory {
    if (error instanceof ApiError) {
      const code = error.code.toLowerCase();
      
      if (code.includes('network') || code.includes('connection')) {
        return ErrorCategory.NETWORK;
      }
      
      if (code.includes('auth') || code.includes('unauthorized') || code.includes('forbidden')) {
        return code.includes('unauthorized') ? ErrorCategory.AUTHENTICATION : ErrorCategory.AUTHORIZATION;
      }
      
      if (code.includes('validation') || code.includes('invalid')) {
        return ErrorCategory.VALIDATION;
      }
      
      if (code.includes('rate_limit') || code.includes('too_many')) {
        return ErrorCategory.RATE_LIMIT;
      }
      
      if (code.includes('plaid') || code.includes('link_token') || code.includes('public_token')) {
        return ErrorCategory.PLaid;
      }
      
      if (error.statusCode && error.statusCode >= 500) {
        return ErrorCategory.SERVER;
      }
    }
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return ErrorCategory.NETWORK;
    }
    
    return ErrorCategory.UNKNOWN;
  }

  // Determine error severity
  static getErrorSeverity(error: unknown): ErrorSeverity {
    const category = this.categorizeError(error);
    
    switch (category) {
      case ErrorCategory.AUTHENTICATION:
      case ErrorCategory.AUTHORIZATION:
        return ErrorSeverity.HIGH;
      case ErrorCategory.SERVER:
        return ErrorSeverity.CRITICAL;
      case ErrorCategory.NETWORK:
        return ErrorSeverity.MEDIUM;
      case ErrorCategory.RATE_LIMIT:
        return ErrorSeverity.MEDIUM;
      case ErrorCategory.VALIDATION:
        return ErrorSeverity.LOW;
      case ErrorCategory.PLaid:
        return ErrorSeverity.MEDIUM;
      default:
        return ErrorSeverity.MEDIUM;
    }
  }

  // Check if error is retryable
  static isRetryableError(error: unknown): boolean {
    const category = this.categorizeError(error);
    
    switch (category) {
      case ErrorCategory.NETWORK:
      case ErrorCategory.RATE_LIMIT:
      case ErrorCategory.SERVER:
        return true;
      case ErrorCategory.AUTHENTICATION:
      case ErrorCategory.AUTHORIZATION:
      case ErrorCategory.VALIDATION:
        return false;
      case ErrorCategory.PLaid:
        // Check for specific Plaid retryable errors
        if (error instanceof ApiError) {
          const retryableCodes = [
            'INSTITUTION_DOWN',
            'RATE_LIMIT_EXCEEDED',
            'ITEM_ERROR',
          ];
          return retryableCodes.includes(error.code);
        }
        return false;
      default:
        return false;
    }
  }

  // Get retry delay for retryable errors
  static getRetryDelay(error: unknown): number {
    const category = this.categorizeError(error);
    
    switch (category) {
      case ErrorCategory.RATE_LIMIT:
        return 60000; // 1 minute
      case ErrorCategory.NETWORK:
        return 5000; // 5 seconds
      case ErrorCategory.SERVER:
        return 10000; // 10 seconds
      case ErrorCategory.PLaid:
        if (error instanceof ApiError) {
          switch (error.code) {
            case 'RATE_LIMIT_EXCEEDED':
              return 60000; // 1 minute
            case 'INSTITUTION_DOWN':
              return 300000; // 5 minutes
            default:
              return 5000; // 5 seconds
          }
        }
        return 5000;
      default:
        return 5000;
    }
  }

  // Get user-friendly error message
  static getErrorMessage(error: unknown): string {
    if (error instanceof ApiError) {
      return this.getApiErrorMessage(error);
    }
    
    if (error instanceof Error) {
      return this.getGenericErrorMessage(error);
    }
    
    return 'An unexpected error occurred.';
  }

  // Get comprehensive error information
  static getErrorInfo(error: unknown): ErrorInfo {
    const category = this.categorizeError(error);
    const severity = this.getErrorSeverity(error);
    const retryable = this.isRetryableError(error);
    const retryDelay = retryable ? this.getRetryDelay(error) : undefined;
    
    return {
      message: this.getErrorMessage(error),
      category,
      severity,
      retryable,
      retryDelay,
      code: error instanceof ApiError ? error.code : undefined,
      details: error instanceof ApiError ? error.details : undefined,
    };
  }

  // Get API-specific error messages
  private static getApiErrorMessage(error: ApiError): string {
    switch (error.code) {
      // Authentication errors
      case 'AUTHENTICATION_ERROR':
      case 'AUTHENTICATION_FAILED':
        return 'Invalid email or password. Please check your credentials and try again.';
      case 'USER_EXISTS':
      case 'USER_ALREADY_EXISTS':
      case 'REGISTRATION_FAILED':
        return 'An account with this email already exists. Please sign in instead.';
      
      // Validation errors
      case 'VALIDATION_ERROR':
        return error.message || 'Invalid input data. Please check your information and try again.';
      case 'INVALID_EMAIL':
        return 'Please enter a valid email address.';
      case 'INVALID_PASSWORD':
        return 'Password must be at least 8 characters long and contain uppercase, lowercase, and numeric characters.';
      
      // Network errors
      case 'NETWORK_ERROR':
        return 'Network connection error. Please check your internet connection and try again.';
      
      // Plaid errors
      case 'CREATE_LINK_TOKEN_FAILED':
        return 'Failed to initialize bank connection. Please try again.';
      case 'EXCHANGE_TOKEN_FAILED':
        return 'Failed to connect bank account. Please try again.';
      case 'DISCONNECT_FAILED':
        return 'Failed to disconnect account. Please try again.';
      
      // Data errors
      case 'GET_ACCOUNTS_FAILED':
        return 'Failed to load accounts. Please try again.';
      case 'GET_TRANSACTIONS_FAILED':
        return 'Failed to load transactions. Please try again.';
      case 'SYNC_FAILED':
        return 'Failed to sync data. Please try again.';
      
      // Server errors
      case 'INTERNAL_ERROR':
      case 'INTERNAL_SERVER_ERROR':
        return 'An internal server error occurred. Please try again later.';
      case 'DATABASE_ERROR':
        return 'Database connection error. Please try again later.';
      case 'CACHE_ERROR':
        return 'Cache service error. Please try again later.';
      
      default:
        // Check if the error message contains specific keywords
        if (error.message.includes('already exists')) {
          return 'An account with this email already exists. Please sign in instead.';
        }
        if (error.message.includes('validation')) {
          return 'Please check your input and try again.';
        }
        if (error.message.includes('network')) {
          return 'Network connection error. Please check your internet connection.';
        }
        return error.message || 'An error occurred. Please try again.';
    }
  }

  // Get generic error messages
  private static getGenericErrorMessage(error: Error): string {
    if (error.message.includes('fetch')) {
      return 'Network connection error. Please check your internet connection.';
    }
    
    if (error.message.includes('timeout')) {
      return 'Request timed out. Please try again.';
    }
    
    if (error.message.includes('abort')) {
      return 'Request was cancelled.';
    }
    
    return error.message || 'An unexpected error occurred.';
  }
}

// Error logging utilities
export class ErrorLogger {
  // Log error with context
  static logError(error: unknown, context?: Record<string, any>) {
    const errorInfo = ErrorHandler.getErrorInfo(error);
    
    console.error('Application Error:', {
      error: errorInfo,
      context,
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
    });
    
    // In production, you might want to send this to an error tracking service
    // like Sentry, LogRocket, or your own error tracking system
    if (process.env.NODE_ENV === 'production') {
      // this.sendToErrorTracking(errorInfo, context);
    }
  }

  // Log warning
  static logWarning(message: string, context?: Record<string, any>) {
    console.warn('Application Warning:', {
      message,
      context,
      timestamp: new Date().toISOString(),
    });
  }

  // Log info
  static logInfo(message: string, context?: Record<string, any>) {
    console.log('Application Info:', {
      message,
      context,
      timestamp: new Date().toISOString(),
    });
  }
}

// Error recovery utilities
export class ErrorRecovery {
  // Retry function with exponential backoff
  static async retry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: unknown;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        // Don't retry on certain error types
        if (!ErrorHandler.isRetryableError(error)) {
          throw error;
        }
        
        if (attempt < maxRetries - 1) {
          const delay = baseDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }

  // Handle authentication errors
  static handleAuthError(error: unknown): void {
    if (error instanceof ApiError && 
        ['AUTHENTICATION_ERROR', 'AUTHENTICATION_FAILED'].includes(error.code)) {
      // Redirect to sign in page or clear auth state
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/signin';
      }
    }
  }

  // Handle network errors
  static handleNetworkError(error: unknown): void {
    const errorInfo = ErrorHandler.getErrorInfo(error);
    
    if (errorInfo.category === ErrorCategory.NETWORK) {
      // Show offline indicator or retry button
      console.warn('Network error detected:', errorInfo.message);
    }
  }
}

// Export utilities for easy access
export const errorUtils = {
  handler: ErrorHandler,
  logger: ErrorLogger,
  recovery: ErrorRecovery,
}; 