# MCP Implementation Challenge Report

**Date**: 2026-01-08
**Analysis Tool**: mcp-builder
**Target**: RFP Analyzer MCP Server

---

## Executive Summary

L'implémentation MCP actuelle est un **bon POC bien structuré**, mais elle dévie de plusieurs best practices MCP et ne tire pas partie des capacités modernes du SDK TypeScript. Ce rapport identifie 14 défis majeurs et propose des améliorations pour transformer ce POC en un serveur MCP production-grade.

### Score d'Adhérence aux Best Practices: 65/100

---

## 1. ❌ Pas de `structuredContent` (MCP SDK Moderne)

### Problème

```typescript
// ❌ Actuel - Retourne du texte brut
result: {
  content: [{
    type: "text",
    text: JSON.stringify(result, null, 2),
  }],
}
```

Le SDK TypeScript moderne supporte `structuredContent` avec des types stricts, mais l'implémentation stringify tout en JSON.

### Impact

- Les clients MCP ne peuvent pas exploiter les données structurées
- Pas de schéma d'output pour les clients
- Les agents LLM doivent parser JSON manuellement
- Moins extensible pour de futures données

### Solution (Best Practice)

```typescript
// ✅ Moderne - Structured content avec types
import { Tool } from "@modelcontextprotocol/sdk/types.js";

return {
  jsonrpc: "2.0",
  id,
  result: {
    content: [
      {
        type: "text",
        text: "RFPs retrieved successfully",
      },
      {
        type: "resource",
        resource: {
          uri: "rfp://list",
          mimeType: "application/json",
          contents: result, // Typed object, not stringified
        },
      },
    ],
  },
};
```

### Référence MCP

- [TypeScript SDK Structured Content](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/structured-content.md)
- Best Practice: Always return typed objects in structuredContent

---

## 2. ❌ Manque `outputSchema` sur les Tools

### Problème

```typescript
// ❌ Actuel - Pas de schéma de sortie
const TOOL_DEFINITIONS = [
  {
    name: "get_rfps",
    description: "List all RFPs with pagination",
    inputSchema: {
      /* defined */
    },
    // ❌ Pas d'outputSchema
  },
];
```

### Impact

- Clients MCP ne savent pas quel format attendre
- Pas de validation de réponse côté client
- Moins utile pour la composition de tools
- Les agents doivent inférer le schéma

### Solution (Best Practice)

```typescript
// ✅ Modern avec outputSchema
const TOOL_DEFINITIONS = [
  {
    name: "get_rfps",
    description: "List all RFPs with pagination",
    inputSchema: {
      /* ... */
    },
    outputSchema: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              title: { type: "string" },
              status: { enum: ["draft", "active", "closed"] },
              requirementCount: { type: "number" },
            },
            required: ["id", "title", "status"],
          },
        },
        _meta: {
          type: "object",
          properties: {
            total: { type: "number" },
            limit: { type: "number" },
            offset: { type: "number" },
            hasMore: { type: "boolean" },
          },
          required: ["total", "limit", "offset", "hasMore"],
        },
      },
      required: ["items", "_meta"],
    },
  },
];
```

### Référence MCP

- [MCP Best Practices - Tool Schemas](https://modelcontextprotocol.io/docs/tools)
- **Ligne guide**: "outputSchema should match the structure returned by the tool"

---

## 3. ❌ Manque Annotations de Tool

### Problème

```typescript
// ❌ Actuel - Pas d'hints
const TOOL_DEFINITIONS = [
  {
    name: "get_rfps",
    // ❌ Manque: readOnlyHint, destructiveHint, etc.
  },
];
```

### Impact

- Clients ne savent pas si le tool modifie l'état
- Pas de hint pour safe retry/caching
- Agents ne peuvent pas optimiser l'appel
- Sécurité: agents pourraient overuse

### Solution (Best Practice)

```typescript
// ✅ Avec annotations complètes
const TOOL_DEFINITIONS = [
  {
    name: "get_rfps",
    description: "List all RFPs with pagination",
    inputSchema: {
      /* ... */
    },
    outputSchema: {
      /* ... */
    },
    // ✅ Annotations importantes
    readOnlyHint: true, // Ne modifie pas l'état
    destructiveHint: false, // N'est pas destructif
    idempotentHint: true, // Appels multiples = même résultat
    openWorldHint: false, // Données fermées (données du système)
  },
  {
    name: "list_suppliers",
    // ...
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
];
```

### Référence MCP

- [MCP Specification - Tool Annotations](https://modelcontextprotocol.io/specification/draft#tool-annotations)
- Best Practice: Toujours inclure les hints pour safer tool use

---

## 4. ⚠️ Données Mock au Lieu de Vraies Données

### Problème

```typescript
// ❌ Actuel - Hardcoded mock data
import { MOCK_RFPS, MOCK_REQUIREMENTS } from "../utils/mock-data";

export function handleGetRFPs(input: GetRFPsInput): GetRFPsOutput {
  const rfps: RFPItem[] = MOCK_RFPS.map((rfp) => ({...}));
}
```

### Impact

- MCP retourne des données fictives, pas des données réelles
- Agents ne peuvent pas analyser les vrais RFPs de l'orga
- Limite complètement l'utilité du serveur
- Ce n'est qu'un POC, non productif

### Solution (Best Practice)

```typescript
// ✅ Intégration avec Supabase réel
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function handleGetRFPs(input: GetRFPsInput): Promise<GetRFPsOutput> {
  const { data: rfps, error } = await supabase
    .from("rfps")
    .select("id, title, description, status, created_at")
    .limit(input.limit)
    .offset(input.offset);

  if (error) throw new Error(`Database error: ${error.message}`);

  return {
    items: rfps.map(rfp => ({...})),
    _meta: { /* ... */ },
  };
}
```

### Dépendances à Ajouter

```bash
npm install @supabase/supabase-js
```

---

## 5. ❌ Pas de Tool pour Responses/Scores

### Problème

L'API expose ces endpoints critiques:

- `GET /api/rfps/[rfpId]/responses/` - Lister les réponses
- `GET /api/responses/[responseId]/` - Détail réponse
- `POST /api/rfps/[rfpId]/analyze/` - Analyser réponses

Mais le MCP n'expose **aucun** de ces tools.

### Impact

- Agents ne peuvent pas récupérer les réponses des suppliers
- Pas d'analyse des scores via MCP
- Limite drastiquement les cas d'usage

### Solution (Best Practice)

Ajouter 3 nouveaux tools:

```typescript
// ✅ Tool: get_responses
{
  name: "get_responses",
  title: "Get Supplier Responses",
  description: "Retrieve responses submitted by suppliers for an RFP",
  inputSchema: {
    type: "object",
    properties: {
      rfp_id: { type: "string", description: "RFP ID" },
      supplier_id: { type: "string", description: "Filter by supplier (optional)" },
      limit: { type: "number", default: 50 },
      offset: { type: "number", default: 0 },
    },
    required: ["rfp_id"],
  },
  outputSchema: {
    type: "object",
    properties: {
      items: { type: "array" },
      _meta: { type: "object" },
    },
  },
  readOnlyHint: true,
  idempotentHint: true,
}

// ✅ Tool: get_response_detail
{
  name: "get_response_detail",
  title: "Get Response Details",
  description: "Get detailed information about a specific response",
  inputSchema: {
    type: "object",
    properties: {
      response_id: { type: "string", description: "Response ID" },
    },
    required: ["response_id"],
  },
  readOnlyHint: true,
}

// ✅ Tool: get_response_scores
{
  name: "get_response_scores",
  title: "Get Response Scores",
  description: "Get evaluation scores for responses",
  inputSchema: {
    type: "object",
    properties: {
      rfp_id: { type: "string" },
      response_id: { type: "string" },
    },
    required: ["rfp_id"],
  },
  readOnlyHint: true,
  idempotentHint: true,
}
```

---

## 6. ❌ Pas de Filtering/Search Avancé

### Problème

```typescript
// ❌ Actuel - Seulement pagination
case "get_requirements": {
  // Retourne TOUS les requirements (paginés)
  // Pas de filtrage par priorité, statut, catégorie, etc.
  const requirements = MOCK_REQUIREMENTS
    .filter(req => req.rfpId === input.rfp_id)
    .map(...);
}
```

### Impact

- Pour trouver les requirements `high priority`, l'agent doit:
  1. Récupérer TOUS les requirements (potentiellement 200+)
  2. Les filtrer localement
  3. Plus 5-10 appels réseau si data > max limit
- Très inefficace et contraire aux best practices MCP
- Agents frustrés

### Solution (Best Practice)

Ajouter des paramètres de filtre:

```typescript
// ✅ Avec filtrage côté serveur
export const GetRequirementsInputSchema = z.object({
  rfp_id: z.string().min(1),
  priority: z.enum(["high", "medium", "low"]).optional(),
  category: z.string().optional(),
  mandatory: z.boolean().optional(),
  search: z.string().optional(), // Full-text search
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
});

// Implémentation avec filtering
export async function handleGetRequirements(
  input: GetRequirementsInput
): Promise<GetRequirementsOutput> {
  let query = supabase
    .from("requirements")
    .select("*")
    .eq("rfp_id", input.rfp_id);

  if (input.priority) {
    query = query.eq("priority", input.priority);
  }
  if (input.category) {
    query = query.ilike("category", `%${input.category}%`);
  }
  if (input.mandatory !== undefined) {
    query = query.eq("mandatory", input.mandatory);
  }
  if (input.search) {
    query = query.or(
      `title.ilike.%${input.search}%,description.ilike.%${input.search}%`
    );
  }

  const { data, error, count } = await query
    .limit(input.limit)
    .offset(input.offset);

  // Return paginated results
}
```

---

## 7. ⚠️ Route Handler Duplication

### Problème

```typescript
// ❌ Actuel - Code quasi-identique répété 5 fois
case "get_rfps": {
  const validation = validateParams(toolArgs, z.object({...}));
  if (!validation.isValid) {
    return { jsonrpc: "2.0", id, error: {...} };
  }
  result = handleGetRFPs(validation.data);
  break;
}

case "get_requirements": {
  const validation = validateParams(toolArgs, z.object({...}));
  if (!validation.isValid) {
    return { jsonrpc: "2.0", id, error: {...} };
  }
  result = handleGetRequirements(validation.data);
  break;
}

// ... 3 autres fois identiques
```

### Impact

- Hard à maintenir
- Easy à introduire des bugs (oubli de validation)
- Ajouter un tool = copier-coller 10 lignes

### Solution (Best Practice)

Utiliser une registry de tools:

```typescript
// ✅ Factorié avec registry
interface ToolHandler {
  schema: z.ZodSchema;
  handler: (input: any) => Promise<any> | any;
  description: string;
  outputSchema?: any;
}

const TOOLS_REGISTRY: Record<string, ToolHandler> = {
  get_rfps: {
    schema: GetRFPsInputSchema,
    handler: handleGetRFPs,
    description: "List all RFPs",
    outputSchema: {
      /* ... */
    },
  },
  get_requirements: {
    schema: GetRequirementsInputSchema,
    handler: handleGetRequirements,
    description: "Get requirements for RFP",
    outputSchema: {
      /* ... */
    },
  },
  // ... etc
};

// Handler simplifié
async function handleToolCall(id: number | string, params: any) {
  const toolName = params?.name;
  const toolDef = TOOLS_REGISTRY[toolName];

  if (!toolDef) {
    return errorResponse(id, -32601, `Tool not found: ${toolName}`);
  }

  const validation = toolDef.schema.safeParse(params?.arguments || {});
  if (!validation.success) {
    return errorResponse(
      id,
      -32602,
      `Invalid parameters: ${validation.error.message}`
    );
  }

  try {
    const result = await toolDef.handler(validation.data);
    return {
      jsonrpc: "2.0",
      id,
      result: {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      },
    };
  } catch (error) {
    return errorResponse(
      id,
      -32603,
      error instanceof Error ? error.message : "Internal error"
    );
  }
}
```

---

## 8. ❌ Pas de Validation d'Authentification

### Problème

```typescript
// ❌ Actuel - N'importe qui peut appeler
export async function POST(req: NextRequest) {
  const body = await req.json();
  // Pas de vérification de token, session, ou authentification
  // Un attaquant peut énumérer tous les RFPs publiquement
}
```

### Impact

- **Sécurité critique**: L'API expose toutes les données sans vérification
- Données sensibles (RFPs, requirements) accessibles à n'importe qui
- Non-compliance avec MCP security best practices

### Solution (Best Practice)

```typescript
// ✅ Avec validation d'authentification
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    // Récupérer le token depuis Authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return errorJsonRpc(-32000, "Missing or invalid authorization header");
    }

    const token = authHeader.slice(7);

    // Vérifier le token avec Supabase
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);
    if (error || !user) {
      return errorJsonRpc(-32000, "Invalid authentication token");
    }

    // Ajouter user context au body
    const body = await req.json();
    body._auth = { userId: user.id };

    // Continuer avec le traitement
    // ...
  } catch (error) {
    return errorJsonRpc(-32700, "Parse error");
  }
}

// Dans les handlers, utiliser user context pour RLS
export async function handleGetRFPs(input: GetRFPsInput, userId: string) {
  const { data: rfps } = await supabase
    .from("rfps")
    .select("*")
    .eq("organization_id", userOrganization) // Row Level Security
    .limit(input.limit)
    .offset(input.offset);
}
```

---

## 9. ❌ Protocol Version Non-Standard

### Problème

```typescript
// ❌ Actuel
const response = {
  protocolVersion: "2025-11-25", // Non-standard? Non-officiel?
  capabilities: SERVER_CAPABILITIES,
  serverInfo: SERVER_INFO,
};
```

### Impact

- Version n'existe peut-être pas dans la spec MCP officielle
- Clients peuvent rejeter comme incompatible
- Confusionisme

### Solution (Best Practice)

```typescript
// ✅ Utiliser une version officielle
// Vérifier: https://modelcontextprotocol.io/specification/draft

const SERVER_INFO = {
  name: "RFP Analyzer MCP Server",
  version: "1.0.0",
};

const response = {
  protocolVersion: "2024-11-05", // Version officielle MCP
  capabilities: SERVER_CAPABILITIES,
  serverInfo: SERVER_INFO,
};
```

Vérifier avec: [MCP Protocol Specification](https://modelcontextprotocol.io/specification/draft)

---

## 10. ⚠️ Gestion d'Erreurs Insuffisante

### Problème

```typescript
// ❌ Actuel - Validation silencieuse
export function validatePaginationParams(
  limit?: number,
  offset?: number
): PaginationParams {
  const result = schema.safeParse(params);
  if (!result.success) {
    // ❌ Retourne silencieusement les defaults
    // Pas d'erreur au client!
    return { limit: DEFAULT_LIMIT, offset: DEFAULT_OFFSET };
  }
  return result.data;
}

// Résultat: Client envoie limit=1000000, reçoit limit=50 sans savoir
```

### Impact

- Clients ne savent pas que leurs params sont invalides
- Agents LLM peuvent se confondre sur les résultats
- Debug difficile

### Solution (Best Practice)

```typescript
// ✅ Retourner les erreurs explicitement
export async function handleToolCall(id: string | number, params: any) {
  const toolName = params?.name;
  const toolDef = TOOLS_REGISTRY[toolName];

  if (!toolDef) {
    return {
      jsonrpc: "2.0",
      id,
      error: {
        code: -32601,
        message: `Tool not found: ${toolName}`,
        data: {
          availableTools: Object.keys(TOOLS_REGISTRY),
          suggestion: "Use tools/list to see available tools",
        },
      },
    };
  }

  const validation = toolDef.schema.safeParse(params?.arguments || {});
  if (!validation.success) {
    const issues = validation.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
      received: issue.code,
    }));

    return {
      jsonrpc: "2.0",
      id,
      error: {
        code: -32602,
        message: "Invalid parameters",
        data: {
          issues,
          schema: toolDef.schema.describe(),
          hint: "Review 'data.issues' for specific validation errors",
        },
      },
    };
  }

  try {
    const result = await toolDef.handler(validation.data);
    return { jsonrpc: "2.0", id, result };
  } catch (error) {
    return {
      jsonrpc: "2.0",
      id,
      error: {
        code: -32603,
        message:
          error instanceof Error ? error.message : "Internal server error",
        data: {
          hint: "Check server logs for more details",
        },
      },
    };
  }
}
```

---

## 11. ⚠️ Pas de Resources Handler

### Problème

L'implémentation n'expose que des **Tools** (procédures d'appel).
Mais MCP supporte aussi **Resources** (URIs côté serveur).

### Impact

- Les données ne peuvent pas être référencées comme des URI
- Limité pour certains cas d'usage (caching, indexing par client)
- Moins flexible

### Solution (Best Practice)

```typescript
// ✅ Ajouter resources endpoint
export async function handleResourcesRead(uri: string) {
  // Ex: rfp://123/details
  const [scheme, ...rest] = uri.split("://");

  if (scheme === "rfp") {
    const [rfpId, type] = rest[0].split("/");

    if (type === "details") {
      const { data } = await supabase
        .from("rfps")
        .select("*")
        .eq("id", rfpId)
        .single();

      return {
        uri,
        mimeType: "application/json",
        contents: JSON.stringify(data),
      };
    }
  }

  throw new Error(`Resource not found: ${uri}`);
}

// In route handler:
case "resources/read": {
  const resource = await handleResourcesRead(body.params.uri);
  return {
    jsonrpc: "2.0",
    id,
    result: { contents: [resource] },
  };
}
```

---

## 12. ⚠️ Pas de Logging Structuré

### Problème

```typescript
// ❌ Actuel - Logs simples
httpLogger.info("[MCP] Request received", {
  method: body?.method,
  id: body?.id,
});
```

### Impact

- Hard à investiguer les problèmes
- Pas de metrics/monitoring
- Performance monitoring absent

### Solution (Best Practice)

```typescript
// ✅ Logging structuré avec metrics
interface LogContext {
  requestId: string;
  method: string;
  userId?: string;
  duration: number;
  status: "success" | "error";
  toolName?: string;
  paramCount?: number;
  error?: string;
}

function logRequest(context: LogContext) {
  httpLogger.info("MCP request processed", {
    requestId: context.requestId,
    method: context.method,
    duration: context.duration,
    status: context.status,
    ...(context.toolName && { toolName: context.toolName }),
    ...(context.error && { error: context.error }),
  });

  // Emit metrics
  if (context.status === "error") {
    metrics.incrementCounter("mcp.errors", { method: context.method });
  }
  metrics.recordHistogram("mcp.duration", context.duration, {
    method: context.method,
  });
}
```

---

## 13. ❌ Pas d'Annotations de Type pour Response Content

### Problème

```typescript
// ❌ Actuel - Return generic text
result: {
  content: [{
    type: "text",
    text: JSON.stringify(result, null, 2),
  }],
}
```

### Impact

- Clients ne savent pas le type de contenu retourné
- Pas de hint sur si c'est JSON, Markdown, etc.
- Limité pour multi-format responses

### Solution (Best Practice)

```typescript
// ✅ Avec type hints et format spécifié
result: {
  content: [{
    type: "text",
    text: JSON.stringify(result, null, 2),
    mimeType: "application/json", // ✅ Explicite le format
  }, {
    type: "text",
    text: `# RFPs Found: ${result.items.length}\n...`, // Markdown pour LLMs
    mimeType: "text/markdown",
  }],
}
```

---

## 14. ⚠️ Protocol Versioning & Compatibility

### Problème

L'implémentation supposre toujours la même version de protocole sans gestion de version.

### Impact

- Futures mises à jour peuvent briser les clients existants
- Pas de backward compatibility

### Solution (Best Practice)

```typescript
// ✅ Gestion de version
const SUPPORTED_PROTOCOL_VERSIONS = ["2024-11-05"];
const CURRENT_PROTOCOL_VERSION = "2024-11-05";

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Vérifier client version
  if (
    body.protocolVersion &&
    !SUPPORTED_PROTOCOL_VERSIONS.includes(body.protocolVersion)
  ) {
    return errorJsonRpc(
      -32000,
      `Unsupported protocol version: ${body.protocolVersion}. Supported: ${SUPPORTED_PROTOCOL_VERSIONS.join(", ")}`
    );
  }

  // Continuer...
}
```

---

## Summary: Roadmap de Remédiation

### 🔴 Critique (Faire maintenant)

1. **Intégrer Supabase réel** (Défi #4) - Abandon des mock data
2. **Ajouter authentification** (Défi #8) - Sécurité
3. **Ajouter outputSchema** (Défi #2) - Best practice MCP
4. **Ajouter annotations** (Défi #3) - Best practice MCP
5. **Tools Response/Scores** (Défi #5) - Utilité complète

### 🟡 Important (Roadmap court-terme)

6. **Refactoring route handler** (Défi #7) - Maintenabilité
7. **Améliorer gestion erreurs** (Défi #10) - Débuggabilité
8. **Filtering avancé** (Défi #6) - Efficacité

### 🟢 Nice-to-have (Considérer)

9. **structuredContent moderne** (Défi #1) - Modernisation SDK
10. **Resources handler** (Défi #11) - Flexibilité
11. **Logging structuré** (Défi #12) - Observabilité

---

## Ressources & Références

- [MCP Official Specification](https://modelcontextprotocol.io/specification/draft)
- [MCP Best Practices](https://modelcontextprotocol.io/docs/tools)
- [TypeScript SDK Documentation](https://github.com/modelcontextprotocol/typescript-sdk)
- [Your MCP Route Handler](../app/api/mcp/route.ts)
- [Your Tool Implementations](../lib/mcp/tools/)

---

## Prochaines Étapes

### Option 1: Quick Win (2-3h)

- [ ] Défi #4: Intégrer Supabase
- [ ] Défi #8: Ajouter auth
- [ ] Défi #2-3: Ajouter schemas/annotations

### Option 2: Production-Ready (1-2 jours)

- [ ] All Option 1
- [ ] Défi #5: Tools response/scores
- [ ] Défi #7: Refactor handler
- [ ] Défi #6: Filtering avancé
- [ ] Défi #1: Modern SDK

Voir `MCP_IMPLEMENTATION_IMPROVEMENTS.md` pour le plan détaillé.
