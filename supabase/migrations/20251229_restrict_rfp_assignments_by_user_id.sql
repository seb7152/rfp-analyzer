-- Migration: Fix RFP assignments RLS to filter by user_id
-- Critical fix: Ensure non-admin users only see their own assignments

-- Create a new restrictive policy that filters by user_id = auth.uid()
CREATE POLICY "Users can view only their own RFP assignments v2"
  ON rfp_user_assignments FOR SELECT
  USING (
    -- User must be in the organization of the RFP
    rfp_id IN (
      SELECT id FROM rfps
      WHERE organization_id IN (
        SELECT organization_id FROM user_organizations
        WHERE user_id = auth.uid()
      )
    )
    -- AND the assignment MUST be for this specific authenticated user
    AND user_id = auth.uid()
  );

-- CRITICAL ISSUE BEING FIXED:
-- The original "Users can view RFP assignments" policy was too permissive.
-- It allowed any user to see ALL assignments in their organization,
-- not just their own assignments.
--
-- This new policy explicitly restricts to user_id = auth.uid(),
-- ensuring strict data isolation between users.
