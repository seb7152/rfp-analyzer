-- Migration 010: Add weight to categories table
-- Purpose: Add weight field to categories for proper weight configuration
-- Date: 2025-11-11

-- Add weight column to categories table
ALTER TABLE categories
ADD COLUMN weight DECIMAL(5,4) NOT NULL DEFAULT 1.0 CHECK (weight BETWEEN 0 AND 1);

-- Create index for performance
CREATE INDEX idx_categories_weight ON categories(rfp_id, weight);

-- Add comment
COMMENT ON COLUMN categories.weight IS 'Weight of the category relative to other categories. Used for scoring calculations.';