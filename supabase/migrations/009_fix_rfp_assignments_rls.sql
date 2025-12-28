-- Migration 009: Fix RFP Assignments RLS Policy
-- Ensures users can only see their own assignments (not all assignments in their orgs)

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view RFP assignments" ON rfp_user_assignments;

-- Create a more restrictive policy that filters by user_id
CREATE POLICY "Users can view their own RFP assignments"
  ON rfp_user_assignments FOR SELECT
  USING (
    -- User must be in the organization of the RFP they're assigned to
    rfp_id IN (
      SELECT id FROM rfps
      WHERE organization_id IN (
        SELECT organization_id FROM user_organizations
        WHERE user_id = auth.uid()
      )
    )
    -- AND the assignment must be for this user
    AND user_id = auth.uid()
  );

-- Allow admins in the organization to view all assignments for RFPs they manage
CREATE POLICY "Organization admins can view RFP assignments"
  ON rfp_user_assignments FOR SELECT
  USING (
    rfp_id IN (
      SELECT id FROM rfps
      WHERE organization_id IN (
        SELECT organization_id FROM user_organizations
        WHERE user_id = auth.uid() AND role = 'admin'
      )
    )
  );
