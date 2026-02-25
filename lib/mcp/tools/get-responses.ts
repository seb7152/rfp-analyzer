/**
 * MCP Tool: get_responses
 * Get responses with flexible filtering: by supplier, by requirement, or by category (node-level).
 * When filtering by category_id, returns responses for ALL requirements in the subtree (recursive).
 */

import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import type { MCPAuthContext } from "@/lib/mcp/auth";
import {
  PaginatedResponse,
  createPaginatedResponse,
} from "../utils/pagination";
import { resolveVersionId } from "../utils/versions";

export const GetResponsesInputSchema = z.object({
  rfp_id: z.string().min(1, "RFP ID is required"),
  version_id: z
    .string()
    .optional()
    .describe(
      "Evaluation version ID. Omit to use the active version. Use get_rfp_versions to list all versions."
    ),
  supplier_id: z
    .string()
    .optional()
    .describe("Filter by supplier ID"),
  requirement_id: z
    .string()
    .optional()
    .describe("Filter by specific requirement ID"),
  category_id: z
    .string()
    .optional()
    .describe(
      "Filter by category ID — returns responses for all requirements in the category subtree (recursive)"
    ),
  include_scores: z
    .boolean()
    .optional()
    .default(true)
    .describe("Include ai_score, manual_score and status (default: true)"),
  limit: z.number().int().min(1).max(200).optional().default(50),
  offset: z.number().int().min(0).optional().default(0),
});

export type GetResponsesInput = z.infer<typeof GetResponsesInputSchema>;

export interface ResponseItem {
  id: string;
  versionId: string;
  requirementId: string;
  requirementExternalId: string;
  requirementTitle: string;
  categoryId: string | null;
  supplierId: string;
  supplierName: string;
  supplierExternalId: string;
  responseText: string | null;
  aiScore: number | null;
  aiComment: string | null;
  manualScore: number | null;
  manualComment: string | null;
  status: string;
  isChecked: boolean;
  updatedAt: string;
}

export type GetResponsesOutput = PaginatedResponse<ResponseItem>;

/**
 * Collect all requirement IDs in a category subtree (recursive).
 */
async function getRequirementIdsForCategory(
  rfp_id: string,
  category_id: string
): Promise<string[]> {
  const supabase = createServiceClient();

  // Fetch all categories for this RFP to build a local tree
  const { data: allCategories } = await supabase
    .from("categories")
    .select("id, parent_id")
    .eq("rfp_id", rfp_id);

  if (!allCategories) return [];

  // BFS/DFS to collect all category IDs in the subtree
  const subtreeCategoryIds = new Set<string>();
  const queue = [category_id];
  while (queue.length > 0) {
    const current = queue.shift()!;
    subtreeCategoryIds.add(current);
    for (const cat of allCategories) {
      if (cat.parent_id === current) {
        queue.push(cat.id);
      }
    }
  }

  // Fetch requirement IDs for all categories in the subtree
  const { data: reqs } = await supabase
    .from("requirements")
    .select("id")
    .eq("rfp_id", rfp_id)
    .in("category_id", Array.from(subtreeCategoryIds));

  return (reqs ?? []).map((r: any) => r.id);
}

/**
 * get_responses handler
 */
export async function handleGetResponses(
  input: GetResponsesInput,
  authContext: MCPAuthContext
): Promise<GetResponsesOutput> {
  const supabase = createServiceClient();
  const {
    rfp_id,
    version_id,
    supplier_id,
    requirement_id,
    category_id,
    include_scores,
    limit,
    offset,
  } = input;

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

  // Resolve the evaluation version (active version if not specified)
  const resolvedVersionId = await resolveVersionId(rfp_id, version_id);

  // Build the responses query with joins
  let requirementIds: string[] | null = null;
  if (category_id) {
    requirementIds = await getRequirementIdsForCategory(rfp_id, category_id);
    if (requirementIds.length === 0) {
      return createPaginatedResponse([], limit, offset, 0);
    }
  }

  const selectFields = [
    "id",
    "version_id",
    "requirement_id",
    "supplier_id",
    "response_text",
    "status",
    "is_checked",
    "updated_at",
    include_scores ? "ai_score, ai_comment, manual_score, manual_comment" : "",
    "requirements!inner(id, requirement_id_external, title, category_id)",
    "suppliers!inner(id, supplier_id_external, name)",
  ]
    .filter(Boolean)
    .join(", ");

  let query = supabase
    .from("responses")
    .select(selectFields, { count: "exact" })
    .eq("rfp_id", rfp_id)
    .eq("version_id", resolvedVersionId)
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (supplier_id) query = query.eq("supplier_id", supplier_id);
  if (requirement_id) query = query.eq("requirement_id", requirement_id);
  if (requirementIds) query = query.in("requirement_id", requirementIds);

  const { data, error, count } = await query;

  if (error) throw new Error(`Failed to fetch responses: ${error.message}`);

  const items: ResponseItem[] = (data ?? []).map((row: any) => ({
    id: row.id,
    versionId: row.version_id,
    requirementId: row.requirement_id,
    requirementExternalId: row.requirements?.requirement_id_external ?? "",
    requirementTitle: row.requirements?.title ?? "",
    categoryId: row.requirements?.category_id ?? null,
    supplierId: row.supplier_id,
    supplierName: row.suppliers?.name ?? "",
    supplierExternalId: row.suppliers?.supplier_id_external ?? "",
    responseText: row.response_text,
    aiScore: include_scores ? (row.ai_score ?? null) : null,
    aiComment: include_scores ? (row.ai_comment ?? null) : null,
    manualScore: include_scores ? (row.manual_score ?? null) : null,
    manualComment: include_scores ? (row.manual_comment ?? null) : null,
    status: row.status,
    isChecked: row.is_checked ?? false,
    updatedAt: row.updated_at,
  }));

  return createPaginatedResponse(items, limit, offset, count ?? items.length);
}
