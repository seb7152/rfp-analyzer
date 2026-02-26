/**
 * MCP Tool: get_rfp_versions
 * List all evaluation versions of an RFP.
 * Returns version history: version number, name, active status, finalization date.
 * Use the version ID to scope get_responses, get_scoring_matrix, and upsert_response.
 */

import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import type { MCPAuthContext } from "@/lib/mcp/auth";
import { listVersions, EvaluationVersion } from "../utils/versions";

export const GetRFPVersionsInputSchema = z.object({
  rfp_id: z.string().min(1, "RFP ID is required"),
});

export type GetRFPVersionsInput = z.infer<typeof GetRFPVersionsInputSchema>;

export interface GetRFPVersionsOutput {
  rfpId: string;
  rfpTitle: string;
  activeVersionId: string | null;
  versions: EvaluationVersion[];
}

export async function handleGetRFPVersions(
  input: GetRFPVersionsInput,
  authContext: MCPAuthContext
): Promise<GetRFPVersionsOutput> {
  const supabase = createServiceClient();
  const { rfp_id } = input;

  // Verify access
  const { data: rfp, error: rfpError } = await supabase
    .from("rfps")
    .select("id, title, organization_id")
    .eq("id", rfp_id)
    .single();

  if (rfpError || !rfp) throw new Error(`RFP not found: ${rfp_id}`);

  if (
    authContext.organizationIds &&
    authContext.organizationIds.length > 0 &&
    !authContext.organizationIds.includes(rfp.organization_id)
  ) {
    const { data: assignment } = await supabase
      .from("rfp_user_assignments")
      .select("id")
      .eq("rfp_id", rfp_id)
      .eq("user_id", authContext.userId)
      .single();
    if (!assignment) throw new Error(`Access denied to RFP: ${rfp_id}`);
  }

  const versions = await listVersions(rfp_id);
  const activeVersion = versions.find((v) => v.isActive) ?? null;

  return {
    rfpId: rfp_id,
    rfpTitle: rfp.title,
    activeVersionId: activeVersion?.id ?? null,
    versions,
  };
}
