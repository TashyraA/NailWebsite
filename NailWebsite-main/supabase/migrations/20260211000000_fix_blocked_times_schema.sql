-- Add missing date column to blocked_times table
ALTER TABLE blocked_times ADD COLUMN IF NOT EXISTS date DATE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_blocked_times_date ON blocked_times(date);