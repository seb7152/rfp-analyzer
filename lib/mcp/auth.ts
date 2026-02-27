import { type NextRequest } from "next/server";
import { validateToken } from "@/lib/pat/token";

export interface MCPAuthContext {
  userId: string;
  organizationIds: string[];
  /** Raw PAT token — available when the context originates from an MCP request (not from an import token) */
  rawToken?: string;
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
  let token = "";

  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.slice("Bearer ".length).trim();
  }

  // Fallback to query parameter if no token in header
  if (!token) {
    const searchParams = req.nextUrl?.searchParams || new URL(req.url).searchParams;
    const tokenParam = searchParams.get("token");
    if (tokenParam) {
      token = tokenParam.trim();
    }
  }

  if (!token) {
    return null;
  }

  const ctx = await validateToken(token);
  if (!ctx) return null;
  return { ...ctx, rawToken: token };
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
