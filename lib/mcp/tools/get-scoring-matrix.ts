/**
 * MCP Tool: get_scoring_matrix
 * Returns a cross-tabulation of requirements × suppliers with scores.
 * Useful for analyzing the full evaluation grid at a glance.
 */

import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import type { MCPAuthContext } from "@/lib/mcp/auth";
import { resolveVersionId } from "../utils/versions";

export const GetScoringMatrixInputSchema = z.object({
  rfp_id: z.string().min(1, "RFP ID is required"),
  version_id: z
    .string()
    .optional()
    .describe(
      "Evaluation version ID. Omit to use the active version. Use get_rfp_versions to list versions."
    ),
  category_id: z
    .string()
    .optional()
    .describe(
      "Optional: scope the matrix to a specific category (and its subtree)"
    ),
  score_type: z
    .enum(["ai", "manual", "both"])
    .optional()
    .default("both")
    .describe("Which scores to include: 'ai', 'manual', or 'both' (default)"),
});

export type GetScoringMatrixInput = z.infer<typeof GetScoringMatrixInputSchema>;

export interface ScoreCell {
  responseId: string | null;
  aiScore: number | null;
  manualScore: number | null;
  status: string | null;
  isChecked: boolean;
}

export interface MatrixRow {
  requirementId: string;
  requirementExternalId: string;
  requirementTitle: string;
  categoryId: string | null;
  categoryTitle: string | null;
  weight: number;
  isMandatory: boolean;
  /** Key: supplierId */
  scores: Record<string, ScoreCell>;
}

export interface MatrixSupplier {
  id: string;
  externalId: string;
  name: string;
  averageAiScore: number | null;
  averageManualScore: number | null;
  responseCount: number;
}

export interface GetScoringMatrixOutput {
  rfpId: string;
  rfpTitle: string;
  suppliers: MatrixSupplier[];
  rows: MatrixRow[];
  summary: {
    totalRequirements: number;
    totalSuppliers: number;
    totalCells: number;
    filledCells: number;
    completionRate: number;
  };
}

/**
 * Collect category subtree IDs (inclusive of root)
 */
async function getCategorySubtree(
  rfp_id: string,
  category_id: string
): Promise<Set<string>> {
  const supabase = createServiceClient();
  const { data: allCategories } = await supabase
    .from("categories")
    .select("id, parent_id")
    .eq("rfp_id", rfp_id);

  const subtree = new Set<string>();
  const queue = [category_id];
  while (queue.length > 0) {
    const current = queue.shift()!;
    subtree.add(current);
    for (const cat of allCategories ?? []) {
      if (cat.parent_id === current) queue.push(cat.id);
    }
  }
  return subtree;
}

/**
 * get_scoring_matrix handler
 */
export async function handleGetScoringMatrix(
  input: GetScoringMatrixInput,
  authContext: MCPAuthContext
): Promise<GetScoringMatrixOutput> {
  const supabase = createServiceClient();
  const { rfp_id, version_id, category_id, score_type } = input;

  // Verify access
  const { data: rfp, error: rfpError } = await supabase
    .from("rfps")
    .select("id, title, organization_id")
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

  // Resolve version and category subtree
  const resolvedVersionId = await resolveVersionId(rfp_id, version_id);

  let subtreeCategoryIds: Set<string> | null = null;
  if (category_id) {
    subtreeCategoryIds = await getCategorySubtree(rfp_id, category_id);
  }

  // Fetch all data in parallel
  const [
    { data: suppliers, error: supError },
    { data: requirements, error: reqError },
    { data: categories, error: catError },
  ] = await Promise.all([
    supabase
      .from("suppliers")
      .select("id, supplier_id_external, name")
      .eq("rfp_id", rfp_id)
      .order("created_at", { ascending: true }),
    supabase
      .from("requirements")
      .select(
        "id, requirement_id_external, title, category_id, weight, is_mandatory, display_order"
      )
      .eq("rfp_id", rfp_id)
      .order("display_order", { ascending: true, nullsFirst: false }),
    supabase
      .from("categories")
      .select("id, title")
      .eq("rfp_id", rfp_id),
  ]);

  if (supError) throw new Error(`Failed to fetch suppliers: ${supError.message}`);
  if (reqError) throw new Error(`Failed to fetch requirements: ${reqError.message}`);
  if (catError) throw new Error(`Failed to fetch categories: ${catError.message}`);

  const categoryTitleMap: Record<string, string> = {};
  for (const cat of categories ?? []) {
    categoryTitleMap[cat.id] = cat.title;
  }

  // Filter requirements by category subtree
  const filteredRequirements = (requirements ?? []).filter(
    (r: any) =>
      !subtreeCategoryIds ||
      (r.category_id && subtreeCategoryIds.has(r.category_id))
  );

  const requirementIds = filteredRequirements.map((r: any) => r.id);
  const supplierList = suppliers ?? [];

  // Fetch all responses for the filtered requirements in the resolved version
  let responsesQuery = supabase
    .from("responses")
    .select(
      "id, requirement_id, supplier_id, ai_score, manual_score, status, is_checked"
    )
    .eq("rfp_id", rfp_id)
    .eq("version_id", resolvedVersionId);

  if (requirementIds.length > 0) {
    responsesQuery = responsesQuery.in("requirement_id", requirementIds);
  }

  const { data: responses, error: resError } = await responsesQuery;
  if (resError) throw new Error(`Failed to fetch responses: ${resError.message}`);

  // Index responses by [requirementId][supplierId]
  const responseIndex: Record<string, Record<string, ScoreCell>> = {};
  for (const res of responses ?? []) {
    if (!responseIndex[res.requirement_id])
      responseIndex[res.requirement_id] = {};
    responseIndex[res.requirement_id][res.supplier_id] = {
      responseId: res.id,
      aiScore:
        score_type !== "manual" ? (res.ai_score ?? null) : null,
      manualScore:
        score_type !== "ai" ? (res.manual_score ?? null) : null,
      status: res.status,
      isChecked: res.is_checked ?? false,
    };
  }

  // Build matrix rows
  const rows: MatrixRow[] = filteredRequirements.map((req: any) => ({
    requirementId: req.id,
    requirementExternalId: req.requirement_id_external ?? "",
    requirementTitle: req.title,
    categoryId: req.category_id ?? null,
    categoryTitle: req.category_id
      ? (categoryTitleMap[req.category_id] ?? null)
      : null,
    weight: req.weight ?? 1,
    isMandatory: req.is_mandatory ?? false,
    scores: supplierList.reduce(
      (acc: Record<string, ScoreCell>, sup: any) => {
        acc[sup.id] = responseIndex[req.id]?.[sup.id] ?? {
          responseId: null,
          aiScore: null,
          manualScore: null,
          status: null,
          isChecked: false,
        };
        return acc;
      },
      {} as Record<string, ScoreCell>
    ),
  }));

  // Compute per-supplier aggregates
  const matrixSuppliers: MatrixSupplier[] = supplierList.map((sup: any) => {
    const supResponses = (responses ?? []).filter(
      (r: any) => r.supplier_id === sup.id && requirementIds.includes(r.requirement_id)
    );
    const aiScores = supResponses
      .map((r: any) => r.ai_score)
      .filter((s: any) => s !== null) as number[];
    const manualScores = supResponses
      .map((r: any) => r.manual_score)
      .filter((s: any) => s !== null) as number[];

    return {
      id: sup.id,
      externalId: sup.supplier_id_external ?? "",
      name: sup.name,
      averageAiScore:
        aiScores.length > 0
          ? Math.round((aiScores.reduce((a, b) => a + b, 0) / aiScores.length) * 100) / 100
          : null,
      averageManualScore:
        manualScores.length > 0
          ? Math.round((manualScores.reduce((a, b) => a + b, 0) / manualScores.length) * 100) /
            100
          : null,
      responseCount: supResponses.length,
    };
  });

  const totalCells = filteredRequirements.length * supplierList.length;
  const filledCells = (responses ?? []).filter((r: any) =>
    requirementIds.includes(r.requirement_id)
  ).length;

  return {
    rfpId: rfp_id,
    rfpTitle: rfp.title,
    suppliers: matrixSuppliers,
    rows,
    summary: {
      totalRequirements: filteredRequirements.length,
      totalSuppliers: supplierList.length,
      totalCells,
      filledCells,
      completionRate:
        totalCells > 0 ? Math.round((filledCells / totalCells) * 100) : 0,
    },
  };
}
