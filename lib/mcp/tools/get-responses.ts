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
  status: z
    .enum(["pending", "pass", "partial", "fail", "roadmap"])
    .optional()
    .describe("Filter by evaluation status"),
  min_score: z
    .number()
    .min(0)
    .max(5)
    .optional()
    .describe("Minimum score (uses manual_score if it exists, else ai_score)"),
  max_score: z
    .number()
    .min(0)
    .max(5)
    .optional()
    .describe("Maximum score (uses manual_score if it exists, else ai_score)"),
  has_comment: z
    .boolean()
    .optional()
    .describe("Filter responses that have a manual reviewer comment"),
  has_question: z
    .boolean()
    .optional()
    .describe("Filter responses that have a reviewer question"),
  include_score: z
    .boolean()
    .optional()
    .default(true)
    .describe("Include the unified score and reviewer_comment (default: true)"),
  include_ia_comment: z
    .boolean()
    .optional()
    .default(false)
    .describe("Include the AI generated comment (default: false)"),
  limit: z.number().int().min(1).max(200).optional().default(50),
  offset: z.number().int().min(0).optional().default(0),
});

export type GetResponsesInput = z.infer<typeof GetResponsesInputSchema>;

export interface SupplierResponse {
  id: string;
  versionId: string;
  supplierId: string;
  supplierName: string;
  supplierExternalId: string;
  responseText: string | null;
  score?: number | null;
  iaComment?: string | null;
  reviewerComment?: string | null;
  status: string;
  isChecked: boolean;
  question: string | null;
  updatedAt: string;
}

export interface RequirementWithResponses {
  requirementId: string;
  requirementExternalId: string;
  requirementTitle: string;
  categoryId: string | null;
  averageScore?: number;
  responses: SupplierResponse[];
}

export type GetResponsesOutput = PaginatedResponse<RequirementWithResponses>;

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
    status,
    min_score,
    max_score,
    has_comment,
    has_question,
    include_score,
    include_ia_comment,
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

  // Fetch active suppliers for this version
  const { data: activeSuppliers, error: activeSuppliersError } = await supabase
    .from("version_supplier_status")
    .select("supplier_id")
    .eq("version_id", resolvedVersionId)
    .eq("is_active", true);

  if (activeSuppliersError) throw new Error(`Failed to fetch active suppliers: ${activeSuppliersError.message}`);

  const activeSupplierIds = activeSuppliers.map((s: any) => s.supplier_id);

  if (activeSupplierIds.length === 0) {
    return createPaginatedResponse([], limit, offset, 0);
  }

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
    "question",
    "updated_at",
    include_score ? "ai_score, manual_score, manual_comment" : "",
    include_ia_comment ? "ai_comment" : "",
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
    .in("supplier_id", activeSupplierIds)
    .order("requirement_id", { ascending: true })
    .order("supplier_id", { ascending: true })
    .range(offset, offset + limit - 1);

  if (supplier_id) query = query.eq("supplier_id", supplier_id);
  if (requirement_id) query = query.eq("requirement_id", requirement_id);
  if (requirementIds) query = query.in("requirement_id", requirementIds);
  if (status) query = query.eq("status", status);
  if (has_comment) query = query.not("manual_comment", "is", null);
  if (has_question) query = query.not("question", "is", null);

  const { data, error, count } = await query;

  if (error) throw new Error(`Failed to fetch responses: ${error.message}`);

  let allData = [...(data ?? [])];

  // Guarantee that we have ALL matching responses for the requirements in this page
  // (Fixes the issue where pagination limit cuts a requirement's responses in half)
  if (allData.length > 0) {
    const reqIdsInPage = [...new Set(allData.map((r: any) => r.requirement_id))];
    const fetchedResponseIds = new Set(allData.map((r: any) => r.id));

    let completeQuery = supabase
      .from("responses")
      .select(selectFields)
      .eq("rfp_id", rfp_id)
      .eq("version_id", resolvedVersionId)
      .in("supplier_id", activeSupplierIds)
      .in("requirement_id", reqIdsInPage);

    if (supplier_id) completeQuery = completeQuery.eq("supplier_id", supplier_id);
    if (status) completeQuery = completeQuery.eq("status", status);
    if (has_comment) completeQuery = completeQuery.not("manual_comment", "is", null);
    if (has_question) completeQuery = completeQuery.not("question", "is", null);

    const { data: missingData, error: missingError } = await completeQuery;
    if (!missingError && missingData) {
      for (const row of missingData as any[]) {
        if (!fetchedResponseIds.has(row.id)) {
          allData.push(row);
          fetchedResponseIds.add(row.id);
        }
      }
    }
  }

  // We filter scores client-side since combining nullable columns is tricky in PostgREST
  let filteredData = allData;
  if (min_score !== undefined || max_score !== undefined) {
    filteredData = filteredData.filter((row: any) => {
      const combinedScore = row.manual_score !== null ? row.manual_score : (row.ai_score ?? null);
      if (combinedScore === null) return false;
      if (min_score !== undefined && combinedScore < min_score) return false;
      if (max_score !== undefined && combinedScore > max_score) return false;
      return true;
    });
  }

  const grouped: Record<string, RequirementWithResponses> = {};

  for (const row of filteredData as any[]) {
    const reqId = row.requirement_id;
    if (!grouped[reqId]) {
      grouped[reqId] = {
        requirementId: reqId,
        requirementExternalId: row.requirements?.requirement_id_external ?? "",
        requirementTitle: row.requirements?.title ?? "",
        categoryId: row.requirements?.category_id ?? null,
        responses: [],
      };
    }

    grouped[reqId].responses.push({
      id: row.id,
      versionId: row.version_id,
      supplierId: row.supplier_id,
      supplierName: row.suppliers?.name ?? "",
      supplierExternalId: row.suppliers?.supplier_id_external ?? "",
      responseText: row.response_text,
      score: include_score ? (row.manual_score !== null ? row.manual_score : (row.ai_score ?? null)) : undefined,
      iaComment: include_ia_comment ? (row.ai_comment ?? null) : undefined,
      reviewerComment: include_score ? (row.manual_comment ?? null) : undefined,
      status: row.status,
      isChecked: row.is_checked ?? false,
      question: row.question ?? null,
      updatedAt: row.updated_at,
    });
  }

  const items: RequirementWithResponses[] = Object.values(grouped).map((req) => {
    let sum = 0;
    let countScore = 0;
    for (const res of req.responses) {
      if (res.score !== undefined && res.score !== null) {
        sum += res.score;
        countScore++;
      }
    }
    return {
      ...req,
      averageScore: countScore > 0 ? Number((sum / countScore).toFixed(2)) : undefined,
    };
  });

  // Client-side pagination count after filtering
  const actualCount = count !== null && min_score === undefined && max_score === undefined ? count : filteredData.length;

  return createPaginatedResponse(items, limit, offset, actualCount);
}
