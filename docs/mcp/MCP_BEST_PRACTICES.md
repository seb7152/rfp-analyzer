# MCP Best Practices - RFP Analyzer Server

**Version**: 1.0
**Date**: 2025-12-31
**Basé sur**: [MCP Specification 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25)

---

## 📚 Références Officielles

1. [MCP Specification](https://modelcontextprotocol.io/specification/2025-11-25)
2. [Build Server Guide](https://modelcontextprotocol.io/docs/develop/build-server)
3. [Server Concepts](https://modelcontextprotocol.io/docs/learn/server-concepts)
4. [Security Best Practices](https://modelcontextprotocol.io/specification/2025-11-25/basic/security_best_practices)

---

## 🎯 Principes Fondamentaux

### 1. Séparation des Responsabilités (Separation of Concerns)

**MCP définit 3 types de fonctionnalités** :

| Type          | Contrôlé par | But                     | Exemples                              |
| ------------- | ------------ | ----------------------- | ------------------------------------- |
| **Tools**     | Modèle (LLM) | Actions exécutables     | `search_flights`, `book_hotel`        |
| **Resources** | Application  | Accès aux données       | `file://path`, `db://schema`          |
| **Prompts**   | Utilisateur  | Templates réutilisables | `plan_vacation`, `summarize_meetings` |

**Application à RFP Analyzer** :

```typescript
// ✅ CORRECT - Chaque type a son rôle
// TOOLS - Modèle peut décider quand les utiliser
server.tool("get_requirements_scores" /* ... */); // Actions de scoring
server.tool("compare_suppliers" /* ... */); // Actions de comparaison

// RESOURCES - Application contrôle l'accès
server.resource("rfp://{rfp_id}" /* ... */); // Données RFP
server.resource("requirements://{rfp_id}/domain/{name}" /* ... */); // Exigences par domaine

// PROMPTS - Utilisateur déclenche des workflows
server.prompt("analyze_rfp" /* ... */); // Template d'analyse complète
server.prompt("export_report" /* ... */); // Template d'export

// ❌ INCORRECT - Mélange des responsabilités
server.tool("get_rfp_data" /* fetch data from DB */); // Devrait être une Resource
```

### 2. Validation Stricte (Strict Validation)

**Toujours utiliser Zod pour les schémas** :

```typescript
import { z } from "zod";

// Input schema avec validation complète
const GetScoresSchema = z
  .object({
    rfp_id: z.string().uuid({
      message: "RFP ID must be a valid UUID",
    }),
    filters: z
      .object({
        domain_names: z
          .array(z.string())
          .min(1, "At least one domain required")
          .max(10, "Maximum 10 domains")
          .optional(),
        supplier_ids: z
          .array(z.string().uuid())
          .min(1, "At least one supplier required")
          .max(10, "Maximum 10 suppliers")
          .optional(),
      })
      .optional(),
  })
  .strict(); // Rejette les champs additionnels

// Handler avec validation
server.tool(
  "get_scores",
  {
    description: "Get supplier scores for RFP",
    inputSchema: GetScoresSchema, // Zod schema automatiquement converti
  },
  async (params) => {
    // params est déjà typé et validé !
    console.log(`RFP ID: ${params.rfp_id}`);
    // ...
  }
);
```

**Gestion des erreurs** :

```typescript
try {
  const result = await getScores(params.rfp_id);
  return { content: [{ type: "text", text: JSON.stringify(result) }] };
} catch (error) {
  // Erreur utilisateur-friendly
  if (error instanceof z.ZodError) {
    return {
      content: [
        {
          type: "text",
          text: `Validation error: ${error.errors.map((e) => e.message).join(", ")}`,
        },
      ],
      isError: true,
    };
  }

  // Erreur technique dans logs seulement
  logger.error("Failed to get scores", {
    error: error.message,
    stack: error.stack,
  });

  return {
    content: [
      {
        type: "text",
        text: "Une erreur est survenue lors de la récupération des scores",
      },
    ],
    isError: true,
  };
}
```

### 3. Logging Sécurisé (Secure Logging)

**Règle d'or pour STDIO servers** :

> **NE JAMAIS utiliser console.log()** car cela corrompt les messages JSON-RPC !

```typescript
// ❌ INCORRECT
console.log("Processing request..."); // Corrompt le flux STDIO

// ✅ CORRECT
import { createLogger } from "./lib/logger";

const logger = createLogger("tools:rfp");
logger.info("Processing request", { rfpId: params.rfp_id });
// Écrit sur stderr ou fichier, pas sur stdout
```

**Implémentation du logger sécurisé** :

```typescript
// lib/logger/index.ts
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  level: LogLevel;
  namespace: string;
  message: string;
  timestamp: string;
  data?: any;
  error?: Error;
}

export function createLogger(namespace: string) {
  return {
    debug: (message: string, data?: any) =>
      log(LogLevel.DEBUG, namespace, message, data),
    info: (message: string, data?: any) =>
      log(LogLevel.INFO, namespace, message, data),
    warn: (message: string, data?: any) =>
      log(LogLevel.WARN, namespace, message, data),
    error: (message: string, error?: Error, data?: any) =>
      log(LogLevel.ERROR, namespace, message, data, error),
  };
}

function log(
  level: LogLevel,
  namespace: string,
  message: string,
  data?: any,
  error?: Error
) {
  const entry: LogEntry = {
    level,
    namespace,
    message,
    timestamp: new Date().toISOString(),
    data,
    error: error
      ? {
          message: error.message,
          stack: error.stack,
        }
      : undefined,
  };

  // Pour STDIO : toujours utiliser console.error
  console.error(JSON.stringify(entry));

  // Pour HTTP : peut utiliser console.log ou un service de logging
  if (process.env.NODE_ENV === "production") {
    // Envoyer vers Datadog, CloudWatch, etc.
    sendToLogService(entry);
  }
}
```

### 4. Contextualisation Complète (Full Context)

**Chaque handler reçoit le contexte MCP** :

```typescript
interface MCPContext {
  user?: {
    id: string;
    email: string;
    role: string;
  };
  organizationId: string;
  permissions: PATPermissions;
  requestId: string;
  timestamp: string;
}

// Utiliser le contexte dans tous les handlers
server.tool(
  "get_requirements_scores",
  /* ... */,
  async (params, context) => {
    // Vérifier les permissions
    if (!hasPermission(context.permissions, "requirements:read")) {
      return unauthorizedResponse(context);
    }

    // Isolation multi-tenant (important !)
    const data = await supabase
      .from('requirements')
      .select('*')
      .eq('rfp_id', params.rfp_id)
      .eq('organization_id', context.organizationId); // Isolation

    // Logging avec contexte
    logger.info("Retrieved requirements", {
      userId: context.user?.id,
      orgId: context.organizationId,
      requestId: context.requestId,
      count: data.length
    });

    return successResponse(data);
  }
);
```

### 5. Performance Monitoring

**Toujours mesurer les performances** :

```typescript
server.tool(
  "get_requirements_scores",
  /* ... */,
  async (params, context) => {
    const startTime = Date.now();
    logger.debug("Tool execution started", {
      tool: "get_requirements_scores",
      params: JSON.stringify(params),
      requestId: context.requestId
    });

    try {
      const result = await executeComplexQuery(params);
      const duration = Date.now() - startTime;

      logger.info("Tool execution completed", {
        tool: "get_requirements_scores",
        duration,
        requestId: context.requestId,
        userId: context.user?.id
      });

      // Inclure le timing dans la réponse
      return {
        content: [{ type: "text", text: JSON.stringify(result) }],
        _meta: { timing: duration }
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error("Tool execution failed", {
        tool: "get_requirements_scores",
        duration,
        error: error.message,
        requestId: context.requestId
      });

      return errorResponse(error);
    }
  }
);
```

**Alertes de performance** :

```typescript
// Dans le logger ou monitoring
if (duration > 2000) {
  // > 2 secondes
  logger.warn("Slow tool execution", {
    tool,
    duration,
    threshold: 2000,
  });

  // Optionnel : envoyer une alerte
  if (process.env.NODE_ENV === "production" && duration > 5000) {
    sendPerformanceAlert({ tool, duration, params });
  }
}
```

---

## 🔐 Sécurité (Security)

### Personal Access Tokens (PAT)

**Implémentation sécurisée** :

```typescript
export class TokenManager {
  // Hasher les tokens (jamais les stocker en clair)
  static async createPAT(userId, orgId, name, permissions) {
    const token = this.generateSecureToken(); // crypto.randomBytes(32)
    const tokenHash = this.hashToken(token); // SHA-256

    // Stocker UNIQUEMENT le hash
    await supabase.from("personal_access_tokens").insert({
      user_id: userId,
      organization_id: orgId,
      name,
      token_hash: tokenHash, // ✅ Pas le token en clair !
      permissions,
    });

    return token; // Retourner le token SEULEMENT lors de la création
  }

  // Valider avec hash
  static async validatePAT(token) {
    const tokenHash = this.hashToken(token);
    return await supabase
      .from("personal_access_tokens")
      .select("*")
      .eq("token_hash", tokenHash) // ✅ Comparer les hash
      .single();
  }

  private static generateSecureToken(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  private static hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }
}
```

### Permissions Granulaires

**Modèle de permissions** :

```typescript
interface PATPermissions {
  // Permissions par catégorie
  requirements?: ("read" | "create" | "update" | "delete")[];
  suppliers?: ("read" | "create" | "update" | "delete")[];
  responses?: ("read" | "create" | "update" | "delete")[];
  comments?: ("read" | "create" | "update" | "delete")[];
  scoring?: ("read" | "create" | "update" | "delete")[];
  versions?: ("read" | "create" | "update" | "delete")[];
}

// Restrictions spécifiques
interface Restrictions {
  organization_ids?: string[]; // Limiter à certaines orgs
  rfp_ids?: string[]; // Limiter à certains RFPs
  ip_whitelist?: string[]; // IPs autorisées
  rate_limit?: {
    requests_per_minute: number;
    requests_per_hour: number;
  };
}

// Vérification des permissions
function hasPermission(permissions: PATPermissions, required: string): boolean {
  const [category, action] = required.split("_");
  const categoryPerms = permissions[category];

  return Array.isArray(categoryPerms) && categoryPerms.includes(action as any);
}
```

### Row Level Security (RLS)

**Policies Supabase** :

```sql
-- Policy pour les requirements
CREATE POLICY "Users can read their organization's requirements"
ON requirements
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id
    FROM user_organizations
    WHERE user_id = auth.uid()
  )
);

-- Policy pour les responses
CREATE POLICY "Users can read responses from their organization's RFPs"
ON responses
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM requirements r
    JOIN rfps rf ON rf.id = r.rfp_id
    JOIN user_organizations uo ON uo.organization_id = rf.organization_id
    WHERE r.id = responses.requirement_id
      AND uo.user_id = auth.uid()
  )
);
```

---

## 🚀 Patterns d'Implémentation

### Resource Template Pattern

```typescript
// Resources dynamiques avec parameters
server.resource(
  {
    uriTemplate: "requirements://{rfp_id}/domain/{domain_name}",
    name: "requirements-domain",
    description: "Get requirements by domain for an RFP",
    mimeType: "application/json",
  },
  async (uri, context) => {
    // Extraire les parameters depuis l'URI
    const params = extractParams(uri, {
      rfp_id: "string",
      domain_name: "string",
    });

    logger.info("Resource accessed", {
      uri,
      params,
      userId: context.user?.id,
    });

    // Récupérer les données
    const requirements = await getRequirementsByDomain(
      params.rfp_id,
      params.domain_name,
      context.organizationId
    );

    return {
      uri,
      mimeType: "application/json",
      content: JSON.stringify(
        {
          domain: params.domain_name,
          requirements,
        },
        null,
        2
      ),
    };
  }
);

// Support de l'autocomplétion
server.listResourceTemplates = async () => [
  {
    uriTemplate: "requirements://{rfp_id}/domain/{domain_name}",
    name: "requirements-domain",
    description: "Get requirements by domain",
    mimeType: "application/json",
  },
  {
    uriTemplate: "requirements://{rfp_id}/tree",
    name: "requirements-tree",
    description: "Get full requirements tree",
    mimeType: "application/json",
  },
];
```

### Tool avec Timeout

```typescript
import { timeout } from 'promises';

server.tool(
  "get_rfp_with_responses",
  /* ... */,
  async (params, context) => {
    const DEFAULT_TIMEOUT = 30000; // 30 secondes

    try {
      const result = await timeout(
        executeComplexQuery(params),
        DEFAULT_TIMEOUT
      );

      return successResponse(result);
    } catch (error) {
      if (error.name === 'TimeoutError') {
        logger.error("Tool timeout", {
          tool: "get_rfp_with_responses",
          timeout: DEFAULT_TIMEOUT,
          params
        });

        return {
          content: [{
            type: "text",
            text: "La requête a pris trop de temps. Veuillez réduire les filtres ou réessayer."
          }],
          isError: true
        };
      }

      throw error; // Re-throw les autres erreurs
    }
  }
);
```

### Pagination Pattern

```typescript
interface PaginatedParams {
  page?: number;
  limit?: number;
}

const PaginatedSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20)
});

server.tool(
  "list_rfps",
  /* ... */,
  async (params) => {
    const { page = 1, limit = 20 } = params;

    // Calculer offset
    const offset = (page - 1) * limit;

    // Query Supabase avec pagination
    const { data, error, count } = await supabase
      .from('rfps')
      .select('*', { count: 'exact' })
      .eq('organization_id', context.organizationId)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Retourner avec métadonnées de pagination
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          rfps: data,
          pagination: {
            page,
            limit,
            total: count,
            totalPages: Math.ceil(count / limit),
            hasNext: offset + limit < count
          }
        })
      }]
    };
  }
);
```

---

## 📊 Monitoring & Observabilité

### Métriques à collecter

```typescript
interface MCPMetrics {
  tool_executions: {
    [toolName: string]: {
      count: number;
      avgDuration: number;
      errorRate: number;
      p95Duration: number;
      p99Duration: number;
    };
  };
  resource_access: {
    [resourceUri: string]: {
      count: number;
      avgSize: number;
      errorRate: number;
    };
  };
  auth_failures: {
    count: number;
    byReason: { [reason: string]: number };
  };
}

// Collecter et envoyer les métriques
export function collectMetrics(
  type: "tool" | "resource",
  name: string,
  duration: number,
  success: boolean
) {
  const key = `${type}:${name}`;
  metrics[key] = metrics[key] || { count: 0, sumDuration: 0, errors: 0 };

  metrics[key].count++;
  metrics[key].sumDuration += duration;

  if (!success) {
    metrics[key].errors++;
  }

  // Envoyer vers monitoring service (Datadog, CloudWatch, etc.)
  if (metrics[key].count % 100 === 0) {
    // Chaque 100 exécutions
    sendMetricsToService(metrics[key]);
  }
}
```

### Audit Logs

```sql
-- Table d'audit
CREATE TABLE mcp_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  organization_id UUID REFERENCES organizations(id),
  pat_id UUID REFERENCES personal_access_tokens(id),

  -- Détails de l'action
  action_type TEXT NOT NULL, -- 'tool_call', 'resource_access', 'prompt_invoke'
  action_name TEXT NOT NULL,
  resource_type TEXT, -- 'rfp', 'requirement', 'supplier', 'response'
  resource_id UUID,

  -- Métadonnées
  params JSONB, -- Paramètres de la requête (anonymisés)
  result_status TEXT NOT NULL, -- 'success', 'error', 'timeout'
  duration_ms INTEGER,

  -- Traçabilité
  ip_address INET,
  user_agent TEXT,
  request_id TEXT,

  created_at TIMESTAMP DEFAULT NOW()
);

-- Index pour les requêtes
CREATE INDEX idx_audit_user_org ON mcp_audit_logs(user_id, organization_id, created_at DESC);
CREATE INDEX idx_audit_action ON mcp_audit_logs(action_type, action_name, created_at DESC);
```

---

## 🧪 Testing

### Testing Strategy

```typescript
// Tests unitaires - Utils isolés
describe("score-calculator", () => {
  it("calculates average correctly", () => {
    const scores = [5, 4, 5, 3, 4];
    const stats = calculateScoreStats(scores);
    expect(stats.avg).toBe(4.2);
  });

  it("handles empty arrays", () => {
    const stats = calculateScoreStats([]);
    expect(stats).toHaveProperty("avg");
  });
});

// Tests d'intégration - Avec DB de test
describe("resources:rfp", () => {
  beforeEach(async () => {
    await resetTestDatabase();
    await seedTestData();
  });

  it("returns only user organization RFPs", async () => {
    const result = await rfpResource.list(userId, orgId);
    expect(result).toHaveLength(5); // 5 RFPs pour cette org
  });

  it("respects RLS policies", async () => {
    const otherOrgRFP = await rfpResource.list(userId, otherOrgId);
    expect(otherOrgRFP).toHaveLength(0); // Accès refusé
  });
});

// Tests E2E - Avec MCP Inspector
describe("E2E: RFP Analysis Workflow", () => {
  it("completes full analysis flow", async () => {
    // 1. Lister les RFPs
    const rfps = await callTool("list_rfps");

    // 2. Sélectionner un RFP
    const rfp = rfps[0];

    // 3. Obtenir les scores
    const scores = await callTool("get_requirements_scores", {
      rfp_id: rfp.id,
      include_stats: true,
    });

    // 4. Comparer les fournisseurs
    const comparison = await callTool("compare_suppliers", {
      rfp_id: rfp.id,
      supplier_ids: [s1, s2, s3],
    });

    // 5. Exporter
    const report = await callTool("export_domain_responses", {
      rfp_id: rfp.id,
      domain_name: "Sécurité",
      format: "markdown",
    });

    // Valider le flux
    expect(rfp).toBeDefined();
    expect(scores).toHaveProperty("requirements");
    expect(comparison).toHaveProperty("summary");
    expect(report).toContain("## Sécurité");
  });
});
```

---

## 📚 Ressources Supplémentaires

1. [MCP Specification - Complete](https://modelcontextprotocol.io/specification/2025-11-25)
2. [MCP SDK GitHub](https://github.com/modelcontextprotocol/typescript-sdk)
3. [TypeScript Examples](https://github.com/modelcontextprotocol/servers/tree/main/src/typescript)
4. [MCP Inspector Tool](https://modelcontextprotocol.io/docs/tools/inspector)

---

**Dernière mise à jour** : 2025-12-31
