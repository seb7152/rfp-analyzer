-- Migration: Allow users to view profiles of other users in the same organization
-- Date: 2025-11-20

-- Drop the restrictive policy that only allows users to see their own profile
DROP POLICY IF EXISTS "Users can view their own profile" ON users;

-- Create a new policy that allows users to see their own profile
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (id = auth.uid());

-- Create a new policy that allows users to see profiles of users in the same organization
CREATE POLICY "Users can view profiles in same organization"
  ON users FOR SELECT
  USING (
    id IN (
      SELECT uo.user_id
      FROM user_organizations uo
      WHERE uo.organization_id IN (
        SELECT organization_id
        FROM user_organizations
        WHERE user_id = auth.uid()
      )
    )
  );
