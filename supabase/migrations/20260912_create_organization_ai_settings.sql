-- Réglages de l'assistance IA par organisation : dictée (transcription) et
-- remise en forme des commentaires et questions, via OpenRouter. Une ligne
-- par organisation, créée à la première modification ; une colonne nulle
-- signifie « valeur par défaut de l'application ».

CREATE TABLE IF NOT EXISTS public.organization_ai_settings (
    organization_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
    transcription_model_id text,
    transcription_prompt text,
    rewrite_model_id text,
    rewrite_prompt text,
    -- Noms propres et termes métier que les deux prompts doivent respecter.
    vocabulary text NOT NULL DEFAULT '',
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.organization_ai_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_select_ai_settings"
    ON public.organization_ai_settings FOR SELECT
    USING (
        organization_id IN (
            SELECT uo.organization_id FROM public.user_organizations uo WHERE uo.user_id = auth.uid()
        )
    );

CREATE POLICY "org_admins_insert_ai_settings"
    ON public.organization_ai_settings FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT uo.organization_id FROM public.user_organizations uo
            WHERE uo.user_id = auth.uid() AND uo.role = 'admin'
        )
    );

CREATE POLICY "org_admins_update_ai_settings"
    ON public.organization_ai_settings FOR UPDATE
    USING (
        organization_id IN (
            SELECT uo.organization_id FROM public.user_organizations uo
            WHERE uo.user_id = auth.uid() AND uo.role = 'admin'
        )
    );
