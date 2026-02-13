-- Migration: Add Peer Review System
-- Feature: 004-peer-review
-- Date: 2026-02-13

-- ============================================================================
-- 1. Add peer_review_enabled to rfps
-- ============================================================================

ALTER TABLE rfps
  ADD COLUMN IF NOT EXISTS peer_review_enabled BOOLEAN NOT NULL DEFAULT false;

-- ============================================================================
-- 2. Create requirement_review_status table
-- ============================================================================

CREATE TABLE IF NOT EXISTS requirement_review_status (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- References
  requirement_id UUID NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
  version_id     UUID NOT NULL REFERENCES evaluation_versions(id) ON DELETE CASCADE,

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'draft',

  -- Submission audit
  submitted_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  submitted_at   TIMESTAMPTZ,

  -- Review audit
  reviewed_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at    TIMESTAMPTZ,

  -- Rejection comment
  rejection_comment TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (requirement_id, version_id),

  CONSTRAINT valid_review_status
    CHECK (status IN ('draft', 'submitted', 'approved', 'rejected'))
);

CREATE INDEX IF NOT EXISTS idx_review_status_requirement
  ON requirement_review_status(requirement_id);

CREATE INDEX IF NOT EXISTS idx_review_status_version
  ON requirement_review_status(version_id);

CREATE INDEX IF NOT EXISTS idx_review_status_version_status
  ON requirement_review_status(version_id, status);

-- Reuse the existing trigger function from migration 001
CREATE TRIGGER update_requirement_review_status_updated_at
  BEFORE UPDATE ON requirement_review_status
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 3. Row Level Security
-- ============================================================================

ALTER TABLE requirement_review_status ENABLE ROW LEVEL SECURITY;

-- SELECT: all members of the organization
CREATE POLICY "Members can view review statuses"
  ON requirement_review_status FOR SELECT
  USING (
    requirement_id IN (
      SELECT req.id FROM requirements req
      INNER JOIN rfps r ON req.rfp_id = r.id
      WHERE r.organization_id = (auth.jwt() ->> 'organization_id')::UUID
    )
  );

-- INSERT: assigned members (evaluator or owner)
CREATE POLICY "Evaluators can insert review statuses"
  ON requirement_review_status FOR INSERT
  WITH CHECK (
    requirement_id IN (
      SELECT req.id FROM requirements req
      INNER JOIN rfp_user_assignments rua ON req.rfp_id = rua.rfp_id
      WHERE rua.user_id = auth.uid()
        AND rua.access_level IN ('owner', 'evaluator', 'admin')
    )
  );

-- UPDATE: assigned members (transition logic enforced in API layer)
CREATE POLICY "Evaluators can update review statuses"
  ON requirement_review_status FOR UPDATE
  USING (
    requirement_id IN (
      SELECT req.id FROM requirements req
      INNER JOIN rfp_user_assignments rua ON req.rfp_id = rua.rfp_id
      WHERE rua.user_id = auth.uid()
        AND rua.access_level IN ('owner', 'evaluator', 'admin')
    )
  );
