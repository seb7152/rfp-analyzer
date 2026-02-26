/**
 * MCP Tool: get_defense_synthesis
 * Returns the AI-generated defense synthesis (forces, faiblesses) per category
 * for a supplier, plus the points de question extracted from evaluation responses.
 */

import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import type { MCPAuthContext } from "@/lib/mcp/auth";

export const GetDefenseSynthesisInputSchema = z.object({
  rfp_id: z.string().min(1, "RFP ID is required"),
  supplier_id: z
    .string()
    .optional()
    .describe(
      "Filter by supplier UUID. Omit to get results for all suppliers."
    ),
  version_id: z
    .string()
    .optional()
    .describe("Evaluation version ID. Omit to get the latest completed analysis."),
});

export type GetDefenseSynthesisInput = z.infer<
  typeof GetDefenseSynthesisInputSchema
>;

export interface CategorySynthesis {
  categoryId: string;
  categoryTitle: string | null;
  categoryCode: string | null;
  supplierId: string;
  supplierName: string | null;
  forces: string[];
  faiblesses: string[];
  questions: string[];
}

export interface GetDefenseSynthesisOutput {
  rfpId: string;
  analyses: CategorySynthesis[];
  count: number;
}

export async function handleGetDefenseSynthesis(
  input: GetDefenseSynthesisInput,
  authContext: MCPAuthContext
): Promise<GetDefenseSynthesisOutput> {
  const supabase = createServiceClient();
  const { rfp_id, supplier_id, version_id } = input;

  // Verify access
  const { data: rfp, error: rfpError } = await supabase
    .from("rfps")
    .select("id, organization_id")
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

  // Fetch completed defense_analysis_tasks joined with defense_analyses
  let tasksQuery = supabase
    .from("defense_analysis_tasks")
    .select(
      `id, category_id, result, defense_analyses!inner ( id, rfp_id, supplier_id, version_id )`
    )
    .eq("defense_analyses.rfp_id", rfp_id)
    .eq("status", "completed");

  if (supplier_id) {
    tasksQuery = tasksQuery.eq("defense_analyses.supplier_id", supplier_id);
  }
  if (version_id) {
    tasksQuery = tasksQuery.eq("defense_analyses.version_id", version_id);
  }

  const { data: tasks, error: tasksError } = await tasksQuery;
  if (tasksError)
    throw new Error(`Failed to fetch defense synthesis: ${tasksError.message}`);

  if (!tasks || tasks.length === 0) {
    return { rfpId: rfp_id, analyses: [], count: 0 };
  }

  const supplierIds = [
    ...new Set(tasks.map((t: any) => t.defense_analyses.supplier_id)),
  ];
  const categoryIds = [
    ...new Set(tasks.map((t: any) => t.category_id).filter(Boolean)),
  ];

  // Fetch categories, suppliers, and requirements→category map in parallel
  const [
    { data: categories },
    { data: suppliers },
    { data: requirements },
  ] = await Promise.all([
    categoryIds.length > 0
      ? supabase
          .from("categories")
          .select("id, title, code")
          .in("id", categoryIds)
      : Promise.resolve({ data: [] }),
    supplierIds.length > 0
      ? supabase.from("suppliers").select("id, name").in("id", supplierIds)
      : Promise.resolve({ data: [] }),
    supabase
      .from("requirements")
      .select("id, category_id")
      .eq("rfp_id", rfp_id),
  ]);

  const categoryMap: Record<string, { title: string | null; code: string | null }> = {};
  for (const cat of categories ?? []) {
    categoryMap[cat.id] = { title: cat.title ?? null, code: cat.code ?? null };
  }

  const supplierMap: Record<string, string> = {};
  for (const sup of suppliers ?? []) {
    supplierMap[sup.id] = sup.name;
  }

  // Build requirement_id → category_id map
  const reqCategoryMap: Record<string, string> = {};
  for (const req of requirements ?? []) {
    if (req.category_id) reqCategoryMap[req.id] = req.category_id;
  }

  // Fetch responses with questions for this RFP (+ optional supplier)
  let responsesQuery = supabase
    .from("responses")
    .select("requirement_id, supplier_id, question")
    .eq("rfp_id", rfp_id)
    .not("question", "is", null);

  if (supplier_id) {
    responsesQuery = responsesQuery.eq("supplier_id", supplier_id);
  }

  const { data: responsesWithQuestions } = await responsesQuery;

  // Group questions by [supplierId][categoryId]
  const questionsByCatSupplier: Record<string, Record<string, Set<string>>> =
    {};
  for (const resp of responsesWithQuestions ?? []) {
    if (!resp.question) continue;
    const catId = reqCategoryMap[resp.requirement_id];
    if (!catId) continue;
    const suppId = resp.supplier_id;
    if (!questionsByCatSupplier[suppId])
      questionsByCatSupplier[suppId] = {};
    if (!questionsByCatSupplier[suppId][catId])
      questionsByCatSupplier[suppId][catId] = new Set();
    questionsByCatSupplier[suppId][catId].add(resp.question);
  }

  // Build output — keep only the first occurrence per (supplierId, categoryId)
  const seen = new Set<string>();
  const analyses: CategorySynthesis[] = [];

  for (const task of tasks) {
    const suppId = (task as any).defense_analyses.supplier_id;
    const catId = task.category_id;
    const key = `${suppId}:${catId}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const result = (task.result as any) ?? {};

    analyses.push({
      categoryId: catId,
      categoryTitle: catId ? (categoryMap[catId]?.title ?? null) : null,
      categoryCode: catId ? (categoryMap[catId]?.code ?? null) : null,
      supplierId: suppId,
      supplierName: supplierMap[suppId] ?? null,
      forces: result.forces ?? [],
      faiblesses: result.faiblesses ?? [],
      questions: catId
        ? Array.from(questionsByCatSupplier[suppId]?.[catId] ?? [])
        : [],
    });
  }

  return { rfpId: rfp_id, analyses, count: analyses.length };
}
