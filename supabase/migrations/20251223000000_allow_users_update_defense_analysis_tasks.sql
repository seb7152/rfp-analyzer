-- Migration: Allow users to update defense analysis tasks
-- Purpose: Enable inline editing of forces and faiblesses in the presentation tab

-- Drop existing service-only policy (will be replaced)
DROP POLICY IF EXISTS "Service can manage defense_analysis_tasks" ON defense_analysis_tasks;

-- Add UPDATE policy for users who have access to the analysis
CREATE POLICY "Users can update defense_analysis_tasks"
ON defense_analysis_tasks
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM defense_analyses da
    JOIN rfps r ON r.id = da.rfp_id
    JOIN user_organizations uo ON uo.organization_id = r.organization_id
    WHERE da.id = defense_analysis_tasks.analysis_id
    AND uo.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM defense_analyses da
    JOIN rfps r ON r.id = da.rfp_id
    JOIN user_organizations uo ON uo.organization_id = r.organization_id
    WHERE da.id = defense_analysis_tasks.analysis_id
    AND uo.user_id = auth.uid()
  )
);

-- Service role can still manage tasks
CREATE POLICY "Service can manage defense_analysis_tasks"
ON defense_analysis_tasks
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

COMMENT ON POLICY "Users can update defense_analysis_tasks" ON defense_analysis_tasks IS 'Allows users to update task results (forces/faiblesses) for analyses they have access to';
