-- Migration: Add questions/clarifications field to supplier_responses
-- Date: 2026-01-01
-- Purpose: Capture questions or clarifications raised by suppliers in their responses

-- Add questions column
ALTER TABLE supplier_responses
ADD COLUMN IF NOT EXISTS questions TEXT NULL;

COMMENT ON COLUMN supplier_responses.questions IS
'Questions or clarifications raised by the supplier in their response. Used to capture points requiring further information or clarification from the client.';

-- Create full-text search index for questions (optional but recommended for search)
CREATE INDEX IF NOT EXISTS supplier_responses_questions_fts_idx
ON supplier_responses
USING gin(to_tsvector('french', coalesce(questions, '')));

COMMENT ON INDEX supplier_responses_questions_fts_idx IS
'Full-text search index on questions field for efficient search capabilities';
