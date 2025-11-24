-- Add rf_document_id foreign key to requirements table
-- This links requirements to specific PDF documents for page-aware navigation

ALTER TABLE requirements
ADD COLUMN rf_document_id UUID REFERENCES rfp_documents(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_requirements_rf_document_id ON requirements(rf_document_id);

-- Note: No additional RLS policy needed - existing "Users can view their RFP requirements" policy
-- from migration 001_initial_schema.sql already handles access control via rfp_id
-- When rf_document_id is set, it's for optional UI enhancement but doesn't restrict access

