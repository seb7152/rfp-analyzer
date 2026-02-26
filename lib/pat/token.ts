import { createHash, randomBytes } from "crypto";
import { createServiceClient } from "@/lib/supabase/service";

const TOKEN_PREFIX = "rfpa_";

/**
 * Generate a new raw PAT token + its hash + its display prefix.
 * The raw token is returned ONCE and must be shown to the user immediately.
 * Only the hash is stored in the database.
 */
export function generateToken(): {
  raw: string;
  hash: string;
  prefix: string;
} {
  const raw = TOKEN_PREFIX + randomBytes(32).toString("base64url");
  const hash = hashToken(raw);
  const prefix = raw.slice(0, TOKEN_PREFIX.length + 8); // "rfpa_" + 8 chars
  return { raw, hash, prefix };
}

/**
 * Hash a raw token using SHA-256. Used for storage and lookup.
 */
export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/**
 * Validate a raw token against the database.
 * Returns the associated userId and organizationId, or null if invalid.
 * Also updates last_used_at as a fire-and-forget side effect.
 */
export async function validateToken(raw: string): Promise<{
  userId: string;
  organizationIds: string[];
} | null> {
  const hash = hashToken(raw);
  const supabase = createServiceClient();

  const { data: token, error } = await supabase
    .from("personal_access_tokens")
    .select("id, user_id, expires_at, revoked_at")
    .eq("token_hash", hash)
    .single();

  if (error || !token) {
    return null;
  }

  // Check revoked
  if (token.revoked_at !== null) {
    return null;
  }

  // Check expiry
  if (token.expires_at !== null && new Date(token.expires_at) < new Date()) {
    return null;
  }

  // Update last_used_at (fire-and-forget)
  supabase
    .from("personal_access_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", token.id)
    .then(() => { });

  // Fetch the user's organizations
  const { data: orgRows } = await supabase
    .from("user_organizations")
    .select("organization_id")
    .eq("user_id", token.user_id)
    .order("joined_at", { ascending: true });

  return {
    userId: token.user_id,
    organizationIds: orgRows ? orgRows.map((r) => r.organization_id) : [],
  };
}
