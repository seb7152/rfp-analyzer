-- Migration: Fix critical RLS bug in rfps table admin check
-- The original policy allowed admins of ANY org to see ALL RFPs in other orgs

-- Drop the buggy policy
DROP POLICY IF EXISTS "Users can view RFPs in their organization" ON rfps;

-- Create the corrected policy
CREATE POLICY "Users can view RFPs in their organization"
  ON rfps FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations
      WHERE user_id = auth.uid()
    )
    AND (
      -- Either assigned to the RFP
      id IN (
        SELECT rfp_id FROM rfp_user_assignments
        WHERE user_id = auth.uid()
      )
      -- Or is admin of THIS SPECIFIC ORGANIZATION (FIXED)
      OR EXISTS (
        SELECT 1 FROM user_organizations
        WHERE user_id = auth.uid()
          AND role = 'admin'
          AND organization_id = rfps.organization_id
      )
    )
  );

-- EXPLANATION OF THE FIX:
-- The original used:
--   OR organization_id IN (SELECT ... WHERE role = 'admin')
-- This allowed ANY admin to see RFPs in orgs where they're just members
--
-- The fix uses EXISTS with explicit organization_id check:
--   OR EXISTS (... WHERE ... AND organization_id = rfps.organization_id)
-- This ensures the admin must be admin OF THE SAME ORGANIZATION as the RFP
