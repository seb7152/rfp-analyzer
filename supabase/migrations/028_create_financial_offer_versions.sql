-- Create financial_offer_versions table
CREATE TABLE IF NOT EXISTS financial_offer_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    version_name VARCHAR,
    version_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_financial_offer_versions_supplier_id ON financial_offer_versions(supplier_id);

-- Create financial_offer_values table
CREATE TABLE IF NOT EXISTS financial_offer_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id UUID NOT NULL REFERENCES financial_offer_versions(id) ON DELETE CASCADE,
    template_line_id UUID NOT NULL REFERENCES financial_template_lines(id) ON DELETE CASCADE,
    setup_cost DECIMAL(15, 2),
    recurrent_cost DECIMAL(15, 2),
    quantity INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(version_id, template_line_id)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_financial_offer_values_version_id ON financial_offer_values(version_id);

-- Add triggers for updated_at
CREATE TRIGGER update_financial_offer_versions_modtime
    BEFORE UPDATE ON financial_offer_versions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_financial_offer_values_modtime
    BEFORE UPDATE ON financial_offer_values
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE financial_offer_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_offer_values ENABLE ROW LEVEL SECURITY;

-- RLS Policies for financial_offer_versions
-- Users can see/edit versions for suppliers linked to RFPs in their organization

CREATE POLICY "Users can view offer versions of their RFPs"
    ON financial_offer_versions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM suppliers s
            JOIN rfps r ON s.rfp_id = r.id
            WHERE s.id = financial_offer_versions.supplier_id
            AND r.organization_id IN (
                SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can insert offer versions for their RFPs"
    ON financial_offer_versions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM suppliers s
            JOIN rfps r ON s.rfp_id = r.id
            WHERE s.id = supplier_id
            AND r.organization_id IN (
                SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can update offer versions of their RFPs"
    ON financial_offer_versions FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM suppliers s
            JOIN rfps r ON s.rfp_id = r.id
            WHERE s.id = financial_offer_versions.supplier_id
            AND r.organization_id IN (
                SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
            )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM suppliers s
            JOIN rfps r ON s.rfp_id = r.id
            WHERE s.id = supplier_id
            AND r.organization_id IN (
                SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can delete offer versions of their RFPs"
    ON financial_offer_versions FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM suppliers s
            JOIN rfps r ON s.rfp_id = r.id
            WHERE s.id = financial_offer_versions.supplier_id
            AND r.organization_id IN (
                SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
            )
        )
    );

-- RLS Policies for financial_offer_values
-- Inherits access from version -> supplier -> rfp

CREATE POLICY "Users can view offer values of their RFPs"
    ON financial_offer_values FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM financial_offer_versions v
            JOIN suppliers s ON v.supplier_id = s.id
            JOIN rfps r ON s.rfp_id = r.id
            WHERE v.id = financial_offer_values.version_id
            AND r.organization_id IN (
                SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can insert offer values for their RFPs"
    ON financial_offer_values FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM financial_offer_versions v
            JOIN suppliers s ON v.supplier_id = s.id
            JOIN rfps r ON s.rfp_id = r.id
            WHERE v.id = version_id
            AND r.organization_id IN (
                SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can update offer values of their RFPs"
    ON financial_offer_values FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM financial_offer_versions v
            JOIN suppliers s ON v.supplier_id = s.id
            JOIN rfps r ON s.rfp_id = r.id
            WHERE v.id = financial_offer_values.version_id
            AND r.organization_id IN (
                SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
            )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM financial_offer_versions v
            JOIN suppliers s ON v.supplier_id = s.id
            JOIN rfps r ON s.rfp_id = r.id
            WHERE v.id = version_id
            AND r.organization_id IN (
                SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can delete offer values of their RFPs"
    ON financial_offer_values FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM financial_offer_versions v
            JOIN suppliers s ON v.supplier_id = s.id
            JOIN rfps r ON s.rfp_id = r.id
            WHERE v.id = financial_offer_values.version_id
            AND r.organization_id IN (
                SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
            )
        )
    );
