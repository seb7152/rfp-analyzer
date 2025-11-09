-- Migration: Add display_order field to categories and requirements
-- Purpose: Allow custom ordering based on import sequence with manual override capability

-- Add display_order to categories
ALTER TABLE categories
ADD COLUMN display_order INTEGER;

-- Add display_order to requirements
ALTER TABLE requirements
ADD COLUMN display_order INTEGER;

-- Create indexes for performance
CREATE INDEX idx_categories_display_order ON categories(rfp_id, display_order);
CREATE INDEX idx_requirements_display_order ON requirements(rfp_id, display_order);

-- Backfill existing categories with display_order based on current code ordering
-- This maintains existing order for retrofit
WITH ordered_categories AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY rfp_id ORDER BY level ASC, code ASC) as order_num
  FROM categories
)
UPDATE categories
SET display_order = ordered_categories.order_num
FROM ordered_categories
WHERE categories.id = ordered_categories.id;

-- Backfill existing requirements with display_order based on current code ordering
WITH ordered_requirements AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY rfp_id ORDER BY level ASC, requirement_id_external ASC) as order_num
  FROM requirements
)
UPDATE requirements
SET display_order = ordered_requirements.order_num
FROM ordered_requirements
WHERE requirements.id = ordered_requirements.id;

-- Add comments
COMMENT ON COLUMN categories.display_order IS 'Custom display order. Auto-incremented on import, can be manually adjusted for reordering.';
COMMENT ON COLUMN requirements.display_order IS 'Custom display order within RFP. Auto-incremented on import, can be manually adjusted for reordering.';
