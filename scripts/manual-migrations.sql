-- Manual SQL script to apply migrations for weight configuration
-- Run this directly in your Supabase SQL editor or via psql

-- Migration 010: Add weight to categories
ALTER TABLE categories
ADD COLUMN IF NOT EXISTS weight DECIMAL(5,4) NOT NULL DEFAULT 1.0 CHECK (weight BETWEEN 0 AND 1);

CREATE INDEX IF NOT EXISTS idx_categories_weight ON categories(rfp_id, weight);

COMMENT ON COLUMN categories.weight IS 'Weight of category relative to other categories. Used for scoring calculations.';

-- Migration 011: Add weight update functions
CREATE OR REPLACE FUNCTION update_category_weights(category_updates JSONB)
RETURNS VOID AS $$
DECLARE
    update_record JSONB;
BEGIN
    FOR update_record IN SELECT * FROM jsonb_array_elements(category_updates)
    LOOP
        UPDATE categories 
            SET weight = (update_record->>'weight')::DECIMAL(5,4),
                updated_at = NOW()
            WHERE id = (update_record->>'id')::UUID;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_requirement_weights(requirement_updates JSONB)
RETURNS VOID AS $$
DECLARE
    update_record JSONB;
BEGIN
    FOR update_record IN SELECT * FROM jsonb_array_elements(requirement_updates)
    LOOP
        UPDATE requirements 
            SET weight = (update_record->>'weight')::DECIMAL(5,4),
                updated_at = NOW()
            WHERE id = (update_record->>'id')::UUID;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Add RLS policies for weight updates (if they don't exist)
DROP POLICY IF EXISTS "Admins can update category weights" ON categories;
CREATE POLICY "Admins can update category weights"
  ON categories FOR UPDATE
  USING (
    rfp_id IN (
      SELECT id FROM rfps
      WHERE organization_id IN (
        SELECT organization_id FROM user_organizations
        WHERE user_id = auth.uid() AND role = 'admin'
      )
    )
  );

DROP POLICY IF EXISTS "Admins can update requirement weights" ON requirements;
CREATE POLICY "Admins can update requirement weights"
  ON requirements FOR UPDATE
  USING (
    rfp_id IN (
      SELECT id FROM rfps
      WHERE organization_id IN (
        SELECT organization_id FROM user_organizations
        WHERE user_id = auth.uid() AND role = 'admin'
      )
    )
  );

-- Migration 012: Add is_mandatory, is_optional, and display_order columns to requirements
ALTER TABLE requirements
ADD COLUMN IF NOT EXISTS is_mandatory BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE requirements
ADD COLUMN IF NOT EXISTS is_optional BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE requirements
ADD COLUMN IF NOT EXISTS display_order INTEGER;

CREATE INDEX IF NOT EXISTS idx_requirements_is_mandatory ON requirements(rfp_id, is_mandatory);
CREATE INDEX IF NOT EXISTS idx_requirements_is_optional ON requirements(rfp_id, is_optional);
CREATE INDEX IF NOT EXISTS idx_requirements_display_order ON requirements(rfp_id, display_order);

COMMENT ON COLUMN requirements.is_mandatory IS 'Flag indicating if this requirement is mandatory for suppliers';
COMMENT ON COLUMN requirements.is_optional IS 'Flag indicating if this requirement is optional for suppliers';
COMMENT ON COLUMN requirements.display_order IS 'Order in which requirements should be displayed in the UI';