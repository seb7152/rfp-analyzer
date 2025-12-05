-- Migration: Add evaluation versioning system
-- Purpose: Support multiple evaluation versions with supplier shortlisting
-- Feature: Version management, progressive evaluation, shortlist tracking

-- ============================================================================
-- CREATE EVALUATION_VERSIONS TABLE
-- ============================================================================

CREATE TABLE evaluation_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rfp_id UUID NOT NULL REFERENCES rfps(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  version_name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  parent_version_id UUID REFERENCES evaluation_versions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  finalized_at TIMESTAMPTZ,
  finalized_by UUID REFERENCES users(id) ON DELETE SET NULL,

  UNIQUE (rfp_id, version_number),
  CONSTRAINT valid_version_number CHECK (version_number > 0)
);

CREATE INDEX idx_evaluation_versions_rfp ON evaluation_versions(rfp_id);
CREATE INDEX idx_evaluation_versions_active ON evaluation_versions(rfp_id, is_active);
CREATE INDEX idx_evaluation_versions_parent ON evaluation_versions(parent_version_id);

-- ============================================================================
-- CREATE VERSION_SUPPLIER_STATUS TABLE
-- ============================================================================

CREATE TABLE version_supplier_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version_id UUID NOT NULL REFERENCES evaluation_versions(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  shortlist_status VARCHAR(20) NOT NULL DEFAULT 'active',
  removal_reason TEXT, -- Optional: justification for removal
  removed_at TIMESTAMPTZ,
  removed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (version_id, supplier_id),
  CONSTRAINT valid_shortlist_status CHECK (shortlist_status IN ('active', 'shortlisted', 'removed'))
);

CREATE INDEX idx_version_supplier_version ON version_supplier_status(version_id);
CREATE INDEX idx_version_supplier_supplier ON version_supplier_status(supplier_id);
CREATE INDEX idx_version_supplier_status ON version_supplier_status(version_id, shortlist_status);

-- ============================================================================
-- CREATE VERSION_CHANGES_LOG TABLE (Audit Trail)
-- ============================================================================

CREATE TABLE version_changes_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version_id UUID NOT NULL REFERENCES evaluation_versions(id) ON DELETE CASCADE,
  rfp_id UUID NOT NULL REFERENCES rfps(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,

  CONSTRAINT valid_action CHECK (action IN (
    'version_created', 'version_finalized', 'version_activated',
    'supplier_removed', 'supplier_restored', 'responses_copied'
  ))
);

CREATE INDEX idx_version_changes_version ON version_changes_log(version_id);
CREATE INDEX idx_version_changes_rfp ON version_changes_log(rfp_id);
CREATE INDEX idx_version_changes_created_at ON version_changes_log(created_at);

-- ============================================================================
-- MODIFY RESPONSES TABLE FOR VERSION SUPPORT
-- ============================================================================

ALTER TABLE responses
ADD COLUMN version_id UUID REFERENCES evaluation_versions(id) ON DELETE SET NULL,
ADD COLUMN is_snapshot BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN original_response_id UUID REFERENCES responses(id) ON DELETE SET NULL;

-- Add indexes for version-based queries
CREATE INDEX idx_responses_version ON responses(version_id);
CREATE INDEX idx_responses_version_supplier ON responses(version_id, supplier_id);

-- Modify unique constraint to be version-aware
ALTER TABLE responses DROP CONSTRAINT IF EXISTS responses_requirement_id_supplier_id_key;
ALTER TABLE responses ADD CONSTRAINT responses_unique_per_version
  UNIQUE (requirement_id, supplier_id, version_id);

-- ============================================================================
-- MIGRATE EXISTING DATA
-- ============================================================================

-- 1. Create "Version initiale" for all existing RFPs
INSERT INTO evaluation_versions (rfp_id, version_number, version_name, is_active, created_by)
SELECT
  id,
  1,
  'Version initiale',
  true,
  created_by
FROM rfps
ON CONFLICT DO NOTHING;

-- 2. Link existing responses to version 1
UPDATE responses r
SET version_id = v.id
FROM evaluation_versions v
WHERE r.rfp_id = v.rfp_id
  AND v.version_number = 1
  AND r.version_id IS NULL;

-- 3. Create supplier status records for version 1 (all suppliers active)
INSERT INTO version_supplier_status (version_id, supplier_id, is_active, shortlist_status)
SELECT
  v.id,
  s.id,
  true,
  'active'
FROM suppliers s
INNER JOIN evaluation_versions v ON s.rfp_id = v.rfp_id
WHERE v.version_number = 1
ON CONFLICT DO NOTHING;

-- 4. Make version_id NOT NULL after migration complete
ALTER TABLE responses ALTER COLUMN version_id SET NOT NULL;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE evaluation_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view versions of their RFPs"
  ON evaluation_versions FOR SELECT
  USING (
    rfp_id IN (
      SELECT r.id FROM rfps r
      WHERE r.organization_id = (auth.jwt() ->> 'organization_id')::UUID
    )
  );

CREATE POLICY "Owners can manage versions"
  ON evaluation_versions FOR ALL
  USING (
    rfp_id IN (
      SELECT rfp_id FROM rfp_user_assignments
      WHERE user_id = auth.uid() AND access_level = 'owner'
    )
  );

ALTER TABLE version_supplier_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view supplier status"
  ON version_supplier_status FOR SELECT
  USING (
    version_id IN (
      SELECT id FROM evaluation_versions
      WHERE rfp_id IN (
        SELECT r.id FROM rfps r
        WHERE r.organization_id = (auth.jwt() ->> 'organization_id')::UUID
      )
    )
  );

CREATE POLICY "Evaluators can update supplier status"
  ON version_supplier_status FOR UPDATE
  USING (
    version_id IN (
      SELECT id FROM evaluation_versions ev
      WHERE ev.rfp_id IN (
        SELECT rfp_id FROM rfp_user_assignments
        WHERE user_id = auth.uid() AND access_level IN ('owner', 'evaluator')
      )
    )
  );

ALTER TABLE version_changes_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view version audit logs"
  ON version_changes_log FOR SELECT
  USING (
    rfp_id IN (
      SELECT r.id FROM rfps r
      WHERE r.organization_id = (auth.jwt() ->> 'organization_id')::UUID
    )
  );

CREATE POLICY "System can insert audit logs"
  ON version_changes_log FOR INSERT
  WITH CHECK (
    rfp_id IN (
      SELECT r.id FROM rfps r
      WHERE r.organization_id = (auth.jwt() ->> 'organization_id')::UUID
    )
  );

-- ============================================================================
-- DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE evaluation_versions IS 'Stores multiple evaluation versions for an RFP, enabling progressive evaluation with version history';
COMMENT ON TABLE version_supplier_status IS 'Tracks supplier status (active/removed) within each evaluation version for shortlisting';
COMMENT ON TABLE version_changes_log IS 'Audit trail for version-related actions: creation, finalization, supplier removal, etc.';

COMMENT ON COLUMN evaluation_versions.version_number IS 'Sequential version number within RFP (starts at 1)';
COMMENT ON COLUMN evaluation_versions.is_active IS 'Only one version per RFP should be active at a time';
COMMENT ON COLUMN evaluation_versions.parent_version_id IS 'Reference to previous version for tracking version lineage';
COMMENT ON COLUMN evaluation_versions.finalized_at IS 'When set, version becomes read-only';

COMMENT ON COLUMN version_supplier_status.shortlist_status IS 'Status: active (being evaluated), shortlisted (passed current phase), or removed (excluded from this version forward)';
COMMENT ON COLUMN version_supplier_status.removal_reason IS 'Optional justification for supplier removal (user-provided narrative)';
