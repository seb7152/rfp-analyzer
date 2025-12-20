-- Migration: Add presentation transcript analysis tables
-- Purpose: Enable async processing of presentation/defense transcripts by supplier
-- Tracks: transcript analysis, responses updates, callback results

-- ============================================================================
-- 1. CREATE presentation_analyses TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS presentation_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfp_id UUID NOT NULL REFERENCES rfps(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  version_id UUID REFERENCES evaluation_versions(id) ON DELETE SET NULL,

  -- Transcript content
  transcript TEXT NOT NULL,

  -- Analysis tracking
  analysis_data JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',

  -- Metadata
  generated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  correlation_id TEXT UNIQUE NOT NULL,

  -- Timing
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Error tracking
  failed_categories INTEGER DEFAULT 0,
  error_message TEXT,

  CONSTRAINT unique_presentation_per_supplier_version
    UNIQUE(rfp_id, supplier_id, version_id)
);

-- ============================================================================
-- 2. CREATE presentation_analysis_tasks TABLE (Category-level task tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS presentation_analysis_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES presentation_analyses(id) ON DELETE CASCADE,
  category_id UUID NOT NULL,

  -- Task lifecycle: pending → processing → completed | failed
  status TEXT NOT NULL DEFAULT 'pending',

  -- Result data: {summary, key_points, suggested_responses, suggested_comments, ...}
  result JSONB,

  -- Error tracking
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Timing
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attempted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Constraint: one task per analysis per category
  CONSTRAINT unique_category_per_presentation_analysis
    UNIQUE (analysis_id, category_id)
);

-- ============================================================================
-- 3. CREATE presentation_response_suggestions TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS presentation_response_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES presentation_analyses(id) ON DELETE CASCADE,
  requirement_id UUID NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,

  -- Original data from analysis
  original_response TEXT,
  original_comment TEXT,
  original_question TEXT,

  -- Suggested updates
  suggested_response TEXT,
  suggested_comment TEXT,
  answered_question TEXT,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | accepted | rejected | manual_review
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 4. INDEXES FOR PERFORMANCE
-- ============================================================================

-- Find all tasks for an analysis (status checking, monitoring)
CREATE INDEX IF NOT EXISTS idx_presentation_analysis_tasks_analysis
  ON presentation_analysis_tasks(analysis_id);

-- Monitor pending tasks across all analyses
CREATE INDEX IF NOT EXISTS idx_presentation_analysis_tasks_pending
  ON presentation_analysis_tasks(status) WHERE status = 'pending';

-- Find failed tasks for retry logic
CREATE INDEX IF NOT EXISTS idx_presentation_analysis_tasks_failed
  ON presentation_analysis_tasks(status, retry_count) WHERE status = 'failed';

-- Update presentation_analyses table indexes
CREATE INDEX IF NOT EXISTS idx_presentation_analyses_status
  ON presentation_analyses(status) WHERE status != 'completed';

CREATE INDEX IF NOT EXISTS idx_presentation_analyses_correlation
  ON presentation_analyses(correlation_id) WHERE correlation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_presentation_analyses_supplier
  ON presentation_analyses(rfp_id, supplier_id);

-- Suggestions indexes
CREATE INDEX IF NOT EXISTS idx_presentation_response_suggestions_analysis
  ON presentation_response_suggestions(analysis_id);

CREATE INDEX IF NOT EXISTS idx_presentation_response_suggestions_status
  ON presentation_response_suggestions(status);

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE presentation_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE presentation_analysis_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE presentation_response_suggestions ENABLE ROW LEVEL SECURITY;

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

-- Service role (backend) can manage analyses
CREATE POLICY "Service can manage presentation_analyses"
  ON presentation_analyses FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Users can view tasks for analyses they have access to
CREATE POLICY "Users can view presentation_analysis_tasks for accessible analyses"
  ON presentation_analysis_tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM presentation_analyses pa
      JOIN rfps r ON r.id = pa.rfp_id
      JOIN user_organizations uo ON uo.organization_id = r.organization_id
      WHERE pa.id = presentation_analysis_tasks.analysis_id
        AND uo.user_id = auth.uid()
    )
  );

-- Service role can manage tasks
CREATE POLICY "Service can manage presentation_analysis_tasks"
  ON presentation_analysis_tasks FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Users can view suggestions for analyses they have access to
CREATE POLICY "Users can view presentation_response_suggestions for accessible analyses"
  ON presentation_response_suggestions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM presentation_analyses pa
      JOIN rfps r ON r.id = pa.rfp_id
      JOIN user_organizations uo ON uo.organization_id = r.organization_id
      WHERE pa.id = presentation_response_suggestions.analysis_id
        AND uo.user_id = auth.uid()
    )
  );

-- Users can update suggestions (accept/reject)
CREATE POLICY "Users can update presentation_response_suggestions for accessible analyses"
  ON presentation_response_suggestions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM presentation_analyses pa
      JOIN rfps r ON r.id = pa.rfp_id
      JOIN user_organizations uo ON uo.organization_id = r.organization_id
      WHERE pa.id = presentation_response_suggestions.analysis_id
        AND uo.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM presentation_analyses pa
      JOIN rfps r ON r.id = pa.rfp_id
      JOIN user_organizations uo ON uo.organization_id = r.organization_id
      WHERE pa.id = presentation_response_suggestions.analysis_id
        AND uo.user_id = auth.uid()
    )
  );

-- Service role can insert suggestions
CREATE POLICY "Service can insert presentation_response_suggestions"
  ON presentation_response_suggestions FOR INSERT
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- 6. HELPER FUNCTIONS FOR ASYNC WORKFLOW
-- ============================================================================

-- Function to update analysis status based on task completion
CREATE OR REPLACE FUNCTION update_presentation_analysis_status()
RETURNS TRIGGER AS $$
DECLARE
  v_total_tasks INTEGER;
  v_completed_tasks INTEGER;
  v_failed_tasks INTEGER;
  v_pending_tasks INTEGER;
  v_new_status TEXT;
BEGIN
  -- Count task statuses
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed'),
    COUNT(*) FILTER (WHERE status = 'failed'),
    COUNT(*) FILTER (WHERE status = 'pending')
  INTO v_total_tasks, v_completed_tasks, v_failed_tasks, v_pending_tasks
  FROM presentation_analysis_tasks
  WHERE analysis_id = NEW.analysis_id;

  -- Determine new analysis status
  IF v_total_tasks = 0 THEN
    v_new_status := 'pending';
  ELSIF v_failed_tasks > 0 THEN
    v_new_status := 'failed';
  ELSIF v_pending_tasks > 0 AND v_completed_tasks > 0 THEN
    v_new_status := 'processing';
  ELSIF v_pending_tasks = 0 AND v_completed_tasks = v_total_tasks THEN
    v_new_status := 'completed';
  ELSE
    v_new_status := 'processing';
  END IF;

  -- Update analysis record
  UPDATE presentation_analyses
  SET
    status = v_new_status,
    last_updated_at = NOW(),
    failed_categories = v_failed_tasks,
    completed_at = CASE
      WHEN v_new_status = 'completed' THEN NOW()
      ELSE completed_at
    END
  WHERE id = NEW.analysis_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update analysis status on task changes
CREATE TRIGGER trg_update_presentation_analysis_status
  AFTER INSERT OR UPDATE ON presentation_analysis_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_presentation_analysis_status();

-- ============================================================================
-- 7. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE presentation_analyses IS
  'Tracks presentation/soutenance transcript analysis jobs.
   Enables async processing: N8N analyzes transcript + provides response/comment suggestions.
   One record per supplier per version.';

COMMENT ON COLUMN presentation_analyses.transcript IS
  'Raw transcript text from presentation/defense';

COMMENT ON COLUMN presentation_analyses.analysis_data IS
  'Final aggregated results from all tasks: {summary, key_points, ...}';

COMMENT ON COLUMN presentation_analyses.status IS
  'Analysis status: pending → processing → completed | failed';

COMMENT ON COLUMN presentation_analyses.correlation_id IS
  'Unique ID to link with N8N webhook callbacks for async result mapping';

COMMENT ON TABLE presentation_analysis_tasks IS
  'Tracks individual category analysis tasks within a presentation_analyses job.
   Enables monitoring of async workflow for each category.
   One task per category per analysis.';

COMMENT ON TABLE presentation_response_suggestions IS
  'Stores suggested improvements to responses and comments based on presentation analysis.
   Users can accept, reject, or manually review each suggestion.';

COMMENT ON FUNCTION update_presentation_analysis_status IS
  'Triggered on presentation_analysis_tasks INSERT/UPDATE.
   Rolls up task statuses to update parent presentation_analyses record.';
