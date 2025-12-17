-- Migration: Add asynchronous defense analysis tracking with multi-stage workflow
-- Purpose: Enable backend to process leaf categories → synthesize parents → store results

-- ============================================================================
-- 1. ALTER EXISTING defense_analyses TABLE
-- ============================================================================

-- Add status tracking columns
ALTER TABLE defense_analyses
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS failed_categories INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS error_message TEXT,
ADD COLUMN IF NOT EXISTS correlation_id TEXT UNIQUE;

-- Add comment for status values
COMMENT ON COLUMN defense_analyses.status IS
  'Analysis status: pending → analyzing_leaves → synthesizing_parents → completed | failed';

COMMENT ON COLUMN defense_analyses.correlation_id IS
  'Unique ID to link with N8N webhook callbacks; used for async result mapping';

-- ============================================================================
-- 2. CREATE defense_analysis_tasks TABLE (Category-level task tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS defense_analysis_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES defense_analyses(id) ON DELETE CASCADE,
  category_id UUID NOT NULL,

  -- Hierarchy level: 0 = leaf categories, 1 = first parents, etc.
  -- Determines processing order
  hierarchy_level INTEGER NOT NULL,

  -- Task lifecycle: pending → processing → completed | failed
  status TEXT NOT NULL DEFAULT 'pending',

  -- Result data: {forces: [...], faiblesses: [...]}
  result JSONB,

  -- Error tracking
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Timing
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attempted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Constraint: one task per analysis per category
  CONSTRAINT unique_category_per_analysis
    UNIQUE (analysis_id, category_id)
);

-- ============================================================================
-- 3. INDEXES FOR PERFORMANCE
-- ============================================================================

-- Find all tasks for an analysis (status checking, monitoring)
CREATE INDEX IF NOT EXISTS idx_defense_analysis_tasks_analysis
  ON defense_analysis_tasks(analysis_id);

-- Find all tasks at a specific hierarchy level (process leaf categories first)
CREATE INDEX IF NOT EXISTS idx_defense_analysis_tasks_hierarchy
  ON defense_analysis_tasks(analysis_id, hierarchy_level, status);

-- Monitor pending tasks across all analyses
CREATE INDEX IF NOT EXISTS idx_defense_analysis_tasks_pending
  ON defense_analysis_tasks(status) WHERE status = 'pending';

-- Find failed tasks for retry logic
CREATE INDEX IF NOT EXISTS idx_defense_analysis_tasks_failed
  ON defense_analysis_tasks(status, retry_count) WHERE status = 'failed';

-- Update defense_analyses table indexes
CREATE INDEX IF NOT EXISTS idx_defense_analyses_status
  ON defense_analyses(status) WHERE status != 'completed';

CREATE INDEX IF NOT EXISTS idx_defense_analyses_correlation
  ON defense_analyses(correlation_id) WHERE correlation_id IS NOT NULL;

-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on defense_analysis_tasks
ALTER TABLE defense_analysis_tasks ENABLE ROW LEVEL SECURITY;

-- Users can view tasks for analyses they have access to
CREATE POLICY "Users can view defense_analysis_tasks for accessible analyses"
  ON defense_analysis_tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM defense_analyses da
      JOIN rfps r ON r.id = da.rfp_id
      JOIN user_organizations uo ON uo.organization_id = r.organization_id
      WHERE da.id = defense_analysis_tasks.analysis_id
        AND uo.user_id = auth.uid()
    )
  );

-- Service role (backend) can insert/update tasks
CREATE POLICY "Service can manage defense_analysis_tasks"
  ON defense_analysis_tasks FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- 5. HELPER FUNCTIONS FOR ASYNC WORKFLOW
-- ============================================================================

-- Function to initialize tasks for a new analysis
CREATE OR REPLACE FUNCTION initialize_analysis_tasks(
  p_analysis_id UUID,
  p_rfp_id UUID,
  p_category_hierarchy JSONB
)
RETURNS void AS $$
DECLARE
  v_category JSONB;
  v_category_id UUID;
  v_hierarchy_level INTEGER;
BEGIN
  -- Clear existing tasks (if restarting)
  DELETE FROM defense_analysis_tasks
  WHERE analysis_id = p_analysis_id;

  -- Insert tasks from category hierarchy
  -- Expected format: [{id, level}, ...]
  -- level 0 = leaves, level 1 = first parents, etc.
  FOR v_category IN
    SELECT jsonb_array_elements(p_category_hierarchy)
  LOOP
    v_category_id := (v_category->>'id')::UUID;
    v_hierarchy_level := (v_category->>'level')::INTEGER;

    INSERT INTO defense_analysis_tasks (
      analysis_id,
      category_id,
      hierarchy_level,
      status
    ) VALUES (
      p_analysis_id,
      v_category_id,
      v_hierarchy_level,
      'pending'
    )
    ON CONFLICT (analysis_id, category_id) DO NOTHING;
  END LOOP;

  -- Update analysis to reflect task count
  UPDATE defense_analyses
  SET categories_analyzed = (
    SELECT COUNT(*) FROM defense_analysis_tasks
    WHERE analysis_id = p_analysis_id
  )
  WHERE id = p_analysis_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update analysis status based on task completion
CREATE OR REPLACE FUNCTION update_analysis_status()
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
  FROM defense_analysis_tasks
  WHERE analysis_id = NEW.analysis_id;

  -- Determine new analysis status
  IF v_failed_tasks > 0 THEN
    v_new_status := 'failed';
  ELSIF v_pending_tasks > 0 AND v_completed_tasks > 0 THEN
    v_new_status := 'analyzing_leaves'; -- or synthesizing_parents based on hierarchy_level
  ELSIF v_pending_tasks = 0 AND v_completed_tasks = v_total_tasks THEN
    v_new_status := 'completed';
  ELSIF v_pending_tasks = v_total_tasks THEN
    v_new_status := 'pending';
  ELSE
    v_new_status := 'processing';
  END IF;

  -- Update analysis record
  UPDATE defense_analyses
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
CREATE TRIGGER trg_update_analysis_status
  AFTER INSERT OR UPDATE ON defense_analysis_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_analysis_status();

-- ============================================================================
-- 6. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE defense_analysis_tasks IS
  'Tracks individual category analysis tasks within a defense_analyses job.
   Enables monitoring of multi-stage workflow: leaf categories → parent synthesis.
   One task per category per analysis.';

COMMENT ON COLUMN defense_analysis_tasks.hierarchy_level IS
  'Processing stage: 0=leaf categories, 1=first-level parents, etc.
   Used to orchestrate: process all level 0 → then level 1 → etc.';

COMMENT ON COLUMN defense_analysis_tasks.status IS
  'Task status: pending (queued) → processing (in progress) → completed | failed';

COMMENT ON COLUMN defense_analysis_tasks.result IS
  'JSON result: {forces: [string,...], faiblesses: [string,...]}
   Populated when N8N webhook returns results.';

COMMENT ON COLUMN defense_analysis_tasks.retry_count IS
  'Number of processing attempts. Use for exponential backoff strategy.';

COMMENT ON FUNCTION initialize_analysis_tasks IS
  'Called when creating a new analysis. Pre-populates tasks for all categories
   in the hierarchy, ready for async processing.
   Input: analysis_id, rfp_id, [{id: uuid, level: int}, ...]';

COMMENT ON FUNCTION update_analysis_status IS
  'Triggered on defense_analysis_tasks INSERT/UPDATE.
   Rolls up task statuses to update parent defense_analyses record.
   Handles status transitions: pending → analyzing → synthesizing → completed.';

-- ============================================================================
-- 7. SAMPLE QUERIES FOR BACKEND OPERATIONS
-- ============================================================================

/*
-- Get next pending tasks for processing (leaf categories first)
SELECT id, analysis_id, category_id, hierarchy_level
FROM defense_analysis_tasks
WHERE status = 'pending'
AND analysis_id = $1
ORDER BY hierarchy_level ASC, created_at ASC
LIMIT 10;

-- Mark task as processing after sending to N8N
UPDATE defense_analysis_tasks
SET status = 'processing', attempted_at = NOW()
WHERE id = $1;

-- Record task result after N8N callback
UPDATE defense_analysis_tasks
SET
  status = 'completed',
  result = $1::jsonb,
  completed_at = NOW()
WHERE id = $2;

-- Get analysis status for frontend polling
SELECT status, categories_analyzed, failed_categories, last_updated_at
FROM defense_analyses
WHERE id = $1;

-- Check if all leaf-level tasks completed (ready for synthesis)
SELECT COUNT(*) = COUNT(*) FILTER (WHERE status = 'completed')
FROM defense_analysis_tasks
WHERE analysis_id = $1 AND hierarchy_level = 0;
*/
