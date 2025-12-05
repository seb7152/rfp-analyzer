ALTER TABLE rfps ADD COLUMN IF NOT EXISTS analysis_settings JSONB DEFAULT '{}'::jsonb;
