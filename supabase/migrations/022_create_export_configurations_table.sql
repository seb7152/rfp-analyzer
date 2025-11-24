-- Migration: Create export_configurations table
-- Purpose: Store Excel export configurations with column mappings
-- Feature: Excel export functionality for RFP analysis data

-- Create export_configurations table
CREATE TABLE export_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rfp_id UUID NOT NULL REFERENCES rfps(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    template_document_id UUID NOT NULL REFERENCES rfp_documents(id) ON DELETE CASCADE,
    worksheet_name VARCHAR(100) NOT NULL,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    
    -- Configuration des colonnes
    column_mappings JSONB NOT NULL DEFAULT '[]',
    -- Format: [{column: "A", field: "requirement_code", ...}]
    
    -- Mapping des exigences
    use_requirement_mapping BOOLEAN DEFAULT FALSE,
    requirement_mapping_column VARCHAR(10), -- "A", "B", etc.
    
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique combination of template, worksheet, and supplier per RFP
    UNIQUE(rfp_id, worksheet_name, supplier_id)
);

-- Create indexes for efficient querying
CREATE INDEX idx_export_configurations_rfp_id ON export_configurations(rfp_id);
CREATE INDEX idx_export_configurations_organization_id ON export_configurations(organization_id);
CREATE INDEX idx_export_configurations_template_id ON export_configurations(template_document_id);
CREATE INDEX idx_export_configurations_supplier_id ON export_configurations(supplier_id);

-- Enable RLS
ALTER TABLE export_configurations ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view export configurations of their organization's RFPs
CREATE POLICY "Users can view export configurations of their RFPs"
  ON export_configurations
  FOR SELECT
  USING (
    organization_id = (auth.jwt() ->> 'organization_id')::UUID
  );

-- RLS Policy: Users can create export configurations for their RFPs
CREATE POLICY "Users can create export configurations for their RFPs"
  ON export_configurations
  FOR INSERT
  WITH CHECK (
    organization_id = (auth.jwt() ->> 'organization_id')::UUID
    AND created_by = auth.uid()
  );

-- RLS Policy: Users can update export configurations they created
CREATE POLICY "Users can update export configurations they created"
  ON export_configurations
  FOR UPDATE
  USING (
    organization_id = (auth.jwt() ->> 'organization_id')::UUID
    AND created_by = auth.uid()
  )
  WITH CHECK (
    organization_id = (auth.jwt() ->> 'organization_id')::UUID
    AND created_by = auth.uid()
  );

-- RLS Policy: Users can delete export configurations they created
CREATE POLICY "Users can delete export configurations they created"
  ON export_configurations
  FOR DELETE
  USING (
    organization_id = (auth.jwt() ->> 'organization_id')::UUID
    AND created_by = auth.uid()
  );

-- Comments for documentation
COMMENT ON TABLE export_configurations IS 
'Stores Excel export configurations linking templates, suppliers, and column mappings for RFP data export';

COMMENT ON COLUMN export_configurations.column_mappings IS 
'JSON array defining which data fields go to which Excel columns: [{column: "A", field: "requirement_code", ...}]';

COMMENT ON COLUMN export_configurations.use_requirement_mapping IS 
'When true, system maps data to rows based on requirement codes found in the specified column';

COMMENT ON COLUMN export_configurations.requirement_mapping_column IS 
'Excel column letter (A, B, C, etc.) where requirement codes should be searched for row mapping';

-- Update trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION update_export_configurations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_export_configurations_updated_at
    BEFORE UPDATE ON export_configurations
    FOR EACH ROW
    EXECUTE FUNCTION update_export_configurations_updated_at();