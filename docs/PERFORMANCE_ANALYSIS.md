# Analyse de performance — chargement de l'application

Analyse du 2 septembre 2026, branche `perf/loading-optimizations`.
Périmètre : temps de chargement des pages du dashboard (bundle JS et latence
API). L'onboarding (offres / cahier des charges / réponses) fera l'objet d'une
étape séparée.

## Résumé

Trois causes dominaient les temps de chargement :

1. **Le poids du JS initial** — la page « summary » téléchargeait 840 kB avant
   de pouvoir afficher quoi que ce soit, dont ~400 kB d'`exceljs` + `jspdf` qui
   ne servent qu'au moment d'un export.
2. **Le nombre d'allers-retours Supabase par requête API** — chaque route
   refaisait la même vérification d'accès en 3 requêtes séquentielles, et une
   page en déclenche jusqu'à 10 en parallèle.
3. **Des agrégations en O(n³) côté serveur** — le endpoint `/dashboard`
   re-parcourait la totalité des réponses à l'intérieur de boucles imbriquées
   sur les fournisseurs, les catégories et les exigences.

Deux bugs de justesse ont été trouvés au passage et corrigés (voir plus bas).

## Mesures

### Poids du JS (mesuré, `next build`)

| Route                                   | First Load JS avant | après  | écart  |
| --------------------------------------- | ------------------- | ------ | ------ |
| `/dashboard/rfp/[rfpId]/summary`        | 840 kB              | 223 kB | −73 %  |
| `/dashboard/rfp/[rfpId]/import`         | 402 kB              | 107 kB | −73 %  |
| `/dashboard/rfp/[rfpId]/synthesis`      | 397 kB              | 165 kB | −58 %  |
| `/dashboard/rfp/[rfpId]/evaluate`       | 291 kB              | 293 kB | +0,7 % |
| `/dashboard/rfp/[rfpId]/financial-grid` | 252 kB              | 255 kB | +1,2 % |

Les deux légères hausses viennent de la redistribution des chunks partagés
(+1,1 kB sur le chunk commun), pas d'un ajout de code.

### Agrégation du dashboard (mesuré, `node scripts/perf/dashboard-aggregate-bench.ts`)

Temps CPU serveur, sortie strictement identique à l'ancienne implémentation
(le script compare les deux champ par champ) :

| Jeu de données                                  | avant   | après  | gain |
| ----------------------------------------------- | ------- | ------ | ---- |
| 10 cat. × 5 exig. × 4 fourn. (200 réponses)     | 0,2 ms  | 0,1 ms | ×3   |
| 20 cat. × 10 exig. × 8 fourn. (1 600 réponses)  | 3,6 ms  | 0,3 ms | ×12  |
| 30 cat. × 20 exig. × 10 fourn. (6 000 réponses) | 31,7 ms | 1,0 ms | ×31  |

### Allers-retours Supabase (comptés en lisant le code, non mesurés en prod)

| Flux                                       | avant                                        | après                           |
| ------------------------------------------ | -------------------------------------------- | ------------------------------- |
| `GET /api/rfps/{id}/dashboard`             | 12 requêtes, ~9 séquentielles                | 8 requêtes, ~5 hops             |
| `GET /api/rfps/{id}/versions` (V versions) | 2 + 6×V (26 pour 4 versions)                 | 4, quel que soit V              |
| `GET /api/rfps/{id}`                       | 5                                            | 4, en parallèle                 |
| Chargement page « summary »                | 7 requêtes HTTP dont 2 `/dashboard` complets | 5 requêtes, 1 seul `/dashboard` |
| En-tête page « evaluate »                  | 1 `/dashboard` complet                       | 1 `/api/rfps/{id}` léger        |

## Détail des corrections

### Serveur

- **`lib/permissions/rfp-access.ts`** — la vérification d'accès enchaînait
  `rfps` → `user_organizations` → `rfp_user_assignments` en séquentiel, et
  était refaite intégralement par chaque route appelée par la page. Ajout d'un
  cache mémoire à TTL court (10 s) + déduplication des appels concurrents, et
  mise en parallèle des deux lectures indépendantes. Le TTL est volontairement
  court : un retrait d'accès prend effet au pire 10 s plus tard. Le cache est
  invalidé explicitement lors de l'ajout ou du retrait d'une affectation. Même
  compromis que celui déjà retenu dans `lib/suppliers/status-cache.ts`.

- **`lib/dashboard/aggregate.ts` (nouveau)** — l'agrégation du dashboard,
  extraite de la route et réécrite en indexant les réponses une seule fois
  (par fournisseur, par exigence) au lieu de refiltrer le tableau complet dans
  chaque boucle. Module pur, donc testable et mesurable hors Next.

- **`app/api/rfps/[rfpId]/dashboard/route.ts`** — le calcul du taux
  d'avancement relançait un `getRFPCompletionPercentage` qui refetchait
  _toutes_ les réponses et _toutes_ les exigences déjà chargées juste au-dessus.
  Il est maintenant calculé à partir des données en mémoire. Les lectures
  restantes (RFP, accès, version active, puis exigences / catégories /
  réponses) sont parallélisées.

- **`app/api/rfps/[rfpId]/versions/route.ts`** — N+1 : 6 requêtes par version,
  dont deux fois la même liste de statuts fournisseurs et un chargement complet
  des réponses. Remplacé par 2 requêtes globales agrégées en mémoire. 12
  `console.log` par appel supprimés.

- **`lib/supabase/queries.ts`** — `getRequirementBreadcrumb` remontait la
  chaîne des parents avec une requête séquentielle par ancêtre ; la chaîne est
  désormais résolue en mémoire. Les 9 `console.log` du chemin chaud de
  `getRFPCompletionPercentage` sont supprimés et ses trois lectures sont
  parallélisées.

- **`app/api/auth/me/route.ts`** — profil et organisations lus en parallèle,
  logs de debug supprimés.

- **`app/api/rfps/[rfpId]/route.ts`** — renvoie maintenant aussi
  `userAccessLevel` et `responsesCount` (ajouts, pas de rupture de contrat),
  ce qui permet à la page « evaluate » de ne plus appeler `/dashboard` pour
  quatre scalaires.

- **`supabase/migrations/20260902_add_performance_indexes.sql`** — index
  composites sur `responses(rfp_id, version_id)`,
  `responses(version_id, supplier_id, is_checked)` et
  `rfp_user_assignments(rfp_id, user_id)`, qui correspondent aux filtres
  réellement utilisés par les chemins chauds. **Migration à appliquer.**

### Client

- **`hooks/use-auth.ts`** — le hook était un `useState`/`useEffect` : chaque
  composant qui l'appelait déclenchait son propre `/api/auth/me`. Jusqu'à 5
  appels identiques par page (layout, navbar, page, deux grilles financières).
  Passé sous React Query : un seul appel partagé, et l'identité est conservée
  d'une navigation à l'autre.

- **`contexts/VersionContext.tsx`** — le provider est monté par le layout du
  dashboard, donc remonté à chaque navigation entre onglets d'un RFP, et
  refetchait la liste des versions à chaque fois. Passé sous React Query.

- **`app/dashboard/rfp/[rfpId]/summary/page.tsx`** — l'effet se déclenchait
  avant la résolution de la version active, ce qui chargeait le dashboard
  complet une première fois sans version puis une seconde fois avec. Corrigé,
  et les trois appels (dashboard, fournisseurs, documents) qui s'enchaînaient
  sont désormais parallèles.

- **Découpage du bundle** — `exceljs` / `jspdf` / `jspdf-autotable` chargés à
  la demande dans les handlers d'export ; onglets et modales de la page
  « summary » en `next/dynamic` ; `material-react-table` + MUI de la page
  « synthesis » et l'éditeur de code de la page « import » également.

## Bugs de justesse corrigés au passage

- **Troncature silencieuse à 1 000 lignes.** PostgREST plafonne chaque réponse
  à 1 000 lignes. Un RFP de 200 exigences × 10 fournisseurs produit 2 000
  réponses : le dashboard, le taux d'avancement et les exports en perdaient une
  partie sans erreur. `lib/supabase/fetch-all.ts` pagine désormais ces lectures
  (avec un ordre de tri stable pour éviter les doublons entre pages).

- **`lib/gcs.ts` lève une exception à l'import** si `GCP_PROJECT_ID` est
  absent, ce qui fait échouer `next build` en entier (« Failed to collect page
  data »). Non corrigé ici — la variable doit être fournie, mais le `throw` au
  niveau module gagnerait à être déplacé dans `getGCSClient()`.

## Vérification

- `npx tsc --noEmit` : OK
- `npm run build` : OK, tableau des tailles ci-dessus
- `node scripts/perf/dashboard-aggregate-bench.ts` : sortie identique à
  l'ancienne implémentation sur les trois jeux de données, gains ci-dessus
- Pas de suite de tests dans le dépôt (`npm test` n'existe pas et ESLint n'est
  pas configuré) : la comparaison avant/après du script de benchmark tient lieu
  de test de non-régression sur la partie la plus réécrite.

## Suites possibles

1. Appliquer la migration d'index et mesurer en conditions réelles (les gains
   d'allers-retours ci-dessus sont comptés, pas chronométrés sur la prod).
2. Le endpoint `/dashboard` reste gros : il renvoie `weightsConfiguration` avec
   toutes les exigences alors que la page « summary » n'en utilise qu'une
   partie. Le découper par onglet réduirait encore le payload.
3. `GET /api/rfps/{id}/responses` charge toutes les réponses d'un RFP côté
   client ; une pagination ou un filtrage serveur par catégorie serait le
   prochain gain sur la page « evaluate ».
4. Les pages du dashboard sont toutes `"use client"` ; passer les en-têtes en
   Server Components supprimerait le waterfall auth → données.
