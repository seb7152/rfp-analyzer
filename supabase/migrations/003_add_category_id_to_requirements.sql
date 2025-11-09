-- Migration 003: Add category_id to requirements table
-- Links requirements to categories for better organization
-- Date: 2025-11-07

-- Add category_id column if it doesn't exist
ALTER TABLE requirements
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_requirements_category ON requirements(category_id);

-- Note: There may be an RLS (Row Level Security) policy preventing inserts
-- If you encounter "row-level security policy" errors, you may need to:
-- 1. Check the RLS policies on the requirements table in Supabase dashboard
-- 2. Ensure the authenticated user has proper INSERT permissions
-- 3. Or temporarily disable RLS for testing: ALTER TABLE requirements DISABLE ROW LEVEL SECURITY;
