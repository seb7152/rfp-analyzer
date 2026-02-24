/**
 * MCP Tool: get_rfp_structure
 * Get complete structure of an RFP: metadata, category tree with requirements, suppliers, stats
 */

import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import type { MCPAuthContext } from "@/lib/mcp/auth";

export const GetRFPStructureInputSchema = z.object({
  rfp_id: z.string().min(1, "RFP ID is required"),
  include_suppliers: z
    .boolean()
    .optional()
    .default(true)
    .describe("Include suppliers list (default: true)"),
  include_stats: z
    .boolean()
    .optional()
    .default(true)
    .describe("Include response statistics (default: true)"),
});

export type GetRFPStructureInput = z.infer<typeof GetRFPStructureInputSchema>;

export interface CategoryNode {
  id: string;
  code: string;
  title: string;
  shortName: string;
  level: number;
  displayOrder: number | null;
  weight: number;
  children: CategoryNode[];
  requirements: RequirementSummary[];
  requirementCount: number;
}

export interface RequirementSummary {
  id: string;
  externalId: string;
  title: string;
  description: string | null;
  weight: number;
  isMandatory: boolean;
  displayOrder: number | null;
}

export interface SupplierSummary {
  id: string;
  externalId: string;
  name: string;
  contactName: string | null;
  contactEmail: string | null;
}

export interface RFPStats {
  totalCategories: number;
  totalRequirements: number;
  mandatoryRequirements: number;
  totalSuppliers: number;
  totalResponses: number;
  responseCompletionRate: number;
}

export interface GetRFPStructureOutput {
  id: string;
  title: string;
  description: string | null;
  status: string;
  createdAt: string;
  categories: CategoryNode[];
  suppliers: SupplierSummary[];
  stats: RFPStats | null;
}

/**
 * Build a hierarchical category tree and embed requirements per category
 */
function buildCategoryTree(
  categories: Array<{
    id: string;
    code: string;
    title: string;
    short_name: string;
    level: number;
    parent_id: string | null;
    display_order: number | null;
    weight: number;
  }>,
  requirementsByCategory: Record<string, RequirementSummary[]>
): CategoryNode[] {
  const nodeMap: Record<string, CategoryNode> = {};

  // Sort categories by level descending to build bottom-up
  const sorted = [...categories].sort((a, b) => b.level - a.level);

  for (const cat of sorted) {
    const reqs = requirementsByCategory[cat.id] ?? [];
    nodeMap[cat.id] = {
      id: cat.id,
      code: cat.code,
      title: cat.title,
      shortName: cat.short_name,
      level: cat.level,
      displayOrder: cat.display_order,
      weight: cat.weight,
      children: [],
      requirements: reqs,
      requirementCount: reqs.length,
    };
  }

  // Wire children into parents
  for (const cat of sorted) {
    if (cat.parent_id && nodeMap[cat.parent_id]) {
      nodeMap[cat.parent_id].children.unshift(nodeMap[cat.id]);
      // Propagate requirement count upward
      nodeMap[cat.parent_id].requirementCount +=
        nodeMap[cat.id].requirementCount;
    }
  }

  // Return only root nodes (no parent)
  return categories
    .filter((c) => c.parent_id === null)
    .sort(
      (a, b) => (a.display_order ?? 9999) - (b.display_order ?? 9999)
    )
    .map((c) => nodeMap[c.id])
    .filter(Boolean);
}

/**
 * Verify RFP access and return RFP data
 */
async function verifyAndGetRFP(
  rfp_id: string,
  authContext: MCPAuthContext
) {
  const supabase = createServiceClient();

  const { data: rfp, error } = await supabase
    .from("rfps")
    .select("id, title, description, status, organization_id, created_at")
    .eq("id", rfp_id)
    .single();

  if (error || !rfp) throw new Error(`RFP not found: ${rfp_id}`);

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

  return rfp;
}

/**
 * get_rfp_structure handler
 */
export async function handleGetRFPStructure(
  input: GetRFPStructureInput,
  authContext: MCPAuthContext
): Promise<GetRFPStructureOutput> {
  const supabase = createServiceClient();
  const { rfp_id, include_suppliers, include_stats } = input;

  const rfp = await verifyAndGetRFP(rfp_id, authContext);

  // Fetch categories, requirements, suppliers in parallel
  const [
    { data: categories, error: catError },
    { data: requirements, error: reqError },
    suppliersResult,
  ] = await Promise.all([
    supabase
      .from("categories")
      .select("id, code, title, short_name, level, parent_id, display_order, weight")
      .eq("rfp_id", rfp_id)
      .order("display_order", { ascending: true, nullsFirst: false }),
    supabase
      .from("requirements")
      .select(
        "id, requirement_id_external, title, description, category_id, weight, is_mandatory, display_order"
      )
      .eq("rfp_id", rfp_id)
      .order("display_order", { ascending: true, nullsFirst: false }),
    include_suppliers
      ? supabase
          .from("suppliers")
          .select("id, supplier_id_external, name, contact_name, contact_email")
          .eq("rfp_id", rfp_id)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (catError) throw new Error(`Failed to fetch categories: ${catError.message}`);
  if (reqError) throw new Error(`Failed to fetch requirements: ${reqError.message}`);
  if (suppliersResult.error)
    throw new Error(`Failed to fetch suppliers: ${suppliersResult.error.message}`);

  // Group requirements by category_id
  const requirementsByCategory: Record<string, RequirementSummary[]> = {};
  for (const req of requirements ?? []) {
    const key = req.category_id ?? "__none__";
    if (!requirementsByCategory[key]) requirementsByCategory[key] = [];
    requirementsByCategory[key].push({
      id: req.id,
      externalId: req.requirement_id_external ?? "",
      title: req.title,
      description: req.description,
      weight: req.weight ?? 1,
      isMandatory: req.is_mandatory ?? false,
      displayOrder: req.display_order ?? null,
    });
  }

  const categoryTree = buildCategoryTree(categories ?? [], requirementsByCategory);

  const suppliers: SupplierSummary[] = (suppliersResult.data ?? []).map((s: any) => ({
    id: s.id,
    externalId: s.supplier_id_external ?? "",
    name: s.name,
    contactName: s.contact_name,
    contactEmail: s.contact_email,
  }));

  let stats: RFPStats | null = null;
  if (include_stats) {
    const totalRequirements = (requirements ?? []).length;
    const mandatoryRequirements = (requirements ?? []).filter(
      (r: any) => r.is_mandatory
    ).length;
    const totalSuppliers = suppliers.length;

    // Count responses
    const { count: totalResponses } = await supabase
      .from("responses")
      .select("id", { count: "exact", head: true })
      .eq("rfp_id", rfp_id);

    const maxResponses = totalRequirements * totalSuppliers;
    const responseCompletionRate =
      maxResponses > 0
        ? Math.round(((totalResponses ?? 0) / maxResponses) * 100)
        : 0;

    stats = {
      totalCategories: (categories ?? []).length,
      totalRequirements,
      mandatoryRequirements,
      totalSuppliers,
      totalResponses: totalResponses ?? 0,
      responseCompletionRate,
    };
  }

  return {
    id: rfp.id,
    title: rfp.title,
    description: rfp.description,
    status: rfp.status,
    createdAt: rfp.created_at,
    categories: categoryTree,
    suppliers,
    stats,
  };
}
