-- Migration: Agents d'analyse (007-agents, MVP)
-- Date: 2026-09-11
-- Additive: no existing table is modified except thread_comments (one nullable column).
--
-- Vocabulary: a "domaine" is a row of public.categories; a leaf "exigence" is a
-- row of public.requirements attached to a category; a "réponse" is a row of
-- public.responses (one per requirement × supplier × evaluation version).

-- ============================================================================
-- 1. agents — defined per organisation, reusable across consultations
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.agents (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id  UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name             TEXT NOT NULL,
    description      TEXT NOT NULL DEFAULT '',
    system_prompt    TEXT NOT NULL,
    model_id         TEXT NOT NULL,
    reasoning_effort TEXT NOT NULL DEFAULT 'high',
    current_version  INTEGER NOT NULL DEFAULT 1,
    archived_at      TIMESTAMPTZ,
    created_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT agents_name_not_blank CHECK (length(btrim(name)) > 0),
    CONSTRAINT agents_prompt_not_blank CHECK (length(btrim(system_prompt)) > 0),
    CONSTRAINT agents_reasoning_effort_valid CHECK (reasoning_effort IN ('none', 'medium', 'high')),
    CONSTRAINT agents_current_version_positive CHECK (current_version > 0)
);

CREATE INDEX IF NOT EXISTS idx_agents_organization ON public.agents(organization_id);

CREATE TRIGGER update_agents_updated_at
    BEFORE UPDATE ON public.agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 2. agent_versions — one row per change of prompt / model / reasoning level
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.agent_versions (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id         UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    version_number   INTEGER NOT NULL,
    system_prompt    TEXT NOT NULL,
    model_id         TEXT NOT NULL,
    reasoning_effort TEXT NOT NULL,
    created_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT agent_versions_unique UNIQUE (agent_id, version_number),
    CONSTRAINT agent_versions_reasoning_effort_valid CHECK (reasoning_effort IN ('none', 'medium', 'high'))
);

CREATE INDEX IF NOT EXISTS idx_agent_versions_agent ON public.agent_versions(agent_id);

-- ============================================================================
-- 3. rfp_agent_assignments — agent × domain (category level 1 or 2) per consultation
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.rfp_agent_assignments (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rfp_id       UUID NOT NULL REFERENCES public.rfps(id) ON DELETE CASCADE,
    agent_id     UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    category_id  UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    created_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT rfp_agent_assignments_unique_category UNIQUE (rfp_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_rfp_agent_assignments_rfp ON public.rfp_agent_assignments(rfp_id);
CREATE INDEX IF NOT EXISTS idx_rfp_agent_assignments_agent ON public.rfp_agent_assignments(agent_id);

-- Ancestors of a category (itself excluded), walking parent_id.
CREATE OR REPLACE FUNCTION public.category_ancestor_ids(p_category_id UUID)
RETURNS SETOF UUID
LANGUAGE sql STABLE
AS $$
    WITH RECURSIVE up AS (
        SELECT c.parent_id AS id FROM public.categories c WHERE c.id = p_category_id
        UNION ALL
        SELECT c.parent_id FROM public.categories c JOIN up ON c.id = up.id
    )
    SELECT id FROM up WHERE id IS NOT NULL;
$$;

-- A leaf requirement may be covered by one agent only: an assignment cannot
-- target a category whose ancestor or descendant is already assigned in the
-- same consultation, and the category must be a domain of level 1 or 2.
CREATE OR REPLACE FUNCTION public.check_agent_assignment_overlap()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_level INTEGER;
    v_rfp UUID;
BEGIN
    SELECT level, rfp_id INTO v_level, v_rfp FROM public.categories WHERE id = NEW.category_id;
    IF v_level IS NULL OR v_rfp <> NEW.rfp_id THEN
        RAISE EXCEPTION 'Le domaine n''appartient pas à cette consultation.' USING ERRCODE = 'check_violation';
    END IF;
    IF v_level > 2 THEN
        RAISE EXCEPTION 'Un agent s''affecte à un domaine de niveau 1 ou 2.' USING ERRCODE = 'check_violation';
    END IF;
    IF EXISTS (
        SELECT 1 FROM public.rfp_agent_assignments a
        WHERE a.rfp_id = NEW.rfp_id
          AND a.id IS DISTINCT FROM NEW.id
          AND (
            a.category_id IN (SELECT public.category_ancestor_ids(NEW.category_id))
            OR NEW.category_id IN (SELECT public.category_ancestor_ids(a.category_id))
          )
    ) THEN
        RAISE EXCEPTION 'Une exigence ne peut être couverte que par un seul agent : un domaine parent ou enfant est déjà affecté.' USING ERRCODE = 'unique_violation';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER rfp_agent_assignments_no_overlap
    BEFORE INSERT OR UPDATE ON public.rfp_agent_assignments
    FOR EACH ROW EXECUTE FUNCTION public.check_agent_assignment_overlap();

-- ============================================================================
-- 4. agent_runs — one analysis = agent version × supplier × domain, on a version
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.agent_runs (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rfp_id            UUID NOT NULL REFERENCES public.rfps(id) ON DELETE CASCADE,
    version_id        UUID NOT NULL REFERENCES public.evaluation_versions(id) ON DELETE CASCADE,
    agent_version_id  UUID NOT NULL REFERENCES public.agent_versions(id) ON DELETE RESTRICT,
    supplier_id       UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
    category_id       UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    status            TEXT NOT NULL DEFAULT 'pending',
    generation_id     TEXT,
    served_model      TEXT,
    prompt_tokens     INTEGER NOT NULL DEFAULT 0,
    completion_tokens INTEGER NOT NULL DEFAULT 0,
    cached_tokens     INTEGER NOT NULL DEFAULT 0,
    cost              NUMERIC(12, 6) NOT NULL DEFAULT 0,
    error             TEXT,
    raw_output        JSONB,
    launched_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    started_at        TIMESTAMPTZ,
    completed_at      TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT agent_runs_status_valid CHECK (status IN ('pending', 'running', 'completed', 'partial', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_agent_runs_rfp_version ON public.agent_runs(rfp_id, version_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_status ON public.agent_runs(status);

CREATE TRIGGER update_agent_runs_updated_at
    BEFORE UPDATE ON public.agent_runs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. agent_run_batches — a run is executed in batches of leaf requirements
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.agent_run_batches (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id            UUID NOT NULL REFERENCES public.agent_runs(id) ON DELETE CASCADE,
    batch_index       INTEGER NOT NULL,
    requirement_ids   UUID[] NOT NULL,
    status            TEXT NOT NULL DEFAULT 'pending',
    attempts          INTEGER NOT NULL DEFAULT 0,
    split_depth       INTEGER NOT NULL DEFAULT 0,
    generation_id     TEXT,
    served_model      TEXT,
    prompt_tokens     INTEGER NOT NULL DEFAULT 0,
    completion_tokens INTEGER NOT NULL DEFAULT 0,
    cached_tokens     INTEGER NOT NULL DEFAULT 0,
    cost              NUMERIC(12, 6) NOT NULL DEFAULT 0,
    error             TEXT,
    raw_output        JSONB,
    claimed_at        TIMESTAMPTZ,
    started_at        TIMESTAMPTZ,
    completed_at      TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT agent_run_batches_status_valid CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    CONSTRAINT agent_run_batches_not_empty CHECK (cardinality(requirement_ids) > 0)
);

CREATE INDEX IF NOT EXISTS idx_agent_run_batches_run ON public.agent_run_batches(run_id);
CREATE INDEX IF NOT EXISTS idx_agent_run_batches_status ON public.agent_run_batches(status, created_at);

CREATE TRIGGER update_agent_run_batches_updated_at
    BEFORE UPDATE ON public.agent_run_batches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 6. agent_findings — one proposal per response, accepted or rejected by a human
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.agent_findings (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id           UUID NOT NULL REFERENCES public.agent_runs(id) ON DELETE CASCADE,
    response_id      UUID NOT NULL REFERENCES public.responses(id) ON DELETE CASCADE,
    requirement_id   UUID NOT NULL REFERENCES public.requirements(id) ON DELETE CASCADE,
    verdict          TEXT NOT NULL,
    proposed_score   NUMERIC(2, 1) NOT NULL,
    justification    TEXT NOT NULL DEFAULT '',
    quotes           JSONB NOT NULL DEFAULT '[]'::jsonb,
    questions        JSONB NOT NULL DEFAULT '[]'::jsonb,
    risks            JSONB NOT NULL DEFAULT '[]'::jsonb,
    sourced          BOOLEAN NOT NULL DEFAULT false,
    status           TEXT NOT NULL DEFAULT 'proposed',
    decided_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    decided_at       TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT agent_findings_unique_per_run UNIQUE (run_id, response_id),
    CONSTRAINT agent_findings_verdict_valid CHECK (verdict IN ('conforme', 'partiel', 'non_conforme', 'non_repondu', 'hors_sujet')),
    CONSTRAINT agent_findings_status_valid CHECK (status IN ('proposed', 'accepted', 'rejected', 'obsolete')),
    CONSTRAINT agent_findings_score_valid CHECK (proposed_score >= 0 AND proposed_score <= 5 AND (proposed_score * 2) = round(proposed_score * 2))
);

CREATE INDEX IF NOT EXISTS idx_agent_findings_response ON public.agent_findings(response_id);
CREATE INDEX IF NOT EXISTS idx_agent_findings_run ON public.agent_findings(run_id);
CREATE INDEX IF NOT EXISTS idx_agent_findings_status ON public.agent_findings(status);

CREATE TRIGGER update_agent_findings_updated_at
    BEFORE UPDATE ON public.agent_findings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 7. thread_comments.agent_finding_id — provenance of a comment created by acceptance
-- ============================================================================

ALTER TABLE public.thread_comments
    ADD COLUMN IF NOT EXISTS agent_finding_id UUID REFERENCES public.agent_findings(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_thread_comments_agent_finding ON public.thread_comments(agent_finding_id);

-- ============================================================================
-- 8. Worker helpers (service role only)
-- ============================================================================

-- Atomically claims up to p_limit pending batches: a batch can be taken by one
-- worker instance only (FOR UPDATE SKIP LOCKED).
CREATE OR REPLACE FUNCTION public.claim_agent_run_batches(p_limit INTEGER)
RETURNS SETOF public.agent_run_batches
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    UPDATE public.agent_run_batches b
    SET status = 'running',
        attempts = b.attempts + 1,
        claimed_at = NOW(),
        started_at = NOW(),
        error = NULL
    WHERE b.id IN (
        SELECT id FROM public.agent_run_batches
        WHERE status = 'pending'
        ORDER BY created_at, batch_index
        LIMIT p_limit
        FOR UPDATE SKIP LOCKED
    )
    RETURNING b.*;
$$;

-- A batch never stays 'running' forever: past the timeout it goes back to
-- pending, and past three attempts it fails.
CREATE OR REPLACE FUNCTION public.requeue_stale_agent_run_batches(p_timeout_seconds INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    WITH stale AS (
        UPDATE public.agent_run_batches
        SET status = CASE WHEN attempts >= 3 THEN 'failed' ELSE 'pending' END,
            error = CASE WHEN attempts >= 3
                         THEN 'Délai dépassé à trois reprises.'
                         ELSE 'Délai dépassé, lot remis en attente.' END,
            completed_at = CASE WHEN attempts >= 3 THEN NOW() ELSE NULL END,
            claimed_at = NULL
        WHERE status = 'running'
          AND claimed_at IS NOT NULL
          AND claimed_at < NOW() - make_interval(secs => p_timeout_seconds)
        RETURNING id
    )
    SELECT count(*) INTO v_count FROM stale;
    RETURN v_count;
END;
$$;

-- True when the worker has something to do (used by the pg_cron trigger).
CREATE OR REPLACE FUNCTION public.agent_worker_has_work(p_timeout_seconds INTEGER)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.agent_run_batches
        WHERE status = 'pending'
           OR (status = 'running' AND claimed_at < NOW() - make_interval(secs => p_timeout_seconds))
    );
$$;

REVOKE ALL ON FUNCTION public.claim_agent_run_batches(INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.requeue_stale_agent_run_batches(INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.agent_worker_has_work(INTEGER) FROM PUBLIC, anon, authenticated;

-- ============================================================================
-- 9. Row Level Security — same shape as response_threads / requirement_review_status
-- ============================================================================

-- Pilot of a consultation: its owner, or an admin of its organisation (the
-- same resultant checkRFPAccess computes in the application).
CREATE OR REPLACE FUNCTION public.is_rfp_pilot(p_rfp_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.rfp_user_assignments rua
        WHERE rua.rfp_id = p_rfp_id AND rua.user_id = auth.uid() AND rua.access_level = 'owner'
    ) OR EXISTS (
        SELECT 1 FROM public.rfps rfp
        JOIN public.user_organizations uo ON uo.organization_id = rfp.organization_id
        WHERE rfp.id = p_rfp_id AND uo.user_id = auth.uid() AND uo.role = 'admin'
    );
$$;

ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfp_agent_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_run_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_findings ENABLE ROW LEVEL SECURITY;

-- agents: read for organisation members, write for organisation admins.
CREATE POLICY "org_members_select_agents"
    ON public.agents FOR SELECT
    USING (
        organization_id IN (
            SELECT uo.organization_id FROM public.user_organizations uo WHERE uo.user_id = auth.uid()
        )
    );

CREATE POLICY "org_admins_insert_agents"
    ON public.agents FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT uo.organization_id FROM public.user_organizations uo
            WHERE uo.user_id = auth.uid() AND uo.role = 'admin'
        )
    );

CREATE POLICY "org_admins_update_agents"
    ON public.agents FOR UPDATE
    USING (
        organization_id IN (
            SELECT uo.organization_id FROM public.user_organizations uo
            WHERE uo.user_id = auth.uid() AND uo.role = 'admin'
        )
    );

-- agent_versions: read for members, insert for admins (never updated).
CREATE POLICY "org_members_select_agent_versions"
    ON public.agent_versions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.agents a
            JOIN public.user_organizations uo ON uo.organization_id = a.organization_id
            WHERE a.id = public.agent_versions.agent_id AND uo.user_id = auth.uid()
        )
    );

CREATE POLICY "org_admins_insert_agent_versions"
    ON public.agent_versions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.agents a
            JOIN public.user_organizations uo ON uo.organization_id = a.organization_id
            WHERE a.id = public.agent_versions.agent_id AND uo.user_id = auth.uid() AND uo.role = 'admin'
        )
    );

-- rfp_agent_assignments: read for members, write for the consultation owner
-- (org admins pilot every consultation, as checkRFPAccess already grants).
CREATE POLICY "org_members_select_agent_assignments"
    ON public.rfp_agent_assignments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.rfps rfp
            JOIN public.user_organizations uo ON uo.organization_id = rfp.organization_id
            WHERE rfp.id = public.rfp_agent_assignments.rfp_id AND uo.user_id = auth.uid()
        )
    );

CREATE POLICY "owners_insert_agent_assignments"
    ON public.rfp_agent_assignments FOR INSERT
    WITH CHECK (public.is_rfp_pilot(rfp_id));

CREATE POLICY "owners_delete_agent_assignments"
    ON public.rfp_agent_assignments FOR DELETE
    USING (public.is_rfp_pilot(rfp_id));

-- agent_runs / batches: read for members; launch (insert) and retry (update)
-- for the consultation owner; the worker writes with the service role.
CREATE POLICY "org_members_select_agent_runs"
    ON public.agent_runs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.rfps rfp
            JOIN public.user_organizations uo ON uo.organization_id = rfp.organization_id
            WHERE rfp.id = public.agent_runs.rfp_id AND uo.user_id = auth.uid()
        )
    );

CREATE POLICY "owners_insert_agent_runs"
    ON public.agent_runs FOR INSERT
    WITH CHECK (public.is_rfp_pilot(rfp_id));

CREATE POLICY "owners_update_agent_runs"
    ON public.agent_runs FOR UPDATE
    USING (public.is_rfp_pilot(rfp_id));

CREATE POLICY "org_members_select_agent_run_batches"
    ON public.agent_run_batches FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.agent_runs r
            JOIN public.rfps rfp ON rfp.id = r.rfp_id
            JOIN public.user_organizations uo ON uo.organization_id = rfp.organization_id
            WHERE r.id = public.agent_run_batches.run_id AND uo.user_id = auth.uid()
        )
    );

CREATE POLICY "owners_insert_agent_run_batches"
    ON public.agent_run_batches FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.agent_runs r
            WHERE r.id = public.agent_run_batches.run_id AND public.is_rfp_pilot(r.rfp_id)
        )
    );

CREATE POLICY "owners_update_agent_run_batches"
    ON public.agent_run_batches FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.agent_runs r
            WHERE r.id = public.agent_run_batches.run_id AND public.is_rfp_pilot(r.rfp_id)
        )
    );

-- agent_findings: read for members; decision (update) for evaluators and owners
-- of the consultation; creation by the worker only.
CREATE POLICY "org_members_select_agent_findings"
    ON public.agent_findings FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.agent_runs r
            JOIN public.rfps rfp ON rfp.id = r.rfp_id
            JOIN public.user_organizations uo ON uo.organization_id = rfp.organization_id
            WHERE r.id = public.agent_findings.run_id AND uo.user_id = auth.uid()
        )
    );

CREATE POLICY "evaluators_update_agent_findings"
    ON public.agent_findings FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.agent_runs r
            JOIN public.rfp_user_assignments rua ON rua.rfp_id = r.rfp_id
            WHERE r.id = public.agent_findings.run_id
              AND rua.user_id = auth.uid()
              AND rua.access_level IN ('evaluator', 'owner', 'admin')
        )
    );

COMMENT ON TABLE public.agents IS 'Agents d''analyse définis par organisation (007-agents).';
COMMENT ON TABLE public.agent_versions IS 'Versions immuables d''un agent ; une analyse référence une version.';
COMMENT ON TABLE public.rfp_agent_assignments IS 'Affectation d''un agent à un domaine (categories niveau 1 ou 2) d''une consultation.';
COMMENT ON TABLE public.agent_runs IS 'Une analyse = version d''agent × fournisseur × domaine, sur une version d''évaluation.';
COMMENT ON TABLE public.agent_run_batches IS 'Lots d''exigences d''une analyse ; l''état de l''analyse se dérive de ses lots.';
COMMENT ON TABLE public.agent_findings IS 'Propositions des agents, acceptées ou rejetées par un évaluateur.';
COMMENT ON COLUMN public.thread_comments.agent_finding_id IS 'Proposition d''agent dont l''acceptation a créé ce commentaire.';
