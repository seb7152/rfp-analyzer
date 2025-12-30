-- Migration: Fix RLS policies for organization member visibility and RFP assignments
-- Date: 2025-12-30
-- Description: Allow admins to view all organization members and manage RFP assignments without recursion

-- Function to get admin organizations without RLS recursion
CREATE OR REPLACE FUNCTION get_user_admin_orgs()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT organization_id
  FROM user_organizations
  WHERE user_id = auth.uid() AND role = 'admin';
$$;

-- Function to get user's RFP assignments without RLS recursion
CREATE OR REPLACE FUNCTION get_user_rfp_assignments()
RETURNS TABLE(rfp_id uuid)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT rfp_id
  FROM rfp_user_assignments
  WHERE user_id = auth.uid();
$$;

-- Function to check if user can access an RFP
CREATE OR REPLACE FUNCTION user_can_access_rfp(p_rfp_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM rfps
      WHERE id = p_rfp_id AND created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM rfps
      WHERE id = p_rfp_id
      AND organization_id IN (SELECT get_user_admin_orgs())
    );
$$;

-- Function to check if user belongs to RFP's organization
CREATE OR REPLACE FUNCTION user_belongs_to_rfp_org(p_rfp_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM user_organizations uo
      JOIN rfps r ON r.organization_id = uo.organization_id
      WHERE uo.user_id = p_user_id AND r.id = p_rfp_id
    );
$$;

-- Function to check if user can update an RFP
CREATE OR REPLACE FUNCTION can_update_rfp(p_rfp_id uuid, p_new_org_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM rfps 
    WHERE id = p_rfp_id AND created_by = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM rfps r
    WHERE r.id = p_rfp_id
    AND r.organization_id IN (SELECT get_user_admin_orgs())
  ) OR (
    p_new_org_id IS NOT NULL
    AND p_new_org_id IN (SELECT get_user_admin_orgs())
  );
$$;

-- DROP old policies on user_organizations
DROP POLICY IF EXISTS "user_orgs_select" ON public.user_organizations;

-- CREATE new policy to allow admins to see all org members
CREATE POLICY "user_orgs_select"
ON public.user_organizations
FOR SELECT
TO public
USING (
  user_id = auth.uid()
  OR organization_id IN (SELECT get_user_admin_orgs())
);

-- DROP old policies on rfps
DROP POLICY IF EXISTS "Admins can view all RFPs" ON public.rfps;
DROP POLICY IF EXISTS "Users can view assigned RFPs" ON public.rfps;

-- CREATE new policies to avoid recursion
CREATE POLICY "Admins can view all RFPs"
ON public.rfps
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM get_user_admin_orgs() AS org_id
    WHERE rfps.organization_id = org_id
  )
);

CREATE POLICY "Users can view assigned RFPs"
ON public.rfps
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM get_user_rfp_assignments() AS assignment
    WHERE assignment.rfp_id = rfps.id
  )
);

CREATE POLICY "Admins can update RFPs"
ON public.rfps
FOR UPDATE
TO public
USING (can_update_rfp(rfps.id))
WITH CHECK (can_update_rfp(rfps.id, organization_id));

-- DROP old policies on rfp_user_assignments
DROP POLICY IF EXISTS "User can view own assignments" ON public.rfp_user_assignments;

-- CREATE new policies for RFP assignments
CREATE POLICY "Users can view assignments"
ON public.rfp_user_assignments
FOR SELECT
TO public
USING (
  user_id = auth.uid()
  OR user_can_access_rfp(rfp_id)
);

CREATE POLICY "Owner or admin can create assignments"
ON public.rfp_user_assignments
FOR INSERT
TO public
WITH CHECK (
  user_can_access_rfp(rfp_id)
  AND user_belongs_to_rfp_org(rfp_id, user_id)
);

CREATE POLICY "Owner or admin can delete assignments"
ON public.rfp_user_assignments
FOR DELETE
TO public
USING (
  user_can_access_rfp(rfp_id)
);
