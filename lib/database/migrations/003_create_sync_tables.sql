-- Migration: Create sync-related tables
-- Description: Add tables for transaction conflicts and sync job tracking

-- Transaction conflicts table for manual review
CREATE TABLE IF NOT EXISTS transaction_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conflict_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  resolution_notes TEXT,
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(transaction_id)
);

-- Sync job history table for tracking and debugging
CREATE TABLE IF NOT EXISTS sync_jobs (
  id VARCHAR(255) PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES plaid_connections(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'queued',
  priority VARCHAR(10) DEFAULT 'normal',
  options JSONB,
  result JSONB,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Sync metrics table for performance monitoring
CREATE TABLE IF NOT EXISTS sync_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES plaid_connections(id) ON DELETE CASCADE,
  sync_type VARCHAR(20) NOT NULL, -- 'full', 'incremental', 'manual'
  accounts_updated INTEGER DEFAULT 0,
  transactions_added INTEGER DEFAULT 0,
  transactions_updated INTEGER DEFAULT 0,
  sync_duration_ms INTEGER,
  success BOOLEAN NOT NULL,
  error_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_transaction_conflicts_user ON transaction_conflicts(user_id);
CREATE INDEX IF NOT EXISTS idx_transaction_conflicts_status ON transaction_conflicts(status);
CREATE INDEX IF NOT EXISTS idx_transaction_conflicts_created ON transaction_conflicts(created_at);

CREATE INDEX IF NOT EXISTS idx_sync_jobs_user ON sync_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_status ON sync_jobs(status);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_created ON sync_jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_connection ON sync_jobs(connection_id);

CREATE INDEX IF NOT EXISTS idx_sync_metrics_user ON sync_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_metrics_connection ON sync_metrics(connection_id);
CREATE INDEX IF NOT EXISTS idx_sync_metrics_created ON sync_metrics(created_at);
CREATE INDEX IF NOT EXISTS idx_sync_metrics_type ON sync_metrics(sync_type);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_transaction_conflicts_updated_at 
  BEFORE UPDATE ON transaction_conflicts 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();