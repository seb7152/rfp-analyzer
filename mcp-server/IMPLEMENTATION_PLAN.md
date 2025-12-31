# Plan d'Implémentation - Serveur MCP RFP Analyzer

**Version**: 1.1
**Date**: 2025-12-31
**Statut**: 🔄 En cours de développement
**Références MCP**: [Spec Officielle](https://modelcontextprotocol.io/specification/2025-11-25)

---

## 📋 Meilleures Pratiques MCP (Best Practices)

### ✅ Principes Fondamentaux

1. **Validation stricte avec Zod**
   - Tous les inputs/outputs doivent utiliser Zod schemas
   - Messages d'erreur détaillés en cas de validation fail
   - Support de types TypeScript natif

2. **Logging sécurisé**
   - Pour STDIO : **JAMAIS** console.log, uniquement console.error ou logger dédié
   - Pour HTTP : console.log acceptable mais utiliser un logger structuré
   - Log levels : debug, info, warn, error

3. **Gestion d'erreurs robuste**
   - Try/catch sur tous les handlers
   - Retour structuré avec `isError: true` si erreur
   - Messages d'erreur user-friendly + détails techniques dans logs

4. **Contextualisation complète**
   - Chaque request reçoit `MCPContext` avec user/org/permissions
   - Isolation multi-tenant garantie par auth middleware
   - Pass-through du context aux outils internes

5. **Performance monitoring**
   - Timing des requêtes (start/end)
   - Métriques par outil/type de requête
   - Alertes sur les requêtes lentes (>2s)

### 🏗️ Architecture Multi-Transport

```typescript
// Transport configuration
const TRANSPORT_CONFIG = {
  // HTTP (Production)
  http: {
    basePath: "/api/mcp",
    timeout: 60000, // 60s
    cors: true,
  },
  // STDIO (Development)
  stdio: {
    timeout: 120000, // 120s (plus long pour complex queries)
    bufferSize: 1024 * 1024, // 1MB buffer
  },
};
```

---

## 📋 État Actuel

### ✅ Déjà Implémenté

- [x] Infrastructure Next.js 14 + MCP SDK
- [x] Routes API MCP (`/api/mcp/[transport]/route.ts`)
- [x] Client Supabase configuré
- [x] Système d'authentification PAT
- [x] Middleware de sécurité
- [x] Outils de gestion des tokens :
  - `test_connection`
  - `create_personal_access_token`
  - `list_my_tokens`
  - `revoke_token`
- [x] Migration base de données pour PAT

### ⚠️ Améliorations Requises (MCP Best Practices)

- [ ] Remplacer console.log par logger structuré (p/STDIO)
- [ ] Ajouter validation Zod sur tous les inputs/outputs
- [ ] Implementer \_meta timing dans les réponses
- [ ] Structurer les messages d'erreur
- [ ] Ajouter support parameter completion
- [ ] Documenter chaque outil avec descriptif détaillé

### 🔄 En Cours / À Faire

- [ ] Resources MCP (implémentation complète avec subscribe)
- [ ] Tools métier (avec validation Zod complète)
- [ ] Système de calcul de scores/moyennes
- [ ] Exports avec formatting multiple (JSON/Markdown/CSV)
- [ ] Prompts MCP (templates de workflows)
- [ ] Tests unitaires + integration
- [ ] Documentation + exemples d'usage

---

## 🎯 Roadmap Détaillée

### Phase 1: Fondations des Données (Priorité 1) ⭐

**Objectif**: Permettre la consultation de base des RFPs et exigences

#### 1.1 Resources RFP

**Fichier**: `lib/mcp/resources/rfps.ts`

```typescript
// À implémenter
- rfp://list
- rfp://{rfp_id}
- rfp://{rfp_id}/summary
```

**Requêtes Supabase nécessaires:**

```typescript
// Liste RFPs avec compteurs
SELECT
  rfps.*,
  COUNT(DISTINCT requirements.id) as requirements_count,
  COUNT(DISTINCT suppliers.id) as suppliers_count,
  COUNT(DISTINCT requirements.id) FILTER (WHERE requirements.level = 1) as domains_count
FROM rfps
LEFT JOIN requirements ON requirements.rfp_id = rfps.id
LEFT JOIN suppliers ON suppliers.rfp_id = rfps.id
WHERE rfps.organization_id = $1
GROUP BY rfps.id

// Détails RFP avec domaines
SELECT
  d.title as domain_name,
  d.code as domain_code,
  COUNT(r.id) as requirements_count,
  d.weight
FROM requirements d
LEFT JOIN requirements r ON r.parent_id IN (
  SELECT id FROM requirements
  WHERE parent_id IN (
    SELECT id FROM requirements WHERE parent_id = d.id
  )
) OR r.parent_id IN (SELECT id FROM requirements WHERE parent_id = d.id)
WHERE d.rfp_id = $1 AND d.level = 1
GROUP BY d.id
```

**Tests à créer:**

- [ ] GET rfp://list retourne tous les RFPs de l'org
- [ ] GET rfp://{id} retourne détails complets
- [ ] Isolation multi-tenant fonctionne
- [ ] Statistiques sont correctes

**Estimation**: 3-4 jours

---

#### 1.2 Resources Requirements

**Fichier**: `lib/mcp/resources/requirements.ts`

```typescript
// À implémenter
- requirements://{rfp_id}/tree
- requirements://{rfp_id}/domain/{domain_name}
- requirements://{requirement_id}
```

**Fonctions utilitaires à créer:**

```typescript
// lib/mcp/utils/requirements-tree.ts
export function buildRequirementsTree(
  flatRequirements: Requirement[]
): RequirementNode[] {
  // Construire l'arbre hiérarchique à 4 niveaux
}

export function filterByDomain(
  requirements: Requirement[],
  domainName: string
): Requirement[] {
  // Filtrer par domaine
}

export async function getRequirementWithResponses(
  requirementId: string,
  supplierIds?: string[]
): Promise<RequirementWithResponses> {
  // Récupérer exigence + réponses + calcul scores
}
```

**Requêtes Supabase:**

```typescript
// Tree complet
SELECT * FROM requirements
WHERE rfp_id = $1
ORDER BY level, sort_order

// Par domaine avec réponses (optionnel)
SELECT
  r.*,
  res.id as response_id,
  res.response_text,
  res.ai_score,
  res.manual_score,
  COALESCE(res.manual_score, res.ai_score) as final_score,
  res.status,
  s.id as supplier_id,
  s.name as supplier_name
FROM requirements r
LEFT JOIN requirements domain ON domain.level = 1 AND domain.rfp_id = r.rfp_id
LEFT JOIN responses res ON res.requirement_id = r.id
LEFT JOIN suppliers s ON s.id = res.supplier_id
WHERE r.rfp_id = $1
  AND domain.title = $2
  AND (r.level = 4)  -- Seulement les exigences finales
  AND ($3::uuid[] IS NULL OR s.id = ANY($3))
ORDER BY r.code
```

**Tests à créer:**

- [ ] Tree retourne hiérarchie complète 4 niveaux
- [ ] Filtrage par domaine fonctionne
- [ ] Include/exclude responses fonctionne
- [ ] Filtrage par supplier_ids fonctionne

**Estimation**: 4-5 jours

---

#### 1.3 Resources Suppliers

**Fichier**: `lib/mcp/resources/suppliers.ts`

```typescript
// À implémenter
- suppliers://{rfp_id}/list
- suppliers://{supplier_id}
```

**Requêtes avec statistiques:**

```typescript
// Liste avec stats
SELECT
  s.*,
  COUNT(res.id) as total_responses,
  COUNT(res.id) FILTER (WHERE res.manual_score IS NOT NULL) as evaluated_responses,
  AVG(COALESCE(res.manual_score, res.ai_score)) as avg_score,
  COUNT(res.id) FILTER (WHERE res.status = 'pass') as pass_count,
  COUNT(res.id) FILTER (WHERE res.status = 'pending') as pending_count
FROM suppliers s
LEFT JOIN responses res ON res.supplier_id = s.id
WHERE s.rfp_id = $1
GROUP BY s.id

// Scores par domaine pour un fournisseur
SELECT
  domain.title as domain_name,
  COUNT(res.id) as responses_count,
  AVG(COALESCE(res.manual_score, res.ai_score)) as avg_score
FROM suppliers s
JOIN responses res ON res.supplier_id = s.id
JOIN requirements req ON req.id = res.requirement_id
JOIN requirements domain ON (
  domain.id = req.parent_id
  OR domain.id IN (
    SELECT parent_id FROM requirements WHERE id = req.parent_id
  )
  OR domain.id IN (
    SELECT parent_id FROM requirements
    WHERE id IN (SELECT parent_id FROM requirements WHERE id = req.parent_id)
  )
) AND domain.level = 1
WHERE s.id = $1
GROUP BY domain.id, domain.title
```

**Tests à créer:**

- [ ] Liste retourne tous les suppliers avec stats
- [ ] Statistiques sont correctes
- [ ] Scores par domaine corrects

**Estimation**: 2-3 jours

---

### Phase 2: Scores et Moyennes (Priorité 2) ⭐⭐

**Objectif**: Calculer et exposer les scores/moyennes pour l'analyse comparative

#### 2.1 Utilitaires de Calcul de Scores

**Fichier**: `lib/mcp/utils/score-calculator.ts`

```typescript
export interface ScoreStatistics {
  avg_score: number;
  median_score: number;
  min_score: number;
  max_score: number;
  std_deviation: number;
  responses_count: number;
  completion_rate: string;
  best_supplier?: string;
  worst_supplier?: string;
  scores_distribution: Record<string, number>;
  status_breakdown: {
    pass: number;
    partial: number;
    fail: number;
    pending: number;
  };
}

export interface ResponseConsolidated {
  score: number; // = manual_score ?? ai_score
  comment: string; // = manual_comment ?? ai_comment
  status: string;
  supplier_name: string;
  evaluated_by?: string; // Si manual_score existe
  evaluated_at?: string; // Si manual_score existe

  // Optionnel (si include_details=true)
  details?: {
    ai_score: number;
    ai_comment: string;
    manual_score: number | null;
    manual_comment: string | null;
  };
}

export function consolidateResponse(response: any): ResponseConsolidated {
  return {
    score: response.manual_score ?? response.ai_score,
    comment: response.manual_comment ?? response.ai_comment,
    status: response.status,
    supplier_name: response.supplier_name,
    evaluated_by: response.manual_score ? response.evaluated_by : null,
    evaluated_at: response.manual_score ? response.evaluated_at : null,
  };
}

export function calculateScoreStats(
  responses: Array<ResponseConsolidated>
): ScoreStatistics {
  // Implémenter tous les calculs statistiques

  // Moyenne
  const scores = responses.map((r) => r.score);
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;

  // Médiane
  const sorted = [...scores].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];

  // Écart-type
  const variance =
    scores.reduce((sum, score) => sum + Math.pow(score - avg, 2), 0) /
    scores.length;
  const std_deviation = Math.sqrt(variance);

  // Distribution
  const distribution = scores.reduce(
    (acc, score) => {
      acc[score] = (acc[score] || 0) + 1;
      return acc;
    },
    {} as Record<number, number>
  );

  // Status breakdown
  const status_breakdown = responses.reduce(
    (acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    },
    { pass: 0, partial: 0, fail: 0, pending: 0 }
  );

  return {
    avg_score: avg,
    median_score: median,
    min_score: Math.min(...scores),
    max_score: Math.max(...scores),
    std_deviation,
    responses_count: responses.length,
    completion_rate: `${Math.round((responses.length / totalExpected) * 100)}%`,
    scores_distribution: distribution,
    status_breakdown,
  };
}
```

**Tests à créer:**

- [ ] Calcul moyenne correct
- [ ] Calcul médiane correct
- [ ] Écart-type correct
- [ ] Distribution correcte
- [ ] Gestion des cas limites (0 responses, scores null)

**Estimation**: 2 jours

---

#### 2.2 Tool: get_requirements_scores

**Fichier**: `lib/mcp/tools/scoring/get-requirements-scores.ts`

```typescript
server.tool(
  "get_requirements_scores",
  {
    rfp_id: z.string().uuid(),
    filters: z
      .object({
        domain_names: z.array(z.string()).optional(),
        requirement_ids: z.array(z.string().uuid()).optional(),
        supplier_ids: z.array(z.string().uuid()).optional(),
      })
      .optional(),
    include_responses: z.boolean().default(false),
    include_stats: z.boolean().default(true),
    sort_by: z.enum(["code", "avg_score", "variance"]).default("code"),
  },
  async (
    { rfp_id, filters, include_responses, include_stats, sort_by },
    { context }
  ) => {
    // 1. Vérifier permissions
    await checkPermissions(context, ["responses:read", "requirements:read"]);

    // 2. Récupérer exigences avec filtres
    const requirements = await getRequirements(rfp_id, filters);

    // 3. Pour chaque exigence, récupérer les réponses et calculer stats
    const results = await Promise.all(
      requirements.map(async (req) => {
        const responses = await getResponses(req.id, filters?.supplier_ids);
        const stats = calculateScoreStats(responses);

        return {
          requirement: {
            id: req.id,
            code: req.code,
            title: req.title,
            domain: req.domain,
            weight: req.weight,
          },
          scores_by_supplier: responses.map((r) => ({
            supplier: { id: r.supplier_id, name: r.supplier_name },
            ai_score: r.ai_score,
            manual_score: r.manual_score,
            final_score: r.final_score,
            status: r.status,
            has_comment: !!r.manual_comment,
            evaluated_at: r.evaluated_at,
          })),
          statistics: include_stats ? stats : undefined,
        };
      })
    );

    // 4. Trier selon sort_by
    const sorted = sortResults(results, sort_by);

    // 5. Calculer stats globales
    const global_stats = calculateGlobalStats(sorted);

    return {
      rfp_id,
      requirements_count: sorted.length,
      requirements: sorted,
      global_statistics: global_stats,
    };
  }
);
```

**Tests à créer:**

- [ ] Retourne scores pour toutes les exigences
- [ ] Filtrage par domaine fonctionne
- [ ] Tri par avg_score fonctionne
- [ ] Tri par variance fonctionne
- [ ] Stats globales correctes

**Estimation**: 3-4 jours

---

#### 2.3 Tool: get_scores_matrix

**Fichier**: `lib/mcp/tools/scoring/get-scores-matrix.ts`

```typescript
server.tool(
  "get_scores_matrix",
  {
    rfp_id: z.string().uuid(),
    domain_name: z.string().optional(),
    supplier_ids: z.array(z.string().uuid()).optional(),
    score_type: z.enum(["ai", "manual", "final"]).default("final")
  },
  async ({ rfp_id, domain_name, supplier_ids, score_type }, { context }) => {
    // 1. Récupérer exigences
    // 2. Récupérer tous les fournisseurs (ou filtrés)
    // 3. Construire la matrice
    // 4. Calculer totaux

    return {
      rfp_id,
      domain: domain_name,
      score_type,
      suppliers: [...],
      matrix: [...],
      totals: {...}
    };
  }
);
```

**Tests à créer:**

- [ ] Matrice correcte pour tous les fournisseurs
- [ ] Filtrage par domaine fonctionne
- [ ] Filtrage par supplier_ids fonctionne
- [ ] Totaux corrects
- [ ] Format tableau alternatif correct

**Estimation**: 2-3 jours

---

#### 2.4 Enrichissement des Resources avec Scores

**Fichiers**: Modifier `requirements.ts`, `responses.ts`

- Ajouter `scores_summary` dans `requirements://{requirement_id}`
- Ajouter `final_score` dans toutes les réponses
- Ajouter `scores_summary` dans `requirements://{rfp_id}/domain/{domain}?include_responses=true`

**Estimation**: 1-2 jours

---

### Phase 3: Consultation Avancée (Priorité 3)

**Objectif**: Permettre des requêtes complexes et flexibles

#### 3.1 Resource: responses://{rfp_id}/by-domain

**Fichier**: `lib/mcp/resources/responses.ts`

**Estimation**: 3-4 jours

#### 3.2 Tool: get_rfp_with_responses

**Fichier**: `lib/mcp/tools/consultation/get-rfp-with-responses.ts`

**Estimation**: 4-5 jours

#### 3.3 Tool: search_responses

**Fichier**: `lib/mcp/tools/consultation/search-responses.ts`

**Estimation**: 2-3 jours

---

### Phase 4: Comparaison (Priorité 4)

#### 4.1 Tool: compare_suppliers

**Fichier**: `lib/mcp/tools/comparison/compare-suppliers.ts`

**Estimation**: 4-5 jours

#### 4.2 Tool: get_domain_analysis

**Fichier**: `lib/mcp/tools/analysis/get-domain-analysis.ts`

**Estimation**: 3-4 jours

---

### Phase 5: Export (Priorité 5)

#### 5.1 Export JSON

**Fichier**: `lib/mcp/tools/export/export-domain-responses.ts`

**Estimation**: 2 jours

#### 5.2 Export Markdown

**Fichier**: `lib/mcp/tools/export/formatters/markdown.ts`

**Estimation**: 2-3 jours

#### 5.3 Export CSV (Matrix)

**Fichier**: `lib/mcp/tools/export/formatters/csv.ts`

**Estimation**: 1-2 jours

---

## 📁 Structure de Fichiers Cible (MCP Best Practices)

```
mcp-server/
├── app/
│   └── api/
│       └── mcp/
│           └── [transport]/
│               └── route.ts                 # ✅ Serveur MCP principal (HTTP+STDIO)
│
├── lib/
│   ├── supabase/
│   │   └── client.ts                       # ✅ Client Supabase
│   │
│   ├── mcp/
│   │   ├── auth/
│   │   │   ├── middleware.ts               # ✅ Auth/permissions (MCP context)
│   │   │   └── tokens.ts                   # ✅ Gestion PAT
│   │   │
│   │   ├── resources/
│   │   │   ├── index.ts                    # 📋 Export tous les resources
│   │   │   ├── rfps.ts                     # 📋 Resources RFP
│   │   │   ├── requirements.ts             # 📋 Resources Requirements
│   │   │   ├── suppliers.ts                # 📋 Resources Suppliers
│   │   │   └── responses.ts                # 📋 Resources Responses
│   │   │
│   │   ├── tools/
│   │   │   ├── index.ts                    # 📋 Export tous les tools
│   │   │   │
│   │   │   ├── auth/
│   │   │   │   └── tokens.ts               # ✅ Outils gestion tokens
│   │   │   │
│   │   │   ├── scoring/
│   │   │   │   ├── get-requirements-scores.ts   # 📋 Scores par exigence
│   │   │   │   └── get-scores-matrix.ts         # 📋 Matrice scores
│   │   │   │
│   │   │   ├── consultation/
│   │   │   │   ├── get-rfp-with-responses.ts    # 📋 Consultation complète
│   │   │   │   └── search-responses.ts          # 📋 Recherche
│   │   │   │
│   │   │   ├── comparison/
│   │   │   │   └── compare-suppliers.ts         # 📋 Comparaison
│   │   │   │
│   │   │   ├── analysis/
│   │   │   │   └── get-domain-analysis.ts       # 📋 Analyse domaine
│   │   │   │
│   │   │   └── export/
│   │   │       ├── export-domain-responses.ts   # 📋 Export principal
│   │   │       ├── generate-comparison-report.ts # 📋 Rapport
│   │   │       └── formatters/
│   │   │           ├── json.ts
│   │   │           ├── markdown.ts
│   │   │           └── csv.ts
│   │   │
│   │   └── utils/
│   │       ├── logger.ts                     # ✅ Logging sécurisé (stderr only)
│   │       ├── requirements-tree.ts        # 🔄 Hiérarchie exigences
│   │       ├── score-calculator.ts         # 🔄 Calculs statistiques
│   │       ├── query-builder.ts            # 🔄 Construction requêtes
│   │       ├── formatters.ts               # 📋 Formatage données
│   │       └── zod-schemas.ts             # ✅ Schemas validation Zod
│   │
│   └── logger/
│       ├── index.ts                        # ✅ Logger structuré
│       └── transport.ts                    # ✅ Log transport (console/file)
│
├── types/
│   ├── mcp.ts                              # ✅ Types MCP
│   ├── database.ts                         # 📋 Types Supabase
│   └── api.ts                              # 📋 Types API responses
│
├── tests/
│   ├── unit/
│   │   ├── utils/
│   │   │   ├── score-calculator.test.ts
│   │   │   └── requirements-tree.test.ts
│   │   └── zod/
│   │       └── schemas.test.ts
│   │
│   ├── integration/
│   │   ├── resources/
│   │   │   ├── rfps.test.ts
│   │   │   └── requirements.test.ts
│   │   └── tools/
│   │       └── scoring.test.ts
│   │
│   └── e2e/
│       ├── scenarios/
│       │   ├── basic-rfp-usage.test.ts
│       │   └── supplier-comparison.test.ts
│       └── mcp-inspector.config.ts
│
├── supabase/
│   └── migrations/
│       ├── 001_create_pat_tokens.sql       # ✅ Migration PAT
│       ├── 002_create_mcp_audit_logs.sql # 📋 Audit logs
│       └── 003_rls_policies.sql            # 📋 RLS policies
│
├── SPECS.md                                # ✅ Spécifications complètes
├── FEATURES_SUMMARY.md                     # ✅ Résumé fonctionnalités
├── IMPLEMENTATION_PLAN.md                  # ✅ Ce fichier
├── ARCHITECTURE.md                         # ✅ Diagrammes architecture
├── MCP_BEST_PRACTICES.md                  # 📋 Meilleures pratiques MCP
├── README.md                               # ✅ Guide démarrage
├── package.json
├── tsconfig.json
├── next.config.js
└── vercel.json

Légende:
✅ Implémenté
🔄 En cours / Priorité haute
📋 À faire
📋 Documentation/Best Practices
```

---

## 📋 Architecture Code (MCP Patterns)

### Server Handler Pattern

```typescript
// lib/mcp/server.ts - Serveur MCP centralisé
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createLogger } from "./lib/logger";
import { registerAllResources } from "./resources";
import { registerAllTools } from "./tools";
import { authMiddleware } from "./auth/middleware";

const logger = createLogger("mcp:server");

export async function createMCPServer() {
  const server = new McpServer({
    name: "rfp-analyzer",
    version: "1.0.0",
  });

  // 1. Configurer le middleware d'authentification
  server.use(authMiddleware);

  // 2. Enregistrer toutes les resources
  await registerAllResources(server);
  logger.info("Resources registered", {
    count: 8, // rfps, requirements, suppliers, responses, etc.
  });

  // 3. Enregistrer tous les tools
  await registerAllTools(server);
  logger.info("Tools registered", {
    count: 12, // get_scores, compare_suppliers, export, etc.
  });

  return server;
}
```

### Resource Registration Pattern

```typescript
// lib/mcp/resources/index.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerRFPResources } from "./rfps";
import { registerRequirementResources } from "./requirements";
import { registerSupplierResources } from "./suppliers";
import { registerResponseResources } from "./responses";
import { createLogger } from "../utils/logger";

const logger = createLogger("mcp:resources");

export async function registerAllResources(server: McpServer) {
  logger.info("Registering resources...");

  await registerRFPResources(server);
  await registerRequirementResources(server);
  await registerSupplierResources(server);
  await registerResponseResources(server);

  logger.info("All resources registered successfully");
}
```

### Tool Registration Pattern

```typescript
// lib/mcp/tools/index.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAuthTools } from "./auth/tokens";
import { registerScoringTools } from "./scoring";
import { registerConsultationTools } from "./consultation";
import { registerComparisonTools } from "./comparison";
import { registerExportTools } from "./export";
import { createLogger } from "../utils/logger";

const logger = createLogger("mcp:tools");

export async function registerAllTools(server: McpServer) {
  logger.info("Registering tools...");

  await registerAuthTools(server);
  await registerScoringTools(server);
  await registerConsultationTools(server);
  await registerComparisonTools(server);
  await registerExportTools(server);

  logger.info("All tools registered successfully");
}
```

### Validation Pattern (Zod)

```typescript
// lib/mcp/utils/zod-schemas.ts
import { z } from "zod";

// Input schema avec validation stricte
export const GetRequirementsScoresSchema = z.object({
  rfp_id: z.string().uuid("RFP ID must be a valid UUID"),
  filters: z
    .object({
      domain_names: z.array(z.string()).optional(),
      requirement_ids: z.array(z.string().uuid()).optional(),
      supplier_ids: z.array(z.string().uuid()).optional(),
      min_score: z.number().min(0).max(5).optional(),
      max_score: z.number().min(0).max(5).optional(),
    })
    .optional(),
  include_responses: z.boolean().default(false),
  include_stats: z.boolean().default(true),
  sort_by: z.enum(["code", "avg_score", "variance"]).default("code"),
});

export const CompareSuppliersSchema = z.object({
  rfp_id: z.string().uuid(),
  supplier_ids: z
    .array(z.string().uuid())
    .min(2)
    .max(10)
    .refine((ids) => new Set(ids).size === ids.length, {
      message: "Supplier IDs must be unique",
    }),
  scope: z.discriminatedUnion("type", [
    z.object({
      type: z.literal("full_rfp"),
    }),
    z.object({
      type: z.literal("domain"),
      domain_name: z.string().min(1).max(255),
    }),
    z.object({
      type: z.literal("requirements"),
      requirement_ids: z.array(z.string().uuid()).min(1),
    }),
  ]),
  comparison_mode: z
    .enum(["side_by_side", "matrix", "summary"])
    .default("side_by_side"),
});

// Output schema pour validation
export const ToolResponseSchema = z.object({
  content: z.array(
    z.object({
      type: z.enum(["text", "image", "resource"]),
      data: z.any(),
    })
  ),
  isError: z.boolean().optional(),
  _meta: z
    .object({
      timing: z.number().optional(),
      requestId: z.string().uuid().optional(),
    })
    .optional(),
});
```

```
mcp-server/
├── app/
│   └── api/
│       └── mcp/
│           └── [transport]/
│               └── route.ts                 # Point d'entrée MCP
│
├── lib/
│   ├── supabase/
│   │   └── client.ts                       # Client Supabase
│   │
│   └── mcp/
│       ├── auth/
│       │   ├── middleware.ts               # ✅ Auth/permissions
│       │   └── tokens.ts                   # ✅ Gestion PAT
│       │
│       ├── resources/
│       │   ├── index.ts                    # Export tous les resources
│       │   ├── rfps.ts                     # 🔄 Resources RFP
│       │   ├── requirements.ts             # 🔄 Resources Requirements
│       │   ├── suppliers.ts                # 🔄 Resources Suppliers
│       │   └── responses.ts                # 📋 Resources Responses
│       │
│       ├── tools/
│       │   ├── index.ts                    # Export tous les tools
│       │   │
│       │   ├── auth/
│       │   │   └── tokens.ts               # ✅ Outils gestion tokens
│       │   │
│       │   ├── scoring/
│       │   │   ├── get-requirements-scores.ts   # 🔄 Scores par exigence
│       │   │   └── get-scores-matrix.ts         # 🔄 Matrice scores
│       │   │
│       │   ├── consultation/
│       │   │   ├── get-rfp-with-responses.ts    # 📋 Consultation complète
│       │   │   └── search-responses.ts          # 📋 Recherche
│       │   │
│       │   ├── comparison/
│       │   │   └── compare-suppliers.ts         # 📋 Comparaison
│       │   │
│       │   ├── analysis/
│       │   │   └── get-domain-analysis.ts       # 📋 Analyse domaine
│       │   │
│       │   └── export/
│       │       ├── export-domain-responses.ts   # 📋 Export principal
│       │       ├── generate-comparison-report.ts # 📋 Rapport
│       │       └── formatters/
│       │           ├── json.ts
│       │           ├── markdown.ts
│       │           └── csv.ts
│       │
│       └── utils/
│           ├── requirements-tree.ts        # 🔄 Hiérarchie exigences
│           ├── score-calculator.ts         # 🔄 Calculs statistiques
│           ├── query-builder.ts            # 🔄 Construction requêtes
│           └── formatters.ts               # 📋 Formatage données
│
├── types/
│   └── mcp.ts                              # ✅ Types MCP
│
├── supabase/
│   └── migrations/
│       └── 001_create_pat_tokens.sql       # ✅ Migration PAT
│
├── tests/
│   ├── resources/
│   │   ├── rfps.test.ts
│   │   ├── requirements.test.ts
│   │   └── suppliers.test.ts
│   │
│   ├── tools/
│   │   ├── scoring.test.ts
│   │   ├── consultation.test.ts
│   │   └── comparison.test.ts
│   │
│   └── utils/
│       ├── score-calculator.test.ts
│       └── requirements-tree.test.ts
│
├── SPECS.md                                # ✅ Spécifications complètes
├── FEATURES_SUMMARY.md                     # ✅ Résumé fonctionnalités
├── IMPLEMENTATION_PLAN.md                  # ✅ Ce fichier
└── README.md                               # ✅ Guide démarrage

Légende:
✅ Implémenté
🔄 En cours / Priorité haute
📋 À faire
```

---

## 🧪 Stratégie de Test

### Tests Unitaires

- Tous les utilitaires (`score-calculator`, `requirements-tree`, etc.)
- Couverture > 80%
- Mock Supabase client pour tests isolés

### Tests d'Intégration

- Chaque Resource avec données réelles (Supabase test DB)
- Chaque Tool avec différentes combinaisons de paramètres
- Tests de permissions multi-tenant
- Tests de validation Zod (edge cases)

### Tests E2E avec MCP Inspector

```bash
# Local testing
npm run dev
npx @modelcontextprotocol/inspector http://localhost:3000/api/mcp

# Remote testing (Vercel)
npx @modelcontextprotocol/inspector https://votre-app.vercel.app/api/mcp
```

### Tests de Performance

- Requêtes avec 200+ exigences
- 10 fournisseurs
- Temps de réponse < 2s (95e percentile)
- Tests de charge concurrents

### Debugging MCP

**Logs Claude Desktop (MacOS)**:

```bash
# Suivre les logs MCP en temps réel
tail -n 50 -f ~/Library/Logs/Claude/mcp*.log

# Logs spécifiques par serveur
tail -n 50 -f ~/Library/Logs/Claude/mcp-server-rfp-analyzer.log
```

**Stratégies de debugging**:

1. Ajouter `verboseLogs: true` en développement
2. Capturer les erreurs avec stack traces
3. Loguer tous les paramètres reçus (anonymisés)
4. Identifier les timeouts (network vs processing)
5. Valider les schemas avec Zod debugger

### Test Scenarios (FEATURES_SUMMARY.md)

```typescript
// 1. Basic RFP listing
Tool: rfp://list
Expected: Array of RFP objects with basic stats

// 2. Domain exploration
Resource: requirements://{rfp_id}/domain/Sécurité?include_responses=true
Expected: 35 requirements × 5 suppliers responses

// 3. Score matrix
Tool: get_scores_matrix({ rfp_id, domain_name: "Sécurité" })
Expected: Matrix [35 req × 5 suppliers] + totals

// 4. Supplier comparison
Tool: compare_suppliers({
  rfp_id,
  supplier_ids: [id1, id2, id3],
  scope: { type: "domain", domain_name: "Infrastructure" }
})
Expected: Side-by-side comparison + summary

// 5. Export markdown
Tool: export_domain_responses({
  rfp_id,
  domain_name: "Conformité",
  format: "markdown"
})
Expected: Formatted markdown document
```

---

## 🔐 Sécurité MCP (Security)

### User Consent & Control

Tous les tools doivent implémenter des mécanismes de consentement :

```typescript
// 1. Permission checks dans le handler
server.tool(
  "compare_suppliers",
  /* schema */,
  async (params, context) => {
    // Vérifier que l'utilisateur a le droit de comparer
    if (!hasPermission(context.permissions, "suppliers:read")) {
      return {
        content: [{
          type: "text",
          text: "Permission refusée : accès suppliers:read requis"
        }],
        isError: true
      };
    }
    // ... suite du traitement
  }
);

// 2. Audit logging (traçabilité complète)
await logMCPAction({
  userId: context.user?.id,
  organizationId: context.organizationId,
  action: "compare_suppliers",
  resource: params.rfp_id,
  metadata: {
    supplierIds: params.supplier_ids,
    scope: params.scope
  }
});
```

### Data Privacy

- [ ] Implémenter RLS (Row Level Security) Supabase
- [ ] Ne jamais transmettre de PII dans les logs
- [ ] Anonymiser les données sensibles dans les logs d'erreur
- [ ] Limiter la quantité de données retournées (pagination)

### Tool Safety

- [ ] Validation stricte de tous les inputs (Zod)
- [ ] Sanitization des paramètres SQL (no direct queries)
- [ ] Rate limiting par user/organisation
- [ ] Timeout sur toutes les requêtes externes (30s default)

### Security Checklist MCP

```typescript
interface SecurityChecklist {
  auth: {
    pat_validation: boolean; // ✅ Token hash vérifié
    permissions_check: boolean; // ✅ Permissions vérifiées par tool
    organization_isolation: boolean; // ✅ Isolation multi-tenant
  };
  data: {
    rls_enabled: boolean; // ✅ Row Level Security
    pii_redaction: boolean; // ✅ PII dans logs redacted
    input_validation: boolean; // ✅ Zod sur tous les inputs
  };
  network: {
    rate_limiting: boolean; // ✅ Rate limits configurés
    request_timeout: boolean; // ✅ Timeouts sur les appels
    tls_enabled: boolean; // ✅ HTTPS en production
  };
  monitoring: {
    audit_logs: boolean; // ✅ Toutes les actions logguées
    error_tracking: boolean; // ✅ Erreurs capturées
    performance_metrics: boolean; // ✅ Timing des requêtes
  };
}
```

---

## 📊 Métriques de Succès

### Fonctionnelles

- [ ] 100% des Resources implémentées (avec subscribe)
- [ ] 100% des Tools prioritaires implémentées
- [ ] 100% validation Zod sur tous les inputs/outputs
- [ ] Tous les exemples d'usage fonctionnent avec MCP Inspector

### Techniques

- [ ] Couverture tests > 80%
- [ ] Temps de réponse < 2s (95e percentile)
- [ ] Rate limiting opérationnel
- [ ] Audit logs fonctionnels (100% des actions tracées)
- [ ] 0 console.log dans le code STDIO

### Sécurité

- [ ] RLS activé sur toutes les tables
- [ ] Permissions granulaires par catégorie
- [ ] Token hashing avec SHA-256
- [ ] Audit logs dans `mcp_audit_logs`
- [ ] Rate limiting par utilisateur/organisation

### Documentation

- [ ] README à jour avec architecture
- [ ] SPECS.md complet avec schémas Zod
- [ ] IMPLEMENTATION_PLAN.md aligné avec MCP best practices
- [ ] Exemples d'usage testés et documentés
- [ ] Guide de déploiement Vercel + configuration client

---

## 🚀 Déploiement

### Environnements

1. **Development** (Local)
   - Base Supabase dédiée
   - Données de test
   - Hot reload

2. **Staging** (Vercel)
   - Base Supabase staging
   - Données anonymisées
   - Tests E2E automatisés

3. **Production** (Vercel)
   - Base Supabase prod
   - Monitoring actif
   - Backups quotidiens

### Checklist de Déploiement

- [ ] Tests passent (unit + integration + E2E)
- [ ] Performance validée (< 2s)
- [ ] Rate limiting configuré
- [ ] Variables d'environnement configurées
- [ ] Documentation à jour
- [ ] Migration DB appliquée (si nécessaire)
- [ ] Rollback plan prêt

---

## 📞 Support

**Équipe**: [Votre équipe]
**Slack**: [Canal]
**Issues**: [GitHub Issues]

---

**Dernière mise à jour**: 2025-12-29
