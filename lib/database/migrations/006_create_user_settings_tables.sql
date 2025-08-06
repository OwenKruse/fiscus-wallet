-- Migration: Create User Settings Tables
-- Description: Creates tables for user_settings and user_preferences to support comprehensive user customization
-- Requirements: 1.1, 2.1, 4.1, 5.1, 6.1, 7.1

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_user_settings_updated_at 
    BEFORE UPDATE ON user_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at 
    BEFORE UPDATE ON user_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create audit trigger function for tracking changes
CREATE OR REPLACE FUNCTION audit_user_settings_changes()
RETURNS TRIGGER AS $$
DECLARE
    old_data JSONB;
    new_data JSONB;
    changed_fields TEXT[];
    field_name TEXT;
BEGIN
    -- Convert OLD and NEW records to JSONB
    IF TG_OP = 'DELETE' THEN
        old_data := to_jsonb(OLD);
        new_data := NULL;
    ELSIF TG_OP = 'INSERT' THEN
        old_data := NULL;
        new_data := to_jsonb(NEW);
    ELSE -- UPDATE
        old_data := to_jsonb(OLD);
        new_data := to_jsonb(NEW);
        
        -- Identify changed fields
        changed_fields := ARRAY[]::TEXT[];
        FOR field_name IN SELECT jsonb_object_keys(new_data) LOOP
            IF old_data->field_name IS DISTINCT FROM new_data->field_name THEN
                changed_fields := array_append(changed_fields, field_name);
            END IF;
        END LOOP;
    END IF;
    
    -- Insert audit record
    INSERT INTO user_settings_audit (
        user_id,
        table_name,
        operation,
        old_values,
        new_values,
        changed_fields
    ) VALUES (
        COALESCE(NEW.user_id, OLD.user_id),
        TG_TABLE_NAME,
        TG_OP,
        old_data,
        new_data,
        changed_fields
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Create audit triggers
CREATE TRIGGER audit_user_settings_trigger
    AFTER INSERT OR UPDATE OR DELETE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION audit_user_settings_changes();

CREATE TRIGGER audit_user_preferences_trigger
    AFTER INSERT OR UPDATE OR DELETE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION audit_user_settings_changes();

-- Create function to initialize default user preferences
CREATE OR REPLACE FUNCTION initialize_user_preferences(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO user_preferences (user_id)
    VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;
END;
$$ language 'plpgsql';

-- Create function to get user settings by category
CREATE OR REPLACE FUNCTION get_user_settings_by_category(p_user_id UUID, p_category VARCHAR(50))
RETURNS TABLE(key VARCHAR(100), value JSONB) AS $$
BEGIN
    RETURN QUERY
    SELECT us.key, us.value
    FROM user_settings us
    WHERE us.user_id = p_user_id AND us.category = p_category
    ORDER BY us.key;
END;
$$ language 'plpgsql';

-- Create function to upsert user setting
CREATE OR REPLACE FUNCTION upsert_user_setting(
    p_user_id UUID,
    p_category VARCHAR(50),
    p_key VARCHAR(100),
    p_value JSONB
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO user_settings (user_id, category, key, value)
    VALUES (p_user_id, p_category, p_key, p_value)
    ON CONFLICT (user_id, category, key)
    DO UPDATE SET
        value = EXCLUDED.value,
        updated_at = NOW();
END;
$$ language 'plpgsql';

-- Create function to reset user preferences to defaults
CREATE OR REPLACE FUNCTION reset_user_preferences_to_defaults(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE user_preferences SET
        theme = 'light',
        currency_format = 'USD',
        date_format = 'MM/dd/yyyy',
        timezone = 'America/New_York',
        language = 'en',
        notifications_enabled = true,
        email_notifications = true,
        goal_notifications = true,
        account_alerts = true,
        system_updates = false,
        marketing_emails = false,
        data_sharing_analytics = false,
        data_sharing_marketing = false,
        two_factor_enabled = false,
        session_timeout_minutes = 480,
        auto_sync_enabled = true,
        sync_frequency = 'daily',
        updated_at = NOW()
    WHERE user_id = p_user_id;
END;
$$ language 'plpgsql';

-- Create function to delete user settings by category
CREATE OR REPLACE FUNCTION delete_user_settings_by_category(p_user_id UUID, p_category VARCHAR(50))
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM user_settings
    WHERE user_id = p_user_id AND category = p_category;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ language 'plpgsql';

-- Create function to cleanup old audit records (older than 1 year)
CREATE OR REPLACE FUNCTION cleanup_old_settings_audit()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM user_settings_audit
    WHERE created_at < NOW() - INTERVAL '1 year';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ language 'plpgsql';

-- Add table comments for documentation
COMMENT ON TABLE user_settings IS 'Flexible key-value storage for user settings organized by category';
COMMENT ON TABLE user_preferences IS 'Structured storage for common user preferences with typed columns';
COMMENT ON TABLE user_settings_audit IS 'Audit trail for all changes to user settings and preferences';

-- Add column comments
COMMENT ON COLUMN user_settings.category IS 'Settings category: profile, notifications, display, privacy, accounts, system';
COMMENT ON COLUMN user_settings.key IS 'Setting key within the category';
COMMENT ON COLUMN user_settings.value IS 'JSON value for the setting, allows flexible data types';

COMMENT ON COLUMN user_preferences.theme IS 'UI theme preference: light, dark, or system';
COMMENT ON COLUMN user_preferences.currency_format IS 'Preferred currency format for financial displays';
COMMENT ON COLUMN user_preferences.date_format IS 'Preferred date format for date displays';
COMMENT ON COLUMN user_preferences.session_timeout_minutes IS 'Session timeout in minutes (15-1440)';
COMMENT ON COLUMN user_preferences.sync_frequency IS 'Frequency for automatic data synchronization';

COMMENT ON COLUMN user_settings_audit.operation IS 'Database operation: INSERT, UPDATE, or DELETE';
COMMENT ON COLUMN user_settings_audit.old_values IS 'Previous values before the change (for UPDATE/DELETE)';
COMMENT ON COLUMN user_settings_audit.new_values IS 'New values after the change (for INSERT/UPDATE)';
COMMENT ON COLUMN user_settings_audit.changed_fields IS 'Array of field names that were modified (for UPDATE)';