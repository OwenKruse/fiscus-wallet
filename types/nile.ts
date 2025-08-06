// Nile Database Type Definitions

export interface NileUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  company?: string;
  createdAt: Date;
  updatedAt: Date;
  tenantId: string;
}

export interface NileUserCreateRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  company?: string;
}

export interface NileUserSignInRequest {
  email: string;
  password: string;
}

export interface NileAuthResponse {
  success: boolean;
  user?: NileUser;
  token?: string;
  error?: string;
}

export interface NileSession {
  id: string;
  userId: string;
  tenantId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

// Database Models
export interface PlaidConnection {
  id: string;
  userId: string;
  itemId: string;
  accessToken: string; // Encrypted
  institutionId: string;
  institutionName: string;
  accounts: string[]; // Account IDs
  status: 'active' | 'error' | 'disconnected';
  lastSync: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Account {
  id: string;
  userId: string;
  plaidAccountId: string;
  connectionId: string;
  name: string;
  officialName?: string;
  type: 'depository' | 'credit' | 'loan' | 'investment';
  subtype: string;
  balance: {
    available?: number;
    current: number;
    limit?: number;
  };
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Transaction {
  id: string;
  userId: string;
  accountId: string;
  plaidTransactionId: string;
  amount: number;
  date: Date;
  name: string;
  merchantName?: string;
  category: string[];
  subcategory?: string;
  pending: boolean;
  accountOwner?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Database operation types
export interface NileQueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
}

export interface NileQueryResult<T> {
  data: T[];
  total: number;
  hasMore: boolean;
}

// Service interfaces
export interface NileAuthService {
  signIn(credentials: NileUserSignInRequest): Promise<NileAuthResponse>;
  signUp(userData: NileUserCreateRequest): Promise<NileAuthResponse>;
  signOut(token: string): Promise<void>;
  getCurrentUser(token: string): Promise<NileUser | null>;
  validateSession(token: string): Promise<boolean>;
  refreshToken(token: string): Promise<string>;
}

export interface NileConnectionService {
  createConnection(connection: Omit<PlaidConnection, 'id' | 'createdAt' | 'updatedAt'>): Promise<PlaidConnection>;
  getConnection(userId: string, itemId: string): Promise<PlaidConnection | null>;
  getConnectionsByUser(userId: string): Promise<PlaidConnection[]>;
  updateConnection(id: string, updates: Partial<PlaidConnection>): Promise<PlaidConnection>;
  deleteConnection(id: string): Promise<void>;
  updateConnectionStatus(id: string, status: PlaidConnection['status']): Promise<void>;
}

export interface NileAccountService {
  createAccount(account: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>): Promise<Account>;
  getAccount(userId: string, plaidAccountId: string): Promise<Account | null>;
  getAccountsByUser(userId: string): Promise<Account[]>;
  getAccountsByConnection(connectionId: string): Promise<Account[]>;
  updateAccount(id: string, updates: Partial<Account>): Promise<Account>;
  deleteAccount(id: string): Promise<void>;
  updateAccountBalance(id: string, balance: Account['balance']): Promise<void>;
}

export interface NileTransactionService {
  createTransaction(transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<Transaction>;
  createTransactions(transactions: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<Transaction[]>;
  getTransaction(userId: string, plaidTransactionId: string): Promise<Transaction | null>;
  getTransactionsByUser(userId: string, options?: NileQueryOptions & TransactionFilters): Promise<NileQueryResult<Transaction>>;
  getTransactionsByAccount(accountId: string, options?: NileQueryOptions): Promise<NileQueryResult<Transaction>>;
  updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction>;
  deleteTransaction(id: string): Promise<void>;
  deleteTransactionsByAccount(accountId: string): Promise<void>;
}

// Filter types
export interface TransactionFilters {
  accountIds?: string[];
  startDate?: Date;
  endDate?: Date;
  categories?: string[];
  minAmount?: number;
  maxAmount?: number;
  pending?: boolean;
  search?: string;
}

// Configuration types
export interface NileConfig {
  url: string;
  apiUrl: string;
  user: string;
  password: string;
  database: string;
}

// Error types
export interface NileError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  requestId?: string;
}

export interface NileServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: NileError;
}

// Cache types
export interface CacheEntry<T> {
  data: T;
  timestamp: Date;
  expiresAt: Date;
}

export interface CacheService {
  get<T>(key: string): Promise<CacheEntry<T> | null>;
  set<T>(key: string, data: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(pattern?: string): Promise<void>;
  isExpired(entry: CacheEntry<any>): boolean;
}

// Sync types
export interface SyncResult {
  success: boolean;
  accountsUpdated: number;
  transactionsAdded: number;
  transactionsUpdated: number;
  goalsUpdated?: number;
  goalCalculationErrors?: string[];
  errors: string[];
  lastSyncTime: Date;
}

export interface SyncOptions {
  forceRefresh?: boolean;
  accountIds?: string[];
  startDate?: Date;
  endDate?: Date;
}

// JWT types
export interface JWTPayload {
  userId: string;
  tenantId: string;
  email: string;
  iat: number;
  exp: number;
}

// Encryption types
export interface EncryptionService {
  encrypt(data: string): string;
  decrypt(encryptedData: string): string;
  hash(password: string): Promise<string>;
  compareHash(password: string, hash: string): Promise<boolean>;
}

// Audit types
export interface AuditLog {
  id: string;
  userId: string;
  tenantId: string;
  action: string;
  resource: string;
  resourceId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

export interface AuditService {
  log(entry: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void>;
  getAuditLogs(userId: string, options?: NileQueryOptions): Promise<NileQueryResult<AuditLog>>;
}

// Database client types
export interface NileClient {
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;
  queryOne<T = any>(sql: string, params?: any[]): Promise<T | null>;
  transaction<T>(callback: (client: NileClient) => Promise<T>): Promise<T>;
  close(): Promise<void>;
  executeUpdate?(sql: string, params?: any[]): Promise<{ rowCount: number }>;
}

// Multi-tenancy types
export interface TenantContext {
  tenantId: string;
  userId: string;
}

export interface NileMiddlewareOptions {
  requireAuth?: boolean;
  requireTenant?: boolean;
  roles?: string[];
}

// Health check types
export interface HealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: Date;
  services: {
    database: 'healthy' | 'unhealthy';
    plaid: 'healthy' | 'unhealthy';
    cache: 'healthy' | 'unhealthy';
  };
  metrics?: {
    responseTime: number;
    activeConnections: number;
    memoryUsage: number;
  };
}