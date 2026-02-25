import { type NextRequest } from "next/server";
import { validateToken } from "@/lib/pat/token";

export interface MCPAuthContext {
  userId: string;
  organizationId: string | null;
}

/**
 * Authenticate an MCP request using a Personal Access Token.
 *
 * Expects header: Authorization: Bearer rfpa_<token>
 *
 * Returns the authenticated user context, or null if the token is
 * missing, invalid, expired, or revoked.
 */
export async function authenticateMCPRequest(
  req: NextRequest
): Promise<MCPAuthContext | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const raw = authHeader.slice("Bearer ".length).trim();
  if (!raw) {
    return null;
  }

  return validateToken(raw);
}

/**
 * Build a JSON-RPC 2.0 Unauthorized error response.
 */
export function unauthorizedResponse(id: number | string | null) {
  return {
    jsonrpc: "2.0",
    id,
    error: {
      code: -32001,
      message: "Unauthorized: valid Personal Access Token required",
    },
  };
}
