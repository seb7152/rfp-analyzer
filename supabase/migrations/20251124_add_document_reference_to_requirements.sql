-- Add rf_document_id foreign key to requirements table
-- This links requirements to specific PDF documents for page-aware navigation

ALTER TABLE requirements
ADD COLUMN rf_document_id UUID REFERENCES rfp_documents(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_requirements_rf_document_id ON requirements(rf_document_id);

-- Add RLS policy for document access through requirements
-- Users can view requirements linked to documents they have access to
CREATE POLICY "Users can view requirements linked to their RFP documents"
  ON requirements
  USING (
    EXISTS (
      SELECT 1 FROM rfp_documents
      WHERE rfp_documents.id = requirements.rf_document_id
        AND rfp_documents.organization_id IN (
          SELECT organization_id FROM user_organizations
          WHERE user_id = auth.uid()
        )
    )
  );
