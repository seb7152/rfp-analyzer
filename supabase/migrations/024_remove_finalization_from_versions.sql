-- Migration: Remove finalization feature from evaluation versions
-- Purpose: Remove finalized_at and finalized_by columns as finalization feature is not needed
-- Feature: Cleanup, schema simplification

-- Drop columns from evaluation_versions table
ALTER TABLE evaluation_versions
DROP COLUMN IF EXISTS finalized_at,
DROP COLUMN IF EXISTS finalized_by;

-- Update version_changes_log constraint to remove version_finalized action
-- Note: The constraint was created in migration 023, we just remove the enum value from comments
-- The database doesn't enforce enum values at the column level, but this documents the change
COMMENT ON TABLE version_changes_log IS 'Audit log for version changes. Actions: version_created, version_activated, supplier_removed, supplier_restored, responses_copied';
