-- La politique SELECT de requirement_review_status s'appuyait sur
-- auth.jwt()->>'organization_id', jamais renseigné : aucune ligne n'était
-- visible sous RLS, et l'upsert de accept_agent_finding (ON CONFLICT DO
-- UPDATE, qui exige de voir la ligne existante) échouait dès qu'un statut
-- de revue existait pour l'exigence. Les membres de l'organisation de la
-- consultation voient désormais ses statuts de revue.

DROP POLICY IF EXISTS "Members can view review statuses" ON public.requirement_review_status;

CREATE POLICY "Members can view review statuses"
    ON public.requirement_review_status FOR SELECT
    USING (
        requirement_id IN (
            SELECT req.id
            FROM public.requirements req
            JOIN public.rfps r ON r.id = req.rfp_id
            JOIN public.user_organizations uo ON uo.organization_id = r.organization_id
            WHERE uo.user_id = auth.uid()
        )
    );

-- La décision elle-même ne peut plus passer inaperçue : si la politique de
-- mise à jour des propositions refuse l'utilisateur, la fonction échoue au
-- lieu de rendre un identifiant de fil avec une proposition toujours proposée.
CREATE OR REPLACE FUNCTION public.accept_agent_finding(p_finding_id UUID, p_comment TEXT)
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
    v_thread_id UUID;
    v_now TIMESTAMPTZ := NOW();
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

    UPDATE public.responses
    SET ai_score = v_finding.proposed_score,
        ai_comment = v_finding.justification,
        last_modified_by = auth.uid(),
        updated_at = v_now
    WHERE id = v_finding.response_id
    RETURNING requirement_id INTO v_requirement_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Vous devez être évaluateur ou pilote de la consultation pour accepter une proposition.' USING ERRCODE = 'insufficient_privilege';
    END IF;

    INSERT INTO public.response_threads (response_id, title, priority, status, created_by)
    VALUES (v_finding.response_id, 'Proposition d''agent acceptée', 'normal', 'open', auth.uid())
    RETURNING id INTO v_thread_id;

    INSERT INTO public.thread_comments (thread_id, content, author_id, agent_finding_id)
    VALUES (v_thread_id, p_comment, auth.uid(), v_finding.id);

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

    RETURN v_thread_id;
END;
$$;
