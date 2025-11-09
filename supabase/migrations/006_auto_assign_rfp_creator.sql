-- Migration 006: Auto-assign RFP creator as owner
-- Ensures that when an RFP is created, the creator is automatically assigned as owner

-- ============================================================================
-- TRIGGER FUNCTION
-- ============================================================================

-- Function to automatically assign creator as owner
CREATE OR REPLACE FUNCTION auto_assign_rfp_creator()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert assignment for the creator as owner
  INSERT INTO rfp_user_assignments (rfp_id, user_id, access_level, assigned_by)
  VALUES (NEW.id, NEW.created_by, 'owner', NEW.created_by)
  ON CONFLICT (rfp_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGER
-- ============================================================================

-- Trigger to auto-assign creator when RFP is created
CREATE TRIGGER auto_assign_rfp_creator_trigger
  AFTER INSERT ON rfps
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_rfp_creator();

-- ============================================================================
-- BACKFILL: Assign existing RFP creators as owners
-- ============================================================================

-- For any existing RFPs without assignments, assign the creator as owner
INSERT INTO rfp_user_assignments (rfp_id, user_id, access_level, assigned_by)
SELECT
  r.id,
  r.created_by,
  'owner',
  r.created_by
FROM rfps r
LEFT JOIN rfp_user_assignments rua ON rua.rfp_id = r.id AND rua.user_id = r.created_by
WHERE rua.id IS NULL
ON CONFLICT (rfp_id, user_id) DO NOTHING;
