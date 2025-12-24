-- Migration: Sync defense_analysis_tasks to defense_analyses using Materialized View
-- Purpose: Keep analysis_data in sync without triggers or performance issues
-- Approach: Materialized view with periodic refresh (no blocking triggers)

-- ============================================================================
-- 1. HELPER FUNCTION: Rebuild analysis_data from tasks for ONE analysis
-- ============================================================================

CREATE OR REPLACE FUNCTION rebuild_analysis_data_for_analysis(p_analysis_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_analysis_data JSONB;
BEGIN
  SELECT jsonb_build_object(
    'categories', COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'category_id', dat.category_id,
          'forces', COALESCE(dat.result->'forces', '[]'::jsonb),
          'faiblesses', COALESCE(dat.result->'faiblesses', '[]'::jsonb),
          'metrics', COALESCE(dat.result->'metrics', '{}'::jsonb)
        )
        ORDER BY dat.hierarchy_level ASC, dat.category_id
      ),
      '[]'::jsonb
    ),
    'synced_at', NOW()
  )
  INTO v_analysis_data
  FROM defense_analysis_tasks dat
  WHERE dat.analysis_id = p_analysis_id
    AND dat.status = 'completed'
    AND dat.result IS NOT NULL;

  RETURN v_analysis_data;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 2. MATERIALIZED VIEW: Pre-computed analysis_data from all tasks
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS defense_analyses_synced AS
SELECT
  da.id,
  da.rfp_id,
  da.supplier_id,
  da.version_id,
  da.status,
  da.generated_at,
  da.correlation_id,
  rebuild_analysis_data_for_analysis(da.id) as analysis_data,
  COUNT(dat.id) FILTER (WHERE dat.status = 'completed') as completed_tasks_count,
  NOW() as last_synced_at
FROM defense_analyses da
LEFT JOIN defense_analysis_tasks dat ON dat.analysis_id = da.id
GROUP BY da.id, da.rfp_id, da.supplier_id, da.version_id, da.status, da.generated_at, da.correlation_id;

-- Create unique index for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_defense_analyses_synced_id
  ON defense_analyses_synced(id);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_defense_analyses_synced_rfp
  ON defense_analyses_synced(rfp_id);

CREATE INDEX IF NOT EXISTS idx_defense_analyses_synced_supplier
  ON defense_analyses_synced(supplier_id, version_id);

COMMENT ON MATERIALIZED VIEW defense_analyses_synced IS
  'Pre-computed view of defense_analyses with analysis_data rebuilt from tasks.
   Refreshed periodically (default: every 5 minutes).
   Use this view for exports, reports, and read-heavy operations.
   For real-time data, query defense_analysis_tasks directly.';

-- ============================================================================
-- 3. FUNCTION: Manual refresh of materialized view
-- ============================================================================

CREATE OR REPLACE FUNCTION refresh_defense_analyses_sync()
RETURNS TABLE(
  refreshed_at TIMESTAMPTZ,
  analyses_count BIGINT,
  duration_ms NUMERIC
) AS $$
DECLARE
  v_start_time TIMESTAMPTZ;
  v_end_time TIMESTAMPTZ;
  v_count BIGINT;
BEGIN
  v_start_time := clock_timestamp();

  -- Refresh the materialized view (CONCURRENTLY to avoid locking)
  REFRESH MATERIALIZED VIEW CONCURRENTLY defense_analyses_synced;

  v_end_time := clock_timestamp();

  -- Count refreshed analyses
  SELECT COUNT(*) INTO v_count FROM defense_analyses_synced;

  RETURN QUERY SELECT
    v_end_time,
    v_count,
    EXTRACT(MILLISECONDS FROM (v_end_time - v_start_time))::NUMERIC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_defense_analyses_sync IS
  'Manually refreshes the defense_analyses_synced materialized view.
   Uses CONCURRENTLY to avoid locking (allows reads during refresh).
   Returns refresh timestamp, count, and duration.
   Call this after bulk edits or on-demand from the UI.
   Usage: SELECT * FROM refresh_defense_analyses_sync();';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION refresh_defense_analyses_sync TO authenticated;

-- ============================================================================
-- 4. FUNCTION: Sync specific analysis to defense_analyses.analysis_data
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_single_analysis_data(p_analysis_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_analysis_data JSONB;
  v_user_organization_id UUID;
  v_analysis_organization_id UUID;
BEGIN
  -- Security: Verify user has access to this analysis via organization
  SELECT uo.organization_id INTO v_user_organization_id
  FROM user_organizations uo
  WHERE uo.user_id = auth.uid()
  LIMIT 1;

  IF v_user_organization_id IS NULL THEN
    RAISE EXCEPTION 'User not associated with any organization';
  END IF;

  -- Get the organization_id of the analysis
  SELECT r.organization_id INTO v_analysis_organization_id
  FROM defense_analyses da
  JOIN rfps r ON r.id = da.rfp_id
  WHERE da.id = p_analysis_id;

  IF v_analysis_organization_id IS NULL THEN
    RAISE EXCEPTION 'Analysis not found';
  END IF;

  -- Verify user belongs to the same organization
  IF v_user_organization_id != v_analysis_organization_id THEN
    RAISE EXCEPTION 'Access denied: analysis belongs to a different organization';
  END IF;

  -- Rebuild analysis_data from tasks
  v_analysis_data := rebuild_analysis_data_for_analysis(p_analysis_id);

  -- Update the defense_analyses record
  UPDATE defense_analyses
  SET
    analysis_data = v_analysis_data,
    last_updated_at = NOW()
  WHERE id = p_analysis_id;

  RETURN jsonb_build_object(
    'success', true,
    'analysis_id', p_analysis_id,
    'synced_at', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

COMMENT ON FUNCTION sync_single_analysis_data IS
  'Immediately syncs a single analysis from tasks to defense_analyses.analysis_data.
   Use this for immediate sync after user edits (optional, for instant feedback).
   The materialized view will also pick up changes on next refresh.
   Usage: SELECT sync_single_analysis_data(''<analysis_id>'');';

GRANT EXECUTE ON FUNCTION sync_single_analysis_data TO authenticated;

-- ============================================================================
-- 4. MANUAL SYNC FOR EXISTING DATA
-- ============================================================================

-- Uncomment to sync all existing analyses (run once after migration)
/*
DO $$
DECLARE
  v_analysis RECORD;
BEGIN
  FOR v_analysis IN
    SELECT DISTINCT analysis_id
    FROM defense_analysis_tasks
    WHERE status = 'completed'
  LOOP
    PERFORM sync_defense_analysis_data(v_analysis.analysis_id);
  END LOOP;

  RAISE NOTICE 'Synced all existing analyses';
END $$;
*/
