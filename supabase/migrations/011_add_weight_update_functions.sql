-- Migration 011: Add batch weight update functions
-- Purpose: Add functions for efficient batch updates of weights
-- Date: 2025-11-11

-- Function to update multiple category weights in a single transaction
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

-- Function to update multiple requirement weights in a single transaction
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

-- Add RLS policies for weight updates
-- Only admins can update weights
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