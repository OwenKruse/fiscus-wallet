# Design Document

## Overview

The goals system will be a comprehensive financial goal tracking feature that integrates seamlessly with the existing Plaid-based financial data infrastructure. The system will allow users to create, manage, and track various types of financial goals while providing automatic progress calculation based on their real financial data. The design leverages the existing database schema, API patterns, and UI components while adding new goal-specific functionality.

## Architecture

### Database Layer
The goals system will extend the existing Prisma schema with new tables that integrate with the current user and account structure. The design follows the established multi-tenant pattern using Nile's user management system.

### API Layer
New API routes will be created following the existing pattern in `app/api/` directory, utilizing the established authentication middleware and error handling patterns. The API will provide CRUD operations for goals and progress tracking calculations.

### Frontend Layer
The goals system will integrate with the existing React/Next.js frontend, utilizing the established UI component library (shadcn/ui) and following the current dashboard layout patterns. The system will extend the existing analytics page and dashboard components.

### Integration Points
- **Plaid Integration**: Automatic progress calculation based on account balances and transaction data
- **Analytics System**: New "Goals" tab in the analytics page with detailed progress charts
- **Dashboard**: Primary goal display widget on the main dashboard
- **Authentication**: Integration with existing Nile-based user authentication

## Components and Interfaces

### Database Schema Extensions

```sql
-- Goals table
CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  user_id UUID NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  goal_type VARCHAR(50) NOT NULL, -- 'savings', 'debt_reduction', 'investment', 'purchase', 'education', 'travel'
  category VARCHAR(100),
  target_amount DECIMAL(12, 2) NOT NULL,
  current_amount DECIMAL(12, 2) DEFAULT 0,
  target_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'completed', 'paused', 'cancelled'
  priority VARCHAR(10) DEFAULT 'medium', -- 'high', 'medium', 'low'
  is_primary BOOLEAN DEFAULT false,
  tracking_account_ids UUID[], -- Array of account IDs for automatic tracking
  tracking_method VARCHAR(50) DEFAULT 'manual', -- 'manual', 'account_balance', 'transaction_category'
  tracking_config JSONB, -- Configuration for automatic tracking
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT fk_goals_user FOREIGN KEY (user_id) REFERENCES users.users(id) ON DELETE CASCADE
);

-- Goal progress entries table for manual adjustments and history
CREATE TABLE goal_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  goal_id UUID NOT NULL,
  user_id UUID NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  progress_type VARCHAR(20) NOT NULL, -- 'manual_add', 'manual_subtract', 'automatic', 'adjustment'
  description TEXT,
  transaction_id UUID, -- Reference to transaction if applicable
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT fk_goal_progress_goal FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE,
  CONSTRAINT fk_goal_progress_user FOREIGN KEY (user_id) REFERENCES users.users(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_goals_user_id ON goals(user_id);
CREATE INDEX idx_goals_status ON goals(status);
CREATE INDEX idx_goals_is_primary ON goals(is_primary);
CREATE INDEX idx_goals_target_date ON goals(target_date);
CREATE INDEX idx_goal_progress_goal_id ON goal_progress(goal_id);
CREATE INDEX idx_goal_progress_created_at ON goal_progress(created_at);
```

### TypeScript Interfaces

```typescript
// Goal types
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

// API Request/Response types
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

export interface GoalsResponse {
  goals: Goal[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

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
  milestones: {
    percentage: number;
    achieved: boolean;
    achievedDate?: string;
  }[];
}
```

### API Endpoints

```typescript
// Goals CRUD operations
GET    /api/goals              // List user's goals with filtering
POST   /api/goals              // Create new goal
GET    /api/goals/[id]         // Get specific goal with progress history
PUT    /api/goals/[id]         // Update goal
DELETE /api/goals/[id]         // Delete goal

// Goal progress management
POST   /api/goals/[id]/progress    // Add manual progress entry
GET    /api/goals/[id]/progress    // Get progress history
PUT    /api/goals/[id]/calculate   // Trigger automatic progress calculation

// Goal analytics
GET    /api/goals/analytics        // Get analytics for all goals
GET    /api/goals/[id]/analytics   // Get analytics for specific goal

// Primary goal management
PUT    /api/goals/[id]/primary     // Set goal as primary
GET    /api/goals/primary          // Get current primary goal
```

### Service Layer Architecture

```typescript
// Goal service for business logic
export class GoalService {
  // CRUD operations
  async createGoal(userId: string, data: CreateGoalRequest): Promise<Goal>
  async updateGoal(goalId: string, userId: string, data: UpdateGoalRequest): Promise<Goal>
  async deleteGoal(goalId: string, userId: string): Promise<void>
  async getGoals(userId: string, filters?: GoalFilters): Promise<Goal[]>
  async getGoal(goalId: string, userId: string): Promise<Goal>
  
  // Progress management
  async addManualProgress(goalId: string, userId: string, data: GoalProgressRequest): Promise<void>
  async calculateAutomaticProgress(goalId: string, userId: string): Promise<void>
  async recalculateAllGoals(userId: string): Promise<void>
  
  // Primary goal management
  async setPrimaryGoal(goalId: string, userId: string): Promise<void>
  async getPrimaryGoal(userId: string): Promise<Goal | null>
  
  // Analytics
  async getGoalAnalytics(goalId: string, userId: string): Promise<GoalAnalytics>
  async getAllGoalsAnalytics(userId: string): Promise<GoalAnalytics[]>
}

// Progress calculation service
export class GoalProgressCalculator {
  async calculateSavingsGoalProgress(goal: Goal, accounts: Account[]): Promise<number>
  async calculateDebtReductionProgress(goal: Goal, accounts: Account[]): Promise<number>
  async calculateInvestmentGoalProgress(goal: Goal, accounts: Account[]): Promise<number>
  async calculateTransactionBasedProgress(goal: Goal, transactions: Transaction[]): Promise<number>
}
```

## Data Models

### Goal Tracking Methods

1. **Manual Tracking**: User manually adds/subtracts progress amounts
2. **Account Balance Tracking**: Progress calculated from specific account balance changes
3. **Transaction Category Tracking**: Progress calculated from transactions in specific categories

### Goal Types and Calculation Logic

1. **Savings Goals**: Track increase in designated savings accounts
2. **Debt Reduction Goals**: Track decrease in debt account balances
3. **Investment Goals**: Track growth in investment accounts
4. **Purchase Goals**: Manual or savings-based tracking for specific purchases
5. **Education Goals**: Manual or savings-based tracking for education expenses
6. **Travel Goals**: Manual or savings-based tracking for travel expenses

### Progress Calculation Rules

- **Automatic Calculation**: Runs when financial data is synced
- **Manual Adjustments**: Allow users to add/subtract amounts with descriptions
- **Historical Tracking**: Maintain progress history for analytics
- **Milestone Detection**: Automatically detect 25%, 50%, 75%, 100% completion

## Error Handling

### Validation Rules
- Goal title: Required, 1-255 characters
- Target amount: Required, positive number, max 12 digits
- Target date: Required, must be future date
- Goal type: Required, must be valid enum value
- Tracking accounts: Must belong to the user

### Error Scenarios
- **Invalid Goal Data**: Return 400 with validation errors
- **Goal Not Found**: Return 404 for non-existent goals
- **Unauthorized Access**: Return 403 for goals not owned by user
- **Primary Goal Conflicts**: Handle multiple primary goals gracefully
- **Calculation Errors**: Log errors and provide fallback values

### Error Response Format
```typescript
{
  success: false,
  error: {
    code: "VALIDATION_ERROR",
    message: "Invalid goal data provided",
    details: {
      field: "targetAmount",
      message: "Target amount must be positive"
    }
  },
  timestamp: "2024-02-08T10:30:00Z"
}
```

## Testing Strategy

### Unit Tests
- Goal service methods (CRUD operations)
- Progress calculation algorithms
- Validation logic
- Date calculations and projections

### Integration Tests
- API endpoint functionality
- Database operations with real data
- Plaid integration for automatic progress
- Authentication and authorization

### End-to-End Tests
- Complete goal creation workflow
- Progress tracking and updates
- Analytics page functionality
- Dashboard primary goal display

### Test Data Scenarios
- Various goal types and tracking methods
- Edge cases (overdue goals, completed goals)
- Multiple users with different goal configurations
- Integration with existing financial data

## Performance Considerations

### Database Optimization
- Proper indexing on frequently queried fields
- Efficient queries for goal analytics
- Pagination for large goal lists
- Optimized progress history queries

### Caching Strategy
- Cache primary goal for dashboard display
- Cache goal analytics calculations
- Invalidate cache on goal updates
- Use existing cache service patterns

### Background Processing
- Automatic progress calculation during sync
- Batch processing for multiple goals
- Async notification generation
- Scheduled milestone checks

## Security Considerations

### Data Protection
- All goal data scoped to authenticated user
- Sensitive financial targets encrypted at rest
- Audit trail for goal modifications
- Secure API endpoints with proper authentication

### Access Control
- User can only access their own goals
- Proper validation of goal ownership
- Secure handling of account associations
- Protection against data leakage

### Privacy
- Goal data not shared between users
- Optional goal sharing features for future
- Compliance with financial data regulations
- Secure deletion of goal history