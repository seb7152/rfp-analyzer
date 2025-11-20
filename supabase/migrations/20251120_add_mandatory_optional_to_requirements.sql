-- Migration: Add is_mandatory and is_optional columns to requirements table
-- Date: 2025-11-20

-- Add is_mandatory and is_optional columns to requirements
ALTER TABLE requirements
ADD COLUMN is_mandatory BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN is_optional BOOLEAN NOT NULL DEFAULT false;

-- Add index for filtering by mandatory/optional status
CREATE INDEX idx_requirements_mandatory ON requirements(is_mandatory) WHERE is_mandatory = true;
CREATE INDEX idx_requirements_optional ON requirements(is_optional) WHERE is_optional = true;

-- Add constraint to ensure a requirement cannot be both mandatory and optional
ALTER TABLE requirements
ADD CONSTRAINT check_mandatory_optional_exclusive 
CHECK (NOT (is_mandatory = true AND is_optional = true));

-- Comment on columns
COMMENT ON COLUMN requirements.is_mandatory IS 'Indicates if this requirement is mandatory for supplier compliance';
COMMENT ON COLUMN requirements.is_optional IS 'Indicates if this requirement is optional for supplier compliance';
