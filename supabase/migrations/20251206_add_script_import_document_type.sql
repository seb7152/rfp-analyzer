-- Migration: Add script_import document type
-- Purpose: Add support for script files (.py, .sh, etc.) as document type
-- Feature: Script import functionality

-- Update the valid_document_type constraint to include script_import
ALTER TABLE rfp_documents 
DROP CONSTRAINT IF EXISTS valid_document_type;

ALTER TABLE rfp_documents 
ADD CONSTRAINT valid_document_type CHECK (document_type IN (
  'cahier_charges', 
  'specifications', 
  'technical_brief', 
  'appendix', 
  'supplier_response', 
  'template',
  'script_import'
));

-- Update the valid_mime_type constraint to include script MIME types
ALTER TABLE rfp_documents 
DROP CONSTRAINT IF EXISTS valid_mime_type;

ALTER TABLE rfp_documents 
ADD CONSTRAINT valid_mime_type CHECK (mime_type IN (
  'application/pdf', 
  'application/vnd.ms-excel', 
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/x-python',
  'text/x-shellscript',
  'application/x-sh',
  'application/json',
  'text/yaml',
  'application/xml',
  'text/xml',
  'application/octet-stream'
));

-- Update comment to reflect new document type
COMMENT ON COLUMN rfp_documents.document_type IS 'Category of document: cahier_charges (specifications), specifications (technical specs), technical_brief (executive summary), appendix (supporting docs), supplier_response, template (Excel export templates), or script_import (Python/Shell scripts for import)';