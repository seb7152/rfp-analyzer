-- Migration 001: Initial Schema with Multi-Tenant Support
-- RFP Analyzer Platform - Complete database schema
-- Date: 2025-11-06

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- MULTI-TENANT TABLES
-- ============================================================================

-- Organizations table (multi-tenant isolation)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  settings JSONB DEFAULT '{}'::jsonb,
  subscription_tier VARCHAR(50) DEFAULT 'free',
  max_users INTEGER DEFAULT 10,
  max_rfps INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_subscription_tier CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
  CONSTRAINT positive_limits CHECK (max_users > 0 AND max_rfps > 0)
);

CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_subscription ON organizations(subscription_tier);

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- User-Organization links (many-to-many with roles)
CREATE TABLE user_organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'evaluator',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  invited_by UUID REFERENCES users(id),
  UNIQUE (user_id, organization_id),
  CONSTRAINT valid_role CHECK (role IN ('admin', 'evaluator', 'viewer'))
);

CREATE INDEX idx_user_orgs_user ON user_organizations(user_id);
CREATE INDEX idx_user_orgs_org ON user_organizations(organization_id);
CREATE INDEX idx_user_orgs_role ON user_organizations(role);

-- ============================================================================
-- RFP TABLES
-- ============================================================================

-- RFPs table
CREATE TABLE rfps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'in_progress',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES users(id),
  CONSTRAINT valid_status CHECK (status IN ('in_progress', 'completed', 'archived'))
);

CREATE INDEX idx_rfps_organization ON rfps(organization_id);
CREATE INDEX idx_rfps_status ON rfps(status);
CREATE INDEX idx_rfps_created_by ON rfps(created_by);

-- RFP-User assignments (granular access control)
CREATE TABLE rfp_user_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rfp_id UUID NOT NULL REFERENCES rfps(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  access_level VARCHAR(20) NOT NULL DEFAULT 'evaluator',
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by UUID REFERENCES users(id),
  UNIQUE (rfp_id, user_id),
  CONSTRAINT valid_access_level CHECK (access_level IN ('owner', 'evaluator', 'viewer'))
);

CREATE INDEX idx_rfp_assignments_rfp ON rfp_user_assignments(rfp_id);
CREATE INDEX idx_rfp_assignments_user ON rfp_user_assignments(user_id);

-- Requirements table (4-level hierarchy)
CREATE TABLE requirements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rfp_id UUID NOT NULL REFERENCES rfps(id) ON DELETE CASCADE,
  requirement_id_external VARCHAR(50) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  context TEXT,
  parent_id UUID REFERENCES requirements(id) ON DELETE CASCADE,
  level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 4),
  weight DECIMAL(5,4) NOT NULL CHECK (weight BETWEEN 0 AND 1),
  position_in_pdf JSONB,
  pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  UNIQUE (rfp_id, requirement_id_external)
);

CREATE INDEX idx_requirements_rfp ON requirements(rfp_id);
CREATE INDEX idx_requirements_parent ON requirements(parent_id);
CREATE INDEX idx_requirements_level ON requirements(level);
CREATE INDEX idx_requirements_rfp_level ON requirements(rfp_id, level);
CREATE INDEX idx_requirements_rfp_external ON requirements(rfp_id, requirement_id_external);

-- Suppliers table
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rfp_id UUID NOT NULL REFERENCES rfps(id) ON DELETE CASCADE,
  supplier_id_external VARCHAR(50) NOT NULL,
  name TEXT NOT NULL,
  contact_name VARCHAR(255),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (rfp_id, supplier_id_external)
);

CREATE INDEX idx_suppliers_rfp ON suppliers(rfp_id);

-- Responses table (evaluation data)
CREATE TABLE responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rfp_id UUID NOT NULL REFERENCES rfps(id) ON DELETE CASCADE,
  requirement_id UUID NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  response_text TEXT,
  ai_score INTEGER CHECK (ai_score BETWEEN 0 AND 5),
  ai_comment TEXT,
  manual_score INTEGER CHECK (manual_score BETWEEN 0 AND 5),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  is_checked BOOLEAN NOT NULL DEFAULT false,
  manual_comment TEXT,
  question TEXT,
  last_modified_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (requirement_id, supplier_id),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'pass', 'partial', 'fail'))
);

CREATE INDEX idx_responses_rfp_requirement ON responses(rfp_id, requirement_id);
CREATE INDEX idx_responses_rfp_supplier ON responses(rfp_id, supplier_id);
CREATE INDEX idx_responses_requirement_supplier ON responses(requirement_id, supplier_id);
CREATE INDEX idx_responses_status ON responses(status);
CREATE INDEX idx_responses_modified_by ON responses(last_modified_by);

-- Response audit table (change tracking)
CREATE TABLE response_audit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  response_id UUID NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
  field_name VARCHAR(50) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  modified_by UUID NOT NULL REFERENCES users(id),
  modified_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_response_audit_response ON response_audit(response_id);
CREATE INDEX idx_response_audit_modified_at ON response_audit(modified_at);
CREATE INDEX idx_response_audit_modified_by ON response_audit(modified_by);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rfps_updated_at BEFORE UPDATE ON rfps
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_requirements_updated_at BEFORE UPDATE ON requirements
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_responses_updated_at BEFORE UPDATE ON responses
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfps ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfp_user_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE response_audit ENABLE ROW LEVEL SECURITY;

-- Organizations: Users can only see organizations they belong to
CREATE POLICY "Users can view their organizations"
  ON organizations FOR SELECT
  USING (
    id IN (
      SELECT organization_id FROM user_organizations
      WHERE user_id = auth.uid()
    )
  );

-- Users: Can view their own profile and profiles in same org
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (id = auth.uid());

-- User-Organizations: Users can see memberships in their orgs
CREATE POLICY "Users can view org memberships"
  ON user_organizations FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations
      WHERE user_id = auth.uid()
    )
  );

-- RFPs: Users can only see RFPs from their organizations (and assigned to them)
CREATE POLICY "Users can view RFPs in their organization"
  ON rfps FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations
      WHERE user_id = auth.uid()
    )
    AND (
      -- Either assigned to the RFP
      id IN (
        SELECT rfp_id FROM rfp_user_assignments
        WHERE user_id = auth.uid()
      )
      -- Or is admin in the organization
      OR organization_id IN (
        SELECT organization_id FROM user_organizations
        WHERE user_id = auth.uid() AND role = 'admin'
      )
    )
  );

CREATE POLICY "Admins can create RFPs"
  ON rfps FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_organizations
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Owners can update RFPs"
  ON rfps FOR UPDATE
  USING (
    id IN (
      SELECT rfp_id FROM rfp_user_assignments
      WHERE user_id = auth.uid() AND access_level = 'owner'
    )
  );

-- RFP Assignments: Can view assignments for accessible RFPs
CREATE POLICY "Users can view RFP assignments"
  ON rfp_user_assignments FOR SELECT
  USING (
    rfp_id IN (
      SELECT id FROM rfps
      WHERE organization_id IN (
        SELECT organization_id FROM user_organizations
        WHERE user_id = auth.uid()
      )
    )
  );

-- Requirements: Inherit access from parent RFP
CREATE POLICY "Users can view requirements"
  ON requirements FOR SELECT
  USING (
    rfp_id IN (SELECT id FROM rfps) -- RLS on rfps filters this
  );

-- Suppliers: Inherit access from parent RFP
CREATE POLICY "Users can view suppliers"
  ON suppliers FOR SELECT
  USING (
    rfp_id IN (SELECT id FROM rfps) -- RLS on rfps filters this
  );

-- Responses: Evaluators can view and modify
CREATE POLICY "Users can view responses"
  ON responses FOR SELECT
  USING (
    rfp_id IN (SELECT id FROM rfps) -- RLS on rfps filters this
  );

CREATE POLICY "Evaluators can update responses"
  ON responses FOR UPDATE
  USING (
    rfp_id IN (
      SELECT rfp_id FROM rfp_user_assignments
      WHERE user_id = auth.uid() AND access_level IN ('owner', 'evaluator')
    )
  );

-- Response Audit: Can view audit logs for accessible responses
CREATE POLICY "Users can view response audit"
  ON response_audit FOR SELECT
  USING (
    response_id IN (SELECT id FROM responses) -- RLS on responses filters this
  );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to check if user has admin role in organization
CREATE OR REPLACE FUNCTION user_is_org_admin(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_organizations
    WHERE user_id = auth.uid()
    AND organization_id = org_id
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's organizations
CREATE OR REPLACE FUNCTION get_user_organizations()
RETURNS TABLE (
  org_id UUID,
  org_name TEXT,
  org_slug VARCHAR,
  user_role VARCHAR,
  joined_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id,
    o.name,
    o.slug,
    uo.role,
    uo.joined_at
  FROM organizations o
  INNER JOIN user_organizations uo ON o.id = uo.organization_id
  WHERE uo.user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's assigned RFPs
CREATE OR REPLACE FUNCTION get_user_rfps(org_id UUID)
RETURNS TABLE (
  rfp_id UUID,
  rfp_title TEXT,
  rfp_status VARCHAR,
  access_level VARCHAR,
  assigned_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.title,
    r.status,
    rua.access_level,
    rua.assigned_at
  FROM rfps r
  INNER JOIN rfp_user_assignments rua ON r.id = rua.rfp_id
  WHERE rua.user_id = auth.uid()
  AND r.organization_id = org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
