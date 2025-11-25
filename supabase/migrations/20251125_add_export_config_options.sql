-- Migration: Add start_row and include_headers to export_configurations
-- Purpose: Store additional export options for controlling output formatting
-- Feature: Excel export customization options

-- Add start_row column to control where data insertion begins
ALTER TABLE export_configurations
ADD COLUMN start_row INTEGER DEFAULT 2;

-- Add include_headers column to control whether custom headers are added
ALTER TABLE export_configurations
ADD COLUMN include_headers BOOLEAN DEFAULT TRUE;

-- Add comments for documentation
COMMENT ON COLUMN export_configurations.start_row IS
'Row number where data insertion should begin (1-based indexing). Used in simple insertion mode.';

COMMENT ON COLUMN export_configurations.include_headers IS
'When true, custom header names from column mappings are written to the Excel file.';
