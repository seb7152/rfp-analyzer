-- Harness des agents, lot 1 et 2 : outils sélectionnés par agent (versionnés
-- comme le prompt), conversation en plusieurs tours avec point de reprise,
-- journal des appels d'outils, et preuves (calculs, sources web) portées par
-- les propositions à côté des extraits verbatim.

-- Outils activés et leurs bornes, ex. {"enabled":["calculer","web_search"],"web_max_uses":5,"web_allowed_domains":[]}
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS tools JSONB NOT NULL DEFAULT '{"enabled":[]}'::jsonb;
ALTER TABLE public.agent_versions ADD COLUMN IF NOT EXISTS tools JSONB NOT NULL DEFAULT '{"enabled":[]}'::jsonb;

-- Un lot devient une conversation : messages échangés jusqu'ici et nombre de
-- tours, pour reprendre dans une autre invocation du travailleur.
ALTER TABLE public.agent_run_batches ADD COLUMN IF NOT EXISTS conversation JSONB;
ALTER TABLE public.agent_run_batches ADD COLUMN IF NOT EXISTS turns INTEGER NOT NULL DEFAULT 0;

-- Preuves d'une proposition : [{"type":"calcul","expression":…,"result":…,"verified":…},{"type":"url","url":…,"title":…,"verified":…}]
ALTER TABLE public.agent_findings ADD COLUMN IF NOT EXISTS evidence JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS public.agent_run_tool_calls (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id      UUID NOT NULL REFERENCES public.agent_runs(id) ON DELETE CASCADE,
    batch_id    UUID NOT NULL REFERENCES public.agent_run_batches(id) ON DELETE CASCADE,
    turn        INTEGER NOT NULL,
    tool        TEXT NOT NULL,
    source      TEXT NOT NULL DEFAULT 'client',
    input       JSONB,
    output      TEXT,
    ok          BOOLEAN NOT NULL DEFAULT true,
    duration_ms INTEGER,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT agent_run_tool_calls_source_valid CHECK (source IN ('client', 'server'))
);
CREATE INDEX IF NOT EXISTS agent_run_tool_calls_batch_idx ON public.agent_run_tool_calls (batch_id, turn);
CREATE INDEX IF NOT EXISTS agent_run_tool_calls_run_idx ON public.agent_run_tool_calls (run_id);

ALTER TABLE public.agent_run_tool_calls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_members_select_agent_run_tool_calls"
    ON public.agent_run_tool_calls FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.agent_runs r
            JOIN public.rfps rfp ON rfp.id = r.rfp_id
            JOIN public.user_organizations uo ON uo.organization_id = rfp.organization_id
            WHERE r.id = public.agent_run_tool_calls.run_id AND uo.user_id = auth.uid()
        )
    );

-- Les preuves font partie du contenu protégé d'une proposition.
CREATE OR REPLACE FUNCTION public.protect_agent_finding_content()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF auth.uid() IS NOT NULL AND (
        NEW.run_id IS DISTINCT FROM OLD.run_id
        OR NEW.response_id IS DISTINCT FROM OLD.response_id
        OR NEW.requirement_id IS DISTINCT FROM OLD.requirement_id
        OR NEW.verdict IS DISTINCT FROM OLD.verdict
        OR NEW.proposed_score IS DISTINCT FROM OLD.proposed_score
        OR NEW.justification IS DISTINCT FROM OLD.justification
        OR NEW.quotes IS DISTINCT FROM OLD.quotes
        OR NEW.questions IS DISTINCT FROM OLD.questions
        OR NEW.risks IS DISTINCT FROM OLD.risks
        OR NEW.sourced IS DISTINCT FROM OLD.sourced
        OR NEW.evidence IS DISTINCT FROM OLD.evidence
    ) THEN
        RAISE EXCEPTION 'Seule la décision sur une proposition peut être modifiée.' USING ERRCODE = 'insufficient_privilege';
    END IF;
    RETURN NEW;
END;
$$;

-- À l'acceptation, les preuves suivent la justification dans le commentaire IA.
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
    v_calcs TEXT;
    v_sources TEXT;
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

    SELECT string_agg('- ' || r, E'\n') INTO v_risks
    FROM jsonb_array_elements_text(COALESCE(v_finding.risks, '[]'::jsonb)) AS r;
    SELECT string_agg('- ' || (e->>'expression') || ' = ' || (e->>'result') || CASE WHEN COALESCE((e->>'verified')::boolean, false) THEN '' ELSE ' (non vérifié)' END, E'\n') INTO v_calcs
    FROM jsonb_array_elements(COALESCE(v_finding.evidence, '[]'::jsonb)) AS e WHERE e->>'type' = 'calcul';
    SELECT string_agg('- ' || COALESCE(NULLIF(e->>'title', ''), e->>'url') || ' — ' || (e->>'url') || CASE WHEN COALESCE((e->>'verified')::boolean, false) THEN '' ELSE ' (non consultée)' END, E'\n') INTO v_sources
    FROM jsonb_array_elements(COALESCE(v_finding.evidence, '[]'::jsonb)) AS e WHERE e->>'type' = 'url';

    v_comment := COALESCE(NULLIF(v_finding.justification, ''), '');
    IF v_calcs IS NOT NULL THEN
        v_comment := v_comment || CASE WHEN v_comment = '' THEN '' ELSE E'\n\n' END || 'Calculs :' || E'\n' || v_calcs;
    END IF;
    IF v_sources IS NOT NULL THEN
        v_comment := v_comment || CASE WHEN v_comment = '' THEN '' ELSE E'\n\n' END || 'Sources :' || E'\n' || v_sources;
    END IF;
    IF v_risks IS NOT NULL THEN
        v_comment := v_comment || CASE WHEN v_comment = '' THEN '' ELSE E'\n\n' END || 'Risques :' || E'\n' || v_risks;
    END IF;

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
