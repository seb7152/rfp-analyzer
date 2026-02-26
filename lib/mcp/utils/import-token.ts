/**
 * Short-lived import tokens for /api/mcp/import-file
 *
 * Stateless HMAC-SHA256 signed tokens — no DB table required.
 * Signed with SUPABASE_SERVICE_ROLE_KEY (already in env).
 *
 * Token format:  base64url(payload_json) . base64url(hmac_sha256(payload))
 * TTL: 15 minutes
 */

import crypto from "crypto";

const TTL_MS = 15 * 60 * 1000; // 15 min

function secret(): string {
  const s = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.IMPORT_TOKEN_SECRET ?? "";
  if (!s) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set — cannot sign import tokens");
  return s;
}

function sign(encodedPayload: string): string {
  return crypto.createHmac("sha256", secret()).update(encodedPayload).digest("base64url");
}

export interface ImportTokenPayload {
  userId: string;
  organizationIds: string[];
  exp: number;
}

/**
 * Generate a short-lived import token from an authenticated MCP context.
 * Include it in the Authorization header of POST /api/mcp/import-file requests.
 */
export function generateImportToken(ctx: {
  userId: string;
  organizationIds: string[];
}): string {
  const payload: ImportTokenPayload = {
    userId: ctx.userId,
    organizationIds: ctx.organizationIds,
    exp: Date.now() + TTL_MS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = sign(encodedPayload);
  return `${encodedPayload}.${sig}`;
}

/**
 * Verify an import token. Returns the payload if valid, null otherwise.
 */
export function verifyImportToken(token: string): ImportTokenPayload | null {
  const dot = token.lastIndexOf(".");
  if (dot === -1) return null;

  const encodedPayload = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  // Constant-time signature comparison (both are base64url of SHA-256 → same length)
  const expectedSig = sign(encodedPayload);
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return null;
  } catch {
    return null;
  }

  try {
    const payload: ImportTokenPayload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf-8")
    );
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
