-- Create a table to link documents with suppliers
-- This allows documents to be associated with specific suppliers
-- while keeping document_type clean for other document types

CREATE TABLE IF NOT EXISTS document_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES rfp_documents(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(document_id, supplier_id)
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_document_suppliers_document_id
  ON document_suppliers(document_id);

CREATE INDEX IF NOT EXISTS idx_document_suppliers_supplier_id
  ON document_suppliers(supplier_id);

-- Add RLS policy for document_suppliers
ALTER TABLE document_suppliers ENABLE ROW LEVEL SECURITY;

-- Users can view document_suppliers if they have access to the RFP
CREATE POLICY "Users can view document suppliers"
  ON document_suppliers FOR SELECT
  USING (
    document_id IN (
      SELECT id FROM rfp_documents
      WHERE organization_id IN (
        SELECT organization_id FROM user_organizations
        WHERE user_id = auth.uid()
      )
    )
  );

-- Users can insert document_suppliers if they have access to the RFP
CREATE POLICY "Users can insert document suppliers"
  ON document_suppliers FOR INSERT
  WITH CHECK (
    document_id IN (
      SELECT id FROM rfp_documents
      WHERE organization_id IN (
        SELECT organization_id FROM user_organizations
        WHERE user_id = auth.uid()
      )
    )
  );

-- Users can delete document_suppliers if they have access to the RFP
CREATE POLICY "Users can delete document suppliers"
  ON document_suppliers FOR DELETE
  USING (
    document_id IN (
      SELECT id FROM rfp_documents
      WHERE organization_id IN (
        SELECT organization_id FROM user_organizations
        WHERE user_id = auth.uid()
      )
    )
  );

-- Update the constraint on document_type to allow only standard types
-- (supplier associations will be tracked in document_suppliers table)
ALTER TABLE rfp_documents
  DROP CONSTRAINT IF EXISTS valid_document_type;

ALTER TABLE rfp_documents
  ADD CONSTRAINT valid_document_type CHECK (document_type IN (
    'cahier_charges', 'specifications', 'technical_brief', 'appendix', 'supplier_response'
  ));

-- Add a comment for future reference
COMMENT ON TABLE document_suppliers IS
  'Tracks which suppliers are associated with documents. Enables filtering documents by supplier and organizing supplier responses.';

COMMENT ON COLUMN document_suppliers.document_id IS
  'Reference to the document in rfp_documents table';

COMMENT ON COLUMN document_suppliers.supplier_id IS
  'Reference to the supplier in suppliers table';

COMMENT ON COLUMN rfp_documents.document_type IS
  'Type of document: cahier_charges (specifications), specifications, technical_brief, appendix, or supplier_response. Use document_suppliers table to link supplier_response documents with specific suppliers.';
