/**
 * MCP Utility: Evaluation Versions
 * Helpers for resolving the active evaluation version of an RFP.
 *
 * The versioning system (migration 023) adds:
 * - evaluation_versions table: one or more versions per RFP (is_active = current)
 * - responses.version_id: NOT NULL, each response belongs to a version
 * - Unique constraint: (requirement_id, supplier_id, version_id)
 */

import { createServiceClient } from "@/lib/supabase/service";

export interface EvaluationVersion {
  id: string;
  rfpId: string;
  versionNumber: number;
  versionName: string;
  description: string | null;
  isActive: boolean;
  parentVersionId: string | null;
  createdAt: string;
  finalizedAt: string | null;
}

/**
 * Resolve a version ID for an RFP:
 * - If version_id is provided, validate it belongs to this RFP and return it.
 * - Otherwise, return the active version ID (is_active = true).
 * Throws if no active version is found.
 */
export async function resolveVersionId(
  rfp_id: string,
  version_id?: string | null
): Promise<string> {
  const supabase = createServiceClient();

  if (version_id) {
    const { data, error } = await supabase
      .from("evaluation_versions")
      .select("id")
      .eq("id", version_id)
      .eq("rfp_id", rfp_id)
      .single();

    if (error || !data) {
      throw new Error(
        `Version '${version_id}' not found for RFP '${rfp_id}'.`
      );
    }
    return data.id;
  }

  // Fetch active version
  const { data, error } = await supabase
    .from("evaluation_versions")
    .select("id")
    .eq("rfp_id", rfp_id)
    .eq("is_active", true)
    .order("version_number", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    throw new Error(
      `No active evaluation version found for RFP '${rfp_id}'. ` +
        `Use get_rfp_versions to list available versions.`
    );
  }

  return data.id;
}

/**
 * List all evaluation versions for an RFP.
 */
export async function listVersions(rfp_id: string): Promise<EvaluationVersion[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("evaluation_versions")
    .select(
      "id, rfp_id, version_number, version_name, description, is_active, parent_version_id, created_at, finalized_at"
    )
    .eq("rfp_id", rfp_id)
    .order("version_number", { ascending: true });

  if (error) throw new Error(`Failed to fetch versions: ${error.message}`);

  return (data ?? []).map((v: any) => ({
    id: v.id,
    rfpId: v.rfp_id,
    versionNumber: v.version_number,
    versionName: v.version_name,
    description: v.description,
    isActive: v.is_active,
    parentVersionId: v.parent_version_id,
    createdAt: v.created_at,
    finalizedAt: v.finalized_at,
  }));
}
