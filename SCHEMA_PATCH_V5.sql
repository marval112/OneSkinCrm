-- Add time tracking columns to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS timer_start TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS time_spent INTEGER DEFAULT 0;
