/**
 * The organisation's choices about the Granola connector: whether members
 * may use a personal key, and who may fetch a transcript into a séance.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type GranolaFetchBy = "pilots" | "evaluators";

export interface GranolaSettings {
  personal_keys: boolean;
  fetch_by: GranolaFetchBy;
}

export const DEFAULT_GRANOLA_SETTINGS: GranolaSettings = { personal_keys: true, fetch_by: "pilots" };

export async function loadGranolaSettings(db: SupabaseClient, organizationId: string): Promise<GranolaSettings> {
  const { data, error } = await db.from("organization_ai_settings").select("granola_personal_keys, granola_fetch_by").eq("organization_id", organizationId).maybeSingle();
  if (error) throw new Error(`Réglages du connecteur illisibles : ${error.message}`);
  const row = data as { granola_personal_keys: boolean | null; granola_fetch_by: string | null } | null;
  if (!row) return DEFAULT_GRANOLA_SETTINGS;
  return {
    personal_keys: row.granola_personal_keys ?? true,
    fetch_by: row.granola_fetch_by === "evaluators" ? "evaluators" : "pilots",
  };
}
