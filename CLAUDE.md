# RFP-Analyer Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-11-06

## Active Technologies

- TypeScript 5.x + Next.js 14, React 18, Supabase (PostgreSQL + Auth), Tanstack Query v5, Tailwind CSS (004-peer-review)
- PostgreSQL via Supabase — table `requirement_review_status` + colonne `rfps.peer_review_enabled` (004-peer-review)

- TypeScript 5.x / JavaScript ES2022+ with Next.js 14 (React 18) (001-rfp-analyzer-platform)

## Project Structure

```text
src/
tests/
```

## Commands

npm test && npm run lint

### Déploiement Supabase Edge Functions

```bash
# Déployer une edge function (--no-verify-jwt : la fonction gère son propre auth via SUPABASE_SERVICE_ROLE_KEY)
npx supabase functions deploy <function_name> --project-ref ixxmjmxfzipxmlwmqods --no-verify-jwt

# Exemples
npx supabase functions deploy generate-soutenance --project-ref ixxmjmxfzipxmlwmqods --no-verify-jwt
npx supabase functions deploy generate-soutenance-callback --project-ref ixxmjmxfzipxmlwmqods --no-verify-jwt
npx supabase functions deploy health-check --project-ref ixxmjmxfzipxmlwmqods --no-verify-jwt

# Ajouter/mettre à jour un secret (variable d'env pour les edge functions)
npx supabase secrets set MY_VAR=value --project-ref ixxmjmxfzipxmlwmqods
```

### Agents d'analyse (007-agents)

Les agents appellent OpenRouter depuis l'application (`lib/agents/`, `app/api/agents/**`, `app/api/rfps/[rfpId]/agents/**`), sans N8N ni edge function. Variables d'environnement Vercel : `SUPABASE_SECRET_KEY` (clé secrète `sb_secret_…`, ou `SUPABASE_SERVICE_ROLE_KEY` en repli), `OPENROUTER_API_KEY`, `CONNECTORS_ENCRYPTION_KEY` (64 hex), `OPENROUTER_DEFAULT_MODEL` (défaut `anthropic/claude-sonnet-5` ; modèle des nouveaux agents et de la rédaction assistée du prompt), `AGENT_WORKER_SECRET`, `NEXT_PUBLIC_APP_URL`. Le travailleur `POST /api/agents/worker` (`maxDuration = 300`, en-tête `x-agent-worker-secret`) est déclenché à chaque lancement et par le job `pg_cron` de `supabase/sql/agent_worker_cron.sql` (à appliquer à la main, placeholders à remplir). Schéma : migration `supabase/migrations/20260911_create_agents.sql`. Outils par agent (`agents.tools` / `agent_versions.tools`, `lib/agents/tools.ts`) : `calculer` (mathjs bridé, `lib/agents/calculator.ts`) exécuté par l'application, `web_search` et `web_fetch` exécutés par OpenRouter (server tools). Un lot est une conversation de 6 tours au plus (`runConversation` dans `worker.ts`), reprise dans une autre invocation via `agent_run_batches.conversation` quand le temps manque ; appels journalisés dans `agent_run_tool_calls` ; preuves (calculs re-évalués, pages citées) dans `agent_findings.evidence`.

Dictée et remise en forme des commentaires et questions (`app/api/ai/{transcribe,rewrite,settings}`, `lib/ai/`) : même clé OpenRouter, audio envoyé en WAV 16 kHz mono (converti dans le navigateur, `lib/audio/wav.ts`), réponse en flux texte. Modèles et prompts par organisation dans `organization_ai_settings` (page Agents & IA › Assistance à la saisie), défauts `OPENROUTER_TRANSCRIPTION_MODEL` / `OPENROUTER_REWRITE_MODEL`. L'ancien webhook N8N de transcription n'est plus utilisé.

Soutenances (chapitre `/dashboard/rfp/[rfpId]/soutenances`, `lib/soutenance/`, `app/api/rfps/[rfpId]/soutenances/**`) : le point de synthèse d'une version (`soutenance_syntheses`, un travail par fournisseur retenu) et une séance par fournisseur (`soutenance_sessions` : date, transcript, compte rendu, `soutenance_briefs` rattachés). Les documents sont produits par deux agents système par organisation (`agents.kind` = `soutenance` / `synthese`, créés au premier usage, modifiables dans Agents & IA, jamais affectés à un domaine) via des travaux `ai_jobs` que le travailleur des agents exécute avec les lots ; l'analyse d'un transcript produit le compte rendu puis des `agent_runs` de `kind = 'soutenance'` dont les propositions (`agent_findings`, preuves `type: "transcript"` horodatées) se reprennent avec `accept_agent_finding`, vers `rfps.soutenance_target_version_id` (sinon la version active) ; une reprise ne touche jamais la note manuelle et remet la réponse `is_checked = false`. Transcripts : Granola (API publique, clé par organisation ou personnelle dans `connector_keys`, chiffrée AES-256-GCM avec `CONNECTORS_ENCRYPTION_KEY`, réglages `organization_ai_settings.granola_*`, page Agents & IA › Connecteurs ; `GRANOLA_API_KEY` sert de repli hors production) ou texte collé. Les anciens onglets N8N (`analyze-defense`, `analyze-presentation`, edge functions `generate-soutenance*`) sont retirés.

Vocabulaire et fiabilisation des transcripts (`lib/soutenance/glossary.ts`, `lib/soutenance/transcript.ts`, migration `supabase/migrations/20260914_vocabulaire.sql`) : un troisième agent système par organisation (`agents.kind = 'vocabulaire'`) dégage le vocabulaire d'une consultation (`rfp_glossaries.terms` : terme, formes entendues, note, origine agent/manuel) depuis le référentiel et les offres (`ai_jobs.kind = 'glossary'`, `POST/PUT/GET /api/rfps/[rfpId]/glossary`, réglé dans Paramètres › Vocabulaire) ; le bloc « Vocabulaire de la consultation » plus `organization_ai_settings.vocabulary` est injecté dans les prompts du brief, du compte rendu, des lots de soutenance, de la transcription audio et de la dictée (`{{vocabulaire}}`). Le transcript brut (`transcript_segments`) reste intact : `transcript_corrections` (liste `{i, from, to, n, by}` appliquée dans l'ordre par `applyCorrections`) porte les substitutions du vocabulaire, les remplacements ciblés de l'agent (`ai_jobs.kind = 'transcript_fix'`, `POST …/transcript/corrections`, bouton « Fiabiliser ») et les retouches à la main (`PATCH …/transcript/corrections`, panneau « Lire en entier » : brut au survol, clic ou double-clic pour retoucher, « Rétablir le brut »). Les agents lisent et les extraits sont vérifiés sur le transcript corrigé ; la recherche du panneau trouve aussi les formes brutes. Après une retouche à la main, le dialogue « Étendre la correction » (`similarWords`, distance de Damerau-Levenshtein tolérante) propose les mêmes textes et les formes proches (Covivio ↔ colivio, covisio) et retient le terme avec ses formes dans le vocabulaire. Notifications : `components/ui/sonner.tsx` (cartes neutres, glyphe de statut, bas droite). Lancements : `lib/agents/credits.ts` lit le solde OpenRouter et refuse en 402 sous 2 $.

MCP : les jetons d'accès sont dans Agents & IA › MCP (`/dashboard/agents/mcp`, l'ancienne adresse `/dashboard/settings/tokens` redirige) avec, par consultation, l'interrupteur `rfps.mcp_enabled` (réglé par les administrateurs de l'organisation via `PATCH /api/rfps/[rfpId]`) ; le dispatcher `app/api/mcp/route.ts` refuse tout outil qui nomme une consultation retirée, et `get_rfps` ne les liste pas.

### Keep-alive Supabase (anti-suspension)

La fonction `health-check` (voir `supabase/functions/health-check`) fait un ping léger sur la table `rfps` pour maintenir l'activité du projet Supabase et éviter la mise en pause automatique après 7 jours d'inactivité (limite du plan gratuit).

Dans N8N, créer un workflow avec :
1. Un noeud **Schedule Trigger** (ex : tous les 3 jours)
2. Un noeud **HTTP Request** en `GET` vers `https://<project-ref>.supabase.co/functions/v1/health-check`, avec le header `apikey: <SUPABASE_ANON_KEY>`

La réponse attendue est `{"status":"ok","database":"reachable",...}` avec un code 200.

## Code Style

TypeScript 5.x / JavaScript ES2022+ with Next.js 14 (React 18): Follow standard conventions

## Recent Changes

- 004-peer-review: Added TypeScript 5.x + Next.js 14, React 18, Supabase (PostgreSQL + Auth), Tanstack Query v5, Tailwind CSS

- 001-rfp-analyzer-platform: Added TypeScript 5.x / JavaScript ES2022+ with Next.js 14 (React 18)

<!-- MANUAL ADDITIONS START -->

## Architecture Documentation

For complete understanding of the RFP Analyzer system, refer to:

- **[Architecture & Workflow Guide](specs/ARCHITECTURE_WORKFLOW_GUIDE.md)** - Complete system overview, data flows, and technical architecture
- **[Implementation Plan PDF Annotations](IMPLEMENTATION_PLAN_PDF_ANNOTATIONS.md)** - Detailed PDF annotation system implementation
- **[PDF Upload Implementation Summary](docs/IMPLEMENTATION-SUMMARY.md)** - File upload and storage architecture

## Key System Components

- **Frontend**: Next.js 14 + React 18 + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes + Supabase (PostgreSQL + Auth + Realtime)
- **Storage**: Google Cloud Storage for PDFs with signed URLs
- **Processing**: N8N workflows for PDF parsing and AI analysis
- **Multi-tenant**: Organization-based isolation with Row Level Security

## Core Workflows

1. **Document Processing**: PDF upload → GCS storage → N8N parsing → Database storage
2. **AI Analysis**: Response import → N8N AI processing → Score generation → Database update
3. **Human Evaluation**: Collaborative review → Manual scoring → Annotations → Real-time sync

## Development Context

This is a B2B SaaS platform for RFP evaluation with:

- Multi-organization support (10-50 users per org)
- 50-200 requirements per RFP
- 4-10 suppliers per evaluation
- Real-time collaboration features
- Advanced PDF annotation system
<!-- MANUAL ADDITIONS END -->
