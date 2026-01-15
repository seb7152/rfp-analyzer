-- Migration: Add 'roadmap' status to responses.status check constraint
-- Date: 2026-01-10

-- 1. Drop existing constraint
ALTER TABLE responses DROP CONSTRAINT IF EXISTS valid_status;

-- 2. Add new constraint with 'roadmap' included
ALTER TABLE responses ADD CONSTRAINT valid_status CHECK (status IN ('pending', 'pass', 'partial', 'fail', 'roadmap'));

-- 3. Comment on the change
COMMENT ON COLUMN responses.status IS 'Status of the evaluation: pending, pass, partial, fail, roadmap';
