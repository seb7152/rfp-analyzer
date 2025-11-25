-- Migration: Add preserve_template_formatting to export_configurations
-- Purpose: Allow users to choose between clean export or preserving template formatting
-- Feature: Template-preserving Excel export mode

-- Add preserve_template_formatting column
ALTER TABLE export_configurations
ADD COLUMN preserve_template_formatting BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN export_configurations.preserve_template_formatting IS
'When true, the export preserves the template file formatting, formulas, and structure, only updating cell values. When false, creates a clean worksheet with data only.';
