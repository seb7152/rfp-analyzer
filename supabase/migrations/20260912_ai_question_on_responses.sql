-- Les notes d'agent acceptées vivent sur la réponse, plus dans un fil de
-- discussion : la note et le commentaire IA comme avant, et les questions
-- de l'agent dans un champ propre, distinct de la question que l'évaluateur
-- assume envers le fournisseur. Les risques rejoignent le commentaire IA.

ALTER TABLE public.responses ADD COLUMN IF NOT EXISTS ai_question TEXT;
COMMENT ON COLUMN public.responses.ai_question IS 'Questions au fournisseur proposées par l''IA (agent accepté) ; l''évaluateur les reprend ou non dans sa propre question.';

DROP FUNCTION IF EXISTS public.accept_agent_finding(UUID, TEXT);

CREATE OR REPLACE FUNCTION public.accept_agent_finding(p_finding_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_finding public.agent_findings%ROWTYPE;
    v_run public.agent_runs%ROWTYPE;
    v_requirement_id UUID;
    v_peer BOOLEAN;
    v_now TIMESTAMPTZ := NOW();
    v_comment TEXT;
    v_question TEXT;
    v_risks TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Non authentifié.' USING ERRCODE = 'insufficient_privilege';
    END IF;

    SELECT * INTO v_finding FROM public.agent_findings WHERE id = p_finding_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Proposition introuvable.' USING ERRCODE = 'no_data_found';
    END IF;
    IF v_finding.status <> 'proposed' THEN
        RAISE EXCEPTION 'Cette proposition a déjà été décidée.' USING ERRCODE = 'check_violation';
    END IF;
    SELECT * INTO v_run FROM public.agent_runs WHERE id = v_finding.run_id;

    -- Commentaire IA : la justification, puis les risques s'il y en a.
    SELECT string_agg('- ' || r, E'\n') INTO v_risks
    FROM jsonb_array_elements_text(COALESCE(v_finding.risks, '[]'::jsonb)) AS r;
    v_comment := COALESCE(NULLIF(v_finding.justification, ''), '');
    IF v_risks IS NOT NULL THEN
        v_comment := v_comment || CASE WHEN v_comment = '' THEN '' ELSE E'\n\n' END || 'Risques :' || E'\n' || v_risks;
    END IF;

    -- Question IA : une question par ligne, vide s'il n'y en a pas.
    SELECT string_agg(q, E'\n') INTO v_question
    FROM jsonb_array_elements_text(COALESCE(v_finding.questions, '[]'::jsonb)) AS q;

    UPDATE public.responses
    SET ai_score = v_finding.proposed_score,
        ai_comment = NULLIF(v_comment, ''),
        ai_question = v_question,
        last_modified_by = auth.uid(),
        updated_at = v_now
    WHERE id = v_finding.response_id
    RETURNING requirement_id INTO v_requirement_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Vous devez être évaluateur ou pilote de la consultation pour accepter une proposition.' USING ERRCODE = 'insufficient_privilege';
    END IF;

    SELECT peer_review_enabled INTO v_peer FROM public.rfps WHERE id = v_run.rfp_id;
    IF COALESCE(v_peer, false) THEN
        INSERT INTO public.requirement_review_status
            (requirement_id, version_id, status, submitted_by, submitted_at, reviewed_by, reviewed_at, rejection_comment, updated_at)
        VALUES (v_requirement_id, v_run.version_id, 'submitted', auth.uid(), v_now, NULL, NULL, NULL, v_now)
        ON CONFLICT (requirement_id, version_id) DO UPDATE
            SET status = 'submitted',
                submitted_by = auth.uid(),
                submitted_at = v_now,
                reviewed_by = NULL,
                reviewed_at = NULL,
                rejection_comment = NULL,
                updated_at = v_now;
    END IF;

    UPDATE public.agent_findings
    SET status = 'accepted', decided_by = auth.uid(), decided_at = v_now
    WHERE id = v_finding.id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Vous devez être évaluateur ou pilote de la consultation pour accepter une proposition.' USING ERRCODE = 'insufficient_privilege';
    END IF;

    RETURN v_finding.response_id;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_agent_finding(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_agent_finding(UUID) TO authenticated;
