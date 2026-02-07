-- Add submitted_at column to track when waiter submitted their reconciliation
ALTER TABLE waiter_shifts 
ADD COLUMN submitted_at TIMESTAMPTZ;