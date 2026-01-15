-- Migration: Create financial_templates table
-- Description: Template financier avec structure hiérarchique pour la comparaison financière des offres
-- US: US-1-001

-- Create financial_templates table
CREATE TABLE IF NOT EXISTS financial_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rfp_id UUID NOT NULL REFERENCES rfps(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    total_period_years INTEGER DEFAULT 3 CHECK (total_period_years IN (1, 3, 5)),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_rfp_template UNIQUE(rfp_id)
);

-- Add comment on table
COMMENT ON TABLE financial_templates IS 'Templates financiers pour la grille d''analyse des coûts RFP';

-- Add comments on columns
COMMENT ON COLUMN financial_templates.rfp_id IS 'Référence au RFP (un seul template par RFP)';
COMMENT ON COLUMN financial_templates.name IS 'Nom du template financier';
COMMENT ON COLUMN financial_templates.total_period_years IS 'Période de calcul TCO en années (1, 3 ou 5)';

-- Create index for performance
CREATE INDEX idx_financial_templates_rfp ON financial_templates(rfp_id);

-- Enable Row Level Security
ALTER TABLE financial_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view financial_templates of their RFPs
CREATE POLICY "Users can view financial_templates of their RFPs"
ON financial_templates FOR SELECT
USING (
    rfp_id IN (
        SELECT id FROM rfps
        WHERE organization_id IN (
            SELECT organization_id FROM user_organizations
            WHERE user_id = auth.uid()
        )
    )
);

-- RLS Policy: Users can create financial_templates for their RFPs
CREATE POLICY "Users can create financial_templates for their RFPs"
ON financial_templates FOR INSERT
WITH CHECK (
    rfp_id IN (
        SELECT id FROM rfps
        WHERE organization_id IN (
            SELECT organization_id FROM user_organizations
            WHERE user_id = auth.uid()
        )
    )
);

-- RLS Policy: Users can update financial_templates of their RFPs
CREATE POLICY "Users can update financial_templates of their RFPs"
ON financial_templates FOR UPDATE
USING (
    rfp_id IN (
        SELECT id FROM rfps
        WHERE organization_id IN (
            SELECT organization_id FROM user_organizations
            WHERE user_id = auth.uid()
        )
    )
)
WITH CHECK (
    rfp_id IN (
        SELECT id FROM rfps
        WHERE organization_id IN (
            SELECT organization_id FROM user_organizations
            WHERE user_id = auth.uid()
        )
    )
);

-- RLS Policy: Users can delete financial_templates of their RFPs
CREATE POLICY "Users can delete financial_templates of their RFPs"
ON financial_templates FOR DELETE
USING (
    rfp_id IN (
        SELECT id FROM rfps
        WHERE organization_id IN (
            SELECT organization_id FROM user_organizations
            WHERE user_id = auth.uid()
        )
    )
);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_financial_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_financial_templates_updated_at
    BEFORE UPDATE ON financial_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_financial_templates_updated_at();
