-- Migration: Create personal_access_tokens table
-- Allows users to generate API tokens for MCP authentication

CREATE TABLE public.personal_access_tokens (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name         text NOT NULL,
  token_hash   text NOT NULL UNIQUE,    -- SHA-256(raw_token) in hex
  token_prefix text NOT NULL,           -- First chars for display (e.g. "rfpa_Ab3x")
  last_used_at timestamptz,
  expires_at   timestamptz,             -- NULL = never expires
  revoked_at   timestamptz,             -- NULL = active token
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.personal_access_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only see and manage their own tokens
CREATE POLICY "Users manage own tokens"
  ON public.personal_access_tokens
  FOR ALL
  USING (auth.uid() = user_id);

-- Index for fast token lookup during MCP auth
CREATE INDEX personal_access_tokens_token_hash_idx
  ON public.personal_access_tokens (token_hash)
  WHERE revoked_at IS NULL;

-- Index for listing a user's tokens
CREATE INDEX personal_access_tokens_user_id_idx
  ON public.personal_access_tokens (user_id);
