-- Migration: Add template document type support
-- Purpose: Enable Excel template uploads for export functionality
-- Feature: Excel export templates for RFP analysis data

-- Update document_type constraint to include 'template'
-- This allows storing Excel templates alongside existing document types
ALTER TABLE rfp_documents
DROP CONSTRAINT IF EXISTS valid_document_type;

ALTER TABLE rfp_documents
ADD CONSTRAINT valid_document_type CHECK (document_type IN (
  'cahier_charges', 
  'specifications', 
  'technical_brief', 
  'appendix', 
  'supplier_response',
  'template'  -- New document type for Excel export templates
));

-- Update comment to reflect the new template type
COMMENT ON COLUMN rfp_documents.document_type IS
'Type of document: cahier_charges (specifications), specifications (technical specs), technical_brief (executive summary), appendix (supporting docs), supplier_response, or template (Excel export templates)';

-- Add index for efficient template queries
CREATE INDEX IF NOT EXISTS idx_rfp_documents_template_type 
ON rfp_documents(document_type) 
WHERE deleted_at IS NULL AND document_type = 'template';

-- Update table comment to include templates
COMMENT ON TABLE rfp_documents IS
'Stores metadata for PDF documents and Excel templates uploaded to RFPs, with references to GCP Cloud Storage objects';

-- Note: Migration tracking should be handled by your migration system
-- This migration adds support for Excel template documents alongside existing PDF documents