// API Client exports
export { 
  authApi, 
  plaidApi, 
  financialApi, 
  apiUtils, 
  ApiError 
} from './api-client';

// React hooks for API operations
export {
  useAuth,
  usePlaid,
  useAccounts,
  useTransactions,
  useSync,
  useAuthCheck,
  useApiError,
  useApiOperation,
} from '../hooks/use-api';

// Plaid Link integration utilities
export {
  usePlaidLink,
  plaidLinkUtils,
  plaidErrorUtils,
  PlaidLinkConfig,
} from './plaid-link-utils';

// Error handling utilities
export {
  ErrorHandler,
  ErrorLogger,
  ErrorRecovery,
  errorUtils,
  ErrorCategory,
  ErrorSeverity,
  ErrorInfo,
} from './error-handling';

// Loading state management utilities
export {
  LoadingStateManager,
  useLoadingState,
  useLoadingStates,
  loadingUtils,
  globalLoadingManager,
  withLoading,
  LoadingConfig,
  ProgressInfo,
} from './loading-states';

// Re-export types for convenience
export type {
  AuthSignInRequest,
  AuthSignUpRequest,
  AuthResponse,
  PlaidLinkTokenRequest,
  PlaidLinkTokenResponse,
  PlaidExchangeTokenRequest,
  PlaidExchangeTokenResponse,
  AccountsResponse,
  TransactionsRequest,
  TransactionsResponse,
  SyncRequest,
  SyncResponse,
  ApiResponse,
  AppError,
  LoadingState,
} from '../types'; 