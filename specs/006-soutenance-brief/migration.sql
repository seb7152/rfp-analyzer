-- Migration: create_soutenance_briefs
-- À appliquer via Supabase CLI ou dashboard

CREATE TABLE soutenance_briefs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rfp_id UUID REFERENCES rfps(id) ON DELETE CASCADE NOT NULL,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE NOT NULL,
  version_id UUID REFERENCES versions(id) ON DELETE SET NULL,
  correlation_id TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  target_statuses TEXT[] DEFAULT ARRAY['partial', 'fail', 'roadmap'],
  report_markdown TEXT,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE soutenance_briefs ENABLE ROW LEVEL SECURITY;

-- RLS: membres de l'org peuvent accéder aux briefs de leur RFP
CREATE POLICY "org_members_can_access_soutenance_briefs"
  ON soutenance_briefs
  FOR ALL
  USING (
    rfp_id IN (
      SELECT id FROM rfps
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- Index pour les requêtes fréquentes
CREATE INDEX soutenance_briefs_rfp_supplier_idx
  ON soutenance_briefs (rfp_id, supplier_id, created_at DESC);

CREATE INDEX soutenance_briefs_correlation_id_idx
  ON soutenance_briefs (correlation_id);
