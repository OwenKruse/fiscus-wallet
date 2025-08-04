import { useState, useCallback, useRef, useEffect } from 'react';
import { LoadingState } from '../types';

// Loading state configuration
export interface LoadingConfig {
  showSpinner?: boolean;
  showProgress?: boolean;
  timeout?: number;
  onTimeout?: () => void;
  onComplete?: () => void;
  onError?: (error: unknown) => void;
}

// Progress tracking interface
export interface ProgressInfo {
  current: number;
  total: number;
  percentage: number;
  message?: string;
  stage?: string;
}

// Loading state manager
export class LoadingStateManager {
  private static instance: LoadingStateManager;
  private loadingStates = new Map<string, LoadingState>();
  private progressStates = new Map<string, ProgressInfo>();
  private timeouts = new Map<string, NodeJS.Timeout>();

  static getInstance(): LoadingStateManager {
    if (!LoadingStateManager.instance) {
      LoadingStateManager.instance = new LoadingStateManager();
    }
    return LoadingStateManager.instance;
  }

  // Set loading state for a specific operation
  setLoadingState(operationId: string, state: LoadingState): void {
    this.loadingStates.set(operationId, state);
    this.notifyListeners(operationId);
  }

  // Get loading state for a specific operation
  getLoadingState(operationId: string): LoadingState {
    return this.loadingStates.get(operationId) || 'idle';
  }

  // Set progress for a specific operation
  setProgress(operationId: string, progress: ProgressInfo): void {
    this.progressStates.set(operationId, progress);
    this.notifyListeners(operationId);
  }

  // Get progress for a specific operation
  getProgress(operationId: string): ProgressInfo | null {
    return this.progressStates.get(operationId) || null;
  }

  // Start loading with timeout
  startLoading(operationId: string, config?: LoadingConfig): void {
    this.setLoadingState(operationId, 'loading');
    
    if (config?.timeout) {
      const timeout = setTimeout(() => {
        if (this.getLoadingState(operationId) === 'loading') {
          this.setLoadingState(operationId, 'error');
          config.onTimeout?.();
        }
      }, config.timeout);
      
      this.timeouts.set(operationId, timeout);
    }
  }

  // Complete loading
  completeLoading(operationId: string, config?: LoadingConfig): void {
    this.clearTimeout(operationId);
    this.setLoadingState(operationId, 'success');
    this.progressStates.delete(operationId);
    config?.onComplete?.();
    
    // Reset to idle after a short delay
    setTimeout(() => {
      this.setLoadingState(operationId, 'idle');
    }, 1000);
  }

  // Error loading
  errorLoading(operationId: string, error: unknown, config?: LoadingConfig): void {
    this.clearTimeout(operationId);
    this.setLoadingState(operationId, 'error');
    this.progressStates.delete(operationId);
    config?.onError?.(error);
  }

  // Clear timeout for an operation
  private clearTimeout(operationId: string): void {
    const timeout = this.timeouts.get(operationId);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(operationId);
    }
  }

  // Listeners for state changes
  private listeners = new Map<string, Set<(state: LoadingState) => void>>();

  // Add listener for state changes
  addListener(operationId: string, listener: (state: LoadingState) => void): () => void {
    if (!this.listeners.has(operationId)) {
      this.listeners.set(operationId, new Set());
    }
    
    this.listeners.get(operationId)!.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners.get(operationId)?.delete(listener);
    };
  }

  // Notify listeners of state change
  private notifyListeners(operationId: string): void {
    const state = this.getLoadingState(operationId);
    this.listeners.get(operationId)?.forEach(listener => listener(state));
  }

  // Clear all states
  clear(): void {
    this.loadingStates.clear();
    this.progressStates.clear();
    this.timeouts.forEach(timeout => clearTimeout(timeout));
    this.timeouts.clear();
  }
}

// React hook for loading state management
export function useLoadingState(operationId: string, config?: LoadingConfig) {
  const [state, setState] = useState<LoadingState>('idle');
  const [progress, setProgress] = useState<ProgressInfo | null>(null);
  const manager = LoadingStateManager.getInstance();
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const unsubscribe = manager.addListener(operationId, (newState) => {
      setState(newState);
    });

    return unsubscribe;
  }, [operationId, manager]);

  const startLoading = useCallback(() => {
    manager.startLoading(operationId, config);
  }, [operationId, config, manager]);

  const completeLoading = useCallback(() => {
    manager.completeLoading(operationId, config);
  }, [operationId, config, manager]);

  const errorLoading = useCallback((error: unknown) => {
    manager.errorLoading(operationId, error, config);
  }, [operationId, config, manager]);

  const setProgress = useCallback((progressInfo: ProgressInfo) => {
    manager.setProgress(operationId, progressInfo);
    setProgress(progressInfo);
  }, [operationId, manager]);

  return {
    state,
    progress,
    isIdle: state === 'idle',
    isLoading: state === 'loading',
    isSuccess: state === 'success',
    isError: state === 'error',
    startLoading,
    completeLoading,
    errorLoading,
    setProgress,
  };
}

// Hook for managing multiple loading states
export function useLoadingStates() {
  const [states, setStates] = useState<Map<string, LoadingState>>(new Map());
  const manager = LoadingStateManager.getInstance();

  const getState = useCallback((operationId: string): LoadingState => {
    return states.get(operationId) || 'idle';
  }, [states]);

  const setState = useCallback((operationId: string, state: LoadingState) => {
    setStates(prev => new Map(prev).set(operationId, state));
  }, []);

  const isAnyLoading = useCallback((): boolean => {
    return Array.from(states.values()).some(state => state === 'loading');
  }, [states]);

  const getLoadingCount = useCallback((): number => {
    return Array.from(states.values()).filter(state => state === 'loading').length;
  }, [states]);

  return {
    states,
    getState,
    setState,
    isAnyLoading,
    getLoadingCount,
  };
}

// Loading indicators and utilities
export const loadingUtils = {
  // Get loading message based on operation
  getLoadingMessage(operation: string): string {
    const messages: Record<string, string> = {
      'auth': 'Signing in...',
      'signup': 'Creating account...',
      'plaid': 'Connecting bank account...',
      'accounts': 'Loading accounts...',
      'transactions': 'Loading transactions...',
      'sync': 'Syncing data...',
      'default': 'Loading...',
    };
    
    return messages[operation] || messages.default;
  },

  // Get progress message based on stage
  getProgressMessage(stage: string): string {
    const messages: Record<string, string> = {
      'init': 'Initializing...',
      'connect': 'Connecting to bank...',
      'authenticate': 'Authenticating...',
      'fetch': 'Fetching data...',
      'process': 'Processing...',
      'complete': 'Completing...',
    };
    
    return messages[stage] || 'Processing...';
  },

  // Calculate percentage
  calculatePercentage(current: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((current / total) * 100);
  },

  // Format progress text
  formatProgress(progress: ProgressInfo): string {
    if (progress.message) {
      return progress.message;
    }
    
    if (progress.stage) {
      return `${loadingUtils.getProgressMessage(progress.stage)} (${progress.percentage}%)`;
    }
    
    return `${progress.percentage}%`;
  },

  // Get loading spinner size based on context
  getSpinnerSize(context: 'button' | 'page' | 'component'): 'sm' | 'md' | 'lg' {
    switch (context) {
      case 'button':
        return 'sm';
      case 'component':
        return 'md';
      case 'page':
        return 'lg';
      default:
        return 'md';
    }
  },

  // Get loading color based on state
  getLoadingColor(state: LoadingState): string {
    switch (state) {
      case 'loading':
        return 'text-blue-600';
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  },
};

// Global loading state manager instance
export const globalLoadingManager = LoadingStateManager.getInstance();

// Utility for tracking async operations
export function withLoading<T extends any[], R>(
  operation: (...args: T) => Promise<R>,
  operationId: string,
  config?: LoadingConfig
) {
  return async (...args: T): Promise<R> => {
    globalLoadingManager.startLoading(operationId, config);
    
    try {
      const result = await operation(...args);
      globalLoadingManager.completeLoading(operationId, config);
      return result;
    } catch (error) {
      globalLoadingManager.errorLoading(operationId, error, config);
      throw error;
    }
  };
} 