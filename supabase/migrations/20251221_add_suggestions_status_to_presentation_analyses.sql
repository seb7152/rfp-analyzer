-- Add suggestions_status to presentation_analyses to track which suggestions have been inserted
-- Format: {"requirementId": "inserted" | "pending" | "rejected"}

ALTER TABLE presentation_analyses
ADD COLUMN suggestions_status JSONB DEFAULT '{}'::jsonb;

-- Create index for better query performance
CREATE INDEX idx_presentation_analyses_suggestions_status
ON presentation_analyses USING gin(suggestions_status);

-- Add comment for documentation
COMMENT ON COLUMN presentation_analyses.suggestions_status IS
'Tracks the status of each suggestion. Format: {requirementId: "inserted"|"pending"|"rejected"}';
