-- Migration: Système d'annotations PDF
-- Description: Crée les tables pour gérer les annotations, surlignages et bookmarks dans les PDFs

-- Table principale des annotations
CREATE TABLE pdf_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES rfp_documents(id) ON DELETE CASCADE,
  requirement_id UUID REFERENCES requirements(id) ON DELETE SET NULL, -- Lien optionnel vers un requirement
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL, -- Pour filtrer par fournisseur

  -- Type d'annotation
  annotation_type VARCHAR(50) NOT NULL CHECK (annotation_type IN ('highlight', 'bookmark', 'note', 'area')),

  -- Position dans le PDF
  page_number INTEGER NOT NULL,
  position JSONB NOT NULL, -- Structure détaillée ci-dessous

  -- Contenu
  highlighted_text TEXT, -- Texte surligné (si applicable)
  note_content TEXT, -- Commentaire associé

  -- Apparence
  color VARCHAR(20) DEFAULT '#FFEB3B', -- Couleur du surlignage

  -- Métadonnées
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE, -- Soft delete

  -- Tags optionnels pour catégoriser
  tags TEXT[] DEFAULT ARRAY[]::TEXT[]
);

-- Structure du champ position (JSONB):
-- {
--   "type": "highlight" | "bookmark" | "area",
--   "pageHeight": 842,
--   "pageWidth": 595,
--   "rects": [
--     {"x": 100, "y": 200, "width": 400, "height": 20},
--     {"x": 100, "y": 220, "width": 300, "height": 20}
--   ],
--   "textRange": {
--     "startOffset": 123,
--     "endOffset": 456
--   }
-- }

-- Index pour performances
CREATE INDEX idx_pdf_annotations_document ON pdf_annotations(document_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_pdf_annotations_organization ON pdf_annotations(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_pdf_annotations_requirement ON pdf_annotations(requirement_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_pdf_annotations_page ON pdf_annotations(document_id, page_number) WHERE deleted_at IS NULL;
CREATE INDEX idx_pdf_annotations_created_by ON pdf_annotations(created_by);

-- Index GIN pour recherche dans le texte surligné et notes
CREATE INDEX idx_pdf_annotations_text_search ON pdf_annotations
  USING GIN (to_tsvector('french', COALESCE(highlighted_text, '') || ' ' || COALESCE(note_content, '')));

-- Trigger pour updated_at
CREATE TRIGGER update_pdf_annotations_updated_at
  BEFORE UPDATE ON pdf_annotations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE pdf_annotations ENABLE ROW LEVEL SECURITY;

-- Policy: Les utilisateurs peuvent voir les annotations de leur organisation
CREATE POLICY "Users can view annotations in their organization"
  ON pdf_annotations
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Les utilisateurs peuvent créer des annotations dans leur organisation
CREATE POLICY "Users can create annotations in their organization"
  ON pdf_annotations
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Les utilisateurs peuvent modifier leurs propres annotations
CREATE POLICY "Users can update their own annotations"
  ON pdf_annotations
  FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Policy: Les utilisateurs peuvent supprimer (soft) leurs propres annotations
CREATE POLICY "Users can delete their own annotations"
  ON pdf_annotations
  FOR UPDATE
  USING (created_by = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (deleted_at IS NOT NULL);

-- Table pour lier plusieurs annotations à un même "groupe" (ex: plusieurs surlignages pour une même preuve)
CREATE TABLE annotation_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  requirement_id UUID REFERENCES requirements(id) ON DELETE CASCADE,
  name VARCHAR(255), -- Ex: "Preuve de certification ISO 27001"
  description TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table de liaison annotations <-> groupes
CREATE TABLE annotation_group_members (
  annotation_id UUID NOT NULL REFERENCES pdf_annotations(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES annotation_groups(id) ON DELETE CASCADE,
  PRIMARY KEY (annotation_id, group_id)
);

-- Index
CREATE INDEX idx_annotation_groups_requirement ON annotation_groups(requirement_id);
CREATE INDEX idx_annotation_group_members_group ON annotation_group_members(group_id);

-- RLS pour annotation_groups
ALTER TABLE annotation_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view annotation groups in their organization"
  ON annotation_groups
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create annotation groups in their organization"
  ON annotation_groups
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- RLS pour annotation_group_members
ALTER TABLE annotation_group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view annotation group members"
  ON annotation_group_members
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM annotation_groups ag
      WHERE ag.id = group_id
      AND ag.organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- Vue pour faciliter les requêtes courantes
CREATE VIEW annotation_details AS
SELECT
  a.id,
  a.organization_id,
  a.document_id,
  a.requirement_id,
  a.supplier_id,
  a.annotation_type,
  a.page_number,
  a.position,
  a.highlighted_text,
  a.note_content,
  a.color,
  a.tags,
  a.created_at,
  a.updated_at,
  d.filename as document_filename,
  d.original_filename as document_original_filename,
  r.number as requirement_number,
  r.title as requirement_title,
  s.name as supplier_name,
  u.email as created_by_email,
  (
    SELECT json_agg(json_build_object('id', ag.id, 'name', ag.name))
    FROM annotation_groups ag
    JOIN annotation_group_members agm ON ag.id = agm.group_id
    WHERE agm.annotation_id = a.id
  ) as groups
FROM pdf_annotations a
LEFT JOIN rfp_documents d ON a.document_id = d.id
LEFT JOIN requirements r ON a.requirement_id = r.id
LEFT JOIN suppliers s ON a.supplier_id = s.id
LEFT JOIN auth.users u ON a.created_by = u.id
WHERE a.deleted_at IS NULL;

-- Fonction helper pour créer une annotation avec lien automatique
CREATE OR REPLACE FUNCTION create_annotation_with_context(
  p_organization_id UUID,
  p_document_id UUID,
  p_requirement_id UUID,
  p_annotation_type VARCHAR,
  p_page_number INTEGER,
  p_position JSONB,
  p_highlighted_text TEXT DEFAULT NULL,
  p_note_content TEXT DEFAULT NULL,
  p_color VARCHAR DEFAULT '#FFEB3B'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_annotation_id UUID;
  v_supplier_id UUID;
BEGIN
  -- Récupérer le supplier_id si le document est lié à un fournisseur
  SELECT ds.supplier_id INTO v_supplier_id
  FROM document_suppliers ds
  WHERE ds.document_id = p_document_id
  LIMIT 1;

  -- Créer l'annotation
  INSERT INTO pdf_annotations (
    organization_id,
    document_id,
    requirement_id,
    supplier_id,
    annotation_type,
    page_number,
    position,
    highlighted_text,
    note_content,
    color,
    created_by
  ) VALUES (
    p_organization_id,
    p_document_id,
    p_requirement_id,
    v_supplier_id,
    p_annotation_type,
    p_page_number,
    p_position,
    p_highlighted_text,
    p_note_content,
    p_color,
    auth.uid()
  )
  RETURNING id INTO v_annotation_id;

  RETURN v_annotation_id;
END;
$$;

-- Commentaires pour documentation
COMMENT ON TABLE pdf_annotations IS 'Stocke les annotations (surlignages, bookmarks, notes) sur les documents PDF';
COMMENT ON COLUMN pdf_annotations.position IS 'Structure JSONB contenant les coordonnées et rectangles de sélection';
COMMENT ON COLUMN pdf_annotations.highlighted_text IS 'Texte extrait du PDF pour recherche et affichage';
COMMENT ON FUNCTION create_annotation_with_context IS 'Fonction helper pour créer une annotation avec auto-linking au supplier';
