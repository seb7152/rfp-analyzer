-- Vocabulaire de la consultation et fiabilisation des transcripts :
-- un glossaire par consultation (termes, formes entendues), dégagé par un
-- agent système « Vocabulaire » puis entretenu à la main ; une couche de
-- corrections sur le transcript d'une séance (le brut reste intact).

-- ============================================================================
-- 1. agents.kind — vocabulaire (troisième agent système)
-- ============================================================================

ALTER TABLE public.agents DROP CONSTRAINT IF EXISTS agents_kind_valid;
ALTER TABLE public.agents ADD CONSTRAINT agents_kind_valid CHECK (kind IN ('analysis', 'soutenance', 'synthese', 'vocabulaire'));

-- ============================================================================
-- 2. ai_jobs.kind — glossary (extraction), transcript_fix (passe ciblée)
-- ============================================================================

ALTER TABLE public.ai_jobs DROP CONSTRAINT IF EXISTS ai_jobs_kind_valid;
ALTER TABLE public.ai_jobs ADD CONSTRAINT ai_jobs_kind_valid CHECK (kind IN ('brief', 'synthese', 'soutenance_report', 'glossary', 'transcript_fix'));

-- ============================================================================
-- 3. rfp_glossaries — le vocabulaire d'une consultation
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.rfp_glossaries (
    rfp_id        UUID PRIMARY KEY REFERENCES public.rfps(id) ON DELETE CASCADE,
    -- [{term, aliases: [...formes entendues ou abrégées], note, source: 'agent' | 'manual'}]
    terms         JSONB NOT NULL DEFAULT '[]'::jsonb,
    job_id        UUID,
    generated_at  TIMESTAMPTZ,
    generated_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    model_id      TEXT,
    cost          NUMERIC(12, 6) NOT NULL DEFAULT 0,
    error         TEXT,
    edited_at     TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_rfp_glossaries_updated_at
    BEFORE UPDATE ON public.rfp_glossaries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.rfp_glossaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_select_rfp_glossaries"
    ON public.rfp_glossaries FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.rfps rfp
            JOIN public.user_organizations uo ON uo.organization_id = rfp.organization_id
            WHERE rfp.id = public.rfp_glossaries.rfp_id AND uo.user_id = auth.uid()
        )
    );

CREATE POLICY "pilots_insert_rfp_glossaries"
    ON public.rfp_glossaries FOR INSERT
    WITH CHECK (public.is_rfp_pilot(rfp_id));

CREATE POLICY "pilots_update_rfp_glossaries"
    ON public.rfp_glossaries FOR UPDATE
    USING (public.is_rfp_pilot(rfp_id));

-- ============================================================================
-- 4. soutenance_sessions — corrections du transcript, en couche
-- ============================================================================

ALTER TABLE public.soutenance_sessions
    -- [{i: index du segment, from, to, n: occurrence (0 par défaut), by: 'glossary' | 'agent' | 'manual'}], appliquées dans l'ordre
    ADD COLUMN IF NOT EXISTS transcript_corrections JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS transcript_fix_job_id  UUID;
