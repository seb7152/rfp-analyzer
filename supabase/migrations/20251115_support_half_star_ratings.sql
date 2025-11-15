-- Migration: Support for half-star ratings (0.5 increments)
-- Date: 2025-11-15
-- Description: Convert score columns from INTEGER to DECIMAL(3,1) to support half-star ratings

-- Modify ai_score and manual_score columns to support decimal values (0.5 increments)
ALTER TABLE responses 
ALTER COLUMN ai_score TYPE DECIMAL(3,1) USING 
  CASE 
    WHEN ai_score IS NULL THEN NULL
    ELSE ai_score::DECIMAL(3,1)
  END,
ALTER COLUMN manual_score TYPE DECIMAL(3,1) USING 
  CASE 
    WHEN manual_score IS NULL THEN NULL
    ELSE manual_score::DECIMAL(3,1)
  END;

-- Update the check constraints to ensure values are between 0 and 5 with 0.5 precision
ALTER TABLE responses 
DROP CONSTRAINT IF EXISTS responses_ai_score_check,
DROP CONSTRAINT IF EXISTS responses_manual_score_check,
ADD CONSTRAINT responses_ai_score_check CHECK (ai_score IS NULL OR (ai_score >= 0 AND ai_score <= 5 AND ai_score * 2 = ROUND(ai_score * 2))),
ADD CONSTRAINT responses_manual_score_check CHECK (manual_score IS NULL OR (manual_score >= 0 AND manual_score <= 5 AND manual_score * 2 = ROUND(manual_score * 2)));

-- Add comment to document the change
COMMENT ON COLUMN responses.ai_score IS 'AI-generated score from 0-5 with 0.5 precision (e.g., 2.5, 3.0, 4.5)';
COMMENT ON COLUMN responses.manual_score IS 'Manual evaluator score from 0-5 with 0.5 precision (e.g., 2.5, 3.0, 4.5)';