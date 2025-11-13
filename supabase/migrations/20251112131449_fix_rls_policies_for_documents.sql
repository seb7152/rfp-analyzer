-- Migration: Fix RLS policies for rfp_documents and document_access_logs
-- Purpose: Use user_organizations table instead of JWT claims for better reliability
-- Issue: JWT claims are not automatically set by Supabase; using direct table checks instead

-- Drop existing policies that rely on JWT organization_id claim
DROP POLICY "Users can view documents of their RFPs" ON rfp_documents;
DROP POLICY "Users can create documents for their RFPs" ON rfp_documents;
DROP POLICY "Users can update documents they created" ON rfp_documents;
DROP POLICY "Users can delete documents they created" ON rfp_documents;

-- Create new policies that check user_organizations table directly
-- SELECT: Users can view documents of RFPs in their organization
CREATE POLICY "Users can view documents of their RFPs"
  ON rfp_documents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_organizations
      WHERE user_organizations.user_id = auth.uid()
        AND user_organizations.organization_id = rfp_documents.organization_id
    )
  );

-- INSERT: Users can create documents for RFPs in their organization
CREATE POLICY "Users can create documents for their RFPs"
  ON rfp_documents
  FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM user_organizations
      WHERE user_organizations.user_id = auth.uid()
        AND user_organizations.organization_id = rfp_documents.organization_id
    )
  );

-- UPDATE: Users can update documents in their organization
CREATE POLICY "Users can update documents they created"
  ON rfp_documents
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_organizations
      WHERE user_organizations.user_id = auth.uid()
        AND user_organizations.organization_id = rfp_documents.organization_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_organizations
      WHERE user_organizations.user_id = auth.uid()
        AND user_organizations.organization_id = rfp_documents.organization_id
    )
  );

-- DELETE: Users can delete documents in their organization
CREATE POLICY "Users can delete documents they created"
  ON rfp_documents
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_organizations
      WHERE user_organizations.user_id = auth.uid()
        AND user_organizations.organization_id = rfp_documents.organization_id
    )
  );

-- Drop existing audit log policy that relies on JWT claim
DROP POLICY "Users can view access logs for their organization" ON document_access_logs;

-- Create new policy for audit logs using direct table check
CREATE POLICY "Users can view access logs for their organization"
  ON document_access_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_organizations
      WHERE user_organizations.user_id = auth.uid()
        AND user_organizations.organization_id = document_access_logs.organization_id
    )
  );
