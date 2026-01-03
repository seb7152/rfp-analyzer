/**
 * MCP HTTP Route Handler
 * Handles Model Context Protocol requests over HTTP
 *
 * This route receives POST requests with MCP protocol messages
 * and dispatches them to the appropriate tool handlers
 */

import { NextRequest, NextResponse } from "next/server";
import { httpLogger } from "@/lib/mcp/utils/logger";
import { handleTestConnection } from "@/lib/mcp/tools/test-connection";
import { handleGetRFPs, GetRFPsInputSchema } from "@/lib/mcp/tools/get-rfps";
import {
  handleGetRequirements,
  GetRequirementsInputSchema,
} from "@/lib/mcp/tools/get-requirements";
import {
  handleListSuppliers,
  ListSuppliersInputSchema,
} from "@/lib/mcp/tools/list-suppliers";
import {
  handleGetRequirementsTree,
  GetRequirementsTreeInputSchema,
} from "@/lib/mcp/tools/get-requirements-tree";

/**
 * MCP Protocol Request Structure
 */
interface MCPRequest {
  jsonrpc: string;
  id: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

/**
 * MCP Protocol Response Structure
 */
interface MCPResponse {
  jsonrpc: string;
  id: string | number | null;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

/**
 * Tool dispatcher - maps tool names to handler functions
 */
function dispatchTool(
  toolName: string,
  params: Record<string, unknown>
): unknown {
  switch (toolName) {
    case "test_connection":
      return handleTestConnection({});

    case "get_rfps": {
      const parsed = GetRFPsInputSchema.safeParse(params);
      if (!parsed.success) {
        throw new Error(`Invalid parameters: ${parsed.error.message}`);
      }
      return handleGetRFPs(parsed.data);
    }

    case "get_requirements": {
      const parsed = GetRequirementsInputSchema.safeParse(params);
      if (!parsed.success) {
        throw new Error(`Invalid parameters: ${parsed.error.message}`);
      }
      return handleGetRequirements(parsed.data);
    }

    case "get_requirements_tree": {
      const parsed = GetRequirementsTreeInputSchema.safeParse(params);
      if (!parsed.success) {
        throw new Error(`Invalid parameters: ${parsed.error.message}`);
      }
      return handleGetRequirementsTree(parsed.data);
    }

    case "list_suppliers": {
      const parsed = ListSuppliersInputSchema.safeParse(params);
      if (!parsed.success) {
        throw new Error(`Invalid parameters: ${parsed.error.message}`);
      }
      return handleListSuppliers(parsed.data);
    }

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

/**
 * Handle OPTIONS requests (CORS preflight)
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

/**
 * Handle POST requests (MCP tool calls)
 */
export async function POST(request: NextRequest) {
  try {
    const startTime = Date.now();

    // Parse request body
    const body = (await request.json()) as MCPRequest;
    httpLogger.info("MCP request received", {
      method: body.method,
      id: body.id,
      hasParams: !!body.params,
    });

    // Handle RPC calls (tool invocations)
    if (body.method === "tools/call") {
      const toolName = body.params?.name as string | undefined;
      const toolParams = (body.params?.arguments ?? {}) as Record<
        string,
        unknown
      >;

      if (!toolName) {
        return NextResponse.json(
          {
            jsonrpc: "2.0",
            id: body.id,
            error: {
              code: -32602,
              message: "Missing tool name in params",
            },
          } as MCPResponse,
          { status: 400 }
        );
      }

      try {
        const result = dispatchTool(toolName, toolParams);
        const elapsedMs = Date.now() - startTime;

        httpLogger.info("Tool executed successfully", {
          tool: toolName,
          elapsedMs,
        });

        return NextResponse.json({
          jsonrpc: "2.0",
          id: body.id,
          result,
        } as MCPResponse);
      } catch (toolError) {
        const elapsedMs = Date.now() - startTime;
        const errorMessage =
          toolError instanceof Error ? toolError.message : "Unknown error";

        httpLogger.error(
          "Tool execution failed",
          { tool: toolName, elapsedMs },
          toolError instanceof Error ? toolError : new Error(String(toolError))
        );

        return NextResponse.json(
          {
            jsonrpc: "2.0",
            id: body.id,
            error: {
              code: -32603,
              message: `Tool error: ${errorMessage}`,
            },
          } as MCPResponse,
          { status: 400 }
        );
      }
    }

    // Handle initialize request
    if (body.method === "initialize") {
      return NextResponse.json({
        jsonrpc: "2.0",
        id: body.id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: {
            tools: {
              listChanged: false,
            },
          },
          serverInfo: {
            name: "RFP Analyzer MCP Server",
            version: "1.0.0",
          },
        },
      } as MCPResponse);
    }

    // Handle tools/list request
    if (body.method === "tools/list") {
      return NextResponse.json({
        jsonrpc: "2.0",
        id: body.id,
        result: {
          tools: [
            {
              name: "test_connection",
              description: "Test MCP server connectivity and health",
              inputSchema: {
                type: "object",
                properties: {},
              },
            },
            {
              name: "get_rfps",
              description: "List all RFPs with pagination support",
              inputSchema: {
                type: "object",
                properties: {
                  limit: {
                    type: "number",
                    description:
                      "Maximum number of results (default: 50, max: 100)",
                  },
                  offset: {
                    type: "number",
                    description: "Number of results to skip (default: 0)",
                  },
                },
              },
            },
            {
              name: "get_requirements",
              description:
                "Get requirements for a specific RFP with pagination",
              inputSchema: {
                type: "object",
                properties: {
                  rfp_id: {
                    type: "string",
                    description: "The RFP ID",
                  },
                  limit: {
                    type: "number",
                    description:
                      "Maximum number of results (default: 50, max: 100)",
                  },
                  offset: {
                    type: "number",
                    description: "Number of results to skip (default: 0)",
                  },
                },
                required: ["rfp_id"],
              },
            },
            {
              name: "get_requirements_tree",
              description:
                "Get hierarchical requirements tree for an RFP (4-level structure: Domain > Category > SubCategory > Requirement)",
              inputSchema: {
                type: "object",
                properties: {
                  rfp_id: {
                    type: "string",
                    description: "The RFP ID",
                  },
                  flatten: {
                    type: "boolean",
                    description:
                      "If true, return flattened list instead of tree (default: false)",
                  },
                },
                required: ["rfp_id"],
              },
            },
            {
              name: "list_suppliers",
              description: "List suppliers for a specific RFP with pagination",
              inputSchema: {
                type: "object",
                properties: {
                  rfp_id: {
                    type: "string",
                    description: "The RFP ID",
                  },
                  limit: {
                    type: "number",
                    description:
                      "Maximum number of results (default: 50, max: 100)",
                  },
                  offset: {
                    type: "number",
                    description: "Number of results to skip (default: 0)",
                  },
                },
                required: ["rfp_id"],
              },
            },
          ],
        },
      } as MCPResponse);
    }

    // Unknown method
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: body.id,
        error: {
          code: -32601,
          message: `Unknown method: ${body.method}`,
        },
      } as MCPResponse,
      { status: 400 }
    );
  } catch (error) {
    httpLogger.error(
      "Request processing failed",
      {},
      error instanceof Error ? error : new Error(String(error))
    );

    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32700,
          message: "Parse error",
        },
      } as MCPResponse,
      { status: 400 }
    );
  }
}

/**
 * Handle GET requests (return API documentation)
 */
export async function GET() {
  return NextResponse.json({
    name: "RFP Analyzer MCP Server",
    version: "1.0.0",
    description: "MCP server for RFP analysis and evaluation",
    endpoint: "/api/mcp",
    transport: "http",
    tools: [
      "test_connection",
      "get_rfps",
      "get_requirements",
      "list_suppliers",
    ],
  });
}
