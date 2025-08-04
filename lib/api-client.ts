import { 
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
  AppError
} from '../types';

// Base API client configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

// Custom error class for API errors
export class ApiError extends Error implements AppError {
  public code: string;
  public statusCode?: number;
  public details?: any;

  constructor(message: string, code: string, statusCode?: number, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

// Base API request function with error handling
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include', // Include cookies for authentication
    ...options,
  };

  try {
    const response = await fetch(url, defaultOptions);
    
    // Handle non-JSON responses
    let data;
    try {
      data = await response.json();
    } catch (jsonError) {
      // If response is not JSON, create a basic error structure
      data = {
        success: false,
        error: {
          message: `HTTP ${response.status}: ${response.statusText}`,
          code: 'INVALID_RESPONSE'
        }
      };
    }

    if (!response.ok) {
      const errorMessage = data.error?.message || data.message || `HTTP ${response.status}`;
      const errorCode = data.error?.code || data.code || 'UNKNOWN_ERROR';
      throw new ApiError(errorMessage, errorCode, response.status, data.error?.details);
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new ApiError('Network error', 'NETWORK_ERROR', 0);
    }
    
    // Log the actual error for debugging
    console.error('API request error:', error);
    throw new ApiError('Unknown error occurred', 'UNKNOWN_ERROR', 0);
  }
}

// Authentication API client functions
export const authApi = {
  // Sign in user
  async signIn(credentials: AuthSignInRequest): Promise<AuthResponse> {
    const response = await apiRequest<ApiResponse<AuthResponse>>('/api/auth/signin', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    
    if (!response.success) {
      throw new ApiError(
        response.error?.message || 'Sign in failed',
        response.error?.code || 'SIGNIN_FAILED'
      );
    }
    
    return response.data!;
  },

  // Sign up user
  async signUp(userData: AuthSignUpRequest): Promise<AuthResponse> {
    const response = await apiRequest<ApiResponse<AuthResponse>>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    
    if (!response.success) {
      throw new ApiError(
        response.error?.message || 'Sign up failed',
        response.error?.code || 'SIGNUP_FAILED'
      );
    }
    
    return response.data!;
  },

  // Get current user profile
  async getCurrentUser(): Promise<AuthResponse['user']> {
    const response = await apiRequest<ApiResponse<AuthResponse['user']>>('/api/auth/me', {
      method: 'GET',
    });
    
    if (!response.success) {
      throw new ApiError(
        response.error?.message || 'Failed to get user profile',
        response.error?.code || 'GET_USER_FAILED'
      );
    }
    
    return response.data!;
  },

  // Sign out user
  async signOut(): Promise<void> {
    await apiRequest<ApiResponse>('/api/auth/signout', {
      method: 'POST',
    });
  },
};

// Plaid API client functions
export const plaidApi = {
  // Create Plaid Link token
  async createLinkToken(products?: string[]): Promise<PlaidLinkTokenResponse> {
    const response = await apiRequest<ApiResponse<PlaidLinkTokenResponse>>('/api/plaid/create-link-token', {
      method: 'POST',
      body: JSON.stringify({ products }),
    });
    
    if (!response.success) {
      throw new ApiError(
        response.error?.message || 'Failed to create link token',
        response.error?.code || 'CREATE_LINK_TOKEN_FAILED'
      );
    }
    
    return response.data!;
  },

  // Exchange public token for access token
  async exchangeToken(request: { publicToken: string }): Promise<PlaidExchangeTokenResponse> {
    const response = await apiRequest<ApiResponse<PlaidExchangeTokenResponse>>('/api/plaid/exchange-token', {
      method: 'POST',
      body: JSON.stringify(request),
    });
    
    if (!response.success) {
      throw new ApiError(
        response.error?.message || 'Failed to exchange token',
        response.error?.code || 'EXCHANGE_TOKEN_FAILED'
      );
    }
    
    return response.data!;
  },

  // Disconnect Plaid account
  async disconnectAccount(connectionId: string): Promise<void> {
    const response = await apiRequest<ApiResponse>('/api/plaid/disconnect', {
      method: 'POST',
      body: JSON.stringify({ connectionId }),
    });
    
    if (!response.success) {
      throw new ApiError(
        response.error?.message || 'Failed to disconnect account',
        response.error?.code || 'DISCONNECT_FAILED'
      );
    }
  },
};

// Financial data API client functions
export const financialApi = {
  // Get user accounts
  async getAccounts(): Promise<AccountsResponse> {
    const response = await apiRequest<ApiResponse<AccountsResponse>>('/api/accounts', {
      method: 'GET',
    });
    
    if (!response.success) {
      throw new ApiError(
        response.error?.message || 'Failed to fetch accounts',
        response.error?.code || 'GET_ACCOUNTS_FAILED'
      );
    }
    
    return response.data!;
  },

  // Get transactions with filters
  async getTransactions(filters: TransactionsRequest = {}): Promise<TransactionsResponse> {
    const searchParams = new URLSearchParams();
    
    // Add filters to search params
    if (filters.accountIds?.length) {
      searchParams.set('accountIds', filters.accountIds.join(','));
    }
    if (filters.startDate) {
      searchParams.set('startDate', filters.startDate);
    }
    if (filters.endDate) {
      searchParams.set('endDate', filters.endDate);
    }
    if (filters.categories?.length) {
      searchParams.set('categories', filters.categories.join(','));
    }
    if (filters.minAmount !== undefined) {
      searchParams.set('minAmount', filters.minAmount.toString());
    }
    if (filters.maxAmount !== undefined) {
      searchParams.set('maxAmount', filters.maxAmount.toString());
    }
    if (filters.pending !== undefined) {
      searchParams.set('pending', filters.pending.toString());
    }
    if (filters.search) {
      searchParams.set('search', filters.search);
    }
    if (filters.page) {
      searchParams.set('page', filters.page.toString());
    }
    if (filters.limit) {
      searchParams.set('limit', filters.limit.toString());
    }

    const endpoint = `/api/transactions${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    
    const response = await apiRequest<ApiResponse<TransactionsResponse>>(endpoint, {
      method: 'GET',
    });
    
    if (!response.success) {
      throw new ApiError(
        response.error?.message || 'Failed to fetch transactions',
        response.error?.code || 'GET_TRANSACTIONS_FAILED'
      );
    }
    
    return response.data!;
  },

  // Sync financial data
  async syncData(options: SyncRequest = {}): Promise<SyncResponse> {
    const response = await apiRequest<ApiResponse<SyncResponse>>('/api/sync', {
      method: 'POST',
      body: JSON.stringify(options),
    });
    
    if (!response.success) {
      throw new ApiError(
        response.error?.message || 'Failed to sync data',
        response.error?.code || 'SYNC_FAILED'
      );
    }
    
    return response.data!;
  },

  // Get investment data
  async getInvestments(filters: import('../types').InvestmentsRequest = {}): Promise<import('../types').InvestmentsResponse> {
    const searchParams = new URLSearchParams();
    
    // Add filters to search params
    if (filters.accountIds?.length) {
      searchParams.set('accountIds', filters.accountIds.join(','));
    }
    if (filters.startDate) {
      searchParams.set('startDate', filters.startDate);
    }
    if (filters.endDate) {
      searchParams.set('endDate', filters.endDate);
    }

    const endpoint = `/api/investments${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    
    const response = await apiRequest<ApiResponse<import('../types').InvestmentsResponse>>(endpoint, {
      method: 'GET',
    });
    
    if (!response.success) {
      throw new ApiError(
        response.error?.message || 'Failed to fetch investments',
        response.error?.code || 'GET_INVESTMENTS_FAILED'
      );
    }
    
    return response.data!;
  },
};

// Utility functions for common API operations
export const apiUtils = {
  // Check if user is authenticated
  async checkAuth(): Promise<boolean> {
    try {
      await authApi.getCurrentUser();
      return true;
    } catch (error) {
      return false;
    }
  },

  // Handle API errors with user-friendly messages
  getErrorMessage(error: unknown): string {
    if (error instanceof ApiError) {
      switch (error.code) {
        case 'NETWORK_ERROR':
          return 'Network connection error. Please check your internet connection.';
        case 'AUTHENTICATION_ERROR':
          return 'Authentication failed. Please sign in again.';
        case 'VALIDATION_ERROR':
          return error.message || 'Invalid input data.';
        case 'USER_EXISTS':
          return 'An account with this email already exists.';
        case 'AUTHENTICATION_FAILED':
          return 'Invalid email or password.';
        case 'CREATE_LINK_TOKEN_FAILED':
          return 'Failed to initialize bank connection. Please try again.';
        case 'EXCHANGE_TOKEN_FAILED':
          return 'Failed to connect bank account. Please try again.';
        case 'DISCONNECT_FAILED':
          return 'Failed to disconnect account. Please try again.';
        case 'GET_ACCOUNTS_FAILED':
          return 'Failed to load accounts. Please try again.';
        case 'GET_TRANSACTIONS_FAILED':
          return 'Failed to load transactions. Please try again.';
        case 'SYNC_FAILED':
          return 'Failed to sync data. Please try again.';
        case 'GET_INVESTMENTS_FAILED':
          return 'Failed to load investment data. Please try again.';
        case 'GET_GOALS_FAILED':
          return 'Failed to load goals. Please try again.';
        case 'CREATE_GOAL_FAILED':
          return 'Failed to create goal. Please try again.';
        case 'UPDATE_GOAL_FAILED':
          return 'Failed to update goal. Please try again.';
        case 'DELETE_GOAL_FAILED':
          return 'Failed to delete goal. Please try again.';
        case 'ADD_PROGRESS_FAILED':
          return 'Failed to add progress. Please try again.';
        case 'GET_PROGRESS_FAILED':
          return 'Failed to load progress history. Please try again.';
        case 'CALCULATE_PROGRESS_FAILED':
          return 'Failed to calculate progress. Please try again.';
        case 'SET_PRIMARY_FAILED':
          return 'Failed to set primary goal. Please try again.';
        case 'GET_PRIMARY_FAILED':
          return 'Failed to load primary goal. Please try again.';
        case 'GET_GOAL_ANALYTICS_FAILED':
          return 'Failed to load goal analytics. Please try again.';
        case 'GET_GOALS_ANALYTICS_FAILED':
          return 'Failed to load goals analytics. Please try again.';
        case 'GET_GOAL_FAILED':
          return 'Failed to load goal details. Please try again.';
        default:
          return error.message || 'An unexpected error occurred.';
      }
    }
    
    if (error instanceof Error) {
      return error.message;
    }
    
    return 'An unexpected error occurred.';
  },

  // Retry function for failed requests
  async retry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: unknown;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        // Don't retry on certain error types
        if (error instanceof ApiError) {
          if (['AUTHENTICATION_ERROR', 'VALIDATION_ERROR', 'USER_EXISTS'].includes(error.code)) {
            throw error;
          }
        }
        
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
        }
      }
    }
    
    throw lastError;
  },
};

// Goals API client functions
export const goalsApi = {
  // Get user goals with optional filters
  async getGoals(filters: import('../types').GoalsFilters = {}): Promise<import('../types').GoalsResponse> {
    const searchParams = new URLSearchParams();
    
    // Add filters to search params
    if (filters.status?.length) {
      searchParams.set('status', filters.status.join(','));
    }
    if (filters.goalType?.length) {
      searchParams.set('goalType', filters.goalType.join(','));
    }
    if (filters.priority?.length) {
      searchParams.set('priority', filters.priority.join(','));
    }
    if (filters.category?.length) {
      searchParams.set('category', filters.category.join(','));
    }
    if (filters.search) {
      searchParams.set('search', filters.search);
    }
    if (filters.sortBy) {
      searchParams.set('sortBy', filters.sortBy);
    }
    if (filters.sortOrder) {
      searchParams.set('sortOrder', filters.sortOrder);
    }
    if (filters.page) {
      searchParams.set('page', filters.page.toString());
    }
    if (filters.limit) {
      searchParams.set('limit', filters.limit.toString());
    }

    const endpoint = `/api/goals${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    
    const response = await apiRequest<ApiResponse<import('../types').GoalsResponse>>(endpoint, {
      method: 'GET',
    });
    
    if (!response.success) {
      throw new ApiError(
        response.error?.message || 'Failed to fetch goals',
        response.error?.code || 'GET_GOALS_FAILED'
      );
    }
    
    return response.data!;
  },

  // Create new goal
  async createGoal(data: import('../types').CreateGoalRequest): Promise<import('../types').Goal> {
    const response = await apiRequest<ApiResponse<import('../types').Goal>>('/api/goals', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    
    if (!response.success) {
      throw new ApiError(
        response.error?.message || 'Failed to create goal',
        response.error?.code || 'CREATE_GOAL_FAILED'
      );
    }
    
    return response.data!;
  },

  // Get specific goal with progress history
  async getGoal(goalId: string): Promise<import('../types').GoalResponse> {
    const response = await apiRequest<ApiResponse<import('../types').GoalResponse>>(`/api/goals/${goalId}`, {
      method: 'GET',
    });
    
    if (!response.success) {
      throw new ApiError(
        response.error?.message || 'Failed to fetch goal',
        response.error?.code || 'GET_GOAL_FAILED'
      );
    }
    
    return response.data!;
  },

  // Update goal
  async updateGoal(goalId: string, data: import('../types').UpdateGoalRequest): Promise<import('../types').Goal> {
    const response = await apiRequest<ApiResponse<import('../types').Goal>>(`/api/goals/${goalId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    
    if (!response.success) {
      throw new ApiError(
        response.error?.message || 'Failed to update goal',
        response.error?.code || 'UPDATE_GOAL_FAILED'
      );
    }
    
    return response.data!;
  },

  // Delete goal
  async deleteGoal(goalId: string): Promise<void> {
    const response = await apiRequest<ApiResponse>(`/api/goals/${goalId}`, {
      method: 'DELETE',
    });
    
    if (!response.success) {
      throw new ApiError(
        response.error?.message || 'Failed to delete goal',
        response.error?.code || 'DELETE_GOAL_FAILED'
      );
    }
  },

  // Add manual progress to goal
  async addGoalProgress(goalId: string, data: import('../types').GoalProgressRequest): Promise<void> {
    const response = await apiRequest<ApiResponse>(`/api/goals/${goalId}/progress`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    
    if (!response.success) {
      throw new ApiError(
        response.error?.message || 'Failed to add goal progress',
        response.error?.code || 'ADD_PROGRESS_FAILED'
      );
    }
  },

  // Get goal progress history
  async getGoalProgress(goalId: string, page?: number, limit?: number): Promise<import('../types').GoalProgressResponse> {
    const searchParams = new URLSearchParams();
    if (page) searchParams.set('page', page.toString());
    if (limit) searchParams.set('limit', limit.toString());

    const endpoint = `/api/goals/${goalId}/progress${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    
    const response = await apiRequest<ApiResponse<import('../types').GoalProgressResponse>>(endpoint, {
      method: 'GET',
    });
    
    if (!response.success) {
      throw new ApiError(
        response.error?.message || 'Failed to fetch goal progress',
        response.error?.code || 'GET_PROGRESS_FAILED'
      );
    }
    
    return response.data!;
  },

  // Calculate automatic progress for goal
  async calculateGoalProgress(goalId: string): Promise<void> {
    const response = await apiRequest<ApiResponse>(`/api/goals/${goalId}/calculate`, {
      method: 'PUT',
    });
    
    if (!response.success) {
      throw new ApiError(
        response.error?.message || 'Failed to calculate goal progress',
        response.error?.code || 'CALCULATE_PROGRESS_FAILED'
      );
    }
  },

  // Set goal as primary
  async setPrimaryGoal(goalId: string): Promise<void> {
    const response = await apiRequest<ApiResponse>(`/api/goals/${goalId}/primary`, {
      method: 'PUT',
    });
    
    if (!response.success) {
      throw new ApiError(
        response.error?.message || 'Failed to set primary goal',
        response.error?.code || 'SET_PRIMARY_FAILED'
      );
    }
  },

  // Get current primary goal
  async getPrimaryGoal(): Promise<import('../types').Goal | null> {
    const response = await apiRequest<ApiResponse<{ primaryGoal: import('../types').Goal | null }>>('/api/goals/primary', {
      method: 'GET',
    });
    
    if (!response.success) {
      throw new ApiError(
        response.error?.message || 'Failed to fetch primary goal',
        response.error?.code || 'GET_PRIMARY_FAILED'
      );
    }
    
    return response.data?.primaryGoal || null;
  },

  // Get goal analytics
  async getGoalAnalytics(goalId: string): Promise<import('../types').GoalAnalyticsResponse> {
    const response = await apiRequest<ApiResponse<import('../types').GoalAnalyticsResponse>>(`/api/goals/${goalId}/analytics`, {
      method: 'GET',
    });
    
    if (!response.success) {
      throw new ApiError(
        response.error?.message || 'Failed to fetch goal analytics',
        response.error?.code || 'GET_GOAL_ANALYTICS_FAILED'
      );
    }
    
    return response.data!;
  },

  // Get all goals analytics
  async getAllGoalsAnalytics(): Promise<import('../types').AllGoalsAnalyticsResponse> {
    const response = await apiRequest<ApiResponse<import('../types').AllGoalsAnalyticsResponse>>('/api/goals/analytics', {
      method: 'GET',
    });
    
    if (!response.success) {
      throw new ApiError(
        response.error?.message || 'Failed to fetch goals analytics',
        response.error?.code || 'GET_GOALS_ANALYTICS_FAILED'
      );
    }
    
    return response.data!;
  },
};

// Export all API functions
export default {
  auth: authApi,
  plaid: plaidApi,
  financial: financialApi,
  goals: goalsApi,
  utils: apiUtils,
}; 