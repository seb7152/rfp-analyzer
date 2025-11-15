-- Migration 012: Create Tags and Requirement Tags Tables
-- Date: 2025-11-15
-- Description: Add tagging functionality for requirements

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TAGS TABLE
-- ============================================================================

CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rfp_id UUID NOT NULL REFERENCES rfps(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7), -- Hex color code (e.g., "#3B82F6")
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  CONSTRAINT unique_tag_per_rfp UNIQUE (rfp_id, name)
);

CREATE INDEX idx_tags_rfp ON tags(rfp_id);
CREATE INDEX idx_tags_name ON tags(name);

COMMENT ON TABLE tags IS 'Tags for organizing and categorizing requirements within an RFP';
COMMENT ON COLUMN tags.color IS 'Hex color code for visual identification (e.g., #3B82F6)';

-- ============================================================================
-- REQUIREMENT TAGS JUNCTION TABLE
-- ============================================================================

CREATE TABLE requirement_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requirement_id UUID NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  CONSTRAINT unique_requirement_tag UNIQUE (requirement_id, tag_id)
);

CREATE INDEX idx_requirement_tags_requirement ON requirement_tags(requirement_id);
CREATE INDEX idx_requirement_tags_tag ON requirement_tags(tag_id);

COMMENT ON TABLE requirement_tags IS 'Many-to-many relationship between requirements and tags';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE requirement_tags ENABLE ROW LEVEL SECURITY;

-- Tags: Users can view tags for RFPs they have access to
CREATE POLICY "Users can view tags in their RFPs"
  ON tags FOR SELECT
  USING (
    rfp_id IN (SELECT id FROM rfps)
  );

-- Tags: Evaluators and owners can manage tags
CREATE POLICY "Evaluators can manage tags"
  ON tags FOR ALL
  USING (
    rfp_id IN (
      SELECT rfp_id FROM rfp_user_assignments
      WHERE user_id = auth.uid() AND access_level IN ('owner', 'evaluator')
    )
  );

-- Requirement Tags: Users can view tags on requirements they can access
CREATE POLICY "Users can view requirement tags"
  ON requirement_tags FOR SELECT
  USING (
    requirement_id IN (
      SELECT id FROM requirements
      WHERE rfp_id IN (SELECT id FROM rfps)
    )
  );

-- Requirement Tags: Evaluators and owners can manage requirement tags
CREATE POLICY "Evaluators can manage requirement tags"
  ON requirement_tags FOR ALL
  USING (
    requirement_id IN (
      SELECT r.id FROM requirements r
      INNER JOIN rfp_user_assignments rua ON r.rfp_id = rua.rfp_id
      WHERE rua.user_id = auth.uid() AND rua.access_level IN ('owner', 'evaluator')
    )
  );
