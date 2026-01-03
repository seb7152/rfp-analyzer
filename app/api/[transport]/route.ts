/**
 * MCP Server Route Handler
 * Uses Vercel's mcp-handler adapter for Next.js
 */

import createMcpHandler from "mcp-handler/dist/index.mjs";
import { z } from "zod";
import { httpLogger } from "@/lib/mcp/utils/logger";

// Import business logic functions (pure handlers, not MCP-specific)
import { handleTestConnection } from "@/lib/mcp/tools/test-connection";
import { handleGetRFPs } from "@/lib/mcp/tools/get-rfps";
import { handleGetRequirements } from "@/lib/mcp/tools/get-requirements";
import { handleListSuppliers } from "@/lib/mcp/tools/list-suppliers";
import { handleGetRequirementsTree } from "@/lib/mcp/tools/get-requirements-tree";

/**
 * Create MCP Route Handler using Vercel's mcp-handler
 * This adapter wraps StreamableHTTPServerTransport for Next.js
 */
const handler = createMcpHandler(
  async (server) => {
    httpLogger.info("Initializing MCP server tools...");

    // Tool: test_connection
    server.tool(
      "test_connection",
      {
        title: "Test MCP Server Connectivity",
        description: "Test MCP server connectivity and health",
        inputSchema: {},
      },
      async () => {
        httpLogger.info("Tool called: test_connection");
        const result = handleTestConnection({});

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }
    );

    // Tool: get_rfps
    server.tool(
      "get_rfps",
      {
        title: "List All RFPs",
        description: "List all RFPs with pagination support",
        inputSchema: {
          limit: z
            .number()
            .int()
            .min(1)
            .max(100)
            .optional()
            .default(50)
            .describe("Maximum number of results (default: 50, max: 100)"),
          offset: z
            .number()
            .int()
            .min(0)
            .optional()
            .default(0)
            .describe("Number of results to skip (default: 0)"),
        },
      },
      async ({ limit, offset }) => {
        httpLogger.info("Tool called: get_rfps", { limit, offset });
        const result = handleGetRFPs({ limit, offset });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }
    );

    // Tool: get_requirements
    server.tool(
      "get_requirements",
      {
        title: "Get Requirements",
        description: "Get requirements for a specific RFP with pagination",
        inputSchema: {
          rfp_id: z.string().uuid().describe("The RFP ID"),
          limit: z
            .number()
            .int()
            .min(1)
            .max(100)
            .optional()
            .default(50)
            .describe("Maximum number of results (default: 50, max: 100)"),
          offset: z
            .number()
            .int()
            .min(0)
            .optional()
            .default(0)
            .describe("Number of results to skip (default: 0)"),
        },
      },
      async ({ rfp_id, limit, offset }) => {
        httpLogger.info("Tool called: get_requirements", {
          rfp_id,
          limit,
          offset,
        });
        const result = handleGetRequirements({ rfp_id, limit, offset });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }
    );

    // Tool: get_requirements_tree
    server.tool(
      "get_requirements_tree",
      {
        title: "Get Requirements Tree",
        description:
          "Get hierarchical requirements tree for an RFP (4-level structure: Domain > Category > SubCategory > Requirement)",
        inputSchema: {
          rfp_id: z.string().uuid().describe("The RFP ID"),
          flatten: z
            .boolean()
            .optional()
            .default(false)
            .describe(
              "If true, return flattened list instead of tree (default: false)"
            ),
        },
      },
      async ({ rfp_id, flatten }) => {
        httpLogger.info("Tool called: get_requirements_tree", {
          rfp_id,
          flatten,
        });
        const result = handleGetRequirementsTree({ rfp_id, flatten });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }
    );

    // Tool: list_suppliers
    server.tool(
      "list_suppliers",
      {
        title: "List Suppliers",
        description: "List suppliers for a specific RFP with pagination",
        inputSchema: {
          rfp_id: z.string().uuid().describe("The RFP ID"),
          limit: z
            .number()
            .int()
            .min(1)
            .max(100)
            .optional()
            .default(50)
            .describe("Maximum number of results (default: 50, max: 100)"),
          offset: z
            .number()
            .int()
            .min(0)
            .optional()
            .default(0)
            .describe("Number of results to skip (default: 0)"),
        },
      },
      async ({ rfp_id, limit, offset }) => {
        httpLogger.info("Tool called: list_suppliers", {
          rfp_id,
          limit,
          offset,
        });
        const result = handleListSuppliers({ rfp_id, limit, offset });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }
    );

    httpLogger.info("All MCP tools registered successfully");
  },
  {
    capabilities: {},
  },
  {
    basePath: "/api/[transport]",
    streamableHttpEndpoint: "/",
    sseEndpoint: "/sse",
    sseMessageEndpoint: "/message",
    maxDuration: 60,
    disableSse: true,
    verboseLogs: true,
  }
);

// Export handler for Next.js API routes
export { handler as GET, handler as POST };
