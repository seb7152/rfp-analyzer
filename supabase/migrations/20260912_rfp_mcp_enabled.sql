-- Exposition d'une consultation au serveur MCP, décidée par consultation
-- dans la page Agents & IA › MCP de l'organisation. Activée par défaut pour
-- ne rien changer aux consultations existantes.

ALTER TABLE public.rfps ADD COLUMN IF NOT EXISTS mcp_enabled BOOLEAN NOT NULL DEFAULT true;
COMMENT ON COLUMN public.rfps.mcp_enabled IS 'Les outils MCP peuvent lire et écrire cette consultation.';
