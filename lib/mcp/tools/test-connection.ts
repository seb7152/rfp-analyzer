/**
 * MCP Tool: test_connection
 * Diagnostic tool to verify MCP server connectivity
 */

import { z } from "zod";

export const TestConnectionInputSchema = z.object({});

export interface TestConnectionInput {
  // No parameters
}

export interface TestConnectionOutput {
  status: "ok" | "error";
  message: string;
  timestamp: string;
  serverVersion: string;
}

/**
 * Test connection tool handler
 */
export function handleTestConnection(
  _input: TestConnectionInput
): TestConnectionOutput {
  return {
    status: "ok",
    message: "MCP server connection successful",
    timestamp: new Date().toISOString(),
    serverVersion: "1.0.0",
  };
}
