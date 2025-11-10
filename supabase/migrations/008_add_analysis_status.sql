-- Migration: Add analysis_status column to rfps table
-- Purpose: Track AI analysis job status with metadata
-- T132: Add analysis_status JSONB column to rfps table

ALTER TABLE rfps ADD COLUMN analysis_status JSONB DEFAULT NULL;

-- Create index for efficient querying
CREATE INDEX idx_rfps_analysis_status ON rfps USING GIN (analysis_status);

-- Add constraint to ensure valid status values
ALTER TABLE rfps ADD CONSTRAINT check_analysis_status_value CHECK (
  analysis_status IS NULL OR
  (analysis_status->>'status' IN ('processing', 'completed', 'failed'))
);

-- Comment for documentation
COMMENT ON COLUMN rfps.analysis_status IS 'Tracks AI analysis job status: {jobId, status, startedAt, completedAt, totalResponses, processedResponses}';
