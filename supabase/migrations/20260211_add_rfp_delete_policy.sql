-- Migration: Add DELETE policy for RFPs
-- Date: 2026-02-11
-- Description: Allow organization admins to delete RFPs.

-- Drop existing policy if it exists (just in case)
DROP POLICY IF EXISTS "Admins can delete RFPs" ON public.rfps;

-- Create the DELETE policy
CREATE POLICY "Admins can delete RFPs"
ON public.rfps
FOR DELETE
TO public
USING (
  -- Check if user is an admin of the organization the RFP belongs to
  -- Using the helper function to avoid recursion and ensure consistency
  EXISTS (
    SELECT 1
    FROM get_user_admin_orgs() AS org_id
    WHERE rfps.organization_id = org_id
  )
);
