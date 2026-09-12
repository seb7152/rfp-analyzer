/**
 * Where a connector key comes from: the member's own key when the
 * organisation allows personal keys, else the organisation's key, else, in
 * development only, the GRANOLA_API_KEY of the environment. Rows are read
 * and written with the service client: the table has no RLS policy.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { decryptSecret, encryptSecret, last4 } from "./crypto";

export type ConnectorProvider = "granola";
export type KeyScope = "user" | "organization" | "env";

export interface ConnectorKeyRow {
  id: string;
  provider: ConnectorProvider;
  organization_id: string;
  user_id: string | null;
  ciphertext: string;
  last4: string;
  verified_at: string | null;
  verified_meta: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** What the browser is told about a stored key. */
export interface ConnectorKeyInfo {
  last4: string;
  verified_at: string | null;
  verified_meta: Record<string, unknown>;
  updated_at: string;
}

export function toInfo(row: ConnectorKeyRow | null): ConnectorKeyInfo | null {
  if (!row) return null;
  return { last4: row.last4, verified_at: row.verified_at, verified_meta: row.verified_meta ?? {}, updated_at: row.updated_at };
}

export async function loadKeyRow(provider: ConnectorProvider, organizationId: string, userId: string | null): Promise<ConnectorKeyRow | null> {
  const db = createServiceClient();
  let q = db.from("connector_keys").select("*").eq("provider", provider).eq("organization_id", organizationId);
  q = userId ? q.eq("user_id", userId) : q.is("user_id", null);
  const { data, error } = await q.maybeSingle();
  if (error) throw new Error(`Clé de connecteur illisible : ${error.message}`);
  return (data as ConnectorKeyRow | null) ?? null;
}

export async function storeKey(
  provider: ConnectorProvider,
  organizationId: string,
  userId: string | null,
  secret: string,
  by: string,
  verified: { verified_at: string; verified_meta: Record<string, unknown> } | null
): Promise<ConnectorKeyRow> {
  const db = createServiceClient();
  const existing = await loadKeyRow(provider, organizationId, userId);
  const values = {
    provider,
    organization_id: organizationId,
    user_id: userId,
    ciphertext: encryptSecret(secret),
    last4: last4(secret),
    verified_at: verified?.verified_at ?? null,
    verified_meta: verified?.verified_meta ?? {},
  };
  const query = existing
    ? db.from("connector_keys").update(values).eq("id", existing.id).select("*").single()
    : db.from("connector_keys").insert({ ...values, created_by: by }).select("*").single();
  const { data, error } = await query;
  if (error || !data) throw new Error(`Clé de connecteur non enregistrée : ${error?.message ?? "inconnue"}`);
  return data as ConnectorKeyRow;
}

export async function deleteKey(provider: ConnectorProvider, organizationId: string, userId: string | null): Promise<void> {
  const db = createServiceClient();
  let q = db.from("connector_keys").delete().eq("provider", provider).eq("organization_id", organizationId);
  q = userId ? q.eq("user_id", userId) : q.is("user_id", null);
  const { error } = await q;
  if (error) throw new Error(`Clé de connecteur non retirée : ${error.message}`);
}

const ENV_FALLBACK_ALLOWED = process.env.VERCEL_ENV !== "production" && process.env.NODE_ENV !== "production";

/**
 * The key to call the provider with for a member of an organisation, and
 * where it came from. Null when there is none.
 */
export async function resolveKey(
  provider: ConnectorProvider,
  organizationId: string,
  userId: string,
  personalKeysAllowed: boolean
): Promise<{ key: string; scope: KeyScope; row: ConnectorKeyRow | null } | null> {
  if (personalKeysAllowed) {
    const own = await loadKeyRow(provider, organizationId, userId);
    if (own) return { key: decryptSecret(own.ciphertext), scope: "user", row: own };
  }
  const org = await loadKeyRow(provider, organizationId, null);
  if (org) return { key: decryptSecret(org.ciphertext), scope: "organization", row: org };
  const env = provider === "granola" ? process.env.GRANOLA_API_KEY?.trim() : undefined;
  if (env && ENV_FALLBACK_ALLOWED) return { key: env, scope: "env", row: null };
  return null;
}

/** Whether a development fallback key exists (never its value). */
export function hasEnvFallback(provider: ConnectorProvider): boolean {
  return ENV_FALLBACK_ALLOWED && provider === "granola" && !!process.env.GRANOLA_API_KEY?.trim();
}
