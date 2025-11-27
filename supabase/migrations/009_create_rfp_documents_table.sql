-- Migration: Create rfp_documents and document_access_logs tables
-- Purpose: Store RFP documents (PDFs) and track access for audit trail
-- Feature: PDF storage integration with GCP Cloud Storage

-- Create rfp_documents table to store document metadata
CREATE TABLE rfp_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfp_id UUID NOT NULL REFERENCES rfps(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255),
  document_type VARCHAR(50) NOT NULL DEFAULT 'cahier_charges',
  -- Valid values: cahier_charges, specifications, technical_brief, appendix, supplier_response, template
  mime_type VARCHAR(100) NOT NULL DEFAULT 'application/pdf',
  file_size BIGINT NOT NULL,

  -- GCP Cloud Storage reference
  gcs_object_name TEXT NOT NULL,
  -- Format: rfps/{organization_id}/{rfp_id}/{document_id}-{filename}

  -- Metadata
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Optional page count for PDF files
  page_count INTEGER,

  -- Soft delete support
  deleted_at TIMESTAMP WITH TIME ZONE,

  CONSTRAINT valid_mime_type CHECK (mime_type IN (
    'application/pdf', 
    'application/vnd.ms-excel', 
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  )),
  CONSTRAINT valid_document_type CHECK (document_type IN ('cahier_charges', 'specifications', 'technical_brief', 'appendix', 'supplier_response', 'template'))
);

-- Create indexes for efficient querying
CREATE INDEX idx_rfp_documents_rfp_id ON rfp_documents(rfp_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_rfp_documents_organization_id ON rfp_documents(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_rfp_documents_document_type ON rfp_documents(document_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_rfp_documents_gcs_object ON rfp_documents(gcs_object_name) WHERE deleted_at IS NULL;

-- Enable RLS
ALTER TABLE rfp_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view documents of their organization's RFPs
CREATE POLICY "Users can view documents of their RFPs"
  ON rfp_documents
  FOR SELECT
  USING (
    organization_id = (auth.jwt() ->> 'organization_id')::UUID
  );

-- RLS Policy: Users can insert documents if they have write access to the RFP
CREATE POLICY "Users can create documents for their RFPs"
  ON rfp_documents
  FOR INSERT
  WITH CHECK (
    organization_id = (auth.jwt() ->> 'organization_id')::UUID
    AND created_by = auth.uid()
  );

-- RLS Policy: Users can update documents they created (within same organization)
CREATE POLICY "Users can update documents they created"
  ON rfp_documents
  FOR UPDATE
  USING (
    organization_id = (auth.jwt() ->> 'organization_id')::UUID
  )
  WITH CHECK (
    organization_id = (auth.jwt() ->> 'organization_id')::UUID
  );

-- RLS Policy: Users can delete documents they created (soft delete via deleted_at)
CREATE POLICY "Users can delete documents they created"
  ON rfp_documents
  FOR DELETE
  USING (
    organization_id = (auth.jwt() ->> 'organization_id')::UUID
  );

-- Create document_access_logs table for audit trail
CREATE TABLE document_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES rfp_documents(id) ON DELETE CASCADE,
  rfp_id UUID NOT NULL REFERENCES rfps(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Action performed
  action VARCHAR(50) NOT NULL,
  -- Valid values: upload, view, download, delete

  -- Request metadata
  ip_address INET,
  user_agent TEXT,

  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_action CHECK (action IN ('upload', 'view', 'download', 'delete'))
);

-- Create indexes for efficient logging queries
CREATE INDEX idx_document_access_logs_document_id ON document_access_logs(document_id);
CREATE INDEX idx_document_access_logs_rfp_id ON document_access_logs(rfp_id);
CREATE INDEX idx_document_access_logs_organization_id ON document_access_logs(organization_id);
CREATE INDEX idx_document_access_logs_user_id ON document_access_logs(user_id);
CREATE INDEX idx_document_access_logs_action ON document_access_logs(action);
CREATE INDEX idx_document_access_logs_created_at ON document_access_logs(created_at);

-- Enable RLS for audit logs
ALTER TABLE document_access_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view logs of their organization's documents
CREATE POLICY "Users can view access logs for their organization"
  ON document_access_logs
  FOR SELECT
  USING (
    organization_id = (auth.jwt() ->> 'organization_id')::UUID
  );

-- RLS Policy: System can insert logs (trusted context only)
CREATE POLICY "System can insert access logs"
  ON document_access_logs
  FOR INSERT
  WITH CHECK (true);

-- Comments for documentation
COMMENT ON TABLE rfp_documents IS 'Stores metadata for PDF documents and Excel templates uploaded to RFPs, with references to GCP Cloud Storage objects';
COMMENT ON COLUMN rfp_documents.gcs_object_name IS 'Path to file in GCP Cloud Storage bucket (rfp-analyzer-storage)';
COMMENT ON COLUMN rfp_documents.document_type IS 'Category of document: cahier_charges (specifications), specifications (technical specs), technical_brief (executive summary), appendix (supporting docs), supplier_response, or template (Excel export templates)';
COMMENT ON COLUMN rfp_documents.deleted_at IS 'Soft delete timestamp for audit trail; NULL means document is active';

COMMENT ON TABLE document_access_logs IS 'Audit trail for document access: views, downloads, uploads, and deletions';
COMMENT ON COLUMN document_access_logs.action IS 'Type of action: upload, view, download, delete';
COMMENT ON COLUMN document_access_logs.ip_address IS 'Client IP address for security audit';
