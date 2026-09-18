-- Écriture atomique d'un fournisseur dans le point de synthèse : les travaux
-- des différents fournisseurs tournent en parallèle et ne doivent pas
-- s'écraser l'un l'autre dans la colonne jsonb.

CREATE OR REPLACE FUNCTION public.set_synthese_supplier(p_synthese_id UUID, p_supplier_id UUID, p_value JSONB)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    UPDATE public.soutenance_syntheses
    SET data = jsonb_set(
        CASE WHEN data ? 'suppliers' THEN data ELSE data || '{"suppliers": {}}'::jsonb END,
        ARRAY['suppliers', p_supplier_id::text],
        p_value,
        true
    )
    WHERE id = p_synthese_id;
$$;
