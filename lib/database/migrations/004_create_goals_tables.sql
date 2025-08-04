-- Migration: Create Goals System Tables
-- Description: Creates tables for goals and goal_progress to support financial goal tracking
-- Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8

-- Create goals table
CREATE TABLE IF NOT EXISTS goals (
    id UUID PRIMARY KEY DEFAULT public.uuid_generate_v7(),
    user_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    goal_type VARCHAR(50) NOT NULL CHECK (goal_type IN ('savings', 'debt_reduction', 'investment', 'purchase', 'education', 'travel')),
    category VARCHAR(100),
    target_amount DECIMAL(12,2) NOT NULL CHECK (target_amount > 0),
    current_amount DECIMAL(12,2) DEFAULT 0 CHECK (current_amount >= 0),
    target_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
    is_primary BOOLEAN DEFAULT FALSE,
    tracking_account_ids UUID[] DEFAULT '{}',
    tracking_method VARCHAR(50) DEFAULT 'manual' CHECK (tracking_method IN ('manual', 'account_balance', 'transaction_category')),
    tracking_config JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_goal_title CHECK (title IS NOT NULL AND LENGTH(title) > 0 AND LENGTH(title) <= 255),
    CONSTRAINT valid_target_date CHECK (target_date > CURRENT_DATE),
    CONSTRAINT valid_amounts CHECK (target_amount > 0 AND current_amount >= 0),
    CONSTRAINT valid_goal_type CHECK (goal_type IN ('savings', 'debt_reduction', 'investment', 'purchase', 'education', 'travel')),
    CONSTRAINT valid_status CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
    CONSTRAINT valid_priority CHECK (priority IN ('high', 'medium', 'low')),
    CONSTRAINT valid_tracking_method CHECK (tracking_method IN ('manual', 'account_balance', 'transaction_category'))
);

-- Create goal_progress table for tracking progress history
CREATE TABLE IF NOT EXISTS goal_progress (
    id UUID PRIMARY KEY DEFAULT public.uuid_generate_v7(),
    goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    progress_type VARCHAR(20) NOT NULL CHECK (progress_type IN ('manual_add', 'manual_subtract', 'automatic', 'adjustment')),
    description TEXT,
    transaction_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_progress_type CHECK (progress_type IN ('manual_add', 'manual_subtract', 'automatic', 'adjustment')),
    CONSTRAINT valid_progress_amount CHECK (amount IS NOT NULL)
);

-- Create indexes for optimal query performance
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);
CREATE INDEX IF NOT EXISTS idx_goals_is_primary ON goals(is_primary);
CREATE INDEX IF NOT EXISTS idx_goals_target_date ON goals(target_date);
CREATE INDEX IF NOT EXISTS idx_goals_goal_type ON goals(goal_type);
CREATE INDEX IF NOT EXISTS idx_goals_created_at ON goals(created_at);
CREATE INDEX IF NOT EXISTS idx_goals_user_status ON goals(user_id, status);

CREATE INDEX IF NOT EXISTS idx_goal_progress_goal_id ON goal_progress(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_progress_user_id ON goal_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_goal_progress_created_at ON goal_progress(created_at);
CREATE INDEX IF NOT EXISTS idx_goal_progress_progress_type ON goal_progress(progress_type);
CREATE INDEX IF NOT EXISTS idx_goal_progress_goal_created ON goal_progress(goal_id, created_at DESC);

-- Create unique constraint to ensure only one primary goal per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_goals_user_primary ON goals(user_id) WHERE is_primary = TRUE;

-- Comments removed due to Nile DB limitations
-- goals table: Stores financial goals for users including savings, debt reduction, and investment targets
-- goal_progress table: Tracks progress history for goals including manual entries and automatic calculations