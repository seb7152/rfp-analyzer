#!/usr/bin/env tsx
/**
 * MCP stdio Wrapper for RFP Analyzer
 *
 * This wrapper allows MCP Inspector (stdio mode) to communicate
 * with the HTTP-based MCP server.
 *
 * Usage:
 *   npx tsx scripts/mcp-stdio-wrapper.ts
 *
 * Then in MCP Inspector, select stdio transport and run:
 *   npx tsx /path/to/this/file
 */

import * as readline from "readline";

const API_URL = process.env.MCP_API_URL || "http://localhost:3000/api/mcp";

// Create readline interface for stdio
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

// stderr for logging (stdout is for JSON-RPC only)
function log(message: string, ...args: any[]) {
  console.error(`[MCP-Wrapper] ${message}`, ...args);
}

// Forward JSON-RPC message to HTTP server
async function forwardMessage(message: any): Promise<any> {
  try {
    log("Forwarding message:", message.method);

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    log("Received response:", result.result ? "success" : "error");
    return result;
  } catch (error) {
    log("Error forwarding message:", error);
    return {
      jsonrpc: "2.0",
      id: message.id,
      error: {
        code: -32603,
        message: `Internal error: ${error instanceof Error ? error.message : String(error)}`,
      },
    };
  }
}

// Main loop: read from stdin, forward to HTTP, write response to stdout
rl.on("line", async (line: string) => {
  try {
    const message = JSON.parse(line);
    log("Received message from stdin");

    const response = await forwardMessage(message);

    // Write response to stdout (JSON-RPC protocol)
    console.log(JSON.stringify(response));
  } catch (error) {
    log("Error parsing message:", error);
    const errorResponse = {
      jsonrpc: "2.0",
      id: null,
      error: {
        code: -32700,
        message: "Parse error",
        data: error instanceof Error ? error.message : String(error),
      },
    };
    console.log(JSON.stringify(errorResponse));
  }
});

// Handle process termination
process.on("SIGINT", () => {
  log("Shutting down...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  log("Shutting down...");
  process.exit(0);
});

log("MCP stdio wrapper started");
log(`Forwarding to: ${API_URL}`);
log("Ready to receive JSON-RPC messages on stdin");
