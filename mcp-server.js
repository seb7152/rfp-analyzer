#!/usr/bin/env node

/**
 * RFP Analyzer MCP Server - Standalone Entry Point
 * Usage: node mcp-server.js
 *
 * This script exposes the MCP server on stdio for MCP Inspector
 */

const http = require("http");

const PORT = process.env.MCP_PORT || 3001;

// Simple JSON-RPC 2.0 server
const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle OPTIONS
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // Health check
  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "ok",
        server: { name: "RFP Analyzer MCP Server", version: "1.0.0" },
        protocol: "jsonrpc-2.0",
        message: "MCP Server ready. POST JSON-RPC requests to /",
      })
    );
    return;
  }

  // JSON-RPC endpoint
  if (req.method === "POST") {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", async () => {
      try {
        const jsonRpcRequest = JSON.parse(body);
        console.error(
          `[MCP] ${jsonRpcRequest.method} (id: ${jsonRpcRequest.id})`
        );

        let response;

        switch (jsonRpcRequest.method) {
          case "initialize":
            response = {
              jsonrpc: "2.0",
              id: jsonRpcRequest.id,
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
            };
            break;

          case "tools/list":
            response = {
              jsonrpc: "2.0",
              id: jsonRpcRequest.id,
              result: {
                tools: [
                  {
                    name: "test_connection",
                    title: "Test MCP Server Connectivity",
                    description: "Test MCP server connectivity and health",
                    inputSchema: {
                      type: "object",
                      properties: {},
                      required: [],
                    },
                    outputSchema: {
                      type: "object",
                      properties: {
                        status: { type: "string" },
                        message: { type: "string" },
                      },
                    },
                    readOnlyHint: true,
                    idempotentHint: true,
                  },
                  {
                    name: "get_rfps",
                    title: "List RFPs",
                    description: "List all RFPs (Request for Proposal)",
                    inputSchema: {
                      type: "object",
                      properties: {
                        limit: {
                          type: "number",
                          description: "Maximum results (default: 50)",
                          default: 50,
                        },
                        offset: {
                          type: "number",
                          description: "Skip results (default: 0)",
                          default: 0,
                        },
                      },
                    },
                    outputSchema: {
                      type: "object",
                      properties: {
                        items: { type: "array" },
                        _meta: {
                          type: "object",
                          properties: {
                            total: { type: "number" },
                            limit: { type: "number" },
                            offset: { type: "number" },
                            hasMore: { type: "boolean" },
                          },
                        },
                      },
                    },
                    readOnlyHint: true,
                    idempotentHint: true,
                  },
                  {
                    name: "get_requirements",
                    title: "Get Requirements",
                    description: "Get requirements for a specific RFP",
                    inputSchema: {
                      type: "object",
                      properties: {
                        rfp_id: {
                          type: "string",
                          description: "The RFP ID",
                        },
                        limit: {
                          type: "number",
                          description: "Maximum results (default: 50)",
                          default: 50,
                        },
                        offset: {
                          type: "number",
                          description: "Skip results (default: 0)",
                          default: 0,
                        },
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
                  },
                  {
                    name: "get_requirements_tree",
                    title: "Get Requirements Tree",
                    description:
                      "Get hierarchical requirements tree (Domain > Category > SubCategory > Requirement)",
                    inputSchema: {
                      type: "object",
                      properties: {
                        rfp_id: {
                          type: "string",
                          description: "The RFP ID",
                        },
                        flatten: {
                          type: "boolean",
                          description: "Return flat list instead of tree",
                          default: false,
                        },
                      },
                      required: ["rfp_id"],
                    },
                    outputSchema: {
                      type: "object",
                      properties: {
                        rfp_id: { type: "string" },
                        tree: { type: "object" },
                        statistics: { type: "object" },
                      },
                    },
                    readOnlyHint: true,
                    idempotentHint: true,
                  },
                  {
                    name: "list_suppliers",
                    title: "List Suppliers",
                    description: "List suppliers for a specific RFP",
                    inputSchema: {
                      type: "object",
                      properties: {
                        rfp_id: {
                          type: "string",
                          description: "The RFP ID",
                        },
                        limit: {
                          type: "number",
                          description: "Maximum results (default: 50)",
                          default: 50,
                        },
                        offset: {
                          type: "number",
                          description: "Skip results (default: 0)",
                          default: 0,
                        },
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
                  },
                ],
              },
            };
            break;

          case "tools/call": {
            const toolName = jsonRpcRequest.params?.name;
            const toolArgs = jsonRpcRequest.params?.arguments || {};

            console.error(`[MCP] Calling tool: ${toolName}`, toolArgs);

            let result;
            switch (toolName) {
              case "test_connection":
                result = {
                  status: "ok",
                  message: "MCP server is working correctly",
                };
                break;

              case "get_rfps":
                // Return mock data for now
                result = {
                  items: [
                    {
                      id: "rfp-001",
                      title: "Infrastructure Platform RFP",
                      description: "Cloud infrastructure modernization",
                      status: "active",
                      requirement_count: 42,
                      supplier_count: 5,
                      created_at: "2024-01-15T10:30:00Z",
                    },
                    {
                      id: "rfp-002",
                      title: "Security Tools RFP",
                      description: "Enterprise security stack",
                      status: "active",
                      requirement_count: 28,
                      supplier_count: 3,
                      created_at: "2024-01-20T14:45:00Z",
                    },
                  ],
                  _meta: {
                    limit: toolArgs.limit || 50,
                    offset: toolArgs.offset || 0,
                    total: 2,
                    hasMore: false,
                    nextOffset: null,
                  },
                };
                break;

              case "get_requirements":
                result = {
                  items: [
                    {
                      id: "req-001",
                      title: "Multi-cloud support",
                      description: "Must support AWS, Azure, GCP",
                      category: "Infrastructure - Cloud",
                      priority: "high",
                      mandatory: true,
                      created_at: "2024-01-15T10:30:00Z",
                    },
                    {
                      id: "req-002",
                      title: "99.99% uptime SLA",
                      description: "Service availability guarantee",
                      category: "Infrastructure - Reliability",
                      priority: "high",
                      mandatory: true,
                      created_at: "2024-01-15T11:00:00Z",
                    },
                  ],
                  _meta: {
                    limit: toolArgs.limit || 50,
                    offset: toolArgs.offset || 0,
                    total: 2,
                    hasMore: false,
                    nextOffset: null,
                  },
                };
                break;

              case "get_requirements_tree":
                result = {
                  rfp_id: toolArgs.rfp_id,
                  tree: {
                    id: `rfp-${toolArgs.rfp_id}`,
                    title: toolArgs.rfp_id,
                    type: "domain",
                    children: [
                      {
                        id: "domain-infrastructure",
                        title: "Infrastructure",
                        type: "domain",
                        children: [
                          {
                            id: "cat-cloud",
                            title: "Cloud",
                            type: "category",
                            children: [
                              {
                                id: "req-001",
                                title: "Multi-cloud support",
                                type: "requirement",
                                priority: "high",
                                mandatory: true,
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                  statistics: {
                    totalDomains: 1,
                    totalCategories: 1,
                    totalRequirements: 1,
                    highPriorityCount: 1,
                    mandatoryCount: 1,
                    requirementsByPriority: { high: 1, medium: 0, low: 0 },
                  },
                };
                break;

              case "list_suppliers":
                result = {
                  items: [
                    {
                      id: "sup-001",
                      name: "CloudTech Solutions",
                      email: "contact@cloudtech.com",
                      status: "submitted",
                      submitted_at: "2024-02-01T09:15:00Z",
                    },
                    {
                      id: "sup-002",
                      name: "InfraCore Inc",
                      email: "info@infracore.io",
                      status: "submitted",
                      submitted_at: "2024-02-02T14:30:00Z",
                    },
                  ],
                  _meta: {
                    limit: toolArgs.limit || 50,
                    offset: toolArgs.offset || 0,
                    total: 2,
                    hasMore: false,
                    nextOffset: null,
                  },
                };
                break;

              default:
                response = {
                  jsonrpc: "2.0",
                  id: jsonRpcRequest.id,
                  error: {
                    code: -32601,
                    message: `Tool not found: ${toolName}`,
                  },
                };
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify(response));
                return;
            }

            response = {
              jsonrpc: "2.0",
              id: jsonRpcRequest.id,
              result: {
                content: [
                  {
                    type: "text",
                    text: JSON.stringify(result, null, 2),
                    mimeType: "application/json",
                  },
                ],
              },
            };
            break;
          }

          default:
            response = {
              jsonrpc: "2.0",
              id: jsonRpcRequest.id,
              error: {
                code: -32601,
                message: `Method not found: ${jsonRpcRequest.method}`,
              },
            };
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(response));
      } catch (error) {
        console.error("[MCP] Error:", error);
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            jsonrpc: "2.0",
            error: {
              code: -32700,
              message: "Parse error",
              data: error instanceof Error ? error.message : String(error),
            },
            id: null,
          })
        );
      }
    });
    return;
  }

  res.writeHead(404);
  res.end("Not Found");
});

server.listen(PORT, "127.0.0.1", () => {
  console.error(`[MCP] Server listening on http://127.0.0.1:${PORT}`);
  console.error("[MCP] For MCP Inspector, use: http://127.0.0.1:3001");
});
