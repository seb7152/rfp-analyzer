# REFONTE — propositions backend, bugs hors périmètre, résultats de tests

Branche `refonte-ui`. Le journal des décisions UX est dans `Décisions.md`.

## 1. Propositions backend non implémentées

Le brief interdit tout changement de schéma, de contrat d'API ou d'auth. Les points ci-dessous en relèvent ; ils sont décrits, pas codés.

### P-1 — Assignation des analystes par domaine
- **Constat.** `rfp_user_assignments` porte seulement `access_level` ; aucune portée par catégorie. Le doc UX (§3 « Assigner les analystes aux domaines », §4 « 40 exigences sur mon domaine ») suppose une file « mes exigences » impossible à calculer.
- **Proposition.** Table `rfp_user_category_assignments (rfp_id, user_id, category_id)` ou colonne `category_ids uuid[]` sur `rfp_user_assignments` ; `GET /assignments` renvoie les domaines ; la file de travail gagne un onglet « Les miennes » et le suivi une colonne « domaines / retard ».

### P-2 — Avancement réel de l'analyse IA
- **Constat.** `rfps.analysis_status` est documenté avec `startedAt`, `totalResponses`, `processedResponses`, mais les callbacks (`app/api/rfps/[rfpId]/analyze/callback`, edge `analyze-callback`) n'écrivent que `{ jobId, status, lastUpdatedAt }`. L'interface compte donc les réponses portant une note IA (D-11).
- **Proposition.** L'edge function `analyze-rfp` écrit `startedAt` et `totalResponses` au lancement ; les callbacks incrémentent `processedResponses` (`jsonb_set` ou RPC atomique) et posent `completedAt`. La ligne d'état lira ces champs. Déploiement : `npx supabase functions deploy analyze-rfp` et `analyze-callback` (non fait ici : déploiement en production).

### P-3 — Citation source portée par la réponse
- **Constat.** `responses` n'a ni document, ni page, ni extrait ; la preuve n'existe que par les annotations « bookmark » posées à la main. Le drill-down du sponsor s'arrête donc à la réponse quand aucun signet n'a été créé.
- **Proposition.** Colonnes `source_document_id uuid`, `source_page int`, `source_quote text` sur `responses`, alimentées par N8N au moment de l'analyse (le prompt peut demander la citation) et par l'import des réponses. Le renvoi devient direct : score › citation.

### P-4 — Sémantique de la note finale
- **Constat.** Le tableau de bord serveur utilise `manual_score || ai_score` (une note manuelle de 0 est ignorée) ; les écrans et l'export utilisent `??` ou la note manuelle seule. La refonte a centralisé la règle côté client (`lib/scoring.ts` : `manual ?? ai`).
- **Proposition.** Aligner `app/api/rfps/[rfpId]/dashboard/route.ts` (lignes 179, 230, 297, 336) et `export/generate` sur `manual ?? ai`, et exposer la pondération dans `/dashboard` (le `totalScore` actuel est une somme non pondérée des moyennes de catégories).

### P-5 — Réponses : pagination et champs
- **Fait (compatible).** `GET /api/rfps/[rfpId]/responses` pagine désormais côté serveur (plus de plafond silencieux à 1 000 lignes) et accepte `fields=light` (sans les textes) pour la file de travail, le suivi et la décision. `GET /preparation` renvoie en plus `responses.total/answered` et `analysis.{status,responsesTotal,responsesScored}`.
- **Proposition.** Ajouter un index `(rfp_id, version_id, supplier_id)` sur `responses` si le plan d'exécution le justifie à 200 × 10.

### P-6 — Droits à deux niveaux
- **Frictions constatées.** Aucun hook client ne donne le niveau d'accès sur la consultation ; chaque page le lit dans une réponse d'API différente (la refonte l'unifie via `useConsultation().access`, lu dans `/preparation`). Un évaluateur d'organisation sans ligne `rfp_user_assignments` n'a aucun accès ; le rôle « viewer » d'organisation et l'accès « viewer » de consultation ne se recoupent pas ; l'IA est refusée aux évaluateurs (`canUseAIFeatures`) sans message. Proposition : un endpoint `GET /api/rfps/[rfpId]/me` renvoyant la résultante des deux niveaux, et un message « demander l'accès au pilote » à la place des affordances mortes.

### P-7 — Route `/api/auth/login`
- **Bug.** Le profil échoue avec « more than one relationship was found for 'users' and 'user_organizations' » (double clé étrangère). La page de connexion n'utilise pas cette route (elle appelle Supabase directement), mais `useAuth().login` oui. Correction : préciser la relation dans le `select` (`user_organizations!user_organizations_user_id_fkey`).

### P-9 — Import : un rapport ligne à ligne
- `POST /categories/import`, `/requirements/import`, `/suppliers/import` et `/responses/import` valident le payload en bloc (`lib/supabase/validators.ts`) : une ligne fautive et rien n'est importé, avec un message global en anglais. L'atelier d'import contourne en appliquant les mêmes règles côté client et en n'envoyant que les lignes valides, ce qui écrit les règles à deux endroits. Proposition : renvoyer `{ created, updated, skipped, errors: [{ line, field, reason }] }` et accepter un payload partiel. Les libellés d'erreur gagneraient à être en français, côté serveur comme côté client.
- Import de tableur : toujours absent. Le « Format attendu » de l'atelier fournit un prompt et un JSON Schema pour convertir un XLSX à l'extérieur ; un import natif reste à arbitrer.

### P-8 — Clé de service en local
- Les routes `response-threads`, `review-statuses` et `review-status` exigent `SUPABASE_SERVICE_ROLE_KEY`, absente de `.env.local` (qui contient des valeurs placeholder pour l'URL et la clé anonyme). En local, les discussions et le peer review renvoient 500 ; les écrans les tolèrent. `.env.development.local` (ignoré par git) a été créé avec l'URL et la clé anonyme réelles pour faire tourner l'application.

## 2. Bugs hors périmètre constatés, non traités

- `financial-grid/page.tsx` : le bouton retour poussait vers `/dashboard/rfp/[id]` (404 avant la refonte ; désormais une redirection par phase).
- `app/dashboard/rfp/[rfpId]/test/page.tsx` : page de développement (radar) sans lien entrant, conservée.
- `components/VersionSelector.tsx`, `RequirementTree.tsx`, `RequirementDetails.tsx`, `RequirementHeader.tsx`, `TableTree.tsx`, `dashboard/GlobalProgressCard.tsx`, `response-threads/ThreadIndicator.tsx` : code mort, conservé.
- `RequirementsTab` : les déplacements, ajouts et suppressions de nœuds ne sont pas persistés (seuls étiquettes et marqueurs le sont) ; la « relecture et correction de l'arborescence » est donc partielle côté données.
- `Sidebar.tsx` / `EvaluationFilters.tsx` (ancienne évaluation, plus montés) : quatre filtres n'étaient jamais appliqués.
- `POST /api/rfps/[rfpId]/analyze` : ignore le corps de la requête (prompt et périmètre perdus) ; la refonte passe par l'edge function.
- `analyze/callback` : la vérification du jeton Bearer est commentée.
- `app/dashboard/rfp/[rfpId]/documents/page.tsx` : redirigeait vers `/auth/login` (route inexistante) ; corrigé vers `/login` (point d'entrée du parcours 1).
- `SuppliersTab` : deux lectures identiques des fournisseurs, logique dupliquée.
- `npm test` et `npm run lint` (CLAUDE.md) : aucun script `test`, ESLint non configuré (`next lint` demande une configuration interactive).
- Sécurité (advisor Supabase) : RLS désactivée sur `organizations`, `requirements`, `categories`, `defense_analyses`, `presentation_analyses`. À traiter avec des politiques avant activation.
- Page de connexion : bouton indigo, hors périmètre, non repeinte.
- Import de tableur : inexistant côté application. Le dépôt se fait en JSON ; l'atelier d'import fournit un prompt et un JSON Schema pour convertir un tableur à l'extérieur (D-18). L'ancien libellé « Depuis un tableur ou un fichier JSON » promettait une capacité absente, il a été corrigé.
- `contexts/VersionContext.tsx` : les erreurs sont des chaînes anglaises (« Failed to fetch versions », « Failed to activate version ») stockées dans le contexte mais affichées nulle part ; `setActiveVersionId` rejette sans que l'appelant historique (`VersionSwitcher`) le capte. Le sommaire refondu capte le rejet et affiche un message français ; la réécriture du contexte (React Query, messages français, état de chargement pendant l'activation) reste à faire.
- Activation d'une version : `POST /api/rfps/[rfpId]/versions/[versionId]/activate` change la version active pour toute la consultation, donc pour tous les utilisateurs. Rien dans l'interface ne le dit au moment du choix. À trancher : confirmation explicite, ou version active par utilisateur (changement de schéma, hors périmètre).

## 3. Données de test

Trois comptes créés le 2026-09-11 dans l'organisation « Test & recette » (`da355d9f-…`), assignés aux consultations `Support L1 Finance - Accor`, `Test SmartParking`, `Test Praem Maintenance` : `e2e.pilote@`, `e2e.expert@`, `e2e.sponsor@rfp-analyzer.test` (mot de passe dans `.env.test.local`). Nettoyage :

```sql
delete from rfp_user_assignments where user_id in (select id from users where email like 'e2e.%@rfp-analyzer.test');
delete from user_organizations where user_id in (select id from users where email like 'e2e.%@rfp-analyzer.test');
delete from users where email like 'e2e.%@rfp-analyzer.test';
delete from auth.identities where user_id in (select id from auth.users where email like 'e2e.%@rfp-analyzer.test');
delete from auth.users where email like 'e2e.%@rfp-analyzer.test';
```

Les tests d'évaluation modifient une réponse puis la remettent dans son état initial ; le test de création supprime la consultation créée.

## 4. Résultats de tests

Session du 2026-09-11, branche `refonte-ui`, base Supabase réelle (org « Test & recette »), serveur `next dev` local.

| Vérification | Résultat |
|---|---|
| `npx tsc --noEmit` | 0 erreur |
| `npm run build` | succès (exit 0, relancé après le dernier correctif) ; deux avertissements « Dynamic server usage » sur `/api/auth/me`, antérieurs et sans effet |
| `npm run lint` | non exécutable : ESLint n'est pas configuré dans le dépôt (état antérieur, inchangé) |
| `npm test` | aucun script `test` dans le dépôt (état antérieur, inchangé) |
| `npx playwright test` (setup + desktop 1440×900 + mobile iPhone 13) | **15/15 verts** : parcours 1 (2 tests × 2), parcours 2 (3 tests × 2, dont hors ligne → file → rejeu), parcours 3 (1 test × 2) |
| Détecteur `impeccable detect` sur les cibles refondues | 0 signalement |
| Revue de finition `impeccable` (agent relecteur, contexte neuf) | disposition initiale « fix », 8 corrections matérielles (renvoi sur la note, fond sombre charbon, libellé du chapitre 4, contraste de la heatmap, accueil mobile, première ligne du hub, répartition lisible sans couleur, preuve de la ligne d'état IA) ; toutes appliquées et scorées « resolved » au passage de verdict (deux tours) |
| Documentation | `DESIGN.md` + `.impeccable/design.json` écrits depuis le build ; dérives mineures relevées par le documenteur et corrigées (titres d'article 16 px partout, panneaux à 200 ms) ; variantes héritées de `button` (`mono`, rayons `lg/full`) et de `card` (`accent`) conservées pour les écrans hors périmètre |
| Vérification fonctionnelle indépendante (agent Sonnet, contexte neuf) | 17 contrôles supplémentaires verts sur les trois personas, redirections d'anciens liens vérifiées ; un avertissement React de clé dans `SuppliersTab` corrigé |
| Revue des captures (agent Sonnet, contexte neuf, liste anti-gabarit) | aucune violation de la liste sur les écrans refondus ; défilement horizontal mobile sans affordance (corrigé : `ScrollX`, colonnes masquées sous 768 px), double croix du panneau de renvois (corrigé), popover de filtres trop haut sur mobile (corrigé) ; chaîne anglaise et cartes KPI relevées sur `/parametres` et `/referentiel` (composants hérités, hors périmètre, listés en D-14) |

Performance mesurée en mode développement (non représentatif de la production), desktop, LCP via `PerformanceObserver` :

| Écran | LCP | Titre visible |
|---|---|---|
| `/preparation` (pilote) | 0,86 s | 1,08 s |
| `/evaluate` (expert) | 1,1 s (1,1–2,0 s selon les runs) | 1,14 s |
| `/decision` (sponsor) | 1,12 s | 1,6 s |

Interactions : la note s'écrit en une requête PUT (optimiste, < 200 ms perçus) ; l'exigence suivante est préchargée. Charge 200 × 10 : la file de travail lit les réponses sans leurs textes (`fields=light`, paginé serveur) ; les colonnes d'une exigence ne chargent que ses réponses.

**Après la direction « Atelier » (D-15)** : `tsc` 0 erreur ; `npx playwright test` 15/15 (desktop + mobile, un test d'accueil adapté au nouveau titre « Consultations ») ; détecteur `impeccable detect` : un avis (rayon 999 px des pastilles, documenté dans DESIGN.md) ; captures relues en clair et en sombre (accueil, préparation, évaluation dépliée et repliée, décision) ; relecture indépendante (agent Sonnet, 32 captures) : aucun point bloquant, troncature des libellés du panneau de filtres corrigée, retour à la ligne des codes dans le panneau de renvois corrigé ; `npm run build` exit 0 après ces correctifs.

Bugs relevés par la vérification et non traités (hors périmètre) : valeurs flottantes non arrondies dans les champs de pondération de `WeightsTab` (`45.039999999999999`) ; note fournisseur affichée sur 20 dans `SuppliersTab` alors que le produit note sur 5 ailleurs.
