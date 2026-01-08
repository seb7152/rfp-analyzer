# MCP Implementation Improvements - Detailed Plan

**Status**: Ready for Implementation
**Estimated Effort**: 1-2 days (MVP: 2-3 hours)
**Dependencies**: Supabase access, service role key

---

## Phase 1: MVP (Faire Aujourd'hui) - 2-3 heures

Ces améliorations transforment le POC en un serveur fonctionnel.

### 1.1 Intégrer Supabase Réel

**Fichier**: `lib/mcp/clients/supabase-client.ts` (NOUVEAU)

```typescript
import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";

// Client avec service role pour lecture des données
export const supabaseClient = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Fonction helper pour RLS context (si besoin)
export function createUserClient(accessToken: string) {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    }
  );
}
```

**Fichier**: `lib/mcp/tools/get-rfps.ts` (MODIFIÉ)

```typescript
import { z } from "zod";
import { supabaseClient } from "../clients/supabase-client";
import {
  PaginatedResponse,
  validatePaginationParams,
  createPaginatedResponse,
} from "../utils/pagination";

export const GetRFPsInputSchema = z.object({
  limit: z.number().int().min(1).max(100).optional().default(50),
  offset: z.number().int().min(0).optional().default(0),
  status: z.enum(["draft", "active", "closed"]).optional(),
  organization_id: z.string().optional(),
});

export type GetRFPsInput = z.infer<typeof GetRFPsInputSchema>;

export interface RFPItem {
  id: string;
  title: string;
  description: string;
  status: "draft" | "active" | "closed";
  requirement_count: number;
  supplier_count: number;
  created_at: string;
  organization_id: string;
}

export type GetRFPsOutput = PaginatedResponse<RFPItem>;

/**
 * ✅ Get RFPs from Supabase - NOT MOCK DATA
 */
export async function handleGetRFPs(
  input: GetRFPsInput
): Promise<GetRFPsOutput> {
  const pagination = validatePaginationParams(input.limit, input.offset);

  try {
    let query = supabaseClient.from("rfps").select(
      `id,
         title,
         description,
         status,
         created_at,
         organization_id,
         requirement_count:requirements(count),
         supplier_count:rfp_suppliers(count)`,
      { count: "exact" }
    );

    // Apply filters
    if (input.status) {
      query = query.eq("status", input.status);
    }
    if (input.organization_id) {
      query = query.eq("organization_id", input.organization_id);
    }

    const {
      data: rfps,
      error,
      count,
    } = await query
      .order("created_at", { ascending: false })
      .range(pagination.offset, pagination.offset + pagination.limit - 1);

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return {
      items: rfps.map((rfp) => ({
        id: rfp.id,
        title: rfp.title,
        description: rfp.description,
        status: rfp.status,
        requirement_count: rfp.requirement_count[0].count || 0,
        supplier_count: rfp.supplier_count[0].count || 0,
        created_at: rfp.created_at,
        organization_id: rfp.organization_id,
      })),
      _meta: {
        limit: pagination.limit,
        offset: pagination.offset,
        total: count || 0,
        hasMore: pagination.offset + pagination.limit < (count || 0),
        nextOffset:
          pagination.offset + pagination.limit < (count || 0)
            ? pagination.offset + pagination.limit
            : null,
      },
    };
  } catch (error) {
    throw new Error(
      `Failed to fetch RFPs: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
```

### 1.2 Ajouter outputSchema & Annotations

**Fichier**: `lib/mcp/tools/definitions.ts` (NOUVEAU)

```typescript
/**
 * ✅ Centralized tool definitions with complete metadata
 */
import { z } from "zod";
import {
  GetRFPsInputSchema,
  GetRequirementsInputSchema,
  GetRequirementsTreeInputSchema,
  ListSuppliersInputSchema,
} from "./index";

const RFPItemSchema = {
  type: "object",
  properties: {
    id: { type: "string", description: "Unique RFP identifier" },
    title: { type: "string", description: "RFP title" },
    description: { type: "string", description: "RFP description" },
    status: {
      type: "string",
      enum: ["draft", "active", "closed"],
      description: "Current RFP status",
    },
    requirement_count: {
      type: "number",
      description: "Total number of requirements",
    },
    supplier_count: {
      type: "number",
      description: "Total number of suppliers",
    },
    created_at: {
      type: "string",
      format: "date-time",
      description: "Creation timestamp",
    },
  },
  required: ["id", "title", "status", "requirement_count", "created_at"],
};

const PaginationMetaSchema = {
  type: "object",
  properties: {
    limit: {
      type: "number",
      description: "Items returned in this page",
    },
    offset: {
      type: "number",
      description: "Starting position of this page",
    },
    total: {
      type: "number",
      description: "Total items matching the query",
    },
    hasMore: {
      type: "boolean",
      description: "Whether more items are available",
    },
    nextOffset: {
      type: ["number", "null"],
      description: "Offset for next page, null if end reached",
    },
  },
  required: ["limit", "offset", "total", "hasMore"],
};

export const TOOL_DEFINITIONS = [
  {
    name: "get_rfps",
    title: "List RFPs",
    description:
      "List all RFPs (Request for Proposal) with pagination and filtering",
    inputSchema: z.object(GetRFPsInputSchema.shape).describe(),
    outputSchema: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: RFPItemSchema,
          description: "List of RFPs",
        },
        _meta: PaginationMetaSchema,
      },
      required: ["items", "_meta"],
    },
    // ✅ Annotations importantes
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },

  {
    name: "get_requirements",
    title: "Get Requirements",
    description: "Get requirements for a specific RFP with optional filtering",
    inputSchema: z.object(GetRequirementsInputSchema.shape).describe(),
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
              description: { type: "string" },
              category: { type: "string" },
              priority: { type: "string", enum: ["high", "medium", "low"] },
              mandatory: { type: "boolean" },
              created_at: { type: "string" },
            },
          },
        },
        _meta: PaginationMetaSchema,
      },
      required: ["items", "_meta"],
    },
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },

  {
    name: "get_requirements_tree",
    title: "Get Requirements Tree",
    description:
      "Get hierarchical requirements tree (Domain > Category > SubCategory > Requirement)",
    inputSchema: z.object(GetRequirementsTreeInputSchema.shape).describe(),
    outputSchema: {
      type: "object",
      properties: {
        rfp_id: { type: "string" },
        tree: { type: "object" },
        statistics: {
          type: "object",
          properties: {
            totalDomains: { type: "number" },
            totalCategories: { type: "number" },
            totalRequirements: { type: "number" },
            highPriorityCount: { type: "number" },
            mandatoryCount: { type: "number" },
          },
        },
      },
    },
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },

  {
    name: "list_suppliers",
    title: "List Suppliers",
    description: "List suppliers for a specific RFP",
    inputSchema: z.object(ListSuppliersInputSchema.shape).describe(),
    outputSchema: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              email: { type: "string" },
              status: {
                type: "string",
                enum: ["invited", "submitted", "approved", "rejected"],
              },
              submitted_at: { type: "string" },
            },
          },
        },
        _meta: PaginationMetaSchema,
      },
    },
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
];
```

### 1.3 Refactorer Route Handler avec Registry

**Fichier**: `app/api/mcp/route.ts` (REFACTORISÉ)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { httpLogger } from "@/lib/mcp/utils/logger";
import { TOOL_DEFINITIONS } from "@/lib/mcp/tools/definitions";
import { handleGetRFPs } from "@/lib/mcp/tools/get-rfps";
import { handleGetRequirements } from "@/lib/mcp/tools/get-requirements";
import { handleListSuppliers } from "@/lib/mcp/tools/list-suppliers";
import { handleGetRequirementsTree } from "@/lib/mcp/tools/get-requirements-tree";

const SERVER_INFO = {
  name: "RFP Analyzer MCP Server",
  version: "1.0.0",
};

const SERVER_CAPABILITIES = {
  tools: {
    listChanged: false,
  },
};

/**
 * ✅ Tool registry - DRY principle
 */
interface ToolHandler {
  schema: z.ZodSchema;
  handler: (input: any) => Promise<any> | any;
}

const TOOLS_REGISTRY: Record<string, ToolHandler> = {
  get_rfps: {
    schema: z.object({
      limit: z.number().int().min(1).max(100).optional().default(50),
      offset: z.number().int().min(0).optional().default(0),
      status: z.enum(["draft", "active", "closed"]).optional(),
      organization_id: z.string().optional(),
    }),
    handler: handleGetRFPs,
  },
  get_requirements: {
    schema: z.object({
      rfp_id: z.string().min(1),
      limit: z.number().int().min(1).max(100).optional().default(50),
      offset: z.number().int().min(0).optional().default(0),
      priority: z.enum(["high", "medium", "low"]).optional(),
      category: z.string().optional(),
    }),
    handler: handleGetRequirements,
  },
  get_requirements_tree: {
    schema: z.object({
      rfp_id: z.string().min(1),
      flatten: z.boolean().optional().default(false),
    }),
    handler: handleGetRequirementsTree,
  },
  list_suppliers: {
    schema: z.object({
      rfp_id: z.string().min(1),
      limit: z.number().int().min(1).max(100).optional().default(50),
      offset: z.number().int().min(0).optional().default(0),
    }),
    handler: handleListSuppliers,
  },
};

/**
 * ✅ Helper: Return JSON-RPC error
 */
function errorResponse(
  id: number | string,
  code: number,
  message: string,
  data?: any
) {
  return NextResponse.json(
    {
      jsonrpc: "2.0",
      id,
      error: { code, message, ...(data && { data }) },
    },
    { status: 400 }
  );
}

/**
 * ✅ Helper: Return successful JSON-RPC response
 */
function successResponse(id: number | string, result: any) {
  return NextResponse.json({
    jsonrpc: "2.0",
    id,
    result: {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
          mimeType: "application/json",
        },
      ],
    },
  });
}

function handleInitialize(id: number | string) {
  httpLogger.info("[MCP] Initialize request");
  return successResponse(id, {
    protocolVersion: "2024-11-05",
    capabilities: SERVER_CAPABILITIES,
    serverInfo: SERVER_INFO,
  });
}

function handleToolsList(id: number | string) {
  httpLogger.info("[MCP] Tools/list request");
  return successResponse(id, { tools: TOOL_DEFINITIONS });
}

/**
 * ✅ Refactored: Single handler for all tools
 */
async function handleToolCall(id: number | string, params: any) {
  const toolName = params?.name;
  const toolArgs = params?.arguments || {};

  httpLogger.info(`[MCP] Tool call: ${toolName}`, { args: toolArgs });

  const toolDef = TOOLS_REGISTRY[toolName];
  if (!toolDef) {
    return errorResponse(id, -32601, `Tool not found: ${toolName}`, {
      availableTools: Object.keys(TOOLS_REGISTRY),
      suggestion: "Use tools/list to discover available tools",
    });
  }

  const validation = toolDef.schema.safeParse(toolArgs);
  if (!validation.success) {
    const issues = validation.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
      code: issue.code,
    }));

    return errorResponse(id, -32602, "Invalid parameters", {
      issues,
      hint: "Review 'data.issues' for validation errors",
    });
  }

  try {
    const result = await toolDef.handler(validation.data);
    return successResponse(id, result);
  } catch (error) {
    httpLogger.error(`[MCP] Tool error: ${toolName}`, error);
    return errorResponse(
      id,
      -32603,
      error instanceof Error ? error.message : "Internal server error",
      {
        toolName,
        hint: "Check server logs for details",
      }
    );
  }
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await req.json();
    httpLogger.info("[MCP] Request", { method: body?.method, id: body?.id });

    const id = body?.id;

    switch (body?.method) {
      case "initialize":
        const initResponse = handleInitialize(id);
        httpLogger.info(
          `[MCP] Initialize completed in ${Date.now() - startTime}ms`
        );
        return initResponse;

      case "tools/list":
        const listResponse = handleToolsList(id);
        httpLogger.info(
          `[MCP] Tools/list completed in ${Date.now() - startTime}ms`
        );
        return listResponse;

      case "tools/call":
        const callResponse = await handleToolCall(id, body.params);
        httpLogger.info(
          `[MCP] Tool call completed in ${Date.now() - startTime}ms`
        );
        return callResponse;

      default:
        return errorResponse(id, -32601, `Method not found: ${body?.method}`);
    }
  } catch (error) {
    httpLogger.error("[MCP] Parse error", error);
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        error: {
          code: -32700,
          message: "Parse error",
          data: error instanceof Error ? error.message : String(error),
        },
        id: null,
      },
      { status: 400 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, mcp-session-id",
      "Access-Control-Max-Age": "86400",
    },
  });
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    server: SERVER_INFO,
    protocol: "jsonrpc-2.0",
    message: "MCP Server ready",
  });
}
```

---

## Phase 2: Important (1-2 hours) - Court-terme

### 2.1 Ajouter Authentification

**Fichier**: `lib/mcp/middleware/auth.ts` (NOUVEAU)

```typescript
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface AuthContext {
  userId: string;
  email: string;
  organizationId: string;
}

/**
 * ✅ Extract and verify JWT token from Authorization header
 */
export async function verifyAuth(
  req: NextRequest
): Promise<AuthContext | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7);

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return null;
    }

    // Get user's organization
    const { data: orgUser } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    if (!orgUser) {
      return null;
    }

    return {
      userId: user.id,
      email: user.email || "",
      organizationId: orgUser.organization_id,
    };
  } catch (error) {
    return null;
  }
}
```

**Fichier**: `app/api/mcp/route.ts` (UPDATED)

```typescript
// Add at the top of POST handler
export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    // ✅ Verify authentication
    const auth = await verifyAuth(req);
    if (!auth) {
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          error: {
            code: -32000,
            message: "Unauthorized - Invalid or missing authentication token",
          },
          id: null,
        },
        { status: 401 }
      );
    }

    const body = await req.json();
    httpLogger.info("[MCP] Request", {
      method: body?.method,
      id: body?.id,
      userId: auth.userId,
    });

    // Pass auth context to handlers if needed
    const context = { ...body, _auth: auth };

    // ... rest of handler
  }
}
```

### 2.2 Ajouter Tools pour Responses/Scores

**Fichier**: `lib/mcp/tools/get-responses.ts` (NOUVEAU)

```typescript
import { z } from "zod";
import { supabaseClient } from "../clients/supabase-client";
import {
  PaginatedResponse,
  createPaginatedResponse,
  validatePaginationParams,
} from "../utils/pagination";

export const GetResponsesInputSchema = z.object({
  rfp_id: z.string().min(1, "RFP ID is required"),
  supplier_id: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional().default(50),
  offset: z.number().int().min(0).optional().default(0),
});

export type GetResponsesInput = z.infer<typeof GetResponsesInputSchema>;

export interface ResponseItem {
  id: string;
  supplier_id: string;
  supplier_name: string;
  status: "pending" | "submitted" | "reviewed" | "scored";
  submitted_at: string | null;
  score: number | null;
  completeness: number;
}

export type GetResponsesOutput = PaginatedResponse<ResponseItem>;

/**
 * ✅ Get responses submitted by suppliers
 */
export async function handleGetResponses(
  input: GetResponsesInput
): Promise<GetResponsesOutput> {
  const pagination = validatePaginationParams(input.limit, input.offset);

  try {
    let query = supabaseClient
      .from("responses")
      .select(
        `id,
         supplier_id,
         rfp_suppliers(name):supplier_id(name),
         status,
         submitted_at,
         score,
         completeness`,
        { count: "exact" }
      )
      .eq("rfp_id", input.rfp_id);

    if (input.supplier_id) {
      query = query.eq("supplier_id", input.supplier_id);
    }

    const {
      data: responses,
      error,
      count,
    } = await query
      .order("submitted_at", { ascending: false })
      .range(pagination.offset, pagination.offset + pagination.limit - 1);

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return {
      items: responses.map((response: any) => ({
        id: response.id,
        supplier_id: response.supplier_id,
        supplier_name: response.rfp_suppliers?.name || "Unknown",
        status: response.status,
        submitted_at: response.submitted_at,
        score: response.score,
        completeness: response.completeness,
      })),
      _meta: {
        limit: pagination.limit,
        offset: pagination.offset,
        total: count || 0,
        hasMore: pagination.offset + pagination.limit < (count || 0),
        nextOffset:
          pagination.offset + pagination.limit < (count || 0)
            ? pagination.offset + pagination.limit
            : null,
      },
    };
  } catch (error) {
    throw new Error(
      `Failed to fetch responses: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
```

---

## Phase 3: Nice-to-Have (Considérer)

### 3.1 Logging Structuré avec Metrics

```typescript
// lib/mcp/utils/metrics.ts
import { performance } from "perf_hooks";

interface MetricsContext {
  requestId: string;
  method: string;
  toolName?: string;
  duration: number;
  status: "success" | "error";
  userId?: string;
}

export function recordMetrics(context: MetricsContext) {
  // Émettre vers votre système de monitoring
  // (DataDog, Cloudflare, etc.)
  httpLogger.info("MCP metrics", {
    ...context,
    timestamp: new Date().toISOString(),
  });
}
```

### 3.2 Filtering Avancé pour Requirements

Ajouter à `GetRequirementsInputSchema`:

```typescript
priority: z.enum(["high", "medium", "low"]).optional(),
category: z.string().optional(),
mandatory: z.boolean().optional(),
search: z.string().optional(),
```

---

## Checklist d'Implémentation

### Phase 1 MVP (Faire Maintenant)

- [ ] Créer `lib/mcp/clients/supabase-client.ts`
- [ ] Mettre à jour `lib/mcp/tools/get-rfps.ts` avec Supabase
- [ ] Créer `lib/mcp/tools/definitions.ts` avec schemas
- [ ] Refactorer `app/api/mcp/route.ts` avec registry
- [ ] Tester avec `curl` ou MCP Inspector
- [ ] Vérifier les données réelles retournées

### Phase 2 Important (2-3 heures)

- [ ] Créer `lib/mcp/middleware/auth.ts`
- [ ] Intégrer auth dans route handler
- [ ] Créer `lib/mcp/tools/get-responses.ts`
- [ ] Ajouter `get_responses` à registry et definitions
- [ ] Ajouter filtering avancé à `get_requirements`
- [ ] Tester avec MCP Inspector avec token

### Phase 3 Nice-to-Have

- [ ] Logging structuré
- [ ] Resources handler
- [ ] Cleanup mock-data (deprecate)
- [ ] Unit tests pour tools

---

## Testing

### With MCP Inspector

```bash
npx @modelcontextprotocol/inspector /path/to/script.js
# Then test tools interactivement
```

### With curl

```bash
# Test initialize
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"initialize","id":1}'

# Test tools/list
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'

# Test tool call
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "jsonrpc":"2.0",
    "method":"tools/call",
    "params":{"name":"get_rfps","arguments":{"limit":10}},
    "id":1
  }'
```

---

## Success Criteria

**MVP (Phase 1)**:

- ✅ Server retourne des vraies données Supabase
- ✅ OutputSchema défini pour chaque tool
- ✅ Annotations présentes (readOnlyHint, etc.)
- ✅ Pas de duplication de code dans route handler
- ✅ MCP Inspector peut lister et appeler les tools

**Production (Phase 2+3)**:

- ✅ Authentification obligatoire
- ✅ Tools responses/scores disponibles
- ✅ Filtering avancé sur tous les tools list
- ✅ Logging/monitoring en place
- ✅ Documentation complète

---

## Resources

- [MCP Specification](https://modelcontextprotocol.io/specification/draft)
- [TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Supabase Client](https://supabase.com/docs/reference/javascript/introduction)
- [Challenge Report](./MCP_IMPLEMENTATION_CHALLENGE.md)
