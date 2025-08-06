-- Migration: Create goal notifications table
-- This table stores notifications for goal milestones, achievements, and schedule updates

CREATE TABLE IF NOT EXISTS goal_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  user_id UUID NOT NULL,
  goal_id UUID NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('milestone', 'completion', 'behind_schedule', 'ahead_schedule', 'deadline_approaching')),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB, -- Additional notification data (milestone percentage, days remaining, etc.)
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT fk_goal_notifications_user FOREIGN KEY (user_id) REFERENCES users.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_goal_notifications_goal FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_goal_notifications_user_id ON goal_notifications(user_id);
CREATE INDEX idx_goal_notifications_goal_id ON goal_notifications(goal_id);
CREATE INDEX idx_goal_notifications_read ON goal_notifications(read);
CREATE INDEX idx_goal_notifications_type ON goal_notifications(type);
CREATE INDEX idx_goal_notifications_created_at ON goal_notifications(created_at);

-- Composite index for common queries
CREATE INDEX idx_goal_notifications_user_unread ON goal_notifications(user_id, read, created_at DESC);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_goal_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_goal_notifications_updated_at
  BEFORE UPDATE ON goal_notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_goal_notifications_updated_at();