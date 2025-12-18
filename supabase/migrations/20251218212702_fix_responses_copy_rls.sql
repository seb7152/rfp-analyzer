-- Fix RLS policy for response copying during version creation
-- Problem: When creating a new version and copying responses from previous version,
-- INSERT policy was blocking bulk insert operation

-- Drop existing INSERT policy and recreate with proper version support
DROP POLICY IF EXISTS "Evaluators can insert responses" ON responses;

-- New comprehensive INSERT policy that supports version creation
CREATE POLICY "Evaluators can insert responses"
  ON responses FOR INSERT
  WITH CHECK (
    -- Allow inserting responses if user has evaluator/owner access
    rfp_id IN (
      SELECT rfp_id FROM rfp_user_assignments
      WHERE user_id = auth.uid() AND access_level IN ('owner', 'evaluator')
    )
    -- AND version_id belongs to the same RFP and organization
    AND version_id IN (
      SELECT ev.id FROM evaluation_versions ev
      JOIN rfps r ON ev.rfp_id = r.id
      WHERE r.organization_id = (auth.jwt() ->> 'organization_id')::UUID
    )
  );

-- Add explicit policy for copying responses between versions
CREATE POLICY "Version creators can copy responses"
  ON responses FOR INSERT
  WITH CHECK (
    -- Allow copying when creating new version (from version_supplier_status context)
    EXISTS (
      SELECT 1 FROM evaluation_versions ev
      WHERE ev.id = version_id
      AND ev.rfp_id IN (
        SELECT rfp_id FROM rfp_user_assignments
        WHERE user_id = auth.uid() AND access_level IN ('owner', 'evaluator')
      )
    )
  );