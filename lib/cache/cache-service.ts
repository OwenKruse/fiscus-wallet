// Cache Service for Financial Data with Nile DB and Prisma
// Implements caching strategies, invalidation, and performance monitoring

import { prisma, type Account, type Transaction, type PlaidConnection } from '../database/prisma-client';
import { getNileClient } from '../database/nile-client';
import type { 
  TransactionsRequest, 
  AccountsResponse, 
  TransactionsResponse,
  SyncResponse 
} from '../../types';

export interface CacheMetrics {
  hitRate: number;
  missRate: number;
  totalRequests: number;
  averageResponseTime: number;
  cacheSize: number;
  lastUpdated: Date;
}

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum cache size
  enableMetrics?: boolean;
  staleWhileRevalidate?: boolean;
  enableAutoSync?: boolean; // Enable automatic Plaid sync when cache is empty
  autoSyncCooldown?: number; // Cooldown period between auto syncs in milliseconds
}

export interface TransactionFilters {
  accountIds?: string[];
  startDate?: Date;
  endDate?: Date;
  categories?: string[];
  minAmount?: number;
  maxAmount?: number;
  pending?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: Date;
  ttl: number;
  hits: number;
  lastAccessed: Date;
}

export type CacheType = 'transactions' | 'accounts' | 'connections' | 'all';

export class CacheService {
  private memoryCache = new Map<string, CacheEntry<any>>();
  private metrics: CacheMetrics;
  private options: Required<CacheOptions>;
  private nileClient = getNileClient();
  private plaidService: any; // Will be lazily loaded to avoid circular dependency
  private lastSyncAttempts = new Map<string, number>(); // Track last sync attempts per user

  constructor(options: CacheOptions = {}) {
    this.options = {
      ttl: options.ttl ?? 5 * 60 * 1000, // 5 minutes default
      maxSize: options.maxSize ?? 1000,
      enableMetrics: options.enableMetrics ?? true,
      staleWhileRevalidate: options.staleWhileRevalidate ?? true,
      enableAutoSync: options.enableAutoSync ?? true,
      autoSyncCooldown: options.autoSyncCooldown ?? 5 * 60 * 1000, // 5 minutes cooldown
    };

    this.metrics = {
      hitRate: 0,
      missRate: 0,
      totalRequests: 0,
      averageResponseTime: 0,
      cacheSize: 0,
      lastUpdated: new Date(),
    };

    // Clean up expired entries periodically
    setInterval(() => this.cleanupExpiredEntries(), 60000); // Every minute
  }

  /**
   * Get cached transactions with filtering and pagination
   */
  async getTransactions(userId: string, filters: TransactionFilters = {}): Promise<TransactionsResponse> {
    const startTime = Date.now();
    const cacheKey = this.generateTransactionsCacheKey(userId, filters);
    
    console.log(`CacheService.getTransactions called - userId: ${userId}, filters:`, filters, `cacheKey: ${cacheKey}`); // Debug log
    
    try {
      // Try memory cache first
      const cached = this.getFromMemoryCache<TransactionsResponse>(cacheKey);
      if (cached && !this.isStale(cached)) {
        console.log(`Cache HIT for ${cacheKey} - returning ${cached.data.transactions.length} transactions`); // Debug log
        this.recordCacheHit(Date.now() - startTime);
        return cached.data;
      }

      // If stale but stale-while-revalidate is enabled, return stale data and refresh in background
      if (cached && this.options.staleWhileRevalidate) {
        console.log(`Cache STALE for ${cacheKey} - returning stale data and refreshing in background`); // Debug log
        this.refreshTransactionsInBackground(userId, filters, cacheKey);
        this.recordCacheHit(Date.now() - startTime);
        return cached.data;
      }

      console.log(`Cache MISS for ${cacheKey} - fetching from database`); // Debug log

      // Cache miss - fetch from database
      const data = await this.fetchTransactionsFromDB(userId, filters);
      
      // If no transactions found and this is a basic query (no specific filters), try syncing from Plaid
      if (data.transactions.length === 0 && this.shouldTriggerPlaidSync(filters) && this.canAttemptSync(userId)) {
        console.log(`No transactions found for user ${userId}, attempting Plaid sync...`);
        this.recordSyncAttempt(userId);
        try {
          await this.triggerPlaidSync(userId, filters);
          // Fetch again after sync
          const refreshedData = await this.fetchTransactionsFromDB(userId, filters);
          this.setInMemoryCache(cacheKey, refreshedData);
          this.recordCacheMiss(Date.now() - startTime);
          return refreshedData;
        } catch (syncError) {
          console.error('Failed to sync transactions from Plaid:', syncError);
          // Continue with empty result if sync fails
        }
      }
      
      this.setInMemoryCache(cacheKey, data);
      this.recordCacheMiss(Date.now() - startTime);
      
      console.log(`Returning ${data.transactions.length} transactions from database, pagination:`, data.pagination); // Debug log
      
      return data;
    } catch (error) {
      console.error('Error getting cached transactions:', error);
      // Fallback to database on cache error
      return this.fetchTransactionsFromDB(userId, filters);
    }
  }

  /**
   * Cache transactions data
   */
  async cacheTransactions(userId: string, transactions: Transaction[]): Promise<void> {
    try {
      // Store in database (already handled by Prisma operations)
      // Update memory cache for common queries
      const cacheKey = this.generateTransactionsCacheKey(userId, {});
      
      // Get current cached data and merge with new transactions
      const existing = this.getFromMemoryCache<TransactionsResponse>(cacheKey);
      if (existing) {
        const mergedTransactions = this.mergeTransactions(existing.data.transactions, transactions);
        const updatedResponse: TransactionsResponse = {
          ...existing.data,
          transactions: mergedTransactions,
        };
        this.setInMemoryCache(cacheKey, updatedResponse);
      }

      // Invalidate related caches
      await this.invalidateTransactionCaches(userId);
    } catch (error) {
      console.error('Error caching transactions:', error);
      throw error;
    }
  }

  /**
   * Get cached accounts
   */
  async getAccounts(userId: string): Promise<AccountsResponse> {
    const startTime = Date.now();
    const cacheKey = `accounts:${userId}`;
    
    try {
      // Try memory cache first
      const cached = this.getFromMemoryCache<AccountsResponse>(cacheKey);
      if (cached && !this.isStale(cached)) {
        this.recordCacheHit(Date.now() - startTime);
        return cached.data;
      }

      // If stale but stale-while-revalidate is enabled
      if (cached && this.options.staleWhileRevalidate) {
        this.refreshAccountsInBackground(userId, cacheKey);
        this.recordCacheHit(Date.now() - startTime);
        return cached.data;
      }

      // Cache miss - fetch from database
      const data = await this.fetchAccountsFromDB(userId);
      
      // If no accounts found, try syncing from Plaid
      if (data.accounts.length === 0 && this.canAttemptSync(userId)) {
        console.log(`No accounts found for user ${userId}, attempting Plaid sync...`);
        this.recordSyncAttempt(userId);
        try {
          await this.triggerAccountSync(userId);
          // Fetch again after sync
          const refreshedData = await this.fetchAccountsFromDB(userId);
          this.setInMemoryCache(cacheKey, refreshedData);
          this.recordCacheMiss(Date.now() - startTime);
          return refreshedData;
        } catch (syncError) {
          console.error('Failed to sync accounts from Plaid:', syncError);
          // Continue with empty result if sync fails
        }
      }
      
      this.setInMemoryCache(cacheKey, data);
      this.recordCacheMiss(Date.now() - startTime);
      
      return data;
    } catch (error) {
      console.error('Error getting cached accounts:', error);
      return this.fetchAccountsFromDB(userId);
    }
  }

  /**
   * Cache accounts data
   */
  async cacheAccounts(userId: string, accounts: Account[]): Promise<void> {
    try {
      const cacheKey = `accounts:${userId}`;
      
      // Transform to response format
      const accountsResponse: AccountsResponse = {
        accounts: accounts.map(account => ({
          id: account.id,
          name: account.name,
          officialName: account.officialName || undefined,
          type: account.type.toLowerCase(),
          subtype: account.subtype,
          balance: {
            available: account.balanceAvailable ? Number(account.balanceAvailable) : undefined,
            current: Number(account.balanceCurrent),
            limit: account.balanceLimit ? Number(account.balanceLimit) : undefined,
          },
          institutionName: '', // Will be populated from connection data
          lastUpdated: account.lastUpdated.toISOString(),
        })),
      };

      // Populate institution names
      for (const account of accountsResponse.accounts) {
        const dbAccount = accounts.find(a => a.id === account.id);
        if (dbAccount) {
          const connection = await prisma.plaidConnection.findUnique({
            where: { id: dbAccount.connectionId },
            select: { institutionName: true },
          });
          account.institutionName = connection?.institutionName || 'Unknown';
        }
      }

      this.setInMemoryCache(cacheKey, accountsResponse);
    } catch (error) {
      console.error('Error caching accounts:', error);
      throw error;
    }
  }

  /**
   * Invalidate cache for specific type and user
   */
  async invalidateCache(userId: string, type: CacheType): Promise<void> {
    try {
      switch (type) {
        case 'transactions':
          await this.invalidateTransactionCaches(userId);
          break;
        case 'accounts':
          this.removeFromMemoryCache(`accounts:${userId}`);
          break;
        case 'connections':
          this.removeFromMemoryCache(`connections:${userId}`);
          break;
        case 'all':
          await this.invalidateAllUserCaches(userId);
          break;
      }
    } catch (error) {
      console.error('Error invalidating cache:', error);
      throw error;
    }
  }

  /**
   * Get cache performance metrics
   */
  getMetrics(): CacheMetrics {
    this.metrics.cacheSize = this.memoryCache.size;
    this.metrics.lastUpdated = new Date();
    return { ...this.metrics };
  }

  /**
   * Clear all caches
   */
  async clearAll(): Promise<void> {
    this.memoryCache.clear();
    this.resetMetrics();
  }

  // Private helper methods

  private generateTransactionsCacheKey(userId: string, filters: TransactionFilters): string {
    const filterStr = JSON.stringify({
      ...filters,
      startDate: filters.startDate?.toISOString(),
      endDate: filters.endDate?.toISOString(),
    });
    return `transactions:${userId}:${Buffer.from(filterStr).toString('base64')}`;
  }

  private async fetchTransactionsFromDB(userId: string, filters: TransactionFilters): Promise<TransactionsResponse> {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 50, 100); // Cap at 100
    const skip = (page - 1) * limit;

    console.log(`Fetching transactions from DB - userId: ${userId}, page: ${page}, limit: ${limit}, skip: ${skip}`, filters); // Debug log

    const where: any = { userId };

    // Apply filters
    if (filters.accountIds?.length) {
      where.accountId = { in: filters.accountIds };
    }
    if (filters.startDate || filters.endDate) {
      where.date = {};
      if (filters.startDate) where.date.gte = filters.startDate;
      if (filters.endDate) where.date.lte = filters.endDate;
    }
    if (filters.categories?.length) {
      where.category = { hasSome: filters.categories };
    }
    if (filters.minAmount !== undefined || filters.maxAmount !== undefined) {
      where.amount = {};
      if (filters.minAmount !== undefined) where.amount.gte = filters.minAmount;
      if (filters.maxAmount !== undefined) where.amount.lte = filters.maxAmount;
    }
    if (filters.pending !== undefined) {
      where.pending = filters.pending;
    }
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { merchantName: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          account: {
            select: { name: true },
          },
        },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      prisma.transaction.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    console.log(`DB query returned ${transactions.length} transactions out of ${total} total, page ${page}/${totalPages}`); // Debug log

    return {
      transactions: transactions.map(t => ({
        id: t.id,
        accountId: t.accountId,
        amount: Number(t.amount),
        date: t.date.toISOString().split('T')[0],
        name: t.name,
        merchantName: t.merchantName || undefined,
        category: t.category,
        subcategory: t.subcategory || undefined,
        pending: t.pending,
        accountName: t.account.name,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  private async fetchAccountsFromDB(userId: string): Promise<AccountsResponse> {
    const accounts = await prisma.account.findMany({
      where: { userId },
      include: {
        connection: {
          select: { institutionName: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return {
      accounts: accounts.map(account => ({
        id: account.id,
        name: account.name,
        officialName: account.officialName || undefined,
        type: account.type.toLowerCase(),
        subtype: account.subtype,
        balance: {
          available: account.balanceAvailable ? Number(account.balanceAvailable) : undefined,
          current: Number(account.balanceCurrent),
          limit: account.balanceLimit ? Number(account.balanceLimit) : undefined,
        },
        institutionName: account.connection.institutionName,
        lastUpdated: account.lastUpdated.toISOString(),
      })),
    };
  }

  private getFromMemoryCache<T>(key: string): CacheEntry<T> | null {
    const entry = this.memoryCache.get(key);
    if (entry) {
      entry.hits++;
      entry.lastAccessed = new Date();
      return entry as CacheEntry<T>;
    }
    return null;
  }

  private setInMemoryCache<T>(key: string, data: T): void {
    // Check cache size limit and evict if necessary
    while (this.memoryCache.size >= this.options.maxSize) {
      this.evictLeastRecentlyUsed();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: new Date(),
      ttl: this.options.ttl,
      hits: 0,
      lastAccessed: new Date(),
    };

    this.memoryCache.set(key, entry);
  }

  private removeFromMemoryCache(key: string): void {
    this.memoryCache.delete(key);
  }

  private isStale(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp.getTime() > entry.ttl;
  }

  private evictLeastRecentlyUsed(): void {
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.lastAccessed.getTime() < oldestTime) {
        oldestTime = entry.lastAccessed.getTime();
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.memoryCache.delete(oldestKey);
    }
  }

  private cleanupExpiredEntries(): void {
    const now = Date.now();
    for (const [key, entry] of this.memoryCache.entries()) {
      if (now - entry.timestamp.getTime() > entry.ttl * 2) { // Double TTL for cleanup
        this.memoryCache.delete(key);
      }
    }
  }

  private async refreshTransactionsInBackground(userId: string, filters: TransactionFilters, cacheKey: string): Promise<void> {
    try {
      const data = await this.fetchTransactionsFromDB(userId, filters);
      this.setInMemoryCache(cacheKey, data);
    } catch (error) {
      console.error('Background refresh failed for transactions:', error);
    }
  }

  private async refreshAccountsInBackground(userId: string, cacheKey: string): Promise<void> {
    try {
      const data = await this.fetchAccountsFromDB(userId);
      this.setInMemoryCache(cacheKey, data);
    } catch (error) {
      console.error('Background refresh failed for accounts:', error);
    }
  }

  private async invalidateTransactionCaches(userId: string): Promise<void> {
    // Remove all transaction-related cache entries for this user
    for (const key of this.memoryCache.keys()) {
      if (key.startsWith(`transactions:${userId}`)) {
        this.memoryCache.delete(key);
      }
    }
  }

  private async invalidateAllUserCaches(userId: string): Promise<void> {
    // Remove all cache entries for this user
    for (const key of this.memoryCache.keys()) {
      if (key.includes(userId)) {
        this.memoryCache.delete(key);
      }
    }
  }

  private mergeTransactions(existing: any[], newTransactions: Transaction[]): any[] {
    const existingMap = new Map(existing.map(t => [t.id, t]));
    
    // Add or update transactions
    for (const transaction of newTransactions) {
      const formatted = {
        id: transaction.id,
        accountId: transaction.accountId,
        amount: Number(transaction.amount),
        date: transaction.date.toISOString().split('T')[0],
        name: transaction.name,
        merchantName: transaction.merchantName || undefined,
        category: transaction.category,
        subcategory: transaction.subcategory || undefined,
        pending: transaction.pending,
        accountName: '', // Will need to be populated
      };
      existingMap.set(transaction.id, formatted);
    }

    return Array.from(existingMap.values()).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  private recordCacheHit(responseTime: number): void {
    if (!this.options.enableMetrics) return;

    this.metrics.totalRequests++;
    this.updateAverageResponseTime(responseTime);
    this.updateHitMissRates(true);
  }

  private recordCacheMiss(responseTime: number): void {
    if (!this.options.enableMetrics) return;

    this.metrics.totalRequests++;
    this.updateAverageResponseTime(responseTime);
    this.updateHitMissRates(false);
  }

  private updateAverageResponseTime(responseTime: number): void {
    const currentAvg = this.metrics.averageResponseTime;
    const totalRequests = this.metrics.totalRequests;
    
    if (totalRequests === 1) {
      this.metrics.averageResponseTime = responseTime;
    } else {
      this.metrics.averageResponseTime = ((currentAvg * (totalRequests - 1)) + responseTime) / totalRequests;
    }
  }

  private updateHitMissRates(wasHit: boolean): void {
    // Track hits and misses separately for accurate calculation
    if (!this.hitCount) this.hitCount = 0;
    if (!this.missCount) this.missCount = 0;

    if (wasHit) {
      this.hitCount++;
    } else {
      this.missCount++;
    }

    this.metrics.hitRate = this.hitCount / this.metrics.totalRequests;
    this.metrics.missRate = this.missCount / this.metrics.totalRequests;
  }

  private hitCount = 0;
  private missCount = 0;

  private resetMetrics(): void {
    this.metrics = {
      hitRate: 0,
      missRate: 0,
      totalRequests: 0,
      averageResponseTime: 0,
      cacheSize: 0,
      lastUpdated: new Date(),
    };
  }

  /**
   * Determine if we should trigger a Plaid sync based on the filters
   * Only sync for basic queries to avoid excessive API calls
   */
  private shouldTriggerPlaidSync(filters: TransactionFilters): boolean {
    // Only trigger sync for basic queries without complex filters
    // This prevents excessive API calls for specific filtered queries
    return (
      this.options.enableAutoSync &&
      !filters.search && // No search term
      !filters.categories?.length && // No category filter
      !filters.minAmount && // No amount filters
      !filters.maxAmount &&
      !filters.accountIds?.length && // No specific account filter
      (!filters.startDate || !filters.endDate) // No specific date range
    );
  }

  /**
   * Check if we can attempt a sync for this user (respects cooldown)
   */
  private canAttemptSync(userId: string): boolean {
    const lastAttempt = this.lastSyncAttempts.get(userId);
    if (!lastAttempt) return true;
    
    const timeSinceLastAttempt = Date.now() - lastAttempt;
    return timeSinceLastAttempt >= this.options.autoSyncCooldown;
  }

  /**
   * Record a sync attempt for cooldown tracking
   */
  private recordSyncAttempt(userId: string): void {
    this.lastSyncAttempts.set(userId, Date.now());
  }

  /**
   * Trigger a Plaid sync to fetch fresh transactions
   */
  private async triggerPlaidSync(userId: string, filters: TransactionFilters): Promise<void> {
    // Lazy load PlaidService to avoid circular dependency
    if (!this.plaidService) {
      const { getPlaidService } = await import('../plaid/plaid-service');
      this.plaidService = getPlaidService();
    }

    // Check if user has any active Plaid connections
    const hasActiveConnections = await this.checkActiveConnections(userId);
    if (!hasActiveConnections) {
      console.log(`User ${userId} has no active Plaid connections, skipping sync`);
      return;
    }

    // Determine sync date range
    const endDate = new Date();
    const startDate = filters.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default to 30 days

    console.log(`Triggering Plaid sync for user ${userId} from ${startDate.toISOString()} to ${endDate.toISOString()}`);

    // Trigger sync with reasonable defaults
    const syncResult = await this.plaidService.syncTransactions(userId, {
      forceRefresh: true,
      startDate,
      endDate,
      accountIds: filters.accountIds,
    });

    if (syncResult.success) {
      console.log(`Successfully synced transactions for user ${userId}: ${syncResult.transactionsAdded} added, ${syncResult.transactionsUpdated} updated`);
    } else {
      console.warn(`Sync completed with errors for user ${userId}:`, syncResult.errors);
      // Still throw if there were errors so the cache service can handle it
      if (syncResult.errors.length > 0) {
        throw new Error(`Sync errors: ${syncResult.errors.join(', ')}`);
      }
    }
  }

  /**
   * Trigger a Plaid sync to fetch fresh accounts
   */
  private async triggerAccountSync(userId: string): Promise<void> {
    // Lazy load PlaidService to avoid circular dependency
    if (!this.plaidService) {
      const { getPlaidService } = await import('../plaid/plaid-service');
      this.plaidService = getPlaidService();
    }

    // Check if user has any active Plaid connections
    const hasActiveConnections = await this.checkActiveConnections(userId);
    if (!hasActiveConnections) {
      console.log(`User ${userId} has no active Plaid connections, skipping account sync`);
      return;
    }

    // Trigger a basic sync to refresh account data
    await this.plaidService.syncTransactions(userId, {
      forceRefresh: true,
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days for account sync
      endDate: new Date(),
    });

    console.log(`Successfully synced accounts for user ${userId}`);
  }

  /**
   * Check if user has any active Plaid connections
   */
  private async checkActiveConnections(userId: string): Promise<boolean> {
    try {
      const connections = await prisma.plaidConnection.findMany({
        where: {
          userId,
          status: 'active',
        },
        select: { id: true },
      });
      return connections.length > 0;
    } catch (error) {
      console.error('Error checking active connections:', error);
      return false;
    }
  }
}

// Singleton instance
let cacheServiceInstance: CacheService | null = null;

export function getCacheService(options?: CacheOptions): CacheService {
  if (!cacheServiceInstance) {
    cacheServiceInstance = new CacheService(options);
  }
  return cacheServiceInstance;
}

export function resetCacheService(): void {
  cacheServiceInstance = null;
}