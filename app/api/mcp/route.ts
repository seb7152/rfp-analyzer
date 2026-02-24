/**
 * MCP Server Route Handler - Streamable HTTP Implementation
 *
 * Implements the MCP Streamable HTTP protocol:
 * - GET: Returns SSE descriptor with message endpoint (one-time, Vercel-compatible)
 * - POST: Handles JSON-RPC 2.0 messages (backward compatible with direct POST)
 *
 * Message handling is done at /api/mcp/message for Streamable HTTP clients,
 * but POST to /api/mcp continues to work for backward compatibility.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { httpLogger } from "@/lib/mcp/utils/logger";
import { authenticateMCPRequest, unauthorizedResponse } from "@/lib/mcp/auth";

// ── Read tools ────────────────────────────────────────────────────────────────
import { handleTestConnection } from "@/lib/mcp/tools/test-connection";
import { handleGetRFPs } from "@/lib/mcp/tools/get-rfps";
import { handleGetRequirements } from "@/lib/mcp/tools/get-requirements";
import { handleListSuppliers } from "@/lib/mcp/tools/list-suppliers";
import { handleGetRequirementsTree } from "@/lib/mcp/tools/get-requirements-tree";
import { handleGetRFPStructure } from "@/lib/mcp/tools/get-rfp-structure";
import { handleGetResponses } from "@/lib/mcp/tools/get-responses";
import { handleGetScoringMatrix } from "@/lib/mcp/tools/get-scoring-matrix";
import { handleGetRFPVersions } from "@/lib/mcp/tools/get-rfp-versions";

// ── Write tools ───────────────────────────────────────────────────────────────
import { handleCreateRFP } from "@/lib/mcp/tools/create-rfp";
import { handleUpdateRFP } from "@/lib/mcp/tools/update-rfp";
import { handleCreateSupplier } from "@/lib/mcp/tools/create-supplier";
import { handleCreateRequirement } from "@/lib/mcp/tools/create-requirement";
import { handleImportStructure } from "@/lib/mcp/tools/import-structure";
import { handleImportRequirements } from "@/lib/mcp/tools/import-requirements";
import { handleImportSupplierResponses } from "@/lib/mcp/tools/import-supplier-responses";
import { handleUpsertResponse } from "@/lib/mcp/tools/upsert-response";

/**
 * Server info for initialize response
 */
const SERVER_INFO = {
  name: "RFP Analyzer MCP Server",
  version: "2.0.0",
};

/**
 * Server capabilities
 */
const SERVER_CAPABILITIES = {
  tools: {
    listChanged: false,
  },
};

/**
 * Tool definitions for tools/list endpoint
 */
const TOOL_DEFINITIONS = [
  // ── Diagnostic ──────────────────────────────────────────────────────────────
  {
    name: "test_connection",
    title: "Test MCP Server Connectivity",
    description: "Test MCP server connectivity and health",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },

  // ── Read: RFPs ──────────────────────────────────────────────────────────────
  {
    name: "get_rfps",
    title: "List All RFPs",
    description: "List all RFPs accessible to the authenticated user, with pagination",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Max results (default: 50, max: 100)", minimum: 1, maximum: 100, default: 50 },
        offset: { type: "number", description: "Results to skip (default: 0)", minimum: 0, default: 0 },
      },
    },
  },
  {
    name: "get_rfp_versions",
    title: "Get RFP Evaluation Versions",
    description:
      "List all evaluation versions of an RFP. Returns version number, name, active status, and finalization date. Use the version ID to scope get_responses, get_scoring_matrix, upsert_response, and import_supplier_responses.",
    inputSchema: {
      type: "object",
      properties: {
        rfp_id: { type: "string", description: "The RFP ID", minLength: 1 },
      },
      required: ["rfp_id"],
    },
  },
  {
    name: "get_rfp_structure",
    title: "Get RFP Structure",
    description:
      "Get the complete structure of an RFP: metadata, hierarchical category tree with embedded requirements, supplier list, and statistics",
    inputSchema: {
      type: "object",
      properties: {
        rfp_id: { type: "string", description: "The RFP ID", minLength: 1 },
        include_suppliers: { type: "boolean", description: "Include supplier list (default: true)", default: true },
        include_stats: { type: "boolean", description: "Include response statistics (default: true)", default: true },
      },
      required: ["rfp_id"],
    },
  },

  // ── Read: Requirements ───────────────────────────────────────────────────────
  {
    name: "get_requirements",
    title: "Get Requirements",
    description: "Get requirements for a specific RFP with pagination (flat list)",
    inputSchema: {
      type: "object",
      properties: {
        rfp_id: { type: "string", description: "The RFP ID", minLength: 1 },
        limit: { type: "number", description: "Max results (default: 50, max: 100)", minimum: 1, maximum: 100, default: 50 },
        offset: { type: "number", description: "Results to skip (default: 0)", minimum: 0, default: 0 },
      },
      required: ["rfp_id"],
    },
  },
  {
    name: "get_requirements_tree",
    title: "Get Requirements Tree",
    description:
      "Get hierarchical requirements tree for an RFP (Domain > Category > SubCategory > Requirement)",
    inputSchema: {
      type: "object",
      properties: {
        rfp_id: { type: "string", description: "The RFP ID", minLength: 1 },
        flatten: { type: "boolean", description: "Return flattened list instead of tree (default: false)", default: false },
      },
      required: ["rfp_id"],
    },
  },

  // ── Read: Suppliers ─────────────────────────────────────────────────────────
  {
    name: "list_suppliers",
    title: "List Suppliers",
    description: "List suppliers for a specific RFP with pagination",
    inputSchema: {
      type: "object",
      properties: {
        rfp_id: { type: "string", description: "The RFP ID", minLength: 1 },
        limit: { type: "number", minimum: 1, maximum: 100, default: 50 },
        offset: { type: "number", minimum: 0, default: 0 },
      },
      required: ["rfp_id"],
    },
  },

  // ── Read: Responses ─────────────────────────────────────────────────────────
  {
    name: "get_responses",
    title: "Get Responses",
    description:
      "Get evaluation responses with flexible filtering: by supplier, by requirement, or by category node (recursive subtree). Optionally scope to a specific evaluation version (omit for active version).",
    inputSchema: {
      type: "object",
      properties: {
        rfp_id: { type: "string", description: "The RFP ID", minLength: 1 },
        version_id: { type: "string", description: "Evaluation version ID (omit for active version)" },
        supplier_id: { type: "string", description: "Filter by supplier UUID" },
        requirement_id: { type: "string", description: "Filter by specific requirement UUID" },
        category_id: {
          type: "string",
          description:
            "Filter by category UUID — returns responses for all requirements in the category and its sub-categories (recursive)",
        },
        include_scores: { type: "boolean", description: "Include ai_score, manual_score, status (default: true)", default: true },
        limit: { type: "number", minimum: 1, maximum: 200, default: 50 },
        offset: { type: "number", minimum: 0, default: 0 },
      },
      required: ["rfp_id"],
    },
  },
  {
    name: "get_scoring_matrix",
    title: "Get Scoring Matrix",
    description:
      "Get a cross-tabulation of requirements × suppliers with scores. Returns a full evaluation grid with per-supplier averages. Optionally scoped to a category subtree or specific version.",
    inputSchema: {
      type: "object",
      properties: {
        rfp_id: { type: "string", description: "The RFP ID", minLength: 1 },
        version_id: { type: "string", description: "Evaluation version ID (omit for active version)" },
        category_id: { type: "string", description: "Optional: scope matrix to a category subtree" },
        score_type: {
          type: "string",
          enum: ["ai", "manual", "both"],
          description: "Which scores to include: 'ai', 'manual', or 'both' (default)",
          default: "both",
        },
      },
      required: ["rfp_id"],
    },
  },

  // ── Write: RFP ──────────────────────────────────────────────────────────────
  {
    name: "create_rfp",
    title: "Create RFP",
    description: "Create a new RFP in the authenticated user's organization",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "RFP title", minLength: 1, maxLength: 255 },
        description: { type: "string", description: "Optional description" },
        status: {
          type: "string",
          enum: ["in_progress", "completed", "archived"],
          description: "Initial status (default: in_progress)",
          default: "in_progress",
        },
      },
      required: ["title"],
    },
  },
  {
    name: "update_rfp",
    title: "Update RFP",
    description: "Update metadata (title, description, status) of an existing RFP",
    inputSchema: {
      type: "object",
      properties: {
        rfp_id: { type: "string", description: "The RFP ID to update", minLength: 1 },
        title: { type: "string", description: "New title", minLength: 1, maxLength: 255 },
        description: { type: ["string", "null"], description: "New description (null to clear)" },
        status: { type: "string", enum: ["in_progress", "completed", "archived"] },
      },
      required: ["rfp_id"],
    },
  },

  // ── Write: Suppliers ────────────────────────────────────────────────────────
  {
    name: "create_supplier",
    title: "Create Supplier",
    description: "Add a single supplier to an RFP",
    inputSchema: {
      type: "object",
      properties: {
        rfp_id: { type: "string", description: "The RFP ID", minLength: 1 },
        name: { type: "string", description: "Supplier name", minLength: 1, maxLength: 255 },
        supplier_id_external: { type: "string", description: "Optional external reference (e.g. SUP-01)" },
        contact_name: { type: "string", description: "Contact person name" },
        contact_email: { type: "string", description: "Contact email", format: "email" },
        contact_phone: { type: "string", description: "Contact phone" },
      },
      required: ["rfp_id", "name"],
    },
  },

  // ── Write: Requirements ─────────────────────────────────────────────────────
  {
    name: "create_requirement",
    title: "Create Requirement",
    description: "Add a single requirement to an RFP. Category can be resolved by UUID or by title.",
    inputSchema: {
      type: "object",
      properties: {
        rfp_id: { type: "string", description: "The RFP ID", minLength: 1 },
        title: { type: "string", description: "Requirement title", minLength: 1, maxLength: 500 },
        description: { type: "string", description: "Full requirement text" },
        requirement_id_external: { type: "string", description: "External code (e.g. 'R - 1')" },
        category_id: { type: "string", description: "Category UUID" },
        category_name: { type: "string", description: "Category title (used if category_id is not provided)" },
        weight: { type: "number", minimum: 0, maximum: 10, default: 1 },
        is_mandatory: { type: "boolean", default: false },
        display_order: { type: "number" },
      },
      required: ["rfp_id", "title"],
    },
  },

  // ── Write: Bulk imports ─────────────────────────────────────────────────────
  {
    name: "import_structure",
    title: "Import Structure (Bulk Categories)",
    description:
      "Bulk import categories from a JSON array matching the /imports/test-categories.json format. The 'id' field is an external reference for parent_id linking — not stored as DB UUID. Supports append (default) or replace mode.",
    inputSchema: {
      type: "object",
      properties: {
        rfp_id: { type: "string", description: "The RFP ID", minLength: 1 },
        categories: {
          type: "array",
          description: "Array of category objects (same format as test-categories.json)",
          items: {
            type: "object",
            properties: {
              id: { type: "string", description: "External reference ID (for parent linking within batch)" },
              code: { type: "string" },
              title: { type: "string" },
              short_name: { type: "string" },
              level: { type: "number", minimum: 1, maximum: 4 },
              parent_id: { type: ["string", "null"] },
              weight: { type: "number", default: 1 },
              display_order: { type: "number" },
            },
            required: ["id", "code", "title", "level"],
          },
        },
        mode: {
          type: "string",
          enum: ["append", "replace"],
          description: "'append' (default): add without deleting. 'replace': delete all existing categories first.",
          default: "append",
        },
      },
      required: ["rfp_id", "categories"],
    },
  },
  {
    name: "import_requirements",
    title: "Import Requirements (Bulk)",
    description:
      "Bulk import requirements from a JSON payload matching the /imports/test-requirements.json format. Supports English keys (code, title, description, category_name) and French keys (numéro, titre, exigence, catégorie). Categories are matched by title.",
    inputSchema: {
      type: "object",
      properties: {
        rfp_id: { type: "string", description: "The RFP ID", minLength: 1 },
        requirements: {
          type: "array",
          description: "Array of requirement objects (same format as test-requirements.json)",
          items: {
            type: "object",
            properties: {
              code: { type: "string", description: "External code, e.g. 'R - 1'" },
              title: { type: "string" },
              description: { type: "string" },
              category_name: { type: "string" },
              category_id: { type: "string" },
              weight: { type: "number", default: 1 },
              is_mandatory: { type: "boolean", default: false },
              "numéro": { type: "string" },
              "titre": { type: "string" },
              "exigence": { type: "string" },
              "catégorie": { type: "string" },
            },
          },
        },
        mode: {
          type: "string",
          enum: ["append", "replace"],
          description: "'append' (default) or 'replace' (deletes all existing requirements first)",
          default: "append",
        },
      },
      required: ["rfp_id", "requirements"],
    },
  },
  {
    name: "import_supplier_responses",
    title: "Import Supplier Responses (Bulk)",
    description:
      "Bulk import responses for a supplier from a JSON array matching the /imports/test-supplier-1.json format. Requirements are matched by requirement_id_external (e.g. 'R - 1'). Uses upsert — existing responses are updated.",
    inputSchema: {
      type: "object",
      properties: {
        rfp_id: { type: "string", description: "The RFP ID", minLength: 1 },
        version_id: { type: "string", description: "Evaluation version ID (omit for active version)" },
        supplier_id: { type: "string", description: "Supplier UUID (or provide supplier_name)" },
        supplier_name: { type: "string", description: "Supplier name — creates supplier if not found" },
        responses: {
          type: "array",
          description: "Array of response objects (same format as test-supplier-1.json)",
          items: {
            type: "object",
            properties: {
              requirement_id_external: { type: "string", description: "External requirement code (e.g. 'R - 1')" },
              response_text: { type: "string" },
              ai_score: { type: "number", minimum: 0, maximum: 5 },
              manual_score: { type: "number", minimum: 0, maximum: 5 },
              status: { type: "string", enum: ["pending", "pass", "partial", "fail", "roadmap"] },
            },
            required: ["requirement_id_external", "response_text"],
          },
        },
      },
      required: ["rfp_id", "responses"],
    },
  },

  // ── Write: Single response ──────────────────────────────────────────────────
  {
    name: "upsert_response",
    title: "Upsert Response",
    description:
      "Create or update a single response for a (requirement, supplier, version) triplet. Omit version_id to target the active version. Returns whether the response was created or updated.",
    inputSchema: {
      type: "object",
      properties: {
        rfp_id: { type: "string", description: "The RFP ID", minLength: 1 },
        requirement_id: { type: "string", description: "Requirement UUID", minLength: 1 },
        supplier_id: { type: "string", description: "Supplier UUID", minLength: 1 },
        version_id: { type: "string", description: "Evaluation version ID (omit for active version)" },
        response_text: { type: "string" },
        ai_score: { type: "number", minimum: 0, maximum: 5 },
        ai_comment: { type: ["string", "null"] },
        manual_score: { type: "number", minimum: 0, maximum: 5 },
        manual_comment: { type: ["string", "null"] },
        status: { type: "string", enum: ["pending", "pass", "partial", "fail", "roadmap"] },
        is_checked: { type: "boolean" },
        question: { type: ["string", "null"] },
      },
      required: ["rfp_id", "requirement_id", "supplier_id"],
    },
  },
];

/**
 * Validate parameters against Zod schema
 */
function validateParams(params: any, schema: any): any {
  const result = schema.safeParse(params);
  if (!result.success) {
    return {
      isValid: false,
      error: result.error.message,
    };
  }
  return {
    isValid: true,
    data: result.data,
  };
}

/**
 * Handle initialize method
 */
function handleInitialize(id: number | string) {
  httpLogger.info("[MCP] Handling initialize request");

  return {
    jsonrpc: "2.0",
    id,
    result: {
      protocolVersion: "2025-11-25",
      capabilities: SERVER_CAPABILITIES,
      serverInfo: SERVER_INFO,
    },
  };
}

/**
 * Handle tools/list method
 */
function handleToolsList(id: number | string) {
  httpLogger.info("[MCP] Handling tools/list request");

  return {
    jsonrpc: "2.0",
    id,
    result: {
      tools: TOOL_DEFINITIONS,
    },
  };
}

/**
 * Handle tools/call method
 */
async function handleToolCall(
  id: number | string,
  params: any,
  authContext: { userId: string; organizationId: string | null }
) {
  const toolName = params?.name;
  const toolArgs = params?.arguments || {};

  httpLogger.info(`[MCP] Handling tools/call for tool: ${toolName}`, {
    args: toolArgs,
  });

  if (!toolName) {
    return {
      jsonrpc: "2.0",
      id,
      error: { code: -32602, message: "Tool name is required" },
    };
  }

  let result;

  switch (toolName) {
    // ── Diagnostic ─────────────────────────────────────────────────────────
    case "test_connection": {
      result = handleTestConnection(toolArgs);
      break;
    }

    // ── Read: RFPs ──────────────────────────────────────────────────────────
    case "get_rfps": {
      const v = validateParams(
        toolArgs,
        z.object({
          limit: z.number().int().min(1).max(100).optional().default(50),
          offset: z.number().int().min(0).optional().default(0),
        })
      );
      if (!v.isValid) return invalidParams(id, v.error);
      result = await handleGetRFPs(v.data, authContext);
      break;
    }

    case "get_rfp_structure": {
      const v = validateParams(
        toolArgs,
        z.object({
          rfp_id: z.string().min(1),
          include_suppliers: z.boolean().optional().default(true),
          include_stats: z.boolean().optional().default(true),
        })
      );
      if (!v.isValid) return invalidParams(id, v.error);
      result = await handleGetRFPStructure(v.data, authContext);
      break;
    }

    // ── Read: Requirements ──────────────────────────────────────────────────
    case "get_requirements": {
      const v = validateParams(
        toolArgs,
        z.object({
          rfp_id: z.string().min(1),
          limit: z.number().int().min(1).max(100).optional().default(50),
          offset: z.number().int().min(0).optional().default(0),
        })
      );
      if (!v.isValid) return invalidParams(id, v.error);
      result = await handleGetRequirements(v.data, authContext);
      break;
    }

    case "get_requirements_tree": {
      const v = validateParams(
        toolArgs,
        z.object({
          rfp_id: z.string().min(1),
          flatten: z.boolean().optional().default(false),
        })
      );
      if (!v.isValid) return invalidParams(id, v.error);
      result = await handleGetRequirementsTree(v.data, authContext);
      break;
    }

    // ── Read: Suppliers ─────────────────────────────────────────────────────
    case "list_suppliers": {
      const v = validateParams(
        toolArgs,
        z.object({
          rfp_id: z.string().min(1),
          limit: z.number().int().min(1).max(100).optional().default(50),
          offset: z.number().int().min(0).optional().default(0),
        })
      );
      if (!v.isValid) return invalidParams(id, v.error);
      result = await handleListSuppliers(v.data, authContext);
      break;
    }

    // ── Read: Versions ──────────────────────────────────────────────────────
    case "get_rfp_versions": {
      const v = validateParams(
        toolArgs,
        z.object({ rfp_id: z.string().min(1) })
      );
      if (!v.isValid) return invalidParams(id, v.error);
      result = await handleGetRFPVersions(v.data, authContext);
      break;
    }

    // ── Read: Responses ─────────────────────────────────────────────────────
    case "get_responses": {
      const v = validateParams(
        toolArgs,
        z.object({
          rfp_id: z.string().min(1),
          version_id: z.string().optional(),
          supplier_id: z.string().optional(),
          requirement_id: z.string().optional(),
          category_id: z.string().optional(),
          include_scores: z.boolean().optional().default(true),
          limit: z.number().int().min(1).max(200).optional().default(50),
          offset: z.number().int().min(0).optional().default(0),
        })
      );
      if (!v.isValid) return invalidParams(id, v.error);
      result = await handleGetResponses(v.data, authContext);
      break;
    }

    case "get_scoring_matrix": {
      const v = validateParams(
        toolArgs,
        z.object({
          rfp_id: z.string().min(1),
          version_id: z.string().optional(),
          category_id: z.string().optional(),
          score_type: z.enum(["ai", "manual", "both"]).optional().default("both"),
        })
      );
      if (!v.isValid) return invalidParams(id, v.error);
      result = await handleGetScoringMatrix(v.data, authContext);
      break;
    }

    // ── Write: RFP ──────────────────────────────────────────────────────────
    case "create_rfp": {
      const v = validateParams(
        toolArgs,
        z.object({
          title: z.string().min(1).max(255),
          description: z.string().optional(),
          status: z
            .enum(["in_progress", "completed", "archived"])
            .optional()
            .default("in_progress"),
        })
      );
      if (!v.isValid) return invalidParams(id, v.error);
      result = await handleCreateRFP(v.data, authContext);
      break;
    }

    case "update_rfp": {
      const v = validateParams(
        toolArgs,
        z.object({
          rfp_id: z.string().min(1),
          title: z.string().min(1).max(255).optional(),
          description: z.string().nullable().optional(),
          status: z.enum(["in_progress", "completed", "archived"]).optional(),
        })
      );
      if (!v.isValid) return invalidParams(id, v.error);
      result = await handleUpdateRFP(v.data, authContext);
      break;
    }

    // ── Write: Suppliers ────────────────────────────────────────────────────
    case "create_supplier": {
      const v = validateParams(
        toolArgs,
        z.object({
          rfp_id: z.string().min(1),
          name: z.string().min(1).max(255),
          supplier_id_external: z.string().optional(),
          contact_name: z.string().optional(),
          contact_email: z.string().email().optional(),
          contact_phone: z.string().optional(),
        })
      );
      if (!v.isValid) return invalidParams(id, v.error);
      result = await handleCreateSupplier(v.data, authContext);
      break;
    }

    // ── Write: Requirements ─────────────────────────────────────────────────
    case "create_requirement": {
      const v = validateParams(
        toolArgs,
        z.object({
          rfp_id: z.string().min(1),
          title: z.string().min(1).max(500),
          description: z.string().optional(),
          requirement_id_external: z.string().optional(),
          category_id: z.string().optional(),
          category_name: z.string().optional(),
          weight: z.number().min(0).max(10).optional().default(1),
          is_mandatory: z.boolean().optional().default(false),
          display_order: z.number().int().optional(),
        })
      );
      if (!v.isValid) return invalidParams(id, v.error);
      result = await handleCreateRequirement(v.data, authContext);
      break;
    }

    // ── Write: Bulk imports ─────────────────────────────────────────────────
    case "import_structure": {
      const v = validateParams(
        toolArgs,
        z.object({
          rfp_id: z.string().min(1),
          categories: z
            .array(
              z
                .object({
                  id: z.string(),
                  code: z.string().min(1),
                  title: z.string().min(1),
                  short_name: z.string().optional(),
                  level: z.number().int().min(1).max(4),
                  parent_id: z.string().nullable().optional(),
                  weight: z.number().optional().default(1),
                  display_order: z.number().int().optional(),
                })
                .passthrough()
            )
            .min(1),
          mode: z.enum(["append", "replace"]).optional().default("append"),
        })
      );
      if (!v.isValid) return invalidParams(id, v.error);
      result = await handleImportStructure(v.data, authContext);
      break;
    }

    case "import_requirements": {
      const v = validateParams(
        toolArgs,
        z.object({
          rfp_id: z.string().min(1),
          requirements: z.array(z.record(z.unknown())).min(1),
          mode: z.enum(["append", "replace"]).optional().default("append"),
        })
      );
      if (!v.isValid) return invalidParams(id, v.error);
      result = await handleImportRequirements(v.data as any, authContext);
      break;
    }

    case "import_supplier_responses": {
      const v = validateParams(
        toolArgs,
        z.object({
          rfp_id: z.string().min(1),
          version_id: z.string().optional(),
          supplier_id: z.string().optional(),
          supplier_name: z.string().optional(),
          responses: z
            .array(
              z.object({
                requirement_id_external: z.string(),
                response_text: z.string(),
                ai_score: z.number().min(0).max(5).optional(),
                manual_score: z.number().min(0).max(5).optional(),
                status: z
                  .enum(["pending", "pass", "partial", "fail", "roadmap"])
                  .optional()
                  .default("pending"),
              })
            )
            .min(1),
        })
      );
      if (!v.isValid) return invalidParams(id, v.error);
      result = await handleImportSupplierResponses(v.data, authContext);
      break;
    }

    case "upsert_response": {
      const v = validateParams(
        toolArgs,
        z.object({
          rfp_id: z.string().min(1),
          requirement_id: z.string().min(1),
          supplier_id: z.string().min(1),
          version_id: z.string().optional(),
          response_text: z.string().optional(),
          ai_score: z.number().min(0).max(5).optional(),
          ai_comment: z.string().nullable().optional(),
          manual_score: z.number().min(0).max(5).optional(),
          manual_comment: z.string().nullable().optional(),
          status: z
            .enum(["pending", "pass", "partial", "fail", "roadmap"])
            .optional(),
          is_checked: z.boolean().optional(),
          question: z.string().nullable().optional(),
        })
      );
      if (!v.isValid) return invalidParams(id, v.error);
      result = await handleUpsertResponse(v.data, authContext);
      break;
    }

    default: {
      return {
        jsonrpc: "2.0",
        id,
        error: { code: -32601, message: `Tool not found: ${toolName}` },
      };
    }
  }

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
}

/**
 * Helper: return an invalid params error response
 */
function invalidParams(id: number | string, error: string) {
  return {
    jsonrpc: "2.0",
    id,
    error: { code: -32602, message: `Invalid parameters: ${error}` },
  };
}

/**
 * Handle MCP POST requests
 * Implements JSON-RPC 2.0 protocol
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const body: {
      jsonrpc: string;
      method?: string;
      id?: number | string;
      params?: any;
    } = await req.json();
    httpLogger.info("[MCP] Request received", {
      method: body?.method,
      id: body?.id,
    });

    const requestId = body?.id as string | number;

    switch (body?.method) {
      case "initialize": {
        const response = handleInitialize(requestId);
        httpLogger.info(`[MCP] Initialize completed in ${Date.now() - startTime}ms`);
        return NextResponse.json(response, { headers: corsHeaders() });
      }

      case "tools/list": {
        const response = handleToolsList(requestId);
        httpLogger.info(`[MCP] Tools/list completed in ${Date.now() - startTime}ms`);
        return NextResponse.json(response, { headers: corsHeaders() });
      }

      case "tools/call": {
        const authContext = await authenticateMCPRequest(req);
        if (!authContext) {
          httpLogger.warn("[MCP] Unauthorized tools/call attempt");
          return NextResponse.json(unauthorizedResponse(requestId), {
            status: 401,
            headers: corsHeaders(),
          });
        }
        const response = await handleToolCall(requestId, body.params, authContext);
        httpLogger.info(`[MCP] Tools/call completed in ${Date.now() - startTime}ms`);
        return NextResponse.json(response, { headers: corsHeaders() });
      }

      default:
        httpLogger.warn(`[MCP] Unknown method: ${body?.method}`);
        return NextResponse.json(
          {
            jsonrpc: "2.0",
            id: requestId,
            error: { code: -32601, message: `Method not found: ${body?.method}` },
          },
          { status: 400, headers: corsHeaders() }
        );
    }
  } catch (error) {
    httpLogger.error("[MCP] Error processing request:", error as any);
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
      { status: 400, headers: corsHeaders() }
    );
  }
}

/**
 * Handle OPTIONS requests for CORS
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, mcp-session-id, Accept",
      "Access-Control-Max-Age": "86400",
    },
  });
}

/**
 * Handle GET requests - SSE Descriptor for Streamable HTTP
 * Returns Server-Sent Events stream with endpoint descriptor then closes
 * Compatible with Vercel (no long-lived connections)
 */
export async function GET(req: NextRequest) {
  httpLogger.info("[MCP] SSE descriptor requested");

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      try {
        const baseUrl = `${req.nextUrl.protocol}//${req.nextUrl.host}`;

        const endpoint = {
          jsonrpc: "2.0",
          method: "endpoint",
          params: {
            uri: `${baseUrl}/api/mcp/message`,
          },
        };

        httpLogger.info("[MCP] Sending SSE endpoint descriptor", {
          uri: endpoint.params.uri,
        });

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(endpoint)}\n\n`)
        );

        controller.close();
        httpLogger.info("[MCP] SSE descriptor sent and closed");
      } catch (error) {
        httpLogger.error("[MCP] Error sending SSE descriptor:", error as any);
        controller.error(error);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

/**
 * Shared CORS headers
 */
function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  };
}
