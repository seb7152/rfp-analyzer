-- Déclenchement périodique du travailleur des agents (007-agents).
-- À appliquer à la main sur le projet Supabase, après la migration
-- 20260911_create_agents.sql. Remplacer les deux valeurs entre chevrons :
--   <APP_URL>              : origine de l'application déployée, ex. https://rfp-analyzer.vercel.app
--   <AGENT_WORKER_SECRET>  : la valeur de la variable d'environnement AGENT_WORKER_SECRET sur Vercel
--
-- Toutes les minutes, si des lots sont en attente ou bloqués « en cours » depuis
-- plus longtemps que le délai maximal (300 s), la base appelle le travailleur.
-- Le travailleur répond 202 immédiatement et traite en arrière-plan.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.unschedule('agent-worker')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'agent-worker');

SELECT cron.schedule(
    'agent-worker',
    '* * * * *',
    $$
    SELECT net.http_post(
        url := '<APP_URL>/api/agents/worker',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'x-agent-worker-secret', '<AGENT_WORKER_SECRET>'
        ),
        body := '{"source":"pg_cron"}'::jsonb,
        timeout_milliseconds := 5000
    )
    WHERE public.agent_worker_has_work(300);
    $$
);
