// Shared Type Definitions and Re-exports

export * from './plaid';
export * from './nile';

// Common API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
  requestId?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Environment Configuration Types
export interface AppConfig {
  environment: 'development' | 'staging' | 'production';
  plaid: {
    clientId: string;
    secretKey: string;
    environment: 'sandbox' | 'development' | 'production';
    products: string[];
    countryCodes: string[];
  };
  nile: {
    url: string;
    apiUrl: string;
    user: string;
    password: string;
    database: string;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  encryption: {
    key: string;
  };
}

// Request/Response Types for API Routes
export interface AuthSignInRequest {
  email: string;
  password: string;
}

export interface AuthSignUpRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  company?: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    tenantId: string;
  };
  token: string;
  expiresAt: string;
}

export interface PlaidLinkTokenRequest {
  userId: string;
  products?: string[];
}

export interface PlaidLinkTokenResponse {
  linkToken: string;
  expiration: string;
}

export interface PlaidExchangeTokenRequest {
  publicToken: string;
  userId?: string; // Optional since auth middleware provides it
}

export interface PlaidExchangeTokenResponse {
  success: boolean;
  institutionName?: string;
  accountsCount?: number;
}

export interface AccountsResponse {
  accounts: {
    id: string;
    name: string;
    officialName?: string;
    type: string;
    subtype: string;
    balance: {
      available?: number;
      current: number;
      limit?: number;
    };
    institutionName: string;
    lastUpdated: string;
  }[];
}

export interface TransactionsRequest {
  accountIds?: string[];
  startDate?: string;
  endDate?: string;
  categories?: string[];
  minAmount?: number;
  maxAmount?: number;
  pending?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface TransactionsResponse {
  transactions: {
    id: string;
    accountId: string;
    amount: number;
    date: string;
    name: string;
    merchantName?: string;
    category: string[];
    subcategory?: string;
    pending: boolean;
    accountName: string;
  }[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface SyncRequest {
  accountIds?: string[];
  forceRefresh?: boolean;
}

export interface SyncResponse {
  success: boolean;
  accountsUpdated: number;
  transactionsAdded: number;
  transactionsUpdated: number;
  errors: string[];
  lastSyncTime: string;
}

// Investment-specific types
export interface InvestmentHolding {
  id: string;
  accountId: string;
  securityId: string;
  institutionValue: number;
  institutionPrice: number;
  quantity: number;
  costBasis?: number;
  security: {
    securityId: string;
    name: string;
    tickerSymbol?: string;
    type: string;
    closePrice?: number;
    closePriceAsOf?: string;
  };
}

export interface InvestmentTransaction {
  id: string;
  accountId: string;
  securityId?: string;
  type: string;
  subtype: string;
  quantity?: number;
  price?: number;
  fees?: number;
  amount: number;
  date: string;
  name: string;
  security?: {
    securityId: string;
    name: string;
    tickerSymbol?: string;
    type: string;
  };
}

export interface InvestmentsRequest {
  accountIds?: string[];
  startDate?: string;
  endDate?: string;
}

export interface InvestmentsResponse {
  holdings: InvestmentHolding[];
  transactions: InvestmentTransaction[];
  accounts: {
    id: string;
    name: string;
    type: string;
    subtype: string;
    balance: {
      available?: number;
      current: number;
      limit?: number;
    };
    institutionName: string;
  }[];
}

// Component Props Types
export interface PlaidLinkButtonProps {
  onSuccess: (publicToken: string, metadata: any) => void;
  onExit?: (error: any, metadata: any) => void;
  className?: string;
  disabled?: boolean;
  children?: React.ReactNode;
}

export interface AccountsListProps {
  accounts: AccountsResponse['accounts'];
  onRefresh?: () => void;
  loading?: boolean;
  error?: string;
}

export interface TransactionsListProps {
  transactions: TransactionsResponse['transactions'];
  loading?: boolean;
  error?: string;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export interface AuthGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
  requireAuth?: boolean;
}

// Form Types
export interface SignInFormData {
  email: string;
  password: string;
}

export interface SignUpFormData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  company?: string;
}

// Error Types
export interface AppError extends Error {
  code: string;
  statusCode?: number;
  details?: any;
}

export interface ValidationError extends AppError {
  field: string;
  value: any;
}

// Utility Types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Status Types
export type ConnectionStatus = 'active' | 'error' | 'disconnected' | 'pending';
export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

// Event Types
export interface AppEvent {
  type: string;
  payload: any;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
}

export interface PlaidEvent extends AppEvent {
  type: 'plaid.connection.created' | 'plaid.connection.updated' | 'plaid.connection.deleted' | 'plaid.sync.completed' | 'plaid.sync.failed';
}

export interface AuthEvent extends AppEvent {
  type: 'auth.signin' | 'auth.signup' | 'auth.signout' | 'auth.session.expired';
}

// Context Types
export interface AuthContextType {
  user: AuthResponse['user'] | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (credentials: AuthSignInRequest) => Promise<void>;
  signUp: (userData: AuthSignUpRequest) => Promise<void>;
  signOut: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

export interface PlaidContextType {
  connections: import('./nile').PlaidConnection[];
  accounts: AccountsResponse['accounts'];
  isLoading: boolean;
  error: string | null;
  connectAccount: (publicToken: string) => Promise<void>;
  disconnectAccount: (connectionId: string) => Promise<void>;
  syncData: (options?: SyncRequest) => Promise<void>;
  refreshAccounts: () => Promise<void>;
}

// Goal System Types
export interface Goal {
  id: string;
  userId: string;
  title: string;
  description?: string;
  goalType: 'savings' | 'debt_reduction' | 'investment' | 'purchase' | 'education' | 'travel';
  category?: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  priority: 'high' | 'medium' | 'low';
  isPrimary: boolean;
  trackingAccountIds: string[];
  trackingMethod: 'manual' | 'account_balance' | 'transaction_category';
  trackingConfig?: {
    accountIds?: string[];
    categoryFilters?: string[];
    transactionTypes?: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface GoalProgress {
  id: string;
  goalId: string;
  userId: string;
  amount: number;
  progressType: 'manual_add' | 'manual_subtract' | 'automatic' | 'adjustment';
  description?: string;
  transactionId?: string;
  createdAt: string;
}

// Goal API Request Types
export interface CreateGoalRequest {
  title: string;
  description?: string;
  goalType: Goal['goalType'];
  category?: string;
  targetAmount: number;
  targetDate: string;
  priority?: Goal['priority'];
  trackingMethod?: Goal['trackingMethod'];
  trackingConfig?: Goal['trackingConfig'];
}

export interface UpdateGoalRequest extends Partial<CreateGoalRequest> {
  status?: Goal['status'];
  isPrimary?: boolean;
  currentAmount?: number;
}

export interface GoalProgressRequest {
  amount: number;
  description?: string;
  progressType: 'manual_add' | 'manual_subtract' | 'adjustment';
}

export interface GoalsFilters {
  status?: Goal['status'][];
  goalType?: Goal['goalType'][];
  priority?: Goal['priority'][];
  category?: string[];
  search?: string;
  sortBy?: 'created_at' | 'target_date' | 'target_amount' | 'progress';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// Goal API Response Types
export interface GoalsResponse {
  goals: Goal[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface GoalResponse {
  goal: Goal;
  progressHistory?: GoalProgress[];
}

export interface GoalProgressResponse {
  progress: GoalProgress[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Goal Analytics Types
export interface GoalAnalytics {
  goalId: string;
  progressHistory: {
    date: string;
    amount: number;
    percentage: number;
  }[];
  projectedCompletion: string;
  monthlyProgress: number;
  isOnTrack: boolean;
  daysRemaining: number;
  averageDailyProgress: number;
  milestones: {
    percentage: number;
    achieved: boolean;
    achievedDate?: string;
  }[];
  trends: {
    last30Days: number;
    last90Days: number;
    overall: number;
  };
}

export interface AllGoalsAnalytics {
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  totalTargetAmount: number;
  totalCurrentAmount: number;
  overallProgress: number;
  goalsOnTrack: number;
  goalsBehindSchedule: number;
  goalsAheadOfSchedule: number;
  goalsByType: {
    [key in Goal['goalType']]: {
      count: number;
      totalTarget: number;
      totalCurrent: number;
      averageProgress: number;
    };
  };
  goalsByPriority: {
    [key in Goal['priority']]: {
      count: number;
      averageProgress: number;
    };
  };
  upcomingDeadlines: {
    goalId: string;
    title: string;
    targetDate: string;
    daysRemaining: number;
    progress: number;
  }[];
  recentMilestones: {
    goalId: string;
    title: string;
    milestone: number;
    achievedDate: string;
  }[];
}

export interface GoalAnalyticsResponse {
  analytics: GoalAnalytics;
}

export interface AllGoalsAnalyticsResponse {
  analytics: AllGoalsAnalytics;
  goalAnalytics: GoalAnalytics[];
}

// Goal Component Props Types
export interface GoalCardProps {
  goal: Goal;
  onEdit?: (goal: Goal) => void;
  onDelete?: (goalId: string) => void;
  onSetPrimary?: (goalId: string) => void;
  onAddProgress?: (goalId: string) => void;
  className?: string;
}

export interface GoalFormProps {
  goal?: Goal;
  onSubmit: (data: CreateGoalRequest | UpdateGoalRequest) => Promise<void>;
  onCancel: () => void;
  accounts?: AccountsResponse['accounts'];
  loading?: boolean;
  error?: string;
}

export interface GoalProgressFormProps {
  goalId: string;
  onSubmit: (data: GoalProgressRequest) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  error?: string;
}

export interface PrimaryGoalWidgetProps {
  goal?: Goal;
  loading?: boolean;
  error?: string;
  onSetPrimary?: () => void;
  className?: string;
}

export interface GoalAnalyticsChartProps {
  analytics: GoalAnalytics;
  type: 'progress' | 'projection' | 'milestones';
  className?: string;
}

export interface GoalsAnalyticsProps {
  analytics: AllGoalsAnalytics;
  goalAnalytics: GoalAnalytics[];
  loading?: boolean;
  error?: string;
  filters?: GoalsFilters;
  onFiltersChange?: (filters: GoalsFilters) => void;
}

// Goal Context Types
export interface GoalsContextType {
  goals: Goal[];
  primaryGoal: Goal | null;
  analytics: AllGoalsAnalytics | null;
  isLoading: boolean;
  error: string | null;
  createGoal: (data: CreateGoalRequest) => Promise<Goal>;
  updateGoal: (goalId: string, data: UpdateGoalRequest) => Promise<Goal>;
  deleteGoal: (goalId: string) => Promise<void>;
  setPrimaryGoal: (goalId: string) => Promise<void>;
  addProgress: (goalId: string, data: GoalProgressRequest) => Promise<void>;
  calculateProgress: (goalId: string) => Promise<void>;
  refreshGoals: () => Promise<void>;
  refreshAnalytics: () => Promise<void>;
}

// Goal Utility Types
export type GoalStatus = Goal['status'];
export type GoalType = Goal['goalType'];
export type GoalPriority = Goal['priority'];
export type TrackingMethod = Goal['trackingMethod'];
export type ProgressType = GoalProgress['progressType'];

export interface GoalCalculationResult {
  currentAmount: number;
  progressEntries: Omit<GoalProgress, 'id' | 'createdAt'>[];
  lastCalculated: string;
}

export interface GoalMilestone {
  percentage: number;
  amount: number;
  achieved: boolean;
  achievedDate?: string;
  estimatedDate?: string;
}

export interface GoalProjection {
  estimatedCompletionDate: string;
  requiredDailyProgress: number;
  requiredMonthlyProgress: number;
  isOnTrack: boolean;
  daysAheadBehind: number;
}

// Goal Validation Types
export interface GoalValidationError {
  field: keyof CreateGoalRequest | keyof UpdateGoalRequest;
  message: string;
  code: string;
}

export interface GoalValidationResult {
  isValid: boolean;
  errors: GoalValidationError[];
}

// Goal Event Types
export interface GoalEvent extends AppEvent {
  type: 'goal.created' | 'goal.updated' | 'goal.deleted' | 'goal.progress.added' | 'goal.milestone.achieved' | 'goal.completed' | 'goal.primary.set';
  payload: {
    goalId: string;
    userId: string;
    goal?: Goal;
    progress?: GoalProgress;
    milestone?: number;
  };
}

// Goal Notification Types
export interface GoalNotification {
  id: string;
  userId: string;
  goalId: string;
  type: 'milestone' | 'completion' | 'behind_schedule' | 'ahead_schedule' | 'deadline_approaching';
  title: string;
  message: string;
  data?: {
    milestone?: number;
    daysRemaining?: number;
    progressPercentage?: number;
  };
  read: boolean;
  createdAt: string;
}

// User Settings Types
export interface UserSettings {
  id: string;
  userId: string;
  profile: ProfileSettings;
  notifications: NotificationSettings;
  display: DisplaySettings;
  privacy: PrivacySettings;
  accounts: AccountSettings;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileSettings {
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  profilePictureUrl?: string;
  emailVerified: boolean;
}

export interface NotificationSettings {
  enabled: boolean;
  email: boolean;
  goalProgress: boolean;
  accountAlerts: boolean;
  systemUpdates: boolean;
  marketingEmails: boolean;
}

export interface DisplaySettings {
  theme: 'light' | 'dark' | 'system';
  currency: string;
  dateFormat: string;
  timezone: string;
  language: string;
}

export interface PrivacySettings {
  twoFactorEnabled: boolean;
  dataSharingAnalytics: boolean;
  dataSharingMarketing: boolean;
  sessionTimeoutMinutes: number;
}

export interface AccountSettings {
  autoSyncEnabled: boolean;
  syncFrequency: 'realtime' | 'hourly' | 'daily';
}

// Individual Setting Item Type
export interface UserSetting {
  id: string;
  userId: string;
  category: string;
  key: string;
  value: any;
  createdAt: string;
  updatedAt: string;
}

// User Preferences Type (matches Prisma model)
export interface UserPreferences {
  id: string;
  userId: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  profilePictureUrl?: string;
  theme: 'light' | 'dark' | 'system';
  currencyFormat: string;
  dateFormat: string;
  timezone: string;
  language: string;
  notificationsEnabled: boolean;
  emailNotifications: boolean;
  goalNotifications: boolean;
  accountAlerts: boolean;
  systemUpdates: boolean;
  marketingEmails: boolean;
  dataSharingAnalytics: boolean;
  dataSharingMarketing: boolean;
  twoFactorEnabled: boolean;
  sessionTimeoutMinutes: number;
  autoSyncEnabled: boolean;
  syncFrequency: 'realtime' | 'hourly' | 'daily';
  createdAt: string;
  updatedAt: string;
}

// Settings API Request Types
export interface UpdateProfileSettingsRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  profilePictureUrl?: string;
}

export interface UpdateNotificationSettingsRequest {
  notificationsEnabled?: boolean;
  emailNotifications?: boolean;
  goalNotifications?: boolean;
  accountAlerts?: boolean;
  systemUpdates?: boolean;
  marketingEmails?: boolean;
}

export interface UpdateDisplaySettingsRequest {
  theme?: 'light' | 'dark' | 'system';
  currencyFormat?: string;
  dateFormat?: string;
  timezone?: string;
  language?: string;
}

export interface UpdatePrivacySettingsRequest {
  twoFactorEnabled?: boolean;
  dataSharingAnalytics?: boolean;
  dataSharingMarketing?: boolean;
  sessionTimeoutMinutes?: number;
}

export interface UpdateAccountSettingsRequest {
  autoSyncEnabled?: boolean;
  syncFrequency?: 'realtime' | 'hourly' | 'daily';
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ChangeEmailRequest {
  newEmail: string;
  password: string;
}

// Settings API Response Types
export interface SettingsResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
}

export interface UserSettingsResponse {
  profile: ProfileSettings;
  notifications: NotificationSettings;
  display: DisplaySettings;
  privacy: PrivacySettings;
  accounts: AccountSettings;
}

export interface ResetSettingsRequest {
  category?: 'profile' | 'notifications' | 'display' | 'privacy' | 'accounts';
}

export interface ExportUserDataResponse {
  profile: ProfileSettings;
  preferences: UserPreferences;
  settings: UserSetting[];
  goals: Goal[];
  accounts: AccountsResponse['accounts'];
  transactions: TransactionsResponse['transactions'];
  exportedAt: string;
}

// Settings Context Types
export interface SettingsContextType {
  settings: UserSettings | null;
  preferences: UserPreferences | null;
  isLoading: boolean;
  error: string | null;
  updateProfile: (data: UpdateProfileSettingsRequest) => Promise<void>;
  updateNotifications: (data: UpdateNotificationSettingsRequest) => Promise<void>;
  updateDisplay: (data: UpdateDisplaySettingsRequest) => Promise<void>;
  updatePrivacy: (data: UpdatePrivacySettingsRequest) => Promise<void>;
  updateAccounts: (data: UpdateAccountSettingsRequest) => Promise<void>;
  changePassword: (data: ChangePasswordRequest) => Promise<void>;
  changeEmail: (data: ChangeEmailRequest) => Promise<void>;
  resetSettings: (category?: string) => Promise<void>;
  exportData: () => Promise<ExportUserDataResponse>;
  refreshSettings: () => Promise<void>;
}

// Settings Component Props Types
export interface SettingsPageProps {
  initialTab?: 'profile' | 'notifications' | 'display' | 'privacy' | 'accounts';
}

export interface ProfileFormProps {
  profile: ProfileSettings;
  onSubmit: (data: UpdateProfileSettingsRequest) => Promise<void>;
  loading?: boolean;
  error?: string;
}

export interface NotificationFormProps {
  notifications: NotificationSettings;
  onSubmit: (data: UpdateNotificationSettingsRequest) => Promise<void>;
  loading?: boolean;
  error?: string;
}

export interface DisplayFormProps {
  display: DisplaySettings;
  onSubmit: (data: UpdateDisplaySettingsRequest) => Promise<void>;
  loading?: boolean;
  error?: string;
}

export interface PrivacyFormProps {
  privacy: PrivacySettings;
  onSubmit: (data: UpdatePrivacySettingsRequest) => Promise<void>;
  onChangePassword: (data: ChangePasswordRequest) => Promise<void>;
  loading?: boolean;
  error?: string;
}

export interface AccountsFormProps {
  accounts: AccountSettings;
  connectedAccounts: AccountsResponse['accounts'];
  onSubmit: (data: UpdateAccountSettingsRequest) => Promise<void>;
  onDisconnectAccount: (accountId: string) => Promise<void>;
  loading?: boolean;
  error?: string;
}

// Settings Validation Types
export interface SettingsValidationError {
  field: string;
  message: string;
  code: string;
}

export interface SettingsValidationResult {
  isValid: boolean;
  errors: SettingsValidationError[];
}

// Settings Event Types
export interface SettingsEvent extends AppEvent {
  type: 'settings.profile.updated' | 'settings.notifications.updated' | 'settings.display.updated' | 'settings.privacy.updated' | 'settings.accounts.updated' | 'settings.password.changed' | 'settings.email.changed' | 'settings.reset' | 'settings.exported';
  payload: {
    userId: string;
    category: string;
    changes?: Record<string, any>;
    oldValues?: Record<string, any>;
    newValues?: Record<string, any>;
  };
}

// Settings Audit Types
export interface UserSettingsAudit {
  id: string;
  userId: string;
  tableName: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  changedFields: string[];
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

// Settings Utility Types
export type SettingsCategory = 'profile' | 'notifications' | 'display' | 'privacy' | 'accounts';
export type ThemeOption = 'light' | 'dark' | 'system';
export type SyncFrequency = 'realtime' | 'hourly' | 'daily';
export type DateFormatOption = 'MM/dd/yyyy' | 'dd/MM/yyyy' | 'yyyy-MM-dd' | 'MMM dd, yyyy';
export type CurrencyOption = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'JPY';
export type LanguageOption = 'en' | 'es' | 'fr' | 'de' | 'it' | 'pt' | 'zh' | 'ja';
export type TimezoneOption = 'America/New_York' | 'America/Chicago' | 'America/Denver' | 'America/Los_Angeles' | 'Europe/London' | 'Europe/Paris' | 'Asia/Tokyo' | 'Australia/Sydney';

// Settings Default Values
export const DEFAULT_USER_PREFERENCES: Omit<UserPreferences, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
  firstName: undefined,
  lastName: undefined,
  phone: undefined,
  profilePictureUrl: undefined,
  theme: 'light',
  currencyFormat: 'USD',
  dateFormat: 'MM/dd/yyyy',
  timezone: 'America/New_York',
  language: 'en',
  notificationsEnabled: true,
  emailNotifications: true,
  goalNotifications: true,
  accountAlerts: true,
  systemUpdates: false,
  marketingEmails: false,
  dataSharingAnalytics: false,
  dataSharingMarketing: false,
  twoFactorEnabled: false,
  sessionTimeoutMinutes: 480,
  autoSyncEnabled: true,
  syncFrequency: 'daily',
};

// Settings Options
export const THEME_OPTIONS: { value: ThemeOption; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

export const CURRENCY_OPTIONS: { value: CurrencyOption; label: string; symbol: string }[] = [
  { value: 'USD', label: 'US Dollar', symbol: '$' },
  { value: 'EUR', label: 'Euro', symbol: '€' },
  { value: 'GBP', label: 'British Pound', symbol: '£' },
  { value: 'CAD', label: 'Canadian Dollar', symbol: 'C$' },
  { value: 'AUD', label: 'Australian Dollar', symbol: 'A$' },
  { value: 'JPY', label: 'Japanese Yen', symbol: '¥' },
];

export const DATE_FORMAT_OPTIONS: { value: DateFormatOption; label: string; example: string }[] = [
  { value: 'MM/dd/yyyy', label: 'MM/DD/YYYY', example: '12/31/2024' },
  { value: 'dd/MM/yyyy', label: 'DD/MM/YYYY', example: '31/12/2024' },
  { value: 'yyyy-MM-dd', label: 'YYYY-MM-DD', example: '2024-12-31' },
  { value: 'MMM dd, yyyy', label: 'MMM DD, YYYY', example: 'Dec 31, 2024' },
];

export const LANGUAGE_OPTIONS: { value: LanguageOption; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'it', label: 'Italiano' },
  { value: 'pt', label: 'Português' },
  { value: 'zh', label: '中文' },
  { value: 'ja', label: '日本語' },
];

export const TIMEZONE_OPTIONS: { value: TimezoneOption; label: string }[] = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'Greenwich Mean Time (GMT)' },
  { value: 'Europe/Paris', label: 'Central European Time (CET)' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)' },
  { value: 'Australia/Sydney', label: 'Australian Eastern Time (AET)' },
];

export const SYNC_FREQUENCY_OPTIONS: { value: SyncFrequency; label: string; description: string }[] = [
  { value: 'realtime', label: 'Real-time', description: 'Sync immediately when changes occur' },
  { value: 'hourly', label: 'Hourly', description: 'Sync every hour' },
  { value: 'daily', label: 'Daily', description: 'Sync once per day' },
];