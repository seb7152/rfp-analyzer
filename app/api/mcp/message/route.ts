/**
 * MCP Message Endpoint - JSON-RPC 2.0 Handler
 * This endpoint handles all MCP JSON-RPC messages according to Streamable HTTP protocol
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { httpLogger } from "@/lib/mcp/utils/logger";
import { authenticateMCPRequest, unauthorizedResponse } from "@/lib/mcp/auth";

// Import existing business logic
import { handleTestConnection } from "@/lib/mcp/tools/test-connection";
import { handleGetRFPs } from "@/lib/mcp/tools/get-rfps";
import { handleGetRequirements } from "@/lib/mcp/tools/get-requirements";
import { handleListSuppliers } from "@/lib/mcp/tools/list-suppliers";
import { handleGetRequirementsTree } from "@/lib/mcp/tools/get-requirements-tree";
import { handleGetResponses } from "@/lib/mcp/tools/get-responses";

/**
 * Server info for initialize response
 */
const SERVER_INFO = {
  name: "RFP Analyzer MCP Server",
  version: "1.0.0",
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
  {
    name: "test_connection",
    title: "Test MCP Server Connectivity",
    description: "Test MCP server connectivity and health",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_rfps",
    title: "List All RFPs",
    description: "List all RFPs with pagination support",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Maximum number of results (default: 50, max: 100)",
          minimum: 1,
          maximum: 100,
          default: 50,
        },
        offset: {
          type: "number",
          description: "Number of results to skip (default: 0)",
          minimum: 0,
          default: 0,
        },
      },
    },
  },
  {
    name: "get_requirements",
    title: "Get Requirements",
    description: "Get requirements for a specific RFP with pagination",
    inputSchema: {
      type: "object",
      properties: {
        rfp_id: {
          type: "string",
          description: "The RFP ID",
          minLength: 1,
        },
        limit: {
          type: "number",
          description: "Maximum number of results (default: 50, max: 100)",
          minimum: 1,
          maximum: 100,
          default: 50,
        },
        offset: {
          type: "number",
          description: "Number of results to skip (default: 0)",
          minimum: 0,
          default: 0,
        },
      },
      required: ["rfp_id"],
    },
  },
  {
    name: "get_requirements_tree",
    title: "Get Requirements Tree",
    description:
      "Get hierarchical requirements tree for an RFP (4-level structure: Domain > Category > SubCategory > Requirement)",
    inputSchema: {
      type: "object",
      properties: {
        rfp_id: {
          type: "string",
          description: "The RFP ID",
          minLength: 1,
        },
        flatten: {
          type: "boolean",
          description:
            "If true, return flattened list instead of tree (default: false)",
          default: false,
        },
      },
      required: ["rfp_id"],
    },
  },
  {
    name: "list_suppliers",
    title: "List Suppliers",
    description: "List suppliers for a specific RFP with pagination",
    inputSchema: {
      type: "object",
      properties: {
        rfp_id: {
          type: "string",
          description: "The RFP ID",
          minLength: 1,
        },
        version_id: {
          type: "string",
          description: "Evaluation version ID (omit for active version)",
        },
        limit: {
          type: "number",
          description: "Maximum number of results (default: 50, max: 100)",
          minimum: 1,
          maximum: 100,
          default: 50,
        },
        offset: {
          type: "number",
          description: "Number of results to skip (default: 0)",
          minimum: 0,
          default: 0,
        },
      },
      required: ["rfp_id"],
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
      error: {
        code: -32602,
        message: "Tool name is required",
      },
    };
  }

  // Dispatch to appropriate tool handler
  let result;
  switch (toolName) {
    case "test_connection": {
      const validation = validateParams(toolArgs, z.object({}));
      if (!validation.isValid) {
        return {
          jsonrpc: "2.0",
          id,
          error: {
            code: -32602,
            message: `Invalid parameters: ${validation.error}`,
          },
        };
      }
      result = handleTestConnection(toolArgs);
      break;
    }

    case "get_rfps": {
      const validation = validateParams(
        toolArgs,
        z.object({
          limit: z.number().int().min(1).max(100).optional().default(50),
          offset: z.number().int().min(0).optional().default(0),
        })
      );
      if (!validation.isValid) {
        return {
          jsonrpc: "2.0",
          id,
          error: {
            code: -32602,
            message: `Invalid parameters: ${validation.error}`,
          },
        };
      }
      result = await handleGetRFPs(validation.data, authContext);
      break;
    }

    case "get_requirements": {
      const validation = validateParams(
        toolArgs,
        z.object({
          rfp_id: z.string().min(1),
          category_id: z.string().optional(),
          limit: z.number().int().min(1).max(200).optional().default(50),
          offset: z.number().int().min(0).optional().default(0),
        })
      );
      if (!validation.isValid) {
        return {
          jsonrpc: "2.0",
          id,
          error: {
            code: -32602,
            message: `Invalid parameters: ${validation.error}`,
          },
        };
      }
      result = await handleGetRequirements(validation.data, authContext);
      break;
    }

    case "get_responses": {
      const validation = validateParams(
        toolArgs,
        z.object({
          rfp_id: z.string().min(1),
          version_id: z.string().optional(),
          supplier_id: z.string().optional(),
          requirement_id: z.string().optional(),
          category_id: z.string().optional(),
          status: z.enum(["pending", "pass", "partial", "fail", "roadmap"]).optional(),
          min_score: z.number().min(0).max(5).optional(),
          max_score: z.number().min(0).max(5).optional(),
          has_comment: z.boolean().optional(),
          has_question: z.boolean().optional(),
          include_score: z.boolean().optional().default(true),
          include_ia_comment: z.boolean().optional().default(false),
          limit: z.number().int().min(1).max(200).optional().default(50),
          offset: z.number().int().min(0).optional().default(0),
        })
      );
      if (!validation.isValid) {
        return {
          jsonrpc: "2.0",
          id,
          error: {
            code: -32602,
            message: `Invalid parameters: ${validation.error}`,
          },
        };
      }
      result = await handleGetResponses(validation.data, authContext);
      break;
    }

    case "get_requirements_tree": {
      const validation = validateParams(
        toolArgs,
        z.object({
          rfp_id: z.string().min(1),
          flatten: z.boolean().optional().default(false),
        })
      );
      if (!validation.isValid) {
        return {
          jsonrpc: "2.0",
          id,
          error: {
            code: -32602,
            message: `Invalid parameters: ${validation.error}`,
          },
        };
      }
      result = await handleGetRequirementsTree(validation.data, authContext);
      break;
    }

    case "list_suppliers": {
      const validation = validateParams(
        toolArgs,
        z.object({
          rfp_id: z.string().min(1),
          version_id: z.string().optional(),
          limit: z.number().int().min(1).max(100).optional().default(50),
          offset: z.number().int().min(0).optional().default(0),
        })
      );
      if (!validation.isValid) {
        return {
          jsonrpc: "2.0",
          id,
          error: {
            code: -32602,
            message: `Invalid parameters: ${validation.error}`,
          },
        };
      }
      result = await handleListSuppliers(validation.data, authContext);
      break;
    }

    default: {
      return {
        jsonrpc: "2.0",
        id,
        error: {
          code: -32601,
          message: `Tool not found: ${toolName}`,
        },
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
 * Handle MCP POST requests
 * Implements JSON-RPC 2.0 protocol for Streamable HTTP
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();

  // Support optional session ID header
  const sessionId = req.headers.get("mcp-session-id");
  if (sessionId) {
    httpLogger.info(`[MCP] Session ID: ${sessionId}`);
  }

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

    // Handle different methods
    switch (body?.method) {
      case "initialize":
        const response = handleInitialize(requestId);
        const elapsedMs = Date.now() - startTime;
        httpLogger.info(`[MCP] Initialize completed in ${elapsedMs}ms`);
        return NextResponse.json(response, {
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
          },
        });

      case "notifications/initialized":
        httpLogger.info("[MCP] Received notifications/initialized");
        // Notifications don't require a JSON-RPC response, returning 202 with no body is correct
        return new NextResponse(null, {
          status: 202,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
          },
        });

      case "tools/list":
        const response1 = handleToolsList(requestId);
        const elapsedMs1 = Date.now() - startTime;
        httpLogger.info(`[MCP] Tools/list completed in ${elapsedMs1}ms`);
        return NextResponse.json(response1, {
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
          },
        });

      case "tools/call": {
        const authContext = await authenticateMCPRequest(req);
        if (!authContext) {
          httpLogger.warn("[MCP] Unauthorized tools/call attempt");
          return NextResponse.json(unauthorizedResponse(requestId), {
            status: 401,
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "POST, OPTIONS",
            },
          });
        }
        const response2 = await handleToolCall(requestId, body.params, authContext);
        const elapsedMs2 = Date.now() - startTime;
        httpLogger.info(`[MCP] Tools/call completed in ${elapsedMs2}ms`);
        return NextResponse.json(response2, {
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
          },
        });
      }

      default:
        httpLogger.warn(`[MCP] Unknown method: ${body?.method}`);
        return NextResponse.json(
          {
            jsonrpc: "2.0",
            id: requestId,
            error: {
              code: -32601,
              message: `Method not found: ${body?.method}`,
            },
          },
          {
            status: 400,
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "POST, OPTIONS",
            },
          }
        );
    }
  } catch (error) {
    httpLogger.error("[MCP] Error processing request:", error as any);

    const elapsedMs = Date.now() - startTime;
    httpLogger.info(`[MCP] Request failed in ${elapsedMs}ms`);

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
      {
        status: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
        },
      }
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
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, mcp-session-id, Accept",
      "Access-Control-Max-Age": "86400",
    },
  });
}
