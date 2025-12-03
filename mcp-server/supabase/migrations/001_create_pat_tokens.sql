-- Migration pour les Personal Access Tokens
-- Date: 2024-11-29

-- Table pour les Personal Access Tokens
CREATE TABLE IF NOT EXISTS personal_access_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  expires_at TIMESTAMPTZ NOT NULL,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  CONSTRAINT valid_expires_at CHECK (expires_at > created_at)
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_pat_user_org ON personal_access_tokens(user_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_pat_token_hash ON personal_access_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_pat_expires_at ON personal_access_tokens(expires_at);

-- Activer RLS
ALTER TABLE personal_access_tokens ENABLE ROW LEVEL SECURITY;

-- Politiques RLS
CREATE POLICY "Users can view own tokens" ON personal_access_tokens
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tokens" ON personal_access_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tokens" ON personal_access_tokens
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tokens" ON personal_access_tokens
  FOR DELETE USING (auth.uid() = user_id);

-- Table d'audit pour les logs MCP
CREATE TABLE IF NOT EXISTS mcp_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  token_hash VARCHAR(255),
  action VARCHAR(100) NOT NULL,
  params JSONB,
  result VARCHAR(20) NOT NULL DEFAULT 'success',
  execution_time_ms INTEGER,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour les logs
CREATE INDEX IF NOT EXISTS idx_mcp_logs_user ON mcp_audit_logs(user_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_mcp_logs_org ON mcp_audit_logs(organization_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_mcp_logs_token ON mcp_audit_logs(token_hash, timestamp);

-- Activer RLS pour les logs
ALTER TABLE mcp_audit_logs ENABLE ROW LEVEL SECURITY;

-- Politiques pour les logs (lecture seule par l'utilisateur)
CREATE POLICY "Users can view own audit logs" ON mcp_audit_logs
  FOR SELECT USING (auth.uid() = user_id);