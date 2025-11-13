-- Migration: Allow Excel and Word documents in addition to PDFs
-- Purpose: Support multiple document formats for RFP uploads

-- Drop the existing MIME type constraint that only allows PDF
ALTER TABLE rfp_documents
DROP CONSTRAINT valid_mime_type;

-- Add new constraint that allows PDF, Excel, and Word formats
ALTER TABLE rfp_documents
ADD CONSTRAINT valid_mime_type CHECK (
  mime_type IN (
    'application/pdf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  )
);

-- Update the table comment to reflect supported formats
COMMENT ON TABLE rfp_documents IS 'Stores metadata for documents (PDF, Excel, Word) uploaded to RFPs, with references to GCP Cloud Storage objects';
