// Client-side caching utilities for fast UI updates
// Implements optimistic updates and background synchronization

import { useState, useEffect, useCallback, useRef } from 'react';
import type { 
  AccountsResponse, 
  TransactionsResponse, 
  TransactionFilters,
  SyncResponse 
} from '../../types';

export interface ClientCacheOptions {
  staleTime?: number; // Time before data is considered stale (ms)
  cacheTime?: number; // Time to keep unused data in cache (ms)
  refetchOnWindowFocus?: boolean;
  refetchOnReconnect?: boolean;
  optimisticUpdates?: boolean;
}

export interface CacheState<T> {
  data: T | null;
  isLoading: boolean;
  isStale: boolean;
  error: string | null;
  lastFetched: Date | null;
  isRefetching: boolean;
}

export interface OptimisticUpdate<T> {
  id: string;
  type: 'add' | 'update' | 'delete';
  data: T;
  timestamp: Date;
  rollback: () => void;
}

class ClientCacheManager {
  private cache = new Map<string, any>();
  private subscribers = new Map<string, Set<(data: any) => void>>();
  private optimisticUpdates = new Map<string, OptimisticUpdate<any>[]>();
  private options: Required<ClientCacheOptions>;

  constructor(options: ClientCacheOptions = {}) {
    this.options = {
      staleTime: options.staleTime ?? 5 * 60 * 1000, // 5 minutes
      cacheTime: options.cacheTime ?? 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: options.refetchOnWindowFocus ?? true,
      refetchOnReconnect: options.refetchOnReconnect ?? true,
      optimisticUpdates: options.optimisticUpdates ?? true,
    };

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    if (typeof window !== 'undefined') {
      if (this.options.refetchOnWindowFocus) {
        window.addEventListener('focus', this.handleWindowFocus);
      }
      if (this.options.refetchOnReconnect) {
        window.addEventListener('online', this.handleReconnect);
      }
    }
  }

  private handleWindowFocus = (): void => {
    // Refetch stale data when window regains focus
    for (const [key, state] of this.cache.entries()) {
      if (this.isStale(state)) {
        this.notifySubscribers(key, { ...state, isStale: true });
      }
    }
  };

  private handleReconnect = (): void => {
    // Refetch all data when connection is restored
    for (const [key, state] of this.cache.entries()) {
      this.notifySubscribers(key, { ...state, isStale: true });
    }
  };

  get<T>(key: string): CacheState<T> | null {
    return this.cache.get(key) || null;
  }

  set<T>(key: string, data: T): void {
    const state: CacheState<T> = {
      data,
      isLoading: false,
      isStale: false,
      error: null,
      lastFetched: new Date(),
      isRefetching: false,
    };

    this.cache.set(key, state);
    this.notifySubscribers(key, state);
  }

  setLoading(key: string, isLoading: boolean): void {
    const current = this.cache.get(key) || this.createEmptyState();
    const updated = { ...current, isLoading };
    this.cache.set(key, updated);
    this.notifySubscribers(key, updated);
  }

  setError(key: string, error: string): void {
    const current = this.cache.get(key) || this.createEmptyState();
    const updated = { ...current, error, isLoading: false };
    this.cache.set(key, updated);
    this.notifySubscribers(key, updated);
  }

  setRefetching(key: string, isRefetching: boolean): void {
    const current = this.cache.get(key) || this.createEmptyState();
    const updated = { ...current, isRefetching };
    this.cache.set(key, updated);
    this.notifySubscribers(key, updated);
  }

  subscribe(key: string, callback: (data: any) => void): () => void {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    this.subscribers.get(key)!.add(callback);

    // Return unsubscribe function
    return () => {
      const subs = this.subscribers.get(key);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) {
          this.subscribers.delete(key);
        }
      }
    };
  }

  addOptimisticUpdate<T>(key: string, update: OptimisticUpdate<T>): void {
    if (!this.options.optimisticUpdates) return;

    if (!this.optimisticUpdates.has(key)) {
      this.optimisticUpdates.set(key, []);
    }
    this.optimisticUpdates.get(key)!.push(update);

    // Apply optimistic update to cached data
    this.applyOptimisticUpdates(key);
  }

  removeOptimisticUpdate(key: string, updateId: string): void {
    const updates = this.optimisticUpdates.get(key);
    if (updates) {
      const index = updates.findIndex(u => u.id === updateId);
      if (index !== -1) {
        updates.splice(index, 1);
        this.applyOptimisticUpdates(key);
      }
    }
  }

  rollbackOptimisticUpdate(key: string, updateId: string): void {
    const updates = this.optimisticUpdates.get(key);
    if (updates) {
      const update = updates.find(u => u.id === updateId);
      if (update) {
        update.rollback();
        this.removeOptimisticUpdate(key, updateId);
      }
    }
  }

  invalidate(key: string): void {
    const current = this.cache.get(key);
    if (current) {
      const updated = { ...current, isStale: true };
      this.cache.set(key, updated);
      this.notifySubscribers(key, updated);
    }
  }

  clear(key?: string): void {
    if (key) {
      this.cache.delete(key);
      this.optimisticUpdates.delete(key);
      this.subscribers.delete(key);
    } else {
      this.cache.clear();
      this.optimisticUpdates.clear();
      this.subscribers.clear();
    }
  }

  private createEmptyState<T>(): CacheState<T> {
    return {
      data: null,
      isLoading: false,
      isStale: false,
      error: null,
      lastFetched: null,
      isRefetching: false,
    };
  }

  private isStale(state: CacheState<any>): boolean {
    if (!state.lastFetched) return true;
    return Date.now() - state.lastFetched.getTime() > this.options.staleTime;
  }

  private notifySubscribers(key: string, data: any): void {
    const subs = this.subscribers.get(key);
    if (subs) {
      subs.forEach(callback => callback(data));
    }
  }

  private applyOptimisticUpdates(key: string): void {
    const updates = this.optimisticUpdates.get(key);
    const current = this.cache.get(key);
    
    if (!updates || !current || !current.data) return;

    // Apply updates in chronological order
    const sortedUpdates = updates.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    let updatedData = { ...current.data };

    for (const update of sortedUpdates) {
      updatedData = this.applyUpdate(updatedData, update);
    }

    const updated = { ...current, data: updatedData };
    this.cache.set(key, updated);
    this.notifySubscribers(key, updated);
  }

  private applyUpdate<T>(data: any, update: OptimisticUpdate<T>): any {
    // This is a simplified implementation - in practice you'd need more sophisticated merging
    switch (update.type) {
      case 'add':
        if (Array.isArray(data)) {
          return [update.data, ...data];
        } else if (data.transactions) {
          return {
            ...data,
            transactions: [update.data, ...data.transactions],
          };
        } else if (data.accounts) {
          return {
            ...data,
            accounts: [update.data, ...data.accounts],
          };
        }
        return data;

      case 'update':
        if (Array.isArray(data)) {
          return data.map(item => 
            item.id === (update.data as any).id ? { ...item, ...update.data } : item
          );
        } else if (data.transactions) {
          return {
            ...data,
            transactions: data.transactions.map((item: any) =>
              item.id === (update.data as any).id ? { ...item, ...update.data } : item
            ),
          };
        } else if (data.accounts) {
          return {
            ...data,
            accounts: data.accounts.map((item: any) =>
              item.id === (update.data as any).id ? { ...item, ...update.data } : item
            ),
          };
        }
        return data;

      case 'delete':
        if (Array.isArray(data)) {
          return data.filter(item => item.id !== (update.data as any).id);
        } else if (data.transactions) {
          return {
            ...data,
            transactions: data.transactions.filter((item: any) => item.id !== (update.data as any).id),
          };
        } else if (data.accounts) {
          return {
            ...data,
            accounts: data.accounts.filter((item: any) => item.id !== (update.data as any).id),
          };
        }
        return data;

      default:
        return data;
    }
  }
}

// Global cache manager instance
const cacheManager = new ClientCacheManager();

// Custom hooks for using the cache

export function useTransactions(filters: TransactionFilters = {}) {
  const cacheKey = `transactions:${JSON.stringify(filters)}`;
  const [state, setState] = useState<CacheState<TransactionsResponse>>(() => 
    cacheManager.get(cacheKey) || cacheManager.createEmptyState()
  );

  const fetchTransactions = useCallback(async (isRefetch = false) => {
    try {
      if (isRefetch) {
        cacheManager.setRefetching(cacheKey, true);
      } else {
        cacheManager.setLoading(cacheKey, true);
      }

      const response = await fetch('/api/transactions?' + new URLSearchParams({
        ...filters,
        page: filters.page?.toString() || '1',
        limit: filters.limit?.toString() || '50',
      } as any));

      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }

      const data: TransactionsResponse = await response.json();
      cacheManager.set(cacheKey, data);
    } catch (error) {
      cacheManager.setError(cacheKey, error instanceof Error ? error.message : 'Unknown error');
    } finally {
      cacheManager.setLoading(cacheKey, false);
      cacheManager.setRefetching(cacheKey, false);
    }
  }, [cacheKey, filters]);

  const refetch = useCallback(() => fetchTransactions(true), [fetchTransactions]);

  const addOptimisticTransaction = useCallback((transaction: any) => {
    const update: OptimisticUpdate<any> = {
      id: `temp-${Date.now()}`,
      type: 'add',
      data: transaction,
      timestamp: new Date(),
      rollback: () => {
        // Rollback logic would be implemented here
      },
    };
    cacheManager.addOptimisticUpdate(cacheKey, update);
  }, [cacheKey]);

  useEffect(() => {
    const unsubscribe = cacheManager.subscribe(cacheKey, setState);
    
    // Fetch data if not cached or stale
    const cached = cacheManager.get(cacheKey);
    if (!cached || (!cached.data && !cached.isLoading)) {
      fetchTransactions();
    }

    return unsubscribe;
  }, [cacheKey, fetchTransactions]);

  return {
    ...state,
    refetch,
    addOptimisticTransaction,
  };
}

export function useAccounts() {
  const cacheKey = 'accounts';
  const [state, setState] = useState<CacheState<AccountsResponse>>(() => 
    cacheManager.get(cacheKey) || cacheManager.createEmptyState()
  );

  const fetchAccounts = useCallback(async (isRefetch = false) => {
    try {
      if (isRefetch) {
        cacheManager.setRefetching(cacheKey, true);
      } else {
        cacheManager.setLoading(cacheKey, true);
      }

      const response = await fetch('/api/accounts');
      if (!response.ok) {
        throw new Error('Failed to fetch accounts');
      }

      const data: AccountsResponse = await response.json();
      cacheManager.set(cacheKey, data);
    } catch (error) {
      cacheManager.setError(cacheKey, error instanceof Error ? error.message : 'Unknown error');
    } finally {
      cacheManager.setLoading(cacheKey, false);
      cacheManager.setRefetching(cacheKey, false);
    }
  }, [cacheKey]);

  const refetch = useCallback(() => fetchAccounts(true), [fetchAccounts]);

  const updateOptimisticAccount = useCallback((accountId: string, updates: Partial<any>) => {
    const update: OptimisticUpdate<any> = {
      id: `update-${accountId}-${Date.now()}`,
      type: 'update',
      data: { id: accountId, ...updates },
      timestamp: new Date(),
      rollback: () => {
        // Rollback logic would be implemented here
      },
    };
    cacheManager.addOptimisticUpdate(cacheKey, update);
  }, [cacheKey]);

  useEffect(() => {
    const unsubscribe = cacheManager.subscribe(cacheKey, setState);
    
    // Fetch data if not cached or stale
    const cached = cacheManager.get(cacheKey);
    if (!cached || (!cached.data && !cached.isLoading)) {
      fetchAccounts();
    }

    return unsubscribe;
  }, [cacheKey, fetchAccounts]);

  return {
    ...state,
    refetch,
    updateOptimisticAccount,
  };
}

export function useSyncData() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const syncData = useCallback(async (options: { accountIds?: string[]; forceRefresh?: boolean } = {}) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      });

      if (!response.ok) {
        throw new Error('Failed to sync data');
      }

      const result: SyncResponse = await response.json();
      
      // Invalidate relevant caches after successful sync
      cacheManager.invalidate('accounts');
      cacheManager.clear('transactions'); // Clear all transaction caches

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    syncData,
    isLoading,
    error,
  };
}

// Export cache manager for advanced usage
export { cacheManager };