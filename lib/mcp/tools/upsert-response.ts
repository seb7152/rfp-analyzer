/**
 * MCP Tool: upsert_response
 * Create or update a single response for a (requirement, supplier, version) triplet.
 * If a response already exists for this combination, it is updated.
 * Omit version_id to target the active evaluation version.
 */

import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import type { MCPAuthContext } from "@/lib/mcp/auth";
import { resolveVersionId } from "../utils/versions";

export const UpsertResponseInputSchema = z.object({
  rfp_id: z.string().min(1, "RFP ID is required"),
  requirement_id: z
    .string()
    .min(1, "Requirement ID is required")
    .describe("UUID of the requirement"),
  supplier_id: z
    .string()
    .min(1, "Supplier ID is required")
    .describe("UUID of the supplier"),
  version_id: z
    .string()
    .optional()
    .describe(
      "Evaluation version ID. Omit to target the active version. Use get_rfp_versions to list versions."
    ),
  response_text: z
    .string()
    .optional()
    .describe("The response text content"),
  ai_score: z
    .number()
    .min(0)
    .max(5)
    .optional()
    .describe("AI score (0–5, supports 0.5 increments)"),
  ai_comment: z
    .string()
    .nullable()
    .optional()
    .describe("AI-generated comment"),
  manual_score: z
    .number()
    .min(0)
    .max(5)
    .optional()
    .describe("Manual score (0–5, supports 0.5 increments)"),
  manual_comment: z
    .string()
    .nullable()
    .optional()
    .describe("Evaluator comment"),
  status: z
    .enum(["pending", "pass", "partial", "fail", "roadmap"])
    .optional()
    .describe("Evaluation status"),
  is_checked: z
    .boolean()
    .optional()
    .describe("Whether this response has been reviewed"),
  question: z
    .string()
    .nullable()
    .optional()
    .describe("Optional question raised by the evaluator"),
});

export type UpsertResponseInput = z.infer<typeof UpsertResponseInputSchema>;

export interface UpsertResponseOutput {
  id: string;
  rfpId: string;
  versionId: string;
  requirementId: string;
  supplierId: string;
  responseText: string | null;
  aiScore: number | null;
  aiComment: string | null;
  manualScore: number | null;
  manualComment: string | null;
  status: string;
  isChecked: boolean;
  updatedAt: string;
  action: "created" | "updated";
}

export async function handleUpsertResponse(
  input: UpsertResponseInput,
  authContext: MCPAuthContext
): Promise<UpsertResponseOutput> {
  const supabase = createServiceClient();
  const { rfp_id, requirement_id, supplier_id, version_id } = input;

  // Verify RFP access
  const { data: rfp, error: rfpError } = await supabase
    .from("rfps")
    .select("id, organization_id")
    .eq("id", rfp_id)
    .single();

  if (rfpError || !rfp) throw new Error(`RFP not found: ${rfp_id}`);

  if (
    authContext.organizationId &&
    rfp.organization_id !== authContext.organizationId
  ) {
    const { data: assignment } = await supabase
      .from("rfp_user_assignments")
      .select("id")
      .eq("rfp_id", rfp_id)
      .eq("user_id", authContext.userId)
      .single();
    if (!assignment) throw new Error(`Access denied to RFP: ${rfp_id}`);
  }

  // Resolve version (active if not specified)
  const resolvedVersionId = await resolveVersionId(rfp_id, version_id);

  // Check if a response exists already for this (requirement, supplier, version) triplet
  const { data: existing } = await supabase
    .from("responses")
    .select("id")
    .eq("rfp_id", rfp_id)
    .eq("requirement_id", requirement_id)
    .eq("supplier_id", supplier_id)
    .eq("version_id", resolvedVersionId)
    .single();

  const isUpdate = !!existing;

  // Build payload — only include fields that were explicitly provided
  const payload: Record<string, unknown> = {
    rfp_id,
    requirement_id,
    supplier_id,
    version_id: resolvedVersionId,
    last_modified_by: authContext.userId,
  };

  if (input.response_text !== undefined) payload.response_text = input.response_text;
  if (input.ai_score !== undefined) payload.ai_score = input.ai_score;
  if (input.ai_comment !== undefined) payload.ai_comment = input.ai_comment;
  if (input.manual_score !== undefined) payload.manual_score = input.manual_score;
  if (input.manual_comment !== undefined) payload.manual_comment = input.manual_comment;
  if (input.status !== undefined) payload.status = input.status;
  if (input.is_checked !== undefined) payload.is_checked = input.is_checked;
  if (input.question !== undefined) payload.question = input.question;

  const { data, error } = await supabase
    .from("responses")
    .upsert(payload, { onConflict: "requirement_id,supplier_id,version_id" })
    .select(
      "id, rfp_id, version_id, requirement_id, supplier_id, response_text, ai_score, ai_comment, manual_score, manual_comment, status, is_checked, updated_at"
    )
    .single();

  if (error) throw new Error(`Failed to upsert response: ${error.message}`);

  return {
    id: data.id,
    rfpId: data.rfp_id,
    versionId: data.version_id,
    requirementId: data.requirement_id,
    supplierId: data.supplier_id,
    responseText: data.response_text,
    aiScore: data.ai_score,
    aiComment: data.ai_comment,
    manualScore: data.manual_score,
    manualComment: data.manual_comment,
    status: data.status,
    isChecked: data.is_checked ?? false,
    updatedAt: data.updated_at,
    action: isUpdate ? "updated" : "created",
  };
}
