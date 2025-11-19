-- Script d'importation simplifié des réponses RFP
-- Utilise les tables Supabase existantes pour récupérer les IDs automatiquement

-- Variables à configurer
\set rfp_id = 'VOTRE_RFP_ID';  -- Remplacer par l'UUID réel du RFP cible

-- Importation des réponses depuis le fichier JSON
-- Structure attendue : {"FOURNISSEUR": [{"requirement_id": "R - X", "notation": note, "comment": "texte"}]}

WITH supplier_responses AS (
    SELECT 
        key as supplier_name,
        jsonb_array_elements(value) as responses
    FROM jsonb_each_text('[{"ACCENTURE", "ITC", "TCS", "CAPGEMINI", "LUCEM", "ATAWAY", "PREREQUIS"}]'::jsonb)
),

parsed_data AS (
    SELECT 
        sr.supplier_name,
        (resp.value ->> 'requirement_id')::TEXT as requirement_id_external,
        CASE 
            WHEN resp.value ->> 'notation' IS NULL THEN NULL
            ELSE (resp.value ->> 'notation')::NUMERIC 
        END as manual_score,
        (resp.value ->> 'comment')::TEXT as manual_comment
    FROM supplier_responses sr
    CROSS JOIN jsonb_array_elements(sr.responses) resp
)

INSERT INTO responses (
    rfp_id,
    requirement_id,
    supplier_id,
    manual_score,
    manual_comment,
    response_text,
    status,
    is_checked,
    created_at,
    updated_at
)
SELECT 
    rfp_id,
    req.id,
    sup.id,
    pd.manual_score,
    pd.manual_comment,
    NULL as response_text,  -- ou pd.manual_comment si vous voulez stocker le commentaire ici
    'pending' as status,
    FALSE as is_checked,
    NOW() as created_at,
    NOW() as updated_at
FROM parsed_data pd
JOIN requirements req ON req.requirement_id_external = pd.requirement_id_external AND req.rfp_id = rfp_id
JOIN suppliers sup ON sup.supplier_id_external = pd.supplier_name AND sup.rfp_id = rfp_id;

-- Rapport d'importation
DO $$
DECLARE
    total_imported INTEGER;
    total_suppliers INTEGER;
    total_requirements INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_imported FROM responses WHERE rfp_id = rfp_id;
    SELECT COUNT(DISTINCT supplier_id) INTO total_suppliers FROM responses WHERE rfp_id = rfp_id;
    SELECT COUNT(DISTINCT requirement_id) INTO total_requirements FROM responses WHERE rfp_id = rfp_id;
    
    RAISE NOTICE 'Importation terminée : % réponses importées pour % fournisseurs couvrant % exigences', 
        total_imported, total_suppliers, total_requirements;
END $$;

-- Pour utiliser ce script :
-- 1. Remplacer 'VOTRE_RFP_ID' par l'UUID réel de votre RFP
-- 2. Charger le fichier JSON dans une table temporaire ou utiliser une CTE
-- 3. Adapter le chemin du fichier si nécessaire

-- Exemple avec chargement depuis fichier (alternative) :
-- COPY temp_responses FROM '/chemin/vers/RFP_Rating_Grid_Extract.json' WITH (FORMAT json);
-- Puis utiliser la requête ci-dessus avec la table temporaire