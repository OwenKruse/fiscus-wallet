-- Migration: Create User Settings Tables (Simplified for Nile)
-- Description: Creates tables for user_settings and user_preferences to support comprehensive user customization
-- Requirements: 1.1, 2.1, 4.1, 5.1, 6.1, 7.1

-- Create user_settings table for flexible key-value settings storage
CREATE TABLE IF NOT EXISTS user_settings (
    id UUID PRIMARY KEY DEFAULT public.uuid_generate_v7(),
    user_id UUID NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('profile', 'notifications', 'display', 'privacy', 'accounts', 'system')),
    key VARCHAR(100) NOT NULL,
    value JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_user_category_key UNIQUE(user_id, category, key),
    CONSTRAINT valid_category CHECK (category IN ('profile', 'notifications', 'display', 'privacy', 'accounts', 'system')),
    CONSTRAINT valid_key_length CHECK (LENGTH(key) > 0 AND LENGTH(key) <= 100),
    CONSTRAINT valid_json_value CHECK (value IS NOT NULL)
);

-- Create user_preferences table for structured common preferences
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT public.uuid_generate_v7(),
    user_id UUID NOT NULL UNIQUE,
    
    -- Profile settings
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    phone VARCHAR(50),
    profile_picture_url TEXT,
    
    -- Display preferences
    theme VARCHAR(20) DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'system')),
    currency_format VARCHAR(10) DEFAULT 'USD',
    date_format VARCHAR(20) DEFAULT 'MM/dd/yyyy',
    timezone VARCHAR(50) DEFAULT 'America/New_York',
    language VARCHAR(10) DEFAULT 'en',
    
    -- Notification preferences
    notifications_enabled BOOLEAN DEFAULT true,
    email_notifications BOOLEAN DEFAULT true,
    goal_notifications BOOLEAN DEFAULT true,
    account_alerts BOOLEAN DEFAULT true,
    system_updates BOOLEAN DEFAULT false,
    marketing_emails BOOLEAN DEFAULT false,
    
    -- Privacy preferences
    data_sharing_analytics BOOLEAN DEFAULT false,
    data_sharing_marketing BOOLEAN DEFAULT false,
    two_factor_enabled BOOLEAN DEFAULT false,
    session_timeout_minutes INTEGER DEFAULT 480 CHECK (session_timeout_minutes > 0),
    
    -- Account preferences
    auto_sync_enabled BOOLEAN DEFAULT true,
    sync_frequency VARCHAR(20) DEFAULT 'daily' CHECK (sync_frequency IN ('realtime', 'hourly', 'daily', 'weekly')),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_theme CHECK (theme IN ('light', 'dark', 'system')),
    CONSTRAINT valid_currency_format CHECK (LENGTH(currency_format) >= 3),
    CONSTRAINT valid_date_format CHECK (LENGTH(date_format) > 0),
    CONSTRAINT valid_timezone CHECK (LENGTH(timezone) > 0),
    CONSTRAINT valid_language CHECK (LENGTH(language) >= 2),
    CONSTRAINT valid_session_timeout CHECK (session_timeout_minutes BETWEEN 15 AND 1440),
    CONSTRAINT valid_sync_frequency CHECK (sync_frequency IN ('realtime', 'hourly', 'daily', 'weekly'))
);

-- Create user_settings_audit table for tracking settings changes
CREATE TABLE IF NOT EXISTS user_settings_audit (
    id UUID PRIMARY KEY DEFAULT public.uuid_generate_v7(),
    user_id UUID NOT NULL,
    table_name VARCHAR(50) NOT NULL CHECK (table_name IN ('user_settings', 'user_preferences')),
    operation VARCHAR(10) NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_table_name CHECK (table_name IN ('user_settings', 'user_preferences')),
    CONSTRAINT valid_operation CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    CONSTRAINT require_values_for_operation CHECK (
        (operation = 'INSERT' AND new_values IS NOT NULL) OR
        (operation = 'UPDATE' AND old_values IS NOT NULL AND new_values IS NOT NULL) OR
        (operation = 'DELETE' AND old_values IS NOT NULL)
    )
);

-- Create indexes for optimal query performance
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_category ON user_settings(category);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_category ON user_settings(user_id, category);
CREATE INDEX IF NOT EXISTS idx_user_settings_key ON user_settings(key);
CREATE INDEX IF NOT EXISTS idx_user_settings_created_at ON user_settings(created_at);
CREATE INDEX IF NOT EXISTS idx_user_settings_updated_at ON user_settings(updated_at);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_theme ON user_preferences(theme);
CREATE INDEX IF NOT EXISTS idx_user_preferences_notifications_enabled ON user_preferences(notifications_enabled);
CREATE INDEX IF NOT EXISTS idx_user_preferences_two_factor_enabled ON user_preferences(two_factor_enabled);
CREATE INDEX IF NOT EXISTS idx_user_preferences_created_at ON user_preferences(created_at);
CREATE INDEX IF NOT EXISTS idx_user_preferences_updated_at ON user_preferences(updated_at);

CREATE INDEX IF NOT EXISTS idx_user_settings_audit_user_id ON user_settings_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_audit_table_name ON user_settings_audit(table_name);
CREATE INDEX IF NOT EXISTS idx_user_settings_audit_operation ON user_settings_audit(operation);
CREATE INDEX IF NOT EXISTS idx_user_settings_audit_created_at ON user_settings_audit(created_at);

-- Create GIN indexes for JSONB columns for efficient querying
CREATE INDEX IF NOT EXISTS idx_user_settings_value_gin ON user_settings USING GIN(value);
CREATE INDEX IF NOT EXISTS idx_user_settings_audit_old_values_gin ON user_settings_audit USING GIN(old_values);
CREATE INDEX IF NOT EXISTS idx_user_settings_audit_new_values_gin ON user_settings_audit USING GIN(new_values);