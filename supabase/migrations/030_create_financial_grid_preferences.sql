-- Migration 030: Create Financial Grid Preferences
-- US-3 / INF-001: Persist user preferences for financial grid (UI mode, selected versions, TCO period)

CREATE TABLE IF NOT EXISTS financial_grid_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rfp_id UUID NOT NULL REFERENCES rfps(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ui_mode VARCHAR(20) NOT NULL DEFAULT 'comparison',
  selected_supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  displayed_versions JSONB DEFAULT '{}'::jsonb, -- Map { supplier_id: version_id }
  tco_period_years INTEGER NOT NULL DEFAULT 3,
  expanded_lines UUID[] DEFAULT '{}',
  show_comments BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT financial_grid_preferences_rfp_user_key UNIQUE (rfp_id, user_id),
  CONSTRAINT valid_ui_mode CHECK (ui_mode IN ('comparison', 'supplier')),
  CONSTRAINT valid_tco_period CHECK (tco_period_years IN (1, 3, 5))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_financial_grid_prefs_rfp ON financial_grid_preferences(rfp_id);
CREATE INDEX IF NOT EXISTS idx_financial_grid_prefs_user ON financial_grid_preferences(user_id);

-- Trigger for updated_at
CREATE TRIGGER update_financial_grid_preferences_updated_at
BEFORE UPDATE ON financial_grid_preferences
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE financial_grid_preferences ENABLE ROW LEVEL SECURITY;

-- Select: Users can view their own preferences
CREATE POLICY "Users can view their own preferences"
  ON financial_grid_preferences FOR SELECT
  USING (user_id = auth.uid());

-- Insert: Users can insert their own preferences (rfp check via FK/logic ensures validity, but we can double check org access if strictness needed)
CREATE POLICY "Users can insert their own preferences"
  ON financial_grid_preferences FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM rfps r
      WHERE r.id = financial_grid_preferences.rfp_id
      AND r.organization_id IN (
        SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
      )
    )
  );

-- Update: Users can update their own preferences
CREATE POLICY "Users can update their own preferences"
  ON financial_grid_preferences FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
