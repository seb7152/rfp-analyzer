-- Migration: Add presentation transcript analysis
-- Purpose: Simple async processing of presentation transcripts
-- Single call to N8N, single callback update

-- ============================================================================
-- CREATE presentation_analyses TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS presentation_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfp_id UUID NOT NULL REFERENCES rfps(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  version_id UUID REFERENCES evaluation_versions(id) ON DELETE SET NULL,

  -- Transcript content
  transcript TEXT NOT NULL,

  -- Analysis results: {summary, keyPoints, suggestions: [{requirementId, ...}]}
  analysis_data JSONB DEFAULT '{}'::jsonb,

  -- Status: pending → processing → completed | failed
  status TEXT NOT NULL DEFAULT 'pending',

  -- Webhook tracking
  correlation_id TEXT UNIQUE NOT NULL,

  -- Metadata
  generated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  error_message TEXT,

  -- Timing
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  CONSTRAINT unique_presentation_per_supplier_version
    UNIQUE(rfp_id, supplier_id, version_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_presentation_analyses_status
  ON presentation_analyses(status) WHERE status != 'completed';

CREATE INDEX IF NOT EXISTS idx_presentation_analyses_correlation
  ON presentation_analyses(correlation_id);

CREATE INDEX IF NOT EXISTS idx_presentation_analyses_supplier
  ON presentation_analyses(rfp_id, supplier_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE presentation_analyses ENABLE ROW LEVEL SECURITY;

-- Users can view analyses for RFPs they have access to
CREATE POLICY "Users can view presentation_analyses for accessible RFPs"
  ON presentation_analyses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM rfps r
      JOIN user_organizations uo ON uo.organization_id = r.organization_id
      WHERE r.id = presentation_analyses.rfp_id
        AND uo.user_id = auth.uid()
    )
  );

-- Service role can manage analyses
CREATE POLICY "Service can manage presentation_analyses"
  ON presentation_analyses FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE presentation_analyses IS
  'Tracks presentation/soutenance transcript analysis.
   One record per supplier per version with full analysis results.';

COMMENT ON COLUMN presentation_analyses.transcript IS
  'Raw transcript text from presentation/defense';

COMMENT ON COLUMN presentation_analyses.analysis_data IS
  'Complete analysis results: {summary, keyPoints, suggestions: [...]}';

COMMENT ON COLUMN presentation_analyses.status IS
  'Status: pending → processing → completed | failed';

COMMENT ON COLUMN presentation_analyses.correlation_id IS
  'ID for N8N webhook callback mapping';
