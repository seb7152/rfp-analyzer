-- Migration: Create financial_template_lines table
-- Description: Lignes hiérarchiques du template financier avec support parent-child
-- US: US-1-002

-- Create financial_template_lines table
CREATE TABLE IF NOT EXISTS financial_template_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES financial_templates(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES financial_template_lines(id) ON DELETE CASCADE,
    line_code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    line_type VARCHAR(20) NOT NULL CHECK (line_type IN ('setup', 'recurrent')),
    recurrence_type VARCHAR(20) CHECK (
        (line_type != 'recurrent' OR recurrence_type IS NOT NULL) AND
        (recurrence_type IS NULL OR recurrence_type IN ('monthly', 'yearly'))
    ),
    custom_formula TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_template_line_code UNIQUE(template_id, line_code)
);

-- Add comments on table and columns
COMMENT ON TABLE financial_template_lines IS 'Lignes hiérarchiques du template financier (catégories et lignes de coûts)';
COMMENT ON COLUMN financial_template_lines.template_id IS 'Référence au template financier';
COMMENT ON COLUMN financial_template_lines.parent_id IS 'Ligne parente pour la structure hiérarchique (NULL = racine)';
COMMENT ON COLUMN financial_template_lines.line_code IS 'Code unique de la ligne (ex: INF-01, INF-01-01)';
COMMENT ON COLUMN financial_template_lines.name IS 'Nom de la ligne ou catégorie';
COMMENT ON COLUMN financial_template_lines.line_type IS 'Type de coût: setup (ponctuel) ou recurrent (périodique)';
COMMENT ON COLUMN financial_template_lines.recurrence_type IS 'Fréquence si recurrent: monthly ou yearly';
COMMENT ON COLUMN financial_template_lines.custom_formula IS 'Formule personnalisée pour le calcul (optionnel)';
COMMENT ON COLUMN financial_template_lines.sort_order IS 'Ordre d''affichage des lignes';
COMMENT ON COLUMN financial_template_lines.is_active IS 'Ligne active (soft delete)';

-- Create indexes for performance
CREATE INDEX idx_financial_template_lines_template ON financial_template_lines(template_id, sort_order);
CREATE INDEX idx_financial_template_lines_parent ON financial_template_lines(parent_id);
CREATE INDEX idx_financial_template_lines_active ON financial_template_lines(template_id, is_active);

-- Enable Row Level Security
ALTER TABLE financial_template_lines ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view lines of their templates
CREATE POLICY "Users can view lines of their templates"
ON financial_template_lines FOR SELECT
USING (
    template_id IN (
        SELECT id FROM financial_templates
        WHERE rfp_id IN (
            SELECT id FROM rfps
            WHERE organization_id IN (
                SELECT organization_id FROM user_organizations
                WHERE user_id = auth.uid()
            )
        )
    )
);

-- RLS Policy: Users can create lines for their templates
CREATE POLICY "Users can create lines for their templates"
ON financial_template_lines FOR INSERT
WITH CHECK (
    template_id IN (
        SELECT id FROM financial_templates
        WHERE rfp_id IN (
            SELECT id FROM rfps
            WHERE organization_id IN (
                SELECT organization_id FROM user_organizations
                WHERE user_id = auth.uid()
            )
        )
    )
);

-- RLS Policy: Users can update lines of their templates
CREATE POLICY "Users can update lines of their templates"
ON financial_template_lines FOR UPDATE
USING (
    template_id IN (
        SELECT id FROM financial_templates
        WHERE rfp_id IN (
            SELECT id FROM rfps
            WHERE organization_id IN (
                SELECT organization_id FROM user_organizations
                WHERE user_id = auth.uid()
            )
        )
    )
)
WITH CHECK (
    template_id IN (
        SELECT id FROM financial_templates
        WHERE rfp_id IN (
            SELECT id FROM rfps
            WHERE organization_id IN (
                SELECT organization_id FROM user_organizations
                WHERE user_id = auth.uid()
            )
        )
    )
);

-- RLS Policy: Users can delete lines of their templates
CREATE POLICY "Users can delete lines of their templates"
ON financial_template_lines FOR DELETE
USING (
    template_id IN (
        SELECT id FROM financial_templates
        WHERE rfp_id IN (
            SELECT id FROM rfps
            WHERE organization_id IN (
                SELECT organization_id FROM user_organizations
                WHERE user_id = auth.uid()
            )
        )
    )
);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_financial_template_lines_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_financial_template_lines_updated_at
    BEFORE UPDATE ON financial_template_lines
    FOR EACH ROW
    EXECUTE FUNCTION update_financial_template_lines_updated_at();

-- Function to prevent circular references in parent_id hierarchy
CREATE OR REPLACE FUNCTION prevent_circular_parent_reference()
RETURNS TRIGGER AS $$
BEGIN
    -- If parent_id is NULL, it's a root line, allow it
    IF NEW.parent_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Check if parent_id would create a circular reference
    -- by walking up the hierarchy to see if we reach NEW.id
    WITH RECURSIVE parent_chain AS (
        -- Start with the new parent
        SELECT id, parent_id, 1 as depth
        FROM financial_template_lines
        WHERE id = NEW.parent_id

        UNION ALL

        -- Recursively get parent's parent
        SELECT ftl.id, ftl.parent_id, pc.depth + 1
        FROM financial_template_lines ftl
        INNER JOIN parent_chain pc ON ftl.id = pc.parent_id
        WHERE pc.depth < 100 -- Safety limit to prevent infinite loops
    )
    SELECT id INTO STRICT NEW.parent_id
    FROM parent_chain
    WHERE id = NEW.id;

    -- If we found NEW.id in the parent chain, it's a circular reference
    RAISE EXCEPTION 'Circular reference detected: line % cannot be its own ancestor', NEW.id;

    RETURN NEW;
EXCEPTION
    WHEN NO_DATA_FOUND THEN
        -- No circular reference found, allow the update
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent circular references
CREATE TRIGGER trigger_prevent_circular_parent_reference
    BEFORE INSERT OR UPDATE OF parent_id ON financial_template_lines
    FOR EACH ROW
    WHEN (NEW.parent_id IS NOT NULL)
    EXECUTE FUNCTION prevent_circular_parent_reference();
