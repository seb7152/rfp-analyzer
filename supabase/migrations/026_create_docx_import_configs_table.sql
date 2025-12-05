-- Migration 026: Create DOCX Import Configurations Table
-- Stores saved import configurations per RFP for easy reuse
-- Date: 2025-12-05

CREATE TABLE docx_import_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rfp_id UUID NOT NULL REFERENCES rfps(id) ON DELETE CASCADE,
  name TEXT NOT NULL,

  -- Code extraction configuration
  code_type TEXT NOT NULL CHECK (code_type IN ('inline', 'table')),
  code_pattern TEXT NOT NULL,
  code_group_index INTEGER NOT NULL DEFAULT 1,
  code_column_index INTEGER DEFAULT 0,
  code_template TEXT NOT NULL,

  -- Title extraction configuration
  title_type TEXT CHECK (title_type IN ('inline', 'table')),
  title_pattern TEXT,
  title_group_index INTEGER DEFAULT 1,
  title_column_index INTEGER DEFAULT 1,

  -- Content extraction configuration
  content_type TEXT CHECK (content_type IN ('inline', 'table')),
  content_pattern TEXT,
  content_group_index INTEGER DEFAULT 1,
  content_column_index INTEGER DEFAULT 2,

  -- Metadata
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),

  -- Ensure config name is unique per RFP
  UNIQUE (rfp_id, name)
);

-- Index for faster lookups
CREATE INDEX idx_docx_configs_rfp ON docx_import_configs(rfp_id);
CREATE INDEX idx_docx_configs_default ON docx_import_configs(rfp_id, is_default);

-- RLS Policies
ALTER TABLE docx_import_configs ENABLE ROW LEVEL SECURITY;

-- Users can view configs for RFPs they have access to
CREATE POLICY "Users can view docx_import_configs for their RFPs"
  ON docx_import_configs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM rfps
      JOIN user_organizations uo ON uo.organization_id = rfps.organization_id
      WHERE rfps.id = docx_import_configs.rfp_id
      AND uo.user_id = auth.uid()
    )
  );

-- Users can create configs for RFPs they have access to
CREATE POLICY "Users can create docx_import_configs for their RFPs"
  ON docx_import_configs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rfps
      JOIN user_organizations uo ON uo.organization_id = rfps.organization_id
      WHERE rfps.id = docx_import_configs.rfp_id
      AND uo.user_id = auth.uid()
    )
  );

-- Users can update configs they created or have access to
CREATE POLICY "Users can update their docx_import_configs"
  ON docx_import_configs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM rfps
      JOIN user_organizations uo ON uo.organization_id = rfps.organization_id
      WHERE rfps.id = docx_import_configs.rfp_id
      AND uo.user_id = auth.uid()
    )
  );

-- Users can delete configs they created
CREATE POLICY "Users can delete their docx_import_configs"
  ON docx_import_configs
  FOR DELETE
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM rfps
      JOIN user_organizations uo ON uo.organization_id = rfps.organization_id
      WHERE rfps.id = docx_import_configs.rfp_id
      AND uo.user_id = auth.uid()
      AND uo.role = 'admin'
    )
  );

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_docx_import_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_docx_import_configs_timestamp
  BEFORE UPDATE ON docx_import_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_docx_import_configs_updated_at();

-- Ensure only one default config per RFP
CREATE UNIQUE INDEX idx_one_default_per_rfp
  ON docx_import_configs (rfp_id)
  WHERE is_default = true;
