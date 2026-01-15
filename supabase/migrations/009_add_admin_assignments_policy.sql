-- Migration 009: Add additional RLS policy for better RFP assignments filtering
-- This migration ADDS policies without removing existing ones
-- Safe approach: adds admin policy while keeping existing user policy

-- Add a policy for organization admins to see all assignments in their org
CREATE POLICY IF NOT EXISTS "Organization admins can view all RFP assignments in their org"
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

-- Note: The original "Users can view RFP assignments" policy remains in place
-- This allows users in an organization to see assignments for RFPs in that org
-- The API layer adds additional filtering via .eq("user_id", user.id)
