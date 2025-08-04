import { useState, useCallback, useEffect, useRef } from 'react';
import {
  authApi,
  plaidApi,
  financialApi,
  goalsApi,
  apiUtils,
  ApiError
} from '../lib/api-client';
import {
  AuthSignInRequest,
  AuthSignUpRequest,
  AuthResponse,
  PlaidExchangeTokenRequest,
  TransactionsRequest,
  SyncRequest,
  AccountsResponse,
  TransactionsResponse,
  SyncResponse,
  LoadingState,
  InvestmentsRequest,
  InvestmentsResponse
} from '../types';

// Generic hook for API operations with loading and error states
export function useApiOperation<T, P extends any[]>(
  operation: (...args: P) => Promise<T>
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<LoadingState>('idle');
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (...args: P) => {
    setLoading('loading');
    setError(null);

    try {
      const result = await operation(...args);
      setData(result);
      setLoading('success');
      return result;
    } catch (err) {
      const errorMessage = apiUtils.getErrorMessage(err);
      console.error('API error:', errorMessage);
      setError(errorMessage);
      setLoading('error');
      throw err;
    }
  }, [operation]);

  const reset = useCallback(() => {
    setData(null);
    setLoading('idle');
    setError(null);
  }, []);

  return {
    data,
    loading,
    error,
    execute,
    reset,
    isIdle: loading === 'idle',
    isLoading: loading === 'loading',
    isSuccess: loading === 'success',
    isError: loading === 'error',
  };
}

// Authentication hooks
export function useAuth() {
  const [user, setUser] = useState<AuthResponse['user'] | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await authApi.getCurrentUser();
        setUser(currentUser);
        setIsAuthenticated(true);
      } catch (error) {
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const signIn = useApiOperation(authApi.signIn);
  const signUp = useApiOperation(authApi.signUp);
  const signOut = useApiOperation(authApi.signOut);

  const handleSignIn = useCallback(async (credentials: AuthSignInRequest) => {
    try {
      const result = await signIn.execute(credentials);
      setUser(result.user);
      setIsAuthenticated(true);
      return result;
    } catch (error) {
      throw error;
    }
  }, [signIn]);

  const handleSignUp = useCallback(async (userData: AuthSignUpRequest) => {
    try {
      const result = await signUp.execute(userData);
      setUser(result.user);
      setIsAuthenticated(true);
      return result;
    } catch (error) {
      throw error;
    }
  }, [signUp]);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut.execute();
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      // Even if sign out fails, clear local state
      setUser(null);
      setIsAuthenticated(false);
      throw error;
    }
  }, [signOut]);

  return {
    user,
    isAuthenticated,
    isLoading,
    signIn: handleSignIn,
    signUp: handleSignUp,
    signOut: handleSignOut,
    signInState: signIn,
    signUpState: signUp,
    signOutState: signOut,
  };
}

// Plaid integration hooks
export function usePlaid() {
  const createLinkToken = useApiOperation(plaidApi.createLinkToken);
  const exchangeToken = useApiOperation(plaidApi.exchangeToken);
  const disconnectAccount = useApiOperation(plaidApi.disconnectAccount);

  const handleExchangeToken = useCallback(async (request: PlaidExchangeTokenRequest) => {
    try {
      const result = await exchangeToken.execute(request);
      return result;
    } catch (error) {
      throw error;
    }
  }, [exchangeToken]);

  const handleDisconnectAccount = useCallback(async (connectionId: string) => {
    try {
      await disconnectAccount.execute(connectionId);
    } catch (error) {
      throw error;
    }
  }, [disconnectAccount]);

  return {
    createLinkToken: createLinkToken.execute,
    exchangeToken: handleExchangeToken,
    disconnectAccount: handleDisconnectAccount,
    createLinkTokenState: createLinkToken,
    exchangeTokenState: exchangeToken,
    disconnectAccountState: disconnectAccount,
  };
}

// Financial data hooks
export function useAccounts() {
  const [accounts, setAccounts] = useState<AccountsResponse['accounts']>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);

  const refreshAccounts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await financialApi.getAccounts();
      setAccounts(result.accounts);
      setLastUpdated(new Date());
      setHasInitiallyLoaded(true);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch accounts';
      setError(errorMessage);
      setHasInitiallyLoaded(true);
      console.error('Failed to fetch accounts:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Load accounts on mount
  useEffect(() => {
    refreshAccounts();
  }, []); // Only run on mount

  return {
    accounts,
    lastUpdated,
    refreshAccounts,
    loading,
    error,
    hasInitiallyLoaded,
    isIdle: hasInitiallyLoaded && !loading && !error && accounts.length === 0,
    isLoading: loading,
    isSuccess: hasInitiallyLoaded && !loading && !error,
    isError: !!error,
  };
}

export function useTransactions(initialFilters?: TransactionsRequest) {
  const [transactions, setTransactions] = useState<TransactionsResponse['transactions']>([]);
  const [pagination, setPagination] = useState<TransactionsResponse['pagination'] | null>(null);
  const [filters, setFilters] = useState<TransactionsRequest>(() => initialFilters || {});
  const filtersRef = useRef(filters);

  // Keep ref in sync with state
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  const getTransactions = useApiOperation(financialApi.getTransactions);

  const loadTransactions = useCallback(async (newFilters?: TransactionsRequest) => {
    return new Promise((resolve, reject) => {
      if (newFilters) {
        // If new filters provided, use them directly
        getTransactions.execute(newFilters).then(result => {
          setTransactions(result.transactions);
          setPagination(result.pagination);
          resolve(result);
        }).catch(reject);
      } else {
        // Use current filters from state
        setFilters(currentFilters => {
          getTransactions.execute(currentFilters).then(result => {
            setTransactions(result.transactions);
            setPagination(result.pagination);
            resolve(result);
          }).catch(reject);
          return currentFilters; // Don't change filters
        });
      }
    });
  }, [getTransactions.execute]);

  const updateFilters = useCallback((newFilters: Partial<TransactionsRequest>) => {
    // Clean up the filters to ensure proper handling of undefined/empty values
    const cleanedFilters: TransactionsRequest = { ...newFilters };

    // Remove accountIds if it's undefined or empty array
    if (cleanedFilters.accountIds === undefined || (Array.isArray(cleanedFilters.accountIds) && cleanedFilters.accountIds.length === 0)) {
      delete cleanedFilters.accountIds;
    }

    // Reset to first page when filters change
    const updatedFilters = { ...filtersRef.current, ...cleanedFilters, page: 1 };
    console.log('Updating filters:', { oldFilters: filtersRef.current, newFilters: cleanedFilters, updatedFilters }); // Debug log

    setFilters(updatedFilters);

    // Call loadTransactions directly to avoid dependency issues
    getTransactions.execute(updatedFilters).then(result => {
      console.log(`Filter update loaded ${result.transactions.length} transactions`, result.pagination); // Debug log
      setTransactions(result.transactions);
      setPagination(result.pagination);
    }).catch(error => {
      console.error('Failed to update filters:', error);
    });
  }, [getTransactions.execute]);

  const loadMore = useCallback(async () => {
    if (pagination?.hasNext) {
      const nextPage = (pagination.page || 1) + 1;
      console.log(`Loading more transactions - page ${nextPage}`, { currentFilters: filtersRef.current, pagination }); // Debug log

      try {
        const newFilters = { ...filtersRef.current, page: nextPage };
        const result = await getTransactions.execute(newFilters);

        setTransactions(prev => {
          console.log(`Appending ${result.transactions.length} new transactions to existing ${prev.length}`); // Debug log
          return [...prev, ...result.transactions];
        });
        setPagination(result.pagination);
        setFilters(newFilters);

        return result;
      } catch (error) {
        console.error('Failed to load more transactions:', error);
        throw error;
      }
    } else {
      console.log('No more transactions to load', { pagination }); // Debug log
    }
  }, [pagination, getTransactions.execute]);

  // Load initial transactions on mount
  useEffect(() => {
    const initialLoad = async () => {
      try {
        const filtersToUse = initialFilters || {};
        const result = await getTransactions.execute(filtersToUse);
        setTransactions(result.transactions);
        setPagination(result.pagination);
      } catch (error) {
        console.error('Failed to load initial transactions:', error);
      }
    };

    initialLoad();
  }, []); // Only run on mount

  return {
    transactions,
    pagination,
    filters,
    loadTransactions,
    updateFilters,
    loadMore,
    loading: getTransactions.loading,
    error: getTransactions.error,
    isIdle: getTransactions.isIdle,
    isLoading: getTransactions.isLoading,
    isSuccess: getTransactions.isSuccess,
    isError: getTransactions.isError,
    hasMore: pagination?.hasNext || false,
  };
}

export function useSync() {
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncStatus, setSyncStatus] = useState<LoadingState>('idle');

  const syncData = useApiOperation(financialApi.syncData);

  const performSync = useCallback(async (options?: SyncRequest) => {
    setSyncStatus('loading');
    try {
      const result = await syncData.execute(options || {});
      setLastSyncTime(new Date());
      setSyncStatus('success');
      return result;
    } catch (error) {
      setSyncStatus('error');
      throw error;
    }
  }, [syncData]);

  return {
    lastSyncTime,
    syncStatus,
    performSync,
    isIdle: syncStatus === 'idle',
    isSyncing: syncStatus === 'loading',
    isSyncSuccess: syncStatus === 'success',
    isSyncError: syncStatus === 'error',
  };
}

export function useInvestments(initialFilters?: import('../types').InvestmentsRequest) {
  const [investments, setInvestments] = useState<import('../types').InvestmentsResponse | null>(null);
  const [filters, setFilters] = useState<import('../types').InvestmentsRequest>(() => initialFilters || {});
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const getInvestments = useApiOperation(financialApi.getInvestments);

  const loadInvestments = useCallback(async (newFilters?: import('../types').InvestmentsRequest) => {
    const filtersToUse = newFilters || filters;
    
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Set a timeout to prevent infinite loading (30 seconds)
    timeoutRef.current = setTimeout(() => {
      if (getInvestments.loading === 'loading') {
        console.warn('Investment data loading timed out after 30 seconds');
        // Force set to error state if still loading after timeout
        getInvestments.reset();
      }
    }, 30000);
    
    try {
      const result = await getInvestments.execute(filtersToUse);
      setInvestments(result);
      setLastUpdated(new Date());
      
      // Clear timeout on success
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      return result;
    } catch (error) {
      console.error('Failed to load investments:', error);
      
      // Clear timeout on error
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      throw error;
    }
  }, [getInvestments, filters]);

  const updateFilters = useCallback((newFilters: Partial<import('../types').InvestmentsRequest>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    loadInvestments(updatedFilters);
  }, [filters, loadInvestments]);

  const refreshInvestments = useCallback(() => {
    return loadInvestments();
  }, [loadInvestments]);

  // Load initial investments on mount
  useEffect(() => {
    loadInvestments();
  }, []); // Only run on mount

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    investments,
    filters,
    lastUpdated,
    loadInvestments,
    updateFilters,
    refreshInvestments,
    loading: getInvestments.loading,
    error: getInvestments.error,
    isIdle: getInvestments.isIdle,
    isLoading: getInvestments.isLoading,
    isSuccess: getInvestments.isSuccess,
    isError: getInvestments.isError,
    // Convenience getters
    holdings: investments?.holdings || [],
    investmentTransactions: investments?.transactions || [],
    investmentAccounts: investments?.accounts || [],
  };
}

// Utility hook for checking authentication status
export function useAuthCheck() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authenticated = await apiUtils.checkAuth();
        setIsAuthenticated(authenticated);
      } catch (error) {
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  return {
    isAuthenticated,
    isLoading,
  };
}

// Goals hooks
export function useGoals(initialFilters?: import('../types').GoalsFilters) {
  const [goals, setGoals] = useState<import('../types').Goal[]>([]);
  const [filters, setFilters] = useState<import('../types').GoalsFilters>(() => initialFilters || {});
  const [pagination, setPagination] = useState<import('../types').GoalsResponse['pagination'] | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const getGoals = useApiOperation(goalsApi.getGoals);
  const createGoal = useApiOperation(goalsApi.createGoal);
  const updateGoal = useApiOperation(goalsApi.updateGoal);
  const deleteGoal = useApiOperation(goalsApi.deleteGoal);

  const loadGoals = useCallback(async (newFilters?: import('../types').GoalsFilters) => {
    const filtersToUse = newFilters || filters;
    try {
      const result = await getGoals.execute(filtersToUse);
      setGoals(result.goals);
      setPagination(result.pagination || null);
      setLastUpdated(new Date());
      return result;
    } catch (error) {
      console.error('Failed to load goals:', error);
      throw error;
    }
  }, [getGoals, filters]);

  const updateFilters = useCallback((newFilters: Partial<import('../types').GoalsFilters>) => {
    const updatedFilters = { ...filters, ...newFilters, page: 1 };
    setFilters(updatedFilters);
    loadGoals(updatedFilters);
  }, [filters, loadGoals]);

  const refreshGoals = useCallback(() => {
    return loadGoals();
  }, [loadGoals]);

  const handleCreateGoal = useCallback(async (data: import('../types').CreateGoalRequest) => {
    try {
      const newGoal = await createGoal.execute(data);
      setGoals(prev => [newGoal, ...prev]);
      setLastUpdated(new Date());
      return newGoal;
    } catch (error) {
      throw error;
    }
  }, [createGoal]);

  const handleUpdateGoal = useCallback(async (goalId: string, data: import('../types').UpdateGoalRequest) => {
    try {
      const updatedGoal = await updateGoal.execute(goalId, data);
      setGoals(prev => prev.map(goal => goal.id === goalId ? updatedGoal : goal));
      setLastUpdated(new Date());
      return updatedGoal;
    } catch (error) {
      throw error;
    }
  }, [updateGoal]);

  const handleDeleteGoal = useCallback(async (goalId: string) => {
    try {
      await deleteGoal.execute(goalId);
      setGoals(prev => prev.filter(goal => goal.id !== goalId));
      setLastUpdated(new Date());
    } catch (error) {
      throw error;
    }
  }, [deleteGoal]);

  // Load initial goals on mount
  useEffect(() => {
    loadGoals();
  }, []); // Only run on mount

  return {
    goals,
    filters,
    pagination,
    lastUpdated,
    loadGoals,
    updateFilters,
    refreshGoals,
    createGoal: handleCreateGoal,
    updateGoal: handleUpdateGoal,
    deleteGoal: handleDeleteGoal,
    loading: getGoals.loading,
    error: getGoals.error,
    isIdle: getGoals.isIdle,
    isLoading: getGoals.isLoading,
    isSuccess: getGoals.isSuccess,
    isError: getGoals.isError,
    // Individual operation states
    createState: createGoal,
    updateState: updateGoal,
    deleteState: deleteGoal,
  };
}

export function useGoal(goalId: string) {
  const [goal, setGoal] = useState<import('../types').Goal | null>(null);
  const [progressHistory, setProgressHistory] = useState<import('../types').GoalProgress[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const getGoal = useApiOperation(goalsApi.getGoal);
  const addProgress = useApiOperation(goalsApi.addGoalProgress);
  const calculateProgress = useApiOperation(goalsApi.calculateGoalProgress);

  const loadGoal = useCallback(async () => {
    try {
      const result = await getGoal.execute(goalId);
      setGoal(result.goal);
      setProgressHistory(result.progressHistory || []);
      setLastUpdated(new Date());
      return result;
    } catch (error) {
      console.error('Failed to load goal:', error);
      throw error;
    }
  }, [getGoal, goalId]);

  const handleAddProgress = useCallback(async (data: import('../types').GoalProgressRequest) => {
    try {
      await addProgress.execute(goalId, data);
      // Reload goal to get updated progress
      await loadGoal();
    } catch (error) {
      throw error;
    }
  }, [addProgress, goalId, loadGoal]);

  const handleCalculateProgress = useCallback(async () => {
    try {
      await calculateProgress.execute(goalId);
      // Reload goal to get updated progress
      await loadGoal();
    } catch (error) {
      throw error;
    }
  }, [calculateProgress, goalId, loadGoal]);

  // Load goal on mount or when goalId changes
  useEffect(() => {
    if (goalId) {
      loadGoal();
    }
  }, [goalId]); // Only depend on goalId, not loadGoal

  return {
    goal,
    progressHistory,
    lastUpdated,
    loadGoal,
    addProgress: handleAddProgress,
    calculateProgress: handleCalculateProgress,
    loading: getGoal.loading,
    error: getGoal.error,
    isIdle: getGoal.isIdle,
    isLoading: getGoal.isLoading,
    isSuccess: getGoal.isSuccess,
    isError: getGoal.isError,
    // Individual operation states
    addProgressState: addProgress,
    calculateProgressState: calculateProgress,
  };
}

export function usePrimaryGoal() {
  const [primaryGoal, setPrimaryGoalState] = useState<import('../types').Goal | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const getPrimaryGoal = useApiOperation(goalsApi.getPrimaryGoal);
  const setPrimaryGoal = useApiOperation(goalsApi.setPrimaryGoal);

  const loadPrimaryGoal = useCallback(async () => {
    try {
      const result = await getPrimaryGoal.execute();
      setPrimaryGoalState(result);
      setLastUpdated(new Date());
      return result;
    } catch (error) {
      console.error('Failed to load primary goal:', error);
      throw error;
    }
  }, [getPrimaryGoal]);

  const handleSetPrimaryGoal = useCallback(async (goalId: string) => {
    try {
      await setPrimaryGoal.execute(goalId);
      // Reload primary goal to get updated data
      await loadPrimaryGoal();
    } catch (error) {
      throw error;
    }
  }, [setPrimaryGoal, loadPrimaryGoal]);

  // Load primary goal on mount
  useEffect(() => {
    loadPrimaryGoal();
  }, []); // Only run on mount

  return {
    primaryGoal,
    lastUpdated,
    loadPrimaryGoal,
    setPrimaryGoal: handleSetPrimaryGoal,
    loading: getPrimaryGoal.loading,
    error: getPrimaryGoal.error,
    isIdle: getPrimaryGoal.isIdle,
    isLoading: getPrimaryGoal.isLoading,
    isSuccess: getPrimaryGoal.isSuccess,
    isError: getPrimaryGoal.isError,
    // Individual operation states
    setPrimaryState: setPrimaryGoal,
  };
}

export function useGoalAnalytics(goalId?: string) {
  const [analytics, setAnalytics] = useState<import('../types').AllGoalsAnalyticsResponse | import('../types').GoalAnalyticsResponse | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const getGoalAnalytics = useApiOperation(goalsApi.getGoalAnalytics);
  const getAllGoalsAnalytics = useApiOperation(goalsApi.getAllGoalsAnalytics);

  const loadAnalytics = useCallback(async () => {
    try {
      let result;
      if (goalId) {
        result = await getGoalAnalytics.execute(goalId);
      } else {
        result = await getAllGoalsAnalytics.execute();
      }
      setAnalytics(result);
      setLastUpdated(new Date());
      return result;
    } catch (error) {
      console.error('Failed to load goal analytics:', error);
      throw error;
    }
  }, [goalId, getGoalAnalytics, getAllGoalsAnalytics]);

  const refreshAnalytics = useCallback(() => {
    return loadAnalytics();
  }, [loadAnalytics]);

  // Load analytics on mount or when goalId changes
  useEffect(() => {
    loadAnalytics();
  }, [goalId]); // Only depend on goalId, not loadAnalytics

  return {
    analytics,
    lastUpdated,
    loadAnalytics,
    refreshAnalytics,
    loading: goalId ? getGoalAnalytics.loading : getAllGoalsAnalytics.loading,
    error: goalId ? getGoalAnalytics.error : getAllGoalsAnalytics.error,
    isIdle: goalId ? getGoalAnalytics.isIdle : getAllGoalsAnalytics.isIdle,
    isLoading: goalId ? getGoalAnalytics.isLoading : getAllGoalsAnalytics.isLoading,
    isSuccess: goalId ? getGoalAnalytics.isSuccess : getAllGoalsAnalytics.isSuccess,
    isError: goalId ? getGoalAnalytics.isError : getAllGoalsAnalytics.isError,
  };
}

// Hook for managing API errors with toast notifications
export function useApiError() {
  const [errors, setErrors] = useState<Array<{ id: string; message: string; timestamp: Date }>>([]);

  const addError = useCallback((message: string) => {
    const error = {
      id: Date.now().toString(),
      message,
      timestamp: new Date(),
    };
    setErrors(prev => [...prev, error]);
  }, []);

  const removeError = useCallback((id: string) => {
    setErrors(prev => prev.filter(error => error.id !== id));
  }, []);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  const handleApiError = useCallback((error: unknown) => {
    const message = apiUtils.getErrorMessage(error);
    addError(message);
    return message;
  }, [addError]);

  return {
    errors,
    addError,
    removeError,
    clearErrors,
    handleApiError,
  };
} 