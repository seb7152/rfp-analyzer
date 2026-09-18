-- Soutenances refondues : une séance par fournisseur retenu (transcript,
-- compte rendu), un point de synthèse par version, des travaux IA exécutés
-- par le travailleur des agents, des agents « système » par organisation
-- (soutenance, synthèse), les clés du connecteur Granola chiffrées.

-- ============================================================================
-- 1. agents.kind — analysis (affectable à un domaine), soutenance, synthese
-- ============================================================================

ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'analysis';
ALTER TABLE public.agents DROP CONSTRAINT IF EXISTS agents_kind_valid;
ALTER TABLE public.agents ADD CONSTRAINT agents_kind_valid CHECK (kind IN ('analysis', 'soutenance', 'synthese'));
-- Un seul agent système actif par organisation et par usage.
CREATE UNIQUE INDEX IF NOT EXISTS agents_one_system_per_kind
    ON public.agents(organization_id, kind) WHERE kind <> 'analysis' AND archived_at IS NULL;

CREATE OR REPLACE FUNCTION public.check_agent_assignment_kind()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF (SELECT kind FROM public.agents WHERE id = NEW.agent_id) <> 'analysis' THEN
        RAISE EXCEPTION 'Seul un agent d''analyse s''affecte à un domaine.' USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_agent_assignment_kind ON public.rfp_agent_assignments;
CREATE TRIGGER check_agent_assignment_kind
    BEFORE INSERT OR UPDATE ON public.rfp_agent_assignments
    FOR EACH ROW EXECUTE FUNCTION public.check_agent_assignment_kind();

-- ============================================================================
-- 2. soutenance_sessions — la séance d'un fournisseur sur une consultation
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.soutenance_sessions (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rfp_id               UUID NOT NULL REFERENCES public.rfps(id) ON DELETE CASCADE,
    supplier_id          UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
    scheduled_at         TIMESTAMPTZ,
    transcript_source    TEXT,
    transcript_text      TEXT,
    -- [{t: secondes depuis le début, "end": secondes, voice: 'me' | 'them' | 'A'…, text}]
    transcript_segments  JSONB,
    -- {granola_note_id, title, duration_seconds, words, voices: [...], imported_at, imported_by}
    transcript_meta      JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- {"them": "Witco", "A": "J. Morel"} : noms donnés aux voix, facultatif
    voice_names          JSONB NOT NULL DEFAULT '{}'::jsonb,
    report_markdown      TEXT,
    report_generated_at  TIMESTAMPTZ,
    report_edited_at     TIMESTAMPTZ,
    report_job_id        UUID,
    created_by           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT soutenance_sessions_unique UNIQUE (rfp_id, supplier_id),
    CONSTRAINT soutenance_sessions_source_valid CHECK (transcript_source IS NULL OR transcript_source IN ('granola', 'pasted', 'audio'))
);

CREATE INDEX IF NOT EXISTS idx_soutenance_sessions_rfp ON public.soutenance_sessions(rfp_id);

CREATE TRIGGER update_soutenance_sessions_updated_at
    BEFORE UPDATE ON public.soutenance_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.soutenance_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_select_soutenance_sessions"
    ON public.soutenance_sessions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.rfps rfp
            JOIN public.user_organizations uo ON uo.organization_id = rfp.organization_id
            WHERE rfp.id = public.soutenance_sessions.rfp_id AND uo.user_id = auth.uid()
        )
    );

CREATE POLICY "pilots_insert_soutenance_sessions"
    ON public.soutenance_sessions FOR INSERT
    WITH CHECK (public.is_rfp_pilot(rfp_id));

CREATE POLICY "pilots_update_soutenance_sessions"
    ON public.soutenance_sessions FOR UPDATE
    USING (public.is_rfp_pilot(rfp_id));

-- Version qui reçoit les propositions reprises (par défaut, la version active).
ALTER TABLE public.rfps ADD COLUMN IF NOT EXISTS soutenance_target_version_id UUID REFERENCES public.evaluation_versions(id) ON DELETE SET NULL;

-- ============================================================================
-- 3. soutenance_briefs — rattachés à la séance, générés par l'application
-- ============================================================================

ALTER TABLE public.soutenance_briefs
    ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.soutenance_sessions(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS job_id UUID,
    ADD COLUMN IF NOT EXISTS model_id TEXT,
    ADD COLUMN IF NOT EXISTS cost NUMERIC(12, 6) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS generated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_soutenance_briefs_session ON public.soutenance_briefs(session_id);

-- ============================================================================
-- 4. soutenance_syntheses — le point de synthèse d'une version
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.soutenance_syntheses (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rfp_id            UUID NOT NULL REFERENCES public.rfps(id) ON DELETE CASCADE,
    version_id        UUID NOT NULL REFERENCES public.evaluation_versions(id) ON DELETE CASCADE,
    status            TEXT NOT NULL DEFAULT 'pending',
    -- {suppliers: {[supplier_id]: {domains: {[category_id]: {forces: [{code, text}], faiblesses: [...], questions: [...]}}, generated_at, edited_at}}}
    data              JSONB NOT NULL DEFAULT '{}'::jsonb,
    model_id          TEXT,
    prompt_tokens     INTEGER NOT NULL DEFAULT 0,
    completion_tokens INTEGER NOT NULL DEFAULT 0,
    cost              NUMERIC(12, 6) NOT NULL DEFAULT 0,
    error             TEXT,
    generated_at      TIMESTAMPTZ,
    generated_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT soutenance_syntheses_unique UNIQUE (rfp_id, version_id),
    CONSTRAINT soutenance_syntheses_status_valid CHECK (status IN ('pending', 'running', 'completed', 'partial', 'failed'))
);

CREATE TRIGGER update_soutenance_syntheses_updated_at
    BEFORE UPDATE ON public.soutenance_syntheses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.soutenance_syntheses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_select_soutenance_syntheses"
    ON public.soutenance_syntheses FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.rfps rfp
            JOIN public.user_organizations uo ON uo.organization_id = rfp.organization_id
            WHERE rfp.id = public.soutenance_syntheses.rfp_id AND uo.user_id = auth.uid()
        )
    );

CREATE POLICY "pilots_insert_soutenance_syntheses"
    ON public.soutenance_syntheses FOR INSERT
    WITH CHECK (public.is_rfp_pilot(rfp_id));

CREATE POLICY "pilots_update_soutenance_syntheses"
    ON public.soutenance_syntheses FOR UPDATE
    USING (public.is_rfp_pilot(rfp_id));

-- ============================================================================
-- 5. ai_jobs — travaux IA d'une consultation, exécutés par le travailleur
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ai_jobs (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rfp_id            UUID NOT NULL REFERENCES public.rfps(id) ON DELETE CASCADE,
    kind              TEXT NOT NULL,
    payload           JSONB NOT NULL DEFAULT '{}'::jsonb,
    status            TEXT NOT NULL DEFAULT 'pending',
    attempts          INTEGER NOT NULL DEFAULT 0,
    served_model      TEXT,
    prompt_tokens     INTEGER NOT NULL DEFAULT 0,
    completion_tokens INTEGER NOT NULL DEFAULT 0,
    cached_tokens     INTEGER NOT NULL DEFAULT 0,
    cost              NUMERIC(12, 6) NOT NULL DEFAULT 0,
    error             TEXT,
    result            JSONB,
    created_by        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    claimed_at        TIMESTAMPTZ,
    started_at        TIMESTAMPTZ,
    completed_at      TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT ai_jobs_kind_valid CHECK (kind IN ('brief', 'synthese', 'soutenance_report')),
    CONSTRAINT ai_jobs_status_valid CHECK (status IN ('pending', 'running', 'completed', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_ai_jobs_rfp ON public.ai_jobs(rfp_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_status ON public.ai_jobs(status, created_at);

CREATE TRIGGER update_ai_jobs_updated_at
    BEFORE UPDATE ON public.ai_jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.ai_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_select_ai_jobs"
    ON public.ai_jobs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.rfps rfp
            JOIN public.user_organizations uo ON uo.organization_id = rfp.organization_id
            WHERE rfp.id = public.ai_jobs.rfp_id AND uo.user_id = auth.uid()
        )
    );

CREATE POLICY "pilots_insert_ai_jobs"
    ON public.ai_jobs FOR INSERT
    WITH CHECK (public.is_rfp_pilot(rfp_id));

CREATE OR REPLACE FUNCTION public.claim_ai_jobs(p_limit INTEGER)
RETURNS SETOF public.ai_jobs
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    UPDATE public.ai_jobs j
    SET status = 'running',
        attempts = j.attempts + 1,
        claimed_at = NOW(),
        started_at = COALESCE(j.started_at, NOW()),
        error = NULL
    WHERE j.id IN (
        SELECT id FROM public.ai_jobs
        WHERE status = 'pending'
        ORDER BY created_at
        LIMIT p_limit
        FOR UPDATE SKIP LOCKED
    )
    RETURNING j.*;
$$;

CREATE OR REPLACE FUNCTION public.requeue_stale_ai_jobs(p_timeout_seconds INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    WITH stale AS (
        UPDATE public.ai_jobs
        SET status = CASE WHEN attempts >= 3 THEN 'failed' ELSE 'pending' END,
            error = CASE WHEN attempts >= 3
                         THEN 'Délai dépassé à trois reprises.'
                         ELSE 'Délai dépassé, travail remis en attente.' END,
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

-- Le déclencheur pg_cron réveille aussi le travailleur pour ces travaux.
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
    ) OR EXISTS (
        SELECT 1 FROM public.ai_jobs
        WHERE status = 'pending'
           OR (status = 'running' AND claimed_at < NOW() - make_interval(secs => p_timeout_seconds))
    );
$$;

-- ============================================================================
-- 6. agent_runs.kind / session_id — une analyse de soutenance est un
--    lancement dont le contexte est le transcript de la séance
-- ============================================================================

ALTER TABLE public.agent_runs ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'analysis';
ALTER TABLE public.agent_runs DROP CONSTRAINT IF EXISTS agent_runs_kind_valid;
ALTER TABLE public.agent_runs ADD CONSTRAINT agent_runs_kind_valid CHECK (kind IN ('analysis', 'soutenance'));
ALTER TABLE public.agent_runs ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.soutenance_sessions(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_agent_runs_session ON public.agent_runs(session_id);

-- ============================================================================
-- 7. connector_keys — clés Granola chiffrées, lues par le service uniquement
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.connector_keys (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider        TEXT NOT NULL,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    -- NULL : clé de l'organisation ; sinon clé personnelle d'un membre
    user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    ciphertext      TEXT NOT NULL,
    last4           TEXT NOT NULL,
    verified_at     TIMESTAMPTZ,
    -- {owner_name, owner_email, notes_30d}
    verified_meta   JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT connector_keys_provider_valid CHECK (provider IN ('granola'))
);

CREATE UNIQUE INDEX IF NOT EXISTS connector_keys_org_unique
    ON public.connector_keys(provider, organization_id) WHERE user_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS connector_keys_user_unique
    ON public.connector_keys(provider, organization_id, user_id) WHERE user_id IS NOT NULL;

CREATE TRIGGER update_connector_keys_updated_at
    BEFORE UPDATE ON public.connector_keys
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Aucune politique : seule la clé de service lit et écrit, jamais le navigateur.
ALTER TABLE public.connector_keys ENABLE ROW LEVEL SECURITY;

-- Réglages du connecteur pour l'organisation.
ALTER TABLE public.organization_ai_settings
    ADD COLUMN IF NOT EXISTS granola_personal_keys BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS granola_fetch_by TEXT NOT NULL DEFAULT 'pilots';
ALTER TABLE public.organization_ai_settings DROP CONSTRAINT IF EXISTS organization_ai_settings_granola_fetch_by_valid;
ALTER TABLE public.organization_ai_settings
    ADD CONSTRAINT organization_ai_settings_granola_fetch_by_valid CHECK (granola_fetch_by IN ('pilots', 'evaluators'));

-- ============================================================================
-- 8. accept_agent_finding — preuves de transcript dans le commentaire IA ;
--    une reprise de soutenance remet l'exigence « à revoir » (is_checked)
-- ============================================================================

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
    v_transcript TEXT;
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
    SELECT string_agg('- « ' || (e->>'text') || ' »' || CASE WHEN NULLIF(e->>'at', '') IS NULL THEN '' ELSE ' (' || (e->>'at') || ')' END, E'\n') INTO v_transcript
    FROM jsonb_array_elements(COALESCE(v_finding.evidence, '[]'::jsonb)) AS e WHERE e->>'type' = 'transcript' AND COALESCE((e->>'verified')::boolean, false);

    v_comment := COALESCE(NULLIF(v_finding.justification, ''), '');
    IF v_transcript IS NOT NULL THEN
        v_comment := v_comment || CASE WHEN v_comment = '' THEN '' ELSE E'\n\n' END || 'Dit en soutenance :' || E'\n' || v_transcript;
    END IF;
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

    -- La note manuelle n'est jamais touchée. Une reprise de soutenance remet
    -- l'exigence dans la file de l'évaluateur (décochée), l'apport en vue.
    UPDATE public.responses
    SET ai_score = v_finding.proposed_score,
        ai_comment = NULLIF(v_comment, ''),
        ai_question = v_question,
        is_checked = CASE WHEN v_run.kind = 'soutenance' THEN false ELSE is_checked END,
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
