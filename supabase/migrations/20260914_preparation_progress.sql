-- Avancement d'une analyse : les compteurs par fournisseur en une requête
-- agrégée, pour le rafraîchissement du hub pendant une analyse (au lieu de
-- relire toutes les réponses toutes les cinq secondes).

CREATE OR REPLACE FUNCTION public.preparation_progress(p_rfp_id UUID, p_version_id UUID)
RETURNS TABLE (supplier_id UUID, total BIGINT, answered BIGINT, scored BIGINT)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
    SELECT r.supplier_id,
           count(*)                                   AS total,
           count(*) FILTER (WHERE r.is_checked)       AS answered,
           count(*) FILTER (WHERE r.ai_score IS NOT NULL) AS scored
    FROM public.responses r
    WHERE r.rfp_id = p_rfp_id
      AND (p_version_id IS NULL OR r.version_id = p_version_id)
    GROUP BY r.supplier_id;
$$;
