/**
 * MCP Tool: import_supplier_responses
 * Bulk import responses for a supplier from a JSON payload.
 *
 * Accepts the same format as /imports/test-supplier-1.json:
 * [
 *   { "requirement_id_external": "R - 1", "response_text": "..." }
 * ]
 *
 * The supplier is identified by supplier_id (UUID) OR supplier_name (creates one if not found).
 * Requirements are matched by requirement_id_external (e.g. "R - 1").
 *
 * Uses upsert: if a response already exists for (requirement, supplier, version), it is updated.
 * Omit version_id to target the active evaluation version.
 */

import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import type { MCPAuthContext } from "@/lib/mcp/auth";
import { resolveVersionId } from "../utils/versions";

const ResponseInputSchema = z.object({
  requirement_id_external: z
    .string()
    .describe("External requirement code (e.g. 'R - 1') — matches requirement_id_external in DB"),
  response_text: z.string().describe("The supplier's response text"),
  ai_score: z.number().min(0).max(5).optional().describe("AI score (0–5, 0.5 increments)"),
  manual_score: z.number().min(0).max(5).optional().describe("Manual score (0–5, 0.5 increments)"),
  status: z
    .enum(["pending", "pass", "partial", "fail", "roadmap"])
    .optional()
    .default("pending"),
});

export const ImportSupplierResponsesInputSchema = z.object({
  rfp_id: z.string().min(1, "RFP ID is required"),
  version_id: z
    .string()
    .optional()
    .describe(
      "Evaluation version ID. Omit to target the active version. Use get_rfp_versions to list versions."
    ),
  supplier_id: z
    .string()
    .optional()
    .describe("UUID of the supplier — required if supplier_name is not provided"),
  supplier_name: z
    .string()
    .optional()
    .describe(
      "Supplier name — creates a new supplier if not found. Required if supplier_id is not provided."
    ),
  responses: z
    .array(ResponseInputSchema)
    .min(1, "At least one response is required"),
});

export type ImportSupplierResponsesInput = z.infer<
  typeof ImportSupplierResponsesInputSchema
>;

export interface ImportSupplierResponsesOutput {
  supplierId: string;
  supplierName: string;
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{
    index: number;
    requirementExternalId: string;
    message: string;
  }>;
}

export async function handleImportSupplierResponses(
  input: ImportSupplierResponsesInput,
  authContext: MCPAuthContext
): Promise<ImportSupplierResponsesOutput> {
  const supabase = createServiceClient();
  const { rfp_id, version_id, responses } = input;

  if (!input.supplier_id && !input.supplier_name) {
    throw new Error("Either supplier_id or supplier_name must be provided.");
  }

  // Verify access
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

  // Resolve supplier
  let supplierId: string;
  let supplierName: string;

  if (input.supplier_id) {
    const { data: sup, error: supError } = await supabase
      .from("suppliers")
      .select("id, name")
      .eq("id", input.supplier_id)
      .eq("rfp_id", rfp_id)
      .single();

    if (supError || !sup)
      throw new Error(`Supplier not found: ${input.supplier_id}`);

    supplierId = sup.id;
    supplierName = sup.name;
  } else {
    // Try to find by name, create if missing
    const { data: existing } = await supabase
      .from("suppliers")
      .select("id, name")
      .eq("rfp_id", rfp_id)
      .ilike("name", input.supplier_name!.trim())
      .limit(1)
      .single();

    if (existing) {
      supplierId = existing.id;
      supplierName = existing.name;
    } else {
      const { data: created, error: createError } = await supabase
        .from("suppliers")
        .insert({ rfp_id, name: input.supplier_name! })
        .select("id, name")
        .single();

      if (createError || !created)
        throw new Error(`Failed to create supplier: ${createError?.message}`);

      supplierId = created.id;
      supplierName = created.name;
    }
  }

  // Pre-load requirements for this RFP (external_id → DB UUID)
  const { data: requirements } = await supabase
    .from("requirements")
    .select("id, requirement_id_external")
    .eq("rfp_id", rfp_id);

  const requirementByExternalId: Record<string, string> = {};
  for (const req of requirements ?? []) {
    if (req.requirement_id_external) {
      requirementByExternalId[req.requirement_id_external.trim()] = req.id;
    }
  }

  const errors: ImportSupplierResponsesOutput["errors"] = [];
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (let i = 0; i < responses.length; i++) {
    const res = responses[i];
    const requirementId =
      requirementByExternalId[res.requirement_id_external.trim()];

    if (!requirementId) {
      errors.push({
        index: i,
        requirementExternalId: res.requirement_id_external,
        message: `Requirement with external ID '${res.requirement_id_external}' not found in this RFP`,
      });
      skipped++;
      continue;
    }

    // Check if response already exists for this version (for tracking created vs updated)
    const { data: existing } = await supabase
      .from("responses")
      .select("id")
      .eq("rfp_id", rfp_id)
      .eq("requirement_id", requirementId)
      .eq("supplier_id", supplierId)
      .eq("version_id", resolvedVersionId)
      .single();

    const payload: Record<string, unknown> = {
      rfp_id,
      requirement_id: requirementId,
      supplier_id: supplierId,
      version_id: resolvedVersionId,
      response_text: res.response_text,
      status: res.status,
    };
    if (res.ai_score !== undefined) payload.ai_score = res.ai_score;
    if (res.manual_score !== undefined) payload.manual_score = res.manual_score;

    const { error } = await supabase
      .from("responses")
      .upsert(payload, { onConflict: "requirement_id,supplier_id,version_id" });

    if (error) {
      errors.push({
        index: i,
        requirementExternalId: res.requirement_id_external,
        message: error.message,
      });
      skipped++;
    } else if (existing) {
      updated++;
    } else {
      created++;
    }
  }

  return {
    supplierId,
    supplierName,
    created,
    updated,
    skipped,
    errors,
  };
}
