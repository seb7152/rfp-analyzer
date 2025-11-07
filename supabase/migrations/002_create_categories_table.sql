-- Migration 002: Create Categories Table
-- Adds hierarchical categories (max 4 levels) for RFPs
-- Date: 2025-11-07

-- ============================================================================
-- CATEGORIES TABLE
-- ============================================================================

-- Categories table (4-level hierarchy)
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rfp_id UUID NOT NULL REFERENCES rfps(id) ON DELETE CASCADE,
  code VARCHAR(100) NOT NULL,
  title TEXT NOT NULL,
  short_name VARCHAR(50) NOT NULL,
  parent_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 4),
  position_in_pdf JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  UNIQUE (rfp_id, code)
);

CREATE INDEX idx_categories_rfp ON categories(rfp_id);
CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_level ON categories(level);
CREATE INDEX idx_categories_rfp_level ON categories(rfp_id, level);
CREATE INDEX idx_categories_rfp_code ON categories(rfp_id, code);

-- ============================================================================
-- UPDATE REQUIREMENTS TABLE
-- ============================================================================

-- Add category_id foreign key to requirements table
ALTER TABLE requirements
ADD COLUMN category_id UUID REFERENCES categories(id) ON DELETE SET NULL;

CREATE INDEX idx_requirements_category ON requirements(category_id);

